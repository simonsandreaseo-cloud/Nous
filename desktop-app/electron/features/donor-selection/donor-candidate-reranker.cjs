'use strict';

const ollamaClient = require('../local-llm-ollama/ollama-local-client.cjs');
const enterpriseRetriever = require('../donor-bank/hybrid-donor-retriever.cjs');
const discourseTopology = require('../text-analysis/discourse-topology-analyzer.cjs');
const factualGuard = require('../text-analysis/factual-entailment-guard.cjs');
const { SEMANTIC_STOPWORDS_ES } = require('../text-analysis/lexical-constants.cjs');
const { tokenize } = require('../text-analysis/draft-preprocessor.cjs');
const { fillSlotsInBrick, healProDropSubject, buildDonorGraftedDraft } = require('../rewrite-tracks/track-a-donor-grafting/donor-slot-filler.cjs');

function rerankCandidatesNeurosymbolic({
  candidates = [],
  rawPara = '',
  currentAnchor = '',
  frame = 'GENERAL_STYLE',
  atoms = {},
  isColonIntro = false,
  articleState = null,
  paraTopology = null,
  log = null
}) {
  const t0 = Date.now();
  const pool = (candidates || []).slice(0, 24);
  if (!pool.length) return null;

  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const queryForSemantic = `${currentAnchor || ''} ${rawPara || ''}`.trim();
  const queryProfile = enterpriseRetriever.analyzeQuery(queryForSemantic, frame, atoms);
  const topicTokens = tokenize(rawPara || '').filter(t => t.length >= 5 && !SEMANTIC_STOPWORDS_ES.has(t));

  const atomGroups = [
    atoms?.shapes || [],
    atoms?.materials || [],
    atoms?.styles || [],
    atoms?.outfits || [],
    atoms?.coatings || [],
    atoms?.brand_models || []
  ].filter(g => g.length > 0);

  const scoredPool = pool.map((node, idx) => {
    const filled = fillSlotsInBrick(node.brick, atoms, frame, null, rawPara);
    const filledNorm = norm(filled);
    const liveHybrid = enterpriseRetriever.scoreCandidateHybrid(queryProfile, node.brick, filled);

    // Eje 1: Similitud Vectorial Densa 128-D + BM25 Léxico-Conceptual sobre borrador injertado (0..42)
    const axis1Sem = Math.min(42, liveHybrid.denseCosine * 34 + liveHybrid.bm25Score * 1.15);

    // Eje 2: Cobertura de Átomos Davidson + intersección de topic_tags ontológicos (0..25)
    let atomCovRatio = 0;
    if (atomGroups.length > 0) {
      let coveredGroups = 0;
      for (const grp of atomGroups) {
        const hit = grp.some(val => {
          const vNorm = norm(val);
          const parts = vNorm.split(/\s+/).filter(p => p.length >= 3);
          return filledNorm.includes(vNorm) || parts.some(p => filledNorm.includes(p));
        });
        if (hit) coveredGroups++;
      }
      atomCovRatio = coveredGroups / atomGroups.length;
    }
    let topicHits = 0;
    if (topicTokens.length > 0) {
      for (const tok of topicTokens) {
        if (filledNorm.includes(tok.slice(0, Math.min(6, tok.length)))) topicHits++;
      }
    }
    const topicRatio = topicTokens.length > 0 ? Math.min(1, topicHits / Math.min(6, topicTokens.length)) : 0.4;
    let axis2Atom = atomGroups.length > 0
      ? (atomCovRatio * 15 + topicRatio * 5 + liveHybrid.tagOverlap * 5)
      : (topicRatio * 16 + liveHybrid.tagOverlap * 9);
    if (frame === 'PRODUCT_FACTUAL' && atoms?.brand_models?.length) {
      const brandStem = norm(atoms.brand_models[0]).split(/\s+/)[0];
      if (brandStem && filledNorm.includes(brandStem)) axis2Atom = Math.min(25, axis2Atom + 5);
    }
    const targetRelations = new Set((atoms?.relations || []).map(r => r.relation).filter(r => r !== 'HAS_ATTRIBUTE'));
    if (targetRelations.size > 0) {
      const brickRels = new Set(Array.isArray(node.brick.causal_relations) ? node.brick.causal_relations : []);
      if (/\b(?:combinan?\s+con|junto\s+a|vestidos|lino|jeans|estilismos|conjuntos|looks)\b/i.test(filled)) brickRels.add('PAIRS_WITH_GARMENT');
      if (/\b(?:verano|todo\s+el\s+a[ñn]o|ciudad|pasarela|a[ñn]os\s*70|temporada)\b/i.test(filled)) brickRels.add('USED_IN_CONTEXT');
      if (/\b(?:gracias\s+a|por\s+lo\s+que|de\s+modo\s+que|para\s+que|logra|permite|consiguen|ya\s+que|porque)\b/i.test(filled)) brickRels.add('CAUSES_BENEFIT');
      if (/\b(?:rostro|facciones|cara|estiliza|favorece|sienta\s+bien|armoniza|suaviza)\b/i.test(filled)) brickRels.add('BALANCES_FACE_SHAPE');
      if (/\b(?:evitar|evita|descartar|no\s+oprim|no\s+presionen|sin\s+saturar|no\s+le\s+van)\b/i.test(filled)) brickRels.add('AVOID_FEATURE');

      let relMatches = 0;
      for (const tr of targetRelations) {
        if (brickRels.has(tr)) relMatches++;
      }
      const causalIsoBonus = Math.min(0.9, relMatches * 0.3);
      axis2Atom = Math.min(25, axis2Atom + causalIsoBonus);
    }
    if (atoms?.shapes?.length) {
      const hasShapeSlotOrMatch = (node.brick.slots || []).some(s => s.slot_type === 'SLOT_FRAME_SHAPE') ||
        atoms.shapes.some(sh => filledNorm.includes(norm(sh).slice(0, 6)));
      if (hasShapeSlotOrMatch) {
        axis2Atom = Math.min(25, axis2Atom + 3);
      }
    }

    // Eje 3: Alineación de Acto Discursivo (discourse_intent) + Polaridad + Continuidad de Persona (-25..+18)
    let axis3Disc = 10;
    if (liveHybrid.intentMatch) axis3Disc += 6;
    else if (liveHybrid.discourseIntent === 'STYLE_DEFINITION' || liveHybrid.discourseIntent === 'OUTFIT_COMBINATION') axis3Disc += 2.5;
    if (liveHybrid.polarity === queryProfile.polarity) axis3Disc += 2;
    if (/[;:¿¡—–]/.test(filled)) axis3Disc += 2.5;
    const neutralMatches = filled.match(/\b(?:tono equilibrado|silueta equilibrada|cualquier ocasión|pasta seleccionada)\b/gi) || [];
    axis3Disc -= Math.min(18, neutralMatches.length * 6);
    if (/^(?:esto es m[aá]s|para eso,|hacen que|te hace ser)\b/i.test(filled.trim())) {
      axis3Disc -= 25;
    }
    if (articleState) {
      const opener2w = filledNorm.trim().split(/\s+/).slice(0, 2).join(' ');
      if (articleState.prevOpener2w && opener2w === articleState.prevOpener2w) {
        axis3Disc -= 9;
      }
      if (articleState.prevPersona && liveHybrid.narrativePersona !== 'IMPERSONAL_THIRD' && articleState.prevPersona !== 'IMPERSONAL_THIRD' && liveHybrid.narrativePersona !== articleState.prevPersona) {
        axis3Disc -= 5;
      } else if (liveHybrid.narrativePersona === queryProfile.narrative_persona) {
        axis3Disc += 3;
      }
    }
    if (isColonIntro) {
      if (/\b(?:modelos|propuestas|opciones|claves|tendencias|destacan|apunta|temporada)\b/i.test(filledNorm)) axis3Disc += 10;
      if (/^(?:no solo|este tipo de)\b/i.test(filled.trim())) axis3Disc -= 12;
    }

    // Eje 4: Frescura entre artículos y dispersión (hasta +16 / fuerte penalización si repetido)
    const reuseCnt = Number(node.brick._crossArticleReuseCount || 0);
    const stemReuseCnt = Number(node.brick._crossArticleStemReuseCount || 0);
    let axis4Fresh = (reuseCnt === 0 && stemReuseCnt === 0)
      ? 16
      : -Math.min(48, reuseCnt * 22 + stemReuseCnt * 10);
    axis4Fresh += Math.max(-4, 4 - Number(node.totalCost || 50) * 0.04);

    // Eje 5: Ritmo biológico y burstiness intra-párrafo (0..12.5, penaliza ráfagas cortas planas)
    const sents = filled.split(/(?<=[.!?])\s+/).filter(s => s.length > 4);
    let axis5Burst = sents.length >= 3 ? 5 : (sents.length === 2 ? 3 : 0);
    if (sents.length >= 2) {
      const sLens = sents.map(s => s.split(/\s+/).filter(Boolean).length);
      const maxL = Math.max(...sLens);
      const minL = Math.min(...sLens);
      const spread = maxL - minL;
      if (spread >= 8) axis5Burst += 3;
      if (spread >= 14 && maxL >= 24) axis5Burst += 2.5;
      if (sents.length >= 4 && maxL <= 22) axis5Burst -= 4;
    }
    if (node.transition === 'CONTINUE') axis5Burst += 2;
    else if (node.transition === 'RETAIN') axis5Burst += 1;

    // Eje 6: Topología Discursiva RST + QUD + Cohesión de Halliday-Hasan
    const liveTopoProfile = discourseTopology.analyzeBrickDiscourseProfile(
      filled,
      node.brick._cleanWindow || node.brick.syntactic_skeleton || filled,
      node.brick.slots
    );
    const topoCompat = discourseTopology.scoreTopologyCompatibility(
      paraTopology?.role || 'SECTION_MEDIAL',
      liveTopoProfile,
      frame
    );
    let axis6Topo = topoCompat.score;
    if (
      paraTopology?.role === 'SECTION_OPENING' &&
      paraTopology?.posInSection === 1 &&
      !/\b(?:cuadrad|rectangul|geom[eé]tric)\b/i.test(rawPara || '') &&
      /^¿A\s+qu[eé]\s+famoso\b.*\bcuadrad/i.test(filled.trim())
    ) {
      axis6Topo -= 14;
    }
    if (discourseTopology.hasContrastiveMaterialRedundancy(node.brick._cleanWindow || '', rawPara, atoms, filled)) {
      axis6Topo -= 42;
    }

    // Eje 7: Guardián de Implicación Fáctica, Polaridad Ligada y Anclas Discriminativas
    const liveEntail = factualGuard.evaluateFactualEntailment(
      rawPara,
      filled,
      atoms?.discriminativeAnchors,
      atoms?.signedPolarity
    );
    let axis7Factual = liveEntail.polarityContradiction
      ? -95
      : Number((liveEntail.anchorCoverageRatio * 28 - liveEntail.missingCriticalTech.length * 44).toFixed(2));
    if (liveEntail.unrequestedTechLeak) {
      axis7Factual = Number((axis7Factual - 22).toFixed(2));
    }
    if (liveEntail.missingSafetyWarning) {
      axis7Factual = Number((axis7Factual - 18).toFixed(2));
    }

    const axisTotal = Number((axis1Sem + axis2Atom + axis3Disc + axis4Fresh + axis5Burst + axis6Topo + axis7Factual).toFixed(2));
    return {
      node,
      origRank: idx + 1,
      axisTotal,
      filledOpener2w: filledNorm.trim().split(/\s+/).slice(0, 2).join(' '),
      liveHybrid,
      liveEntail,
      axes: {
        sem: Number(axis1Sem.toFixed(1)),
        atom: Number(axis2Atom.toFixed(1)),
        disc: Number(axis3Disc.toFixed(1)),
        fresh: Number(axis4Fresh.toFixed(1)),
        burst: Number(axis5Burst.toFixed(1)),
        topo: Number(axis6Topo.toFixed(1)),
        fact: Number(axis7Factual.toFixed(1)),
        cos: liveHybrid.denseCosine,
        bm25: liveHybrid.bm25Score
      }
    };
  });

  scoredPool.sort((a, b) => b.axisTotal - a.axisTotal);
  const winner = scoredPool.find(item => !item.liveEntail?.polarityContradiction) || scoredPool[0];
  if (articleState && winner) {
    articleState.prevOpener2w = winner.filledOpener2w;
    if (winner.liveHybrid.narrativePersona !== 'IMPERSONAL_THIRD') {
      articleState.prevPersona = winner.liveHybrid.narrativePersona;
    }
  }
  let fitScore = Math.min(10, Math.max(2, Math.round(winner.axisTotal / 10.2)));
  if (winner?.liveEntail?.isHonestFactualGap) {
    fitScore = Math.min(5, fitScore);
  }
  const durationMs = Date.now() - t0;
  const reason = `7-Ejes Híbrido [Rank #${winner.origRank}/${pool.length}]: cos=${winner.axes.cos}, bm25=${winner.axes.bm25}, atom=${winner.axes.atom}, disc=${winner.axes.disc}(${winner.liveHybrid.discourseIntent}), fresc=${winner.axes.fresh}, cad=${winner.axes.burst}, topo=${winner.axes.topo}, fact=${winner.axes.fact}`;

  if (log) {
    log(`[RERANKER_5_EJES] ${pool.length} candidatos | Ganador #${winner.origRank}: ${winner.node.brick.brick_id} (${winner.node.domain}) | Total=${winner.axisTotal} | Fit=${fitScore}/10 | ${reason} (${durationMs}ms)`);
  }

  return {
    usedReranker: true,
    mode: 'enterprise-hybrid-7axis',
    candidateCount: pool.length,
    chosenRank: winner.origRank,
    chosenNode: winner.node,
    fitScore,
    entailmentAudit: winner.liveEntail,
    reason,
    durationMs,
    poolSummary: scoredPool.slice(0, 10).map(sp => ({
      rank: sp.origRank,
      brick_id: sp.node.brick.brick_id,
      domain: sp.node.domain,
      score: sp.node.score,
      semScore: sp.node.brick._semScore || 0,
      denseCosine: sp.axes.cos,
      bm25: sp.axes.bm25,
      intent: sp.liveHybrid.discourseIntent,
      axisTotal: sp.axisTotal,
      fresh: sp.node.brick._crossArticleFresh !== false
    }))
  };
}

