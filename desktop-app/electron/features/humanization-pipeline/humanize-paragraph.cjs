'use strict';

const bankGapTracker = require('../donor-bank/bank-coverage-gap-tracker.cjs');
const factualGuard = require('../text-analysis/factual-entailment-guard.cjs');
const {
  neutralizeAiCliches,
  detectOutroCliché,
  computeNGramOverlapRatio,
  countTokenDelta
} = require('../text-analysis/draft-preprocessor.cjs');
const { findAllCorpusOverlaps, selectUnusedGlitch } = require('../anti-plagiarism-and-quality/corpus-shingle-scanner.cjs');
const { applyCentralGrammaticalSurgery, applySymbolicShingleBreaker } = require('../anti-plagiarism-and-quality/symbolic-shingle-breaker.cjs');
const { enforceBrandSku } = require('../rewrite-tracks/track-a-donor-grafting/donor-slot-filler.cjs');
const { runTrackAParagraph } = require('../rewrite-tracks/track-a-donor-grafting/run-track-a-paragraph.cjs');
const { runTrackBParagraph } = require('../rewrite-tracks/track-b-guided-transfer/run-track-b-paragraph.cjs');

async function humanizeParagraph({
  bankState,
  paragraphIndex = null,
  frame,
  atoms,
  atomSummaryText,
  tuples,
  rawPara,
  currentAnchor,
  isFirstAfterHeading,
  glitchIdx,
  options,
  auditSteps,
  usedDonorIds,
  usedDomainsCount,
  centeringTransitions,
  usedGlitches,
  usedHinges,
  usedBridgeWords,
  useLocalLLM,
  activeModel,
  log,
  qwenStats,
  usageLedger = null,
  articleState = null,
  paraTopology = null,
  carrilBStats = null,
  ollamaLazyState = null,
  domainId = 'optica',
  activeSubdomains = null
}) {
  const trackARes = await runTrackAParagraph({
    bankState,
    frame,
    atoms,
    tuples,
    rawPara,
    currentAnchor,
    isFirstAfterHeading,
    options,
    auditSteps,
    usedDonorIds,
    usedDomainsCount,
    centeringTransitions,
    usedHinges,
    useLocalLLM,
    activeModel,
    log,
    qwenStats,
    usageLedger,
    articleState,
    paraTopology,
    domainId,
    activeSubdomains
  });

  let {
    reconstructedPara,
    donorsUsedInPara,
    pickedDonors,
    centering,
    rerankMeta,
    donorSelectionAudit,
    semanticRerankerAudit,
    isColonIntro,
    qwenAttemptsUsed,
    rotatedCandidate,
    paraInterventionTokens
  } = trackARes;

  // -----------------------------------------------------------------------
  // FASE 5: Clichés Residuales, Anti-Outro, Ruptura k-gramas y Glitches
  // -----------------------------------------------------------------------
  const beforeCliche = reconstructedPara;
  reconstructedPara = neutralizeAiCliches(reconstructedPara, auditSteps)
    .replace(/\b(tiene\s+(?:todo\s+el\s+)?sentido)\s+([a-záéíóúüñ]{4,}(?:amos|emos|imos|es|as|en|an))\b/gi, '$1 que $2');
  paraInterventionTokens += Math.min(4, countTokenDelta(beforeCliche, reconstructedPara));

  if (options.antiOutro !== false) {
    const sents = reconstructedPara.split(/(?<=[.!?])\s+/).filter(Boolean);
    const keptSents = [];
    for (const s of sents) {
      const outroHit = detectOutroCliché(s);
      if (outroHit) {
        log(`[ANTI_OUTRO] Podada frase de cierre genérica: "${s}" (${outroHit.reason})`);
        auditSteps.push({
          stage: 'ANTI_OUTRO_PRUNED',
          sentence: s,
          reason: outroHit.reason
        });
      } else {
        keptSents.push(s);
      }
    }
    if (keptSents.length > 0) {
      reconstructedPara = keptSents.join(' ');
    }
  }

  // Ruptura gramatical central de k-gramas (bisección interior [3, L-4], bordes intactos)
  const enableCentralSurgery = options?.centralShingleSurgery !== false;
  const enableAntiPlagiarism = options?.antiPlagiarism === true || bankState.enableAntiPlagiarism === true;
  if (enableCentralSurgery || enableAntiPlagiarism) {
    const overlapsBefore = findAllCorpusOverlaps(bankState, reconstructedPara, donorsUsedInPara, 7);

    if (overlapsBefore.length > 0) {
      log(`[FASE_5_SHINGLES] Detectados ${overlapsBefore.length} solapamientos >= 7 palabras contra donantes/banco: ${overlapsBefore.slice(0, 6).map(o => `"${o.shingle}"`).join(' | ')}${overlapsBefore.length > 6 ? ` (+${overlapsBefore.length - 6} más)` : ''}`);

      const beforeShingleBreak = reconstructedPara;
      const surgeryRes = applyCentralGrammaticalSurgery(bankState, 
        reconstructedPara,
        donorsUsedInPara,
        atoms,
        7,
        log,
        auditSteps
      );
      reconstructedPara = surgeryRes.text;

      paraInterventionTokens += countTokenDelta(beforeShingleBreak, reconstructedPara);
      const overlapsAfter = findAllCorpusOverlaps(bankState, reconstructedPara, donorsUsedInPara, 7);
      log(`[FASE_5_CIRUGIA_RESUMEN] Solapamientos >=7w: ${overlapsBefore.length} -> ${overlapsAfter.length} | Oraciones editadas: ${surgeryRes.stats.sentencesEdited} | Ops: ${surgeryRes.operations.length} | Violaciones borde: ${surgeryRes.stats.borderViolations} | Resultado: "${reconstructedPara}"`);
    } else {
      log(`[FASE_5_CIRUGIA_RESUMEN] Solapamientos >=7w detectados: 0 (sin cirugía requerida)`);
    }
  } else {
    log(`[FASE_5_ANTIPLAGIO] Omitida por configuración explícita.`);
  }

  // Preservar las oraciones orgánicas completas del autor humano pre-2022 (sin fragmentar con breakLongSentence)

  // Glitch biológico certificado orgánico (máximo 2 por artículo, cadencia irregular)
  const existingGlitchPattern = /olvídate de las marcas|sin rodeos ni artificios|cuestión de proporciones|no todas sientan igual|pruébalas y notarás|icono atemporal|detalle sutil que lo cambia|un acierto seguro|diseño de toda la vida|te durarán años|al tacto se nota|varilla ajusta|alma metálica|pulido manual impecable/i;
  const alreadyHasAnyGlitch = existingGlitchPattern.test(rawPara) || existingGlitchPattern.test(reconstructedPara);
  const canInjectGlitch = options.injectGlitches === 'force' && !reconstructedPara.trim().endsWith(':') && !alreadyHasAnyGlitch && usedGlitches.size < 2;
  if (canInjectGlitch && (glitchIdx === 2 || glitchIdx === 6)) {
    const glitchObj = selectUnusedGlitch(frame, usedGlitches, `${rawPara} ${reconstructedPara}`);
    if (glitchObj && !reconstructedPara.includes(glitchObj.text)) {
      usedGlitches.add(glitchObj.text);
      const sents = reconstructedPara.split(/(?<=[.!?])\s+/).filter(Boolean);
      if (sents.length >= 3 && glitchIdx === 6) {
        // Intersperse glitch organically as an internal pause
        reconstructedPara = `${sents[0]} ${glitchObj.text} ${sents.slice(1).join(' ')}`.trim();
      } else {
        reconstructedPara = reconstructedPara.trim() + ' ' + glitchObj.text;
      }
      log(`[GLITCH_BIOLOGICO] Inyectado: "${glitchObj.text}" (${glitchObj.reason})`);
      auditSteps.push({
        stage: 'GLITCH_INJECTION',
        glitch: glitchObj.text,
        reason: glitchObj.reason
      });
      if (enableAntiPlagiarism) {
        const postGlitchOverlaps = findAllCorpusOverlaps(bankState, reconstructedPara, donorsUsedInPara, 7);
        if (postGlitchOverlaps.length > 0) {
          reconstructedPara = applySymbolicShingleBreaker(bankState, reconstructedPara, donorsUsedInPara, atoms, paraBridgeWords, 7);
        }
      }
    }
  }

  reconstructedPara = enforceBrandSku(reconstructedPara, atoms);
  let finalLiveEntailment = factualGuard.evaluateFactualEntailment(
    rawPara,
    reconstructedPara,
    atoms?.discriminativeAnchors,
    atoms?.signedPolarity
  );
  if (finalLiveEntailment.isHonestFactualGap) {
    rerankMeta.fitScore = Math.min(rerankMeta.fitScore ?? 5, 5);
    donorSelectionAudit.fitScore = rerankMeta.fitScore;
    semanticRerankerAudit.fitScore = rerankMeta.fitScore;
  }
  let trigramOverlap = computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
  let divergencePct = Number(((1 - trigramOverlap) * 100).toFixed(1));

  let coverageEntry = bankGapTracker.evaluateParagraphCoverage({
    paragraphIndex,
    heading: currentAnchor || '(Introducción)',
    frame,
    isColonIntro,
    rawPara,
    atoms,
    donorText: reconstructedPara,
    donorId: donorsUsedInPara.map(b => b.brick_id).join(' + ') || 'fallback',
    source: donorsUsedInPara.map(b => b.source_domain || 'corpus').join(', ') || 'fallback',
    poolSize: centering.rawCoherentPoolSize ?? (centering.topCandidates?.length || pickedDonors.length),
    semScore: pickedDonors[0]?.brick?._semScore ?? 0,
    matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
    fitScore: rerankMeta.fitScore,
    chosenRank: rerankMeta.chosenRank,
    candidateCount: rerankMeta.candidateCount,
    usedReranker: rerankMeta.usedReranker,
    rerankReason: rerankMeta.reason,
    qwenAttempts: qwenAttemptsUsed,
    rotatedCandidate,
    crossArticleReuseCount: pickedDonors[0]?.brick?._crossArticleReuseCount || 0,
    entailmentAudit: finalLiveEntailment
  });

  // -----------------------------------------------------------------------
  // CARRIL B (Edición Guiada Restringida sobre Andamio Humano + Juez Mecánico)
  // Se activa únicamente cuando Carril A clasifica el párrafo como hueco CRITICO
  // (o MEDIO+CRITICO si carrilBMode === 'always_gap'). Cero intervención en [OK].
  // -----------------------------------------------------------------------
  const shouldTriggerCarrilB = !isColonIntro && Boolean(carrilBStats?.enabled) && (
    carrilBStats.mode === 'always_gap' ? coverageEntry.isGap : coverageEntry.severity === 'CRITICO'
  );


  if (shouldTriggerCarrilB) {
    const trackBRes = await runTrackBParagraph({
      bankState,
      paragraphIndex,
      rawPara,
      atoms,
      frame,
      currentAnchor,
      paraTopology,
      usedDonorIds,
      usedDomainsCount,
      activeSubdomains,
      domainId,
      ollamaLazyState,
      activeModel,
      qwenStats,
      carrilBStats,
      auditSteps,
      log,
      coverageEntry,
      reconstructedPara,
      donorsUsedInPara,
      paraInterventionTokens,
      trigramOverlap,
      divergencePct,
      finalLiveEntailment,
      rerankMeta,
      donorSelectionAudit,
      semanticRerankerAudit,
      centering,
      pickedDonors,
      isColonIntro
    });
    reconstructedPara = trackBRes.reconstructedPara;
    paraInterventionTokens = trackBRes.paraInterventionTokens;
    trigramOverlap = trackBRes.trigramOverlap;
    divergencePct = trackBRes.divergencePct;
    coverageEntry = trackBRes.coverageEntry;
    finalLiveEntailment = trackBRes.finalLiveEntailment;
  } else {
    coverageEntry.track = 'CARRIL_A';
  }

  semanticRerankerAudit.donorId = coverageEntry.donorId;
  semanticRerankerAudit.domain = coverageEntry.source;
  semanticRerankerAudit.fitScore = coverageEntry.fitScore;
  semanticRerankerAudit.coverageScore = coverageEntry.coverageScore;
  semanticRerankerAudit.severity = coverageEntry.severity;
  semanticRerankerAudit.poolSize = coverageEntry.poolSize;
  semanticRerankerAudit.missingConcepts = coverageEntry.missingConcepts;
  semanticRerankerAudit.gapReasons = coverageEntry.gapReasons;
  semanticRerankerAudit.isBankGap = coverageEntry.isGap;
  semanticRerankerAudit.track = coverageEntry.track;
  semanticRerankerAudit.harvestKeywords = coverageEntry.harvestSpec?.keywords || [];

  return {
    text: reconstructedPara,
    donorsUsedInPara,
    interventionTokens: paraInterventionTokens,
    trigramOverlap,
    divergencePct,
    coverageEntry
  };
}

module.exports = {
  humanizeParagraph
};