async function rerankCandidatesWithQwen({
  candidates,
  rawPara,
  currentAnchor,
  frame,
  atoms,
  tuples,
  extractedFacts,
  modelName,
  log,
  qwenStats,
  isColonIntro = false,
  centeringCb = ''
}) {
  const pool = (candidates || []).slice(0, 3);
  if (!pool.length) return null;

  const estimateDeterministicFit = (node) => {
    const s = node?.brick?._semScore || 0;
    return Math.min(9, Math.max(3, Math.round(3 + s / 4.5)));
  };

  if (pool.length === 1) {
    const only = pool[0];
    const est = estimateDeterministicFit(only);
    return {
      chosenNode: only,
      chosenRank: 1,
      fitScore: est,
      reason: 'Candidato único tras filtros de coherencia',
      candidateCount: 1,
      poolSummary: [{ rank: 1, brick_id: only.brick.brick_id, domain: only.domain, semScore: only.brick._semScore || 0 }]
    };
  }

  const previews = pool.map(node => {
    let piece = fillSlotsInBrick(node.brick, atoms, frame, tuples?.[0] || null);
    const pieceFirstSent = (piece || '').split(/(?<=[.!?])\s+/)[0] || piece || '';
    const hasExplicitSubject = /\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(pieceFirstSent);
    if (piece && !hasExplicitSubject && node.profile?.hasProDrop) {
      const healed = healProDropSubject(piece, centeringCb, atoms);
      if (healed.healed) piece = healed.text;
    }
    const drafted = buildDonorGraftedDraft({
      skeletonPieces: piece ? [piece] : [],
      tuples,
      atoms,
      extractedFacts,
      frame,
      centering: { cb: centeringCb, hinge: null },
      endsWithColon: isColonIntro
    });
    const text = (drafted || piece || node.brick._cleanWindow || '').replace(/\s+/g, ' ').trim();
    return text.length > 240 ? `${text.slice(0, 237)}...` : text;
  });

  const targetSummary = (extractedFacts && extractedFacts.trim().length >= 25
    ? extractedFacts.replace(/\s+/g, ' ').trim()
    : (rawPara || '').replace(/\s+/g, ' ').trim()
  ).slice(0, 280);

  const candidateLines = previews.map((txt, idx) => `${idx + 1}) ${txt}`).join('\n');

  const prompt = `Elige el candidato que mejor encaja en tema, intención y coherencia editorial con la SECCIÓN y la IDEA OBJETIVO.

SECCIÓN: ${currentAnchor || 'Introducción del artículo'}
TIPO: ${isColonIntro ? 'Frase introductoria que termina en dos puntos (:) para presentar modelos o consejos' : frame}
IDEA OBJETIVO: ${targetSummary}

CANDIDATOS:
${candidateLines}

CRITERIOS:
- Prioriza el candidato que realmente trata el mismo subtema, estilo, material o función que la SECCIÓN y la IDEA OBJETIVO.
- Descarta candidatos que contradigan la idea objetivo, hablen de temas ajenos (clima, lluvia, ropa formal, problemas médicos) o suenen bruscos/fuera de lugar.
- Califica el ENCAJE real de 1 a 10 (9-10 exacto, 7-8 bueno, 4-6 genérico o hueco de banco, 1-3 forzado).
- Responde ÚNICAMENTE una línea con el formato exacto:
ELEGIDO: <número del 1 al ${pool.length}> | ENCAJE: <1-10> | MOTIVO: <máx 10 palabras>`;

  const poolSummary = pool.map((n, idx) => ({
    rank: idx + 1,
    brick_id: n.brick.brick_id,
    domain: n.domain,
    score: n.score,
    semScore: n.brick._semScore || 0
  }));

  try {
    const res = await ollamaClient.generate(modelName, prompt, {
      system: 'Eres un editor jefe de óptica y moda que selecciona el mejor borrador candidato por coherencia temática. Nunca reescribas textos; responde solo una línea con el formato exacto: ELEGIDO: N | ENCAJE: X | MOTIVO: ...',
      temperature: 0.0,
      top_p: 0.85,
      num_predict: 44,
      cleanPlainText: true
    });

    qwenStats.calls += 1;
    qwenStats.totalDurationMs += res.durationMs;
    qwenStats.totalTokens += res.eval_count || 0;

    const rawOut = (res.response || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    const chosenMatch = rawOut.match(/(?:ELEGIDO|OPCI[OÓ]N|CANDIDATO)\s*[:#=-]?\s*<?(\d+)>?/i) || rawOut.match(/\b([1-6])\b/);
    let chosenNum = chosenMatch ? parseInt(chosenMatch[1], 10) : 1;
    if (!Number.isFinite(chosenNum) || chosenNum < 1 || chosenNum > pool.length) {
      chosenNum = 1;
    }
    const chosenNode = pool[chosenNum - 1];

    const fitMatch = rawOut.match(/(?:ENCAJE|PUNTUACI[OÓ]N|NOTA|SCORE)\s*[:=-]?\s*<?(\d{1,2})>?/i);
    let fitScore = fitMatch ? parseInt(fitMatch[1], 10) : estimateDeterministicFit(chosenNode);
    if (!Number.isFinite(fitScore) || fitScore < 1 || fitScore > 10) {
      fitScore = estimateDeterministicFit(chosenNode);
    }

    const reasonMatch = rawOut.match(/MOTIVO\s*[:=-]?\s*(.+)$/i);
    const reason = reasonMatch
      ? reasonMatch[1].replace(/^["']|["']$/g, '').trim().slice(0, 110)
      : 'Mayor afinidad temática y editorial en el pool';

    const poolCompact = poolSummary.map(p => `#${p.rank}:${p.brick_id}(sem:${p.semScore})`).join(', ');
    log(`[QWEN_FASE_2_RERANKER] Pool [${poolCompact}] (${res.durationMs}ms) -> Elegido #${chosenNum}: ${chosenNode.brick.brick_id} (${chosenNode.domain}) | Encaje: ${fitScore}/10 | Motivo: ${reason}`);

    return {
      chosenNode,
      chosenRank: chosenNum,
      fitScore,
      reason,
      candidateCount: pool.length,
      durationMs: res.durationMs,
      evalCount: res.eval_count || 0,
      rawResponse: rawOut,
      poolSummary
    };
  } catch (err) {
    qwenStats.failures += 1;
    const fallbackNode = pool[0];
    const est = estimateDeterministicFit(fallbackNode);
    log(`[QWEN_FASE_2_RERANKER_FALLBACK] Error en juez semántico (${err.message}). Conservado #1: ${fallbackNode.brick.brick_id} (Encaje est.: ${est}/10).`);
    return {
      chosenNode: fallbackNode,
      chosenRank: 1,
      fitScore: est,
      reason: `Fallback top-1 TF-IDF (${err.message})`,
      candidateCount: pool.length,
      durationMs: 0,
      evalCount: 0,
      rawResponse: '',
      poolSummary
    };
  }
}

module.exports = {
  rerankCandidatesNeurosymbolic,
  rerankCandidatesWithQwen
};
