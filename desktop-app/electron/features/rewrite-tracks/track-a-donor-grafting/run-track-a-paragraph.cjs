'use strict';

const factualGuard = require('../../text-analysis/factual-entailment-guard.cjs');
const { countTokenDelta } = require('../../text-analysis/draft-preprocessor.cjs');
const { classifyParagraph } = require('../../text-analysis/davidsonian-atom-extractor.cjs');
const { getBrickProfile } = require('./donor-skeleton-cleaner.cjs');
const { fillSlotsInBrick, healProDropSubject, buildDonorGraftedDraft } = require('./donor-slot-filler.cjs');
const { atomizeWithQwen, compileCollocationalWithQwen, validateQwenGraft, analyzeAlterations } = require('./collocational-llm-grafter.cjs');
const { searchDonorBricksForParagraph } = require('../../donor-selection/donor-candidate-search.cjs');
const { solveCenteringDAGWithDijkstra, commitChosenDonors } = require('../../donor-selection/centering-dag-router.cjs');
const { rerankCandidatesNeurosymbolic, rerankCandidatesWithQwen } = require('../../donor-selection/donor-candidate-reranker.cjs');

async function runTrackAParagraph({
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
  usageLedger = null,
  articleState = null,
  paraTopology = null,
  domainId = 'optica',
  activeSubdomains = null
}) {
  const donorsUsedInPara = [];
  let paraInterventionTokens = 0;

  // -----------------------------------------------------------------------
  // PROCESO QWEN #1: Atomización Proposicional de Davidson (Selectiva en puentes cortos)
  // -----------------------------------------------------------------------
  let extractedFacts = '';
  const inputWordCount = rawPara.split(/\s+/).filter(Boolean).length;
  const hasBrandSku = Boolean(atoms?.brand_models?.length);
  const shouldUseFastSymbolicAtomization = frame === 'TRANSITION_CURATION' || (inputWordCount < 42 && !hasBrandSku);

  if (useLocalLLM && !shouldUseFastSymbolicAtomization) {
    try {
      const atomRes = await atomizeWithQwen(rawPara, atoms, frame, currentAnchor, activeModel, log, qwenStats);
      extractedFacts = atomRes.rawResponse;
      auditSteps.push({
        stage: 'QWEN_ATOMIZATION',
        model: atomRes.model,
        durationMs: atomRes.durationMs,
        evalCount: atomRes.evalCount,
        prompt: atomRes.prompt,
        rawResponse: atomRes.rawResponse,
        atomsSummary: extractedFacts,
        frame
      });
    } catch (err) {
      qwenStats.failures += 1;
      log(`[QWEN_FASE_1_ERROR] ${err.message} — usando fallback de átomos deterministas.`);
    }
  } else {
    const fastSentences = rawPara.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    extractedFacts = fastSentences.join(' ');
    log(`[QWEN_FASE_1_ATOMIZACION] Modo simbólico rápido (párrafo puente corto de ${inputWordCount} palabras, 0ms)`);
    for (const fs of fastSentences) {
      log(`[QWEN_FASE_1_RESULTADO] ${fs}`);
    }
    auditSteps.push({
      stage: 'QWEN_ATOMIZATION',
      model: 'symbolic-fast-path',
      durationMs: 0,
      evalCount: 0,
      prompt: '(omitido en párrafo puente corto)',
      rawResponse: extractedFacts,
      atomsSummary: extractedFacts,
      frame
    });
  }

  // -----------------------------------------------------------------------
  // FASE 2 & FASE 3: Selección 3 Capas (TF-IDF+Conceptos -> Filtros -> Reranker Qwen) + DAG
  // -----------------------------------------------------------------------
  const isColonIntro = frame === 'TRANSITION_CURATION' || rawPara.trim().endsWith(':');
  const centering = solveCenteringDAGWithDijkstra(bankState, {
    tuples: tuples && tuples.length ? tuples : [{ id: 'p1', subFrame: frame, requiredSlots: [], argCount: 1, expectedCf: 'FRAME_ENTITY', rawClause: rawPara }],
    atoms,
    frame,
    currentAnchor,
    isFirstAfterHeading,
    usedDonorIds,
    usedDomainsCount,
    usedHinges,
    rawPara,
    deferCommit: true,
    usageLedger,
    paraTopology,
    articleMacroStyle: articleState?.articleMacroStyle || 'general_editorial',
    domainId,
    activeSubdomains
  });

  let pickedDonors = centering.chosenNodes || [];
  const estimateFitFromSem = (node) => {
    const s = node?.brick?._semScore || 0;
    return Math.min(9, Math.max(3, Math.round(3 + s / 4.5)));
  };
  let rerankMeta = {
    usedReranker: false,
    candidateCount: centering.topCandidates?.length || pickedDonors.length,
    chosenRank: 1,
    fitScore: estimateFitFromSem(pickedDonors[0]),
    reason: 'Selección determinista TF-IDF + clústeres conceptuales',
    durationMs: 0,
    poolSummary: (centering.topCandidates || pickedDonors).map((n, idx) => ({
      rank: idx + 1,
      brick_id: n.brick.brick_id,
      domain: n.domain,
      score: n.score,
      semScore: n.brick._semScore || 0
    }))
  };

  let lastEntailmentAudit = null;
  if (centering.topCandidates && centering.topCandidates.length >= 2) {
    const rerankRes = (options?.useQwenReranker === true && useLocalLLM)
      ? await rerankCandidatesWithQwen({
          candidates: centering.topCandidates,
          rawPara,
          currentAnchor,
          frame,
          atoms,
          tuples,
          extractedFacts,
          modelName: activeModel,
          log,
          qwenStats,
          isColonIntro,
          centeringCb: centering.cb
        })
      : rerankCandidatesNeurosymbolic({
          candidates: centering.topCandidates,
          rawPara,
          currentAnchor,
          frame,
          atoms,
          isColonIntro,
          articleState,
          paraTopology,
          log
        });
    if (rerankRes && rerankRes.chosenNode) {
      pickedDonors = [rerankRes.chosenNode];
      lastEntailmentAudit = rerankRes.entailmentAudit || null;
      centering.chosenNodes = pickedDonors;
      centering.transitions = [rerankRes.chosenNode.transition || centering.transitionType];
      centering.transitionType = centering.transitions[0];
      centering.hasProDrop = Boolean(rerankRes.chosenNode.profile?.hasProDrop);
      centering.optimalCost = rerankRes.chosenNode.totalCost ?? centering.optimalCost;
      rerankMeta = {
        usedReranker: true,
        mode: rerankRes.mode || 'qwen',
        candidateCount: rerankRes.candidateCount,
        chosenRank: rerankRes.chosenRank,
        fitScore: rerankRes.fitScore,
        reason: rerankRes.reason,
        durationMs: rerankRes.durationMs || 0,
        poolSummary: rerankRes.poolSummary || []
      };
    }
  }

  const buildDraftForNodes = (nodesList) => {
    const pieces = [];
    let healedAny = false;
    for (let idx = 0; idx < (nodesList || []).length; idx++) {
      const b = nodesList[idx]?.brick || nodesList[idx];
      if (!b) continue;
      let piece = fillSlotsInBrick(b, atoms, frame, tuples?.[idx] || null, rawPara);
      const pieceFirstSent = (piece || '').split(/(?<=[.!?])\s+/)[0] || piece || '';
      const hasExplicitSubject = /\b(?:modelo|diseño|gafa|gafas|montura|monturas|silueta|lentes|cristales|acetato|metal|ray-ban|persol|chlo[eé]|gucci|prada|oakley)\b/i.test(pieceFirstSent);
      if (idx === 0 && piece && !hasExplicitSubject && frame !== 'AUDIOLOGY' && frame !== 'CLINICAL_OPHTHALMOLOGY' && getBrickProfile(b).hasProDrop) {
        const healed = healProDropSubject(piece, centering.cb, atoms);
        if (healed.healed) {
          piece = healed.text;
          healedAny = true;
        }
      }
      if (piece) pieces.push(piece);
    }
    const draft = buildDonorGraftedDraft({
      skeletonPieces: pieces,
      tuples,
      atoms,
      extractedFacts,
      frame,
      centering,
      endsWithColon: isColonIntro
    });
    return { pieces, healedAny, draft };
  };

  const initialBuild = buildDraftForNodes(pickedDonors);
  let proDropHealed = initialBuild.healedAny;
  const skeletonPieces = initialBuild.pieces;

  for (const tr of (centering.transitions || [])) {
    if (tr && centeringTransitions[tr] !== undefined) centeringTransitions[tr] += 1;
  }

  for (const n of pickedDonors) {
    donorsUsedInPara.push(n.brick);
  }

  const donorsMeta = pickedDonors.length
    ? pickedDonors.map(n => `${n.brick.brick_id} (${n.domain}, ${n.brick.frame}, score:${n.score}, sem:${n.brick._semScore || 0}, encaje:${rerankMeta.fitScore}/10)`).join(' + ')
    : 'fallback_sintactico';

  const combinedSkeleton = skeletonPieces.length
    ? skeletonPieces.join(' ')
    : '(molde sintáctico compacto)';

  log(`[FASE_2_DONANTE] Seleccionado(s): ${donorsMeta}`);
  log(`[FASE_2_ESQUELETO] "${combinedSkeleton}"`);
  log(`[FASE_3_CENTERING] Ancla Cb: "${centering.cb}" | Ruta DAG Dijkstra (${(tuples || []).length} capas, coste: ${centering.optimalCost}): [${donorsUsedInPara.map(b => b.brick_id).join(' -> ') || 'fallback'}] | Transiciones: [${(centering.transitions || []).join(' -> ')}] | Pro-Drop sanado: ${proDropHealed ? 'SÍ' : 'NO'}${centering.hinge ? ` | Bisagra: "${centering.hinge}"` : ''} | Dominios acumulados K: ${usedDomainsCount.size}`);

  const donorSelectionAudit = {
    stage: 'DONOR_SELECTION',
    donor_id: donorsUsedInPara.map(b => b.brick_id).join(', ') || 'ninguno',
    frame,
    score: pickedDonors[0]?.score ?? 0,
    semScore: pickedDonors[0]?.brick?._semScore ?? 0,
    matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
    fitScore: rerankMeta.fitScore,
    source: donorsUsedInPara.map(b => b.source_domain || 'corpus pre-2022').join(', ') || 'motor simbólico',
    skeleton: combinedSkeleton,
    reason: `Emparejamiento semántico en 3 capas (TF-IDF + clústeres + filtros de coherencia${rerankMeta.usedReranker ? ' + Juez Qwen' : ''}) sobre banco biológico pre-2022.`
  };
  auditSteps.push(donorSelectionAudit);

  const semanticRerankerAudit = {
    stage: 'SEMANTIC_RERANKER',
    usedReranker: rerankMeta.usedReranker,
    candidateCount: rerankMeta.candidateCount,
    chosenRank: rerankMeta.chosenRank,
    donorId: donorsUsedInPara.map(b => b.brick_id).join(' + ') || 'fallback',
    domain: pickedDonors[0]?.domain || 'corpus',
    semScore: pickedDonors[0]?.brick?._semScore ?? 0,
    fitScore: rerankMeta.fitScore,
    isBankGap: (rerankMeta.fitScore ?? 10) <= 6,
    durationMs: rerankMeta.durationMs || 0,
    poolSummary: rerankMeta.poolSummary,
    reason: rerankMeta.reason
  };
  auditSteps.push(semanticRerankerAudit);

  auditSteps.push({
    stage: 'CENTERING_SOLVER',
    anchor: centering.cb,
    transitionType: centering.transitionType,
    transitions: centering.transitions,
    dagCost: centering.optimalCost,
    pathDonors: donorsUsedInPara.map(b => b.brick_id),
    proDropHealed,
    hasProDrop: centering.hasProDrop || proDropHealed,
    hinge: centering.hinge,
    reason: 'Camino óptimo resuelto con Dijkstra sobre Grafo Acíclico Dirigido (Cb/Cf/Cp), dispersión multifuente y sanación Pro-Drop.'
  });

  // Construir borrador injertado exclusivamente sobre moldes pre-2022 + hechos atómicos (CERO rawPara; sin degradar antes de Qwen)
  let graftedDonorDraft = initialBuild.draft;
  let preFilledSkeleton = graftedDonorDraft;

  if (centering.hinge) {
    paraInterventionTokens += centering.hinge.split(/\s+/).filter(Boolean).length;
  }

  // -----------------------------------------------------------------------
  // PROCESO QWEN #2: Compilador Colocacional y Sanación (estrictamente sobre graftedDonorDraft)
  // -----------------------------------------------------------------------
  let reconstructedPara = '';
  let usedQwenGraft = false;
  let rotatedCandidate = false;
  let qwenAttemptsUsed = 0;

  if (isColonIntro) {
    reconstructedPara = graftedDonorDraft;
    if (rawPara.trim().endsWith(':') && !reconstructedPara.trim().endsWith(':')) {
      reconstructedPara = reconstructedPara.replace(/[.!?]+$/, '') + ':';
    }
    commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
    log(`[QWEN_FASE_4_INJERTO] Blindaje estructural de transición con dos puntos (:) aplicado — ensamblaje sobre molde pre-2022 sin rawPara.`);
    log(`[QWEN_FASE_4_ENTRADA_ESQUELETO] "${graftedDonorDraft}"`);
    log(`[QWEN_FASE_4_RESULTADO] ${reconstructedPara}`);
    auditSteps.push({
      stage: 'QWEN_COLLOCATIONAL_GRAFT',
      model: 'symbolic-colon-shield',
      durationMs: 0,
      evalCount: 0,
      donorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
      preFilledSkeleton,
      rawResponse: reconstructedPara,
      reason: 'Párrafo introductorio cerrado en dos puntos (:) reconstruido sobre molde pre-2022 sin copiar sintaxis de entrada.'
    });
  } else if (useLocalLLM) {
    const maxAttemptsPerCandidate = 5;
    const totalMaxAttempts = 10;
    const primaryId = pickedDonors[0]?.brick?.brick_id;
    const candidateQueue = [pickedDonors];
    const altNode = (centering.topCandidates || []).find(c => c?.brick?.brick_id && c.brick.brick_id !== primaryId);
    if (altNode) {
      candidateQueue.push([altNode]);
    }

    let acceptedGraft = null;
    let lastFailureReason = null;
    const attemptHistory = [];
    const tempSchedule = [0.08, 0.16, 0.28, 0.05, 0.35, 0.22, 0.42, 0.12, 0.38, 0.30];
    let globalAttempt = 0;

    for (let qIdx = 0; qIdx < candidateQueue.length && !acceptedGraft; qIdx++) {
      const candNodes = candidateQueue[qIdx];
      if (qIdx > 0) {
        rotatedCandidate = true;
        const altBuild = buildDraftForNodes(candNodes);
        pickedDonors = candNodes;
        donorsUsedInPara.length = 0;
        for (const n of pickedDonors) donorsUsedInPara.push(n.brick);
        graftedDonorDraft = altBuild.draft;
        preFilledSkeleton = altBuild.draft;
        lastFailureReason = null;
        const altId = candNodes[0]?.brick?.brick_id || 'fallback';
        const altDom = candNodes[0]?.domain || 'corpus';
        rerankMeta.fitScore = estimateFitFromSem(candNodes[0]);
        rerankMeta.reason = `Alternativa tras 5 descartes en candidato #1 (${altId})`;
        donorSelectionAudit.donor_id = altId;
        donorSelectionAudit.source = altDom;
        donorSelectionAudit.score = candNodes[0]?.score ?? 0;
        donorSelectionAudit.semScore = candNodes[0]?.brick?._semScore ?? 0;
        donorSelectionAudit.fitScore = rerankMeta.fitScore;
        donorSelectionAudit.skeleton = altBuild.pieces.join(' ');
        semanticRerankerAudit.donorId = altId;
        semanticRerankerAudit.domain = altDom;
        semanticRerankerAudit.semScore = candNodes[0]?.brick?._semScore ?? 0;
        semanticRerankerAudit.fitScore = rerankMeta.fitScore;
        semanticRerankerAudit.isBankGap = (rerankMeta.fitScore ?? 10) <= 6;
        log(`[QWEN_FASE_4_ROTACION] Rotando a donante alternativo ${altId} (${altDom}) tras ${maxAttemptsPerCandidate} descartes en candidato previo.`);
      }

      const candBudget = candidateQueue.length > 1 ? maxAttemptsPerCandidate : totalMaxAttempts;
      for (let localTry = 1; localTry <= candBudget && globalAttempt < totalMaxAttempts; localTry++) {
        globalAttempt++;
        const currentTemp = tempSchedule[(globalAttempt - 1) % tempSchedule.length];
        try {
          const graftRes = await compileCollocationalWithQwen({
            graftedDonorDraft,
            endsWithColon: false,
            atoms,
            centering,
            currentAnchor,
            frame,
            modelName: activeModel,
            log,
            qwenStats,
            attempt: globalAttempt,
            temperature: currentTemp,
            feedback: lastFailureReason
          });

          const check = validateQwenGraft(graftRes.text, rawPara, atoms, graftedDonorDraft, frame, currentAnchor);
          const auditMetrics = analyzeAlterations(graftRes.text, graftedDonorDraft, atoms);

          attemptHistory.push({
            attempt: globalAttempt,
            candidateDonorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
            temperature: currentTemp,
            text: graftRes.text,
            valid: check.ok,
            reason: check.ok ? 'Aceptado' : check.reason,
            metrics: auditMetrics
          });

          if (check.ok) {
            acceptedGraft = graftRes;
            acceptedGraft.auditMetrics = auditMetrics;
            acceptedGraft.attemptNumber = globalAttempt;
            acceptedGraft.totalAttempts = globalAttempt;
            log(`[QWEN_FASE_4_EXITO] Intento ${globalAttempt}/${totalMaxAttempts} ACEPTADO (Alteración: ${(auditMetrics.alterationRate).toFixed(1)}% | ${auditMetrics.typeSummary}).`);
            break;
          } else {
            lastFailureReason = check.reason;
            log(`[QWEN_FASE_4_REINTENTO] Intento ${globalAttempt}/${totalMaxAttempts} descartado (${check.reason}). Preparando reintento...`);
          }
        } catch (err) {
          qwenStats.failures += 1;
          lastFailureReason = err.message;
          log(`[QWEN_FASE_4_ERROR] Intento ${globalAttempt}/${totalMaxAttempts} falló (${err.message}).`);
        }
      }
    }

    if (acceptedGraft) {
      qwenAttemptsUsed = acceptedGraft.totalAttempts || globalAttempt;
      commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
      reconstructedPara = acceptedGraft.text;
      usedQwenGraft = true;
      auditSteps.push({
        stage: 'QWEN_COLLOCATIONAL_GRAFT',
        model: acceptedGraft.model,
        durationMs: acceptedGraft.durationMs,
        evalCount: acceptedGraft.evalCount,
        donorId: donorsUsedInPara.map(b => b.brick_id).join(' + '),
        preFilledSkeleton,
        rawResponse: acceptedGraft.text,
        attemptsCount: acceptedGraft.totalAttempts,
        attemptHistory,
        alterationMetrics: acceptedGraft.auditMetrics,
        reason: `Pulido morfosintáctico completado en intento ${acceptedGraft.attemptNumber}/${totalMaxAttempts}.`
      });
    } else {
      // Regla estricta: Si tras agotar los 10 intentos Qwen sigue dando resultados no conformes,
      // PROHIBIDO usar el donante tal cual (evita falsos positivos o incoherencias).
      // El proceso falla explícitamente y detiene la compilación.
      const lastErr = lastFailureReason || 'Validación morfosintáctica no superada';
      log(`[QWEN_FASE_4_FALLO_CRITICO] El párrafo no logró una salida válida tras ${globalAttempt} intentos. Motivo final: ${lastErr}. Proceso abortado para evitar falsos positivos.`);
      const err = new Error(`Fallo crítico en humanización: Tras ${globalAttempt} intentos, Qwen no generó una concordancia morfosintáctica conforme a las restricciones del Bluepaper (Último error: ${lastErr}).`);
      err.attemptHistory = attemptHistory;
      throw err;
    }
  }

  if (!isColonIntro && !usedQwenGraft) {
    if (!lastEntailmentAudit) {
      lastEntailmentAudit = factualGuard.evaluateFactualEntailment(rawPara, graftedDonorDraft, atoms?.discriminativeAnchors, atoms?.signedPolarity);
    }

    // Voice-Locked 2-Clause Adversative Pivot Composition (solo si el donante monolítico deja hueco fáctico real)
    if (lastEntailmentAudit?.isHonestFactualGap) {
      const pivot = factualGuard.detectAdversativePivot(rawPara);
      if (pivot.hasPivot) {
        const { type: frameL, atoms: atomsL } = classifyParagraph(pivot.leftClause, currentAnchor);
        const { type: frameR, atoms: atomsR } = classifyParagraph(pivot.rightClause, currentAnchor);
        const searchOptsBase = {
          paragraphMode: false,
          minWindowWords: 12,
          maxWindowWords: 45,
          currentAnchor,
          usageLedger,
          articleMacroStyle: articleState?.articleMacroStyle || 'general_editorial',
          domainId,
          activeSubdomains
        };
        const framesL = [...new Set([frameL, frame, 'OPTICAL_PROTECTION', 'MATERIAL_COMPOSITION', 'GENERAL_STYLE'])];
        const candsL = searchDonorBricksForParagraph(bankState, framesL, atomsL, pivot.leftClause, usedDonorIds, 8, null, frame, { ...searchOptsBase, isFirstAfterHeading });
        if (candsL.length > 0) {
          const nodeL = candsL[0];
          const leftId = nodeL.brick.brick_id;
          const leftPersona = nodeL.brick._narrativePersona || 'IMPERSONAL_THIRD';
          const excludeForRight = new Set([...usedDonorIds, leftId]);
          const framesR = [...new Set([frameR, frame, 'OPTICAL_PROTECTION', 'MATERIAL_COMPOSITION', 'GENERAL_STYLE'])];
          const candsR = searchDonorBricksForParagraph(bankState, framesR, atomsR, pivot.rightClause, excludeForRight, 12, null, frame, { ...searchOptsBase, isFirstAfterHeading: false });
          const nodeR = candsR.find(cr => {
            const rp = cr.brick._narrativePersona || 'IMPERSONAL_THIRD';
            return leftPersona === 'IMPERSONAL_THIRD' || rp === 'IMPERSONAL_THIRD' || rp === leftPersona;
          }) || candsR[0];

          if (nodeR) {
            const leftText = fillSlotsInBrick(nodeL.brick, atomsL, frameL, null, pivot.leftClause);
            const rightText = fillSlotsInBrick(nodeR.brick, atomsR, frameR, null, pivot.rightClause);
            if (leftText && rightText) {
              const trimL = leftText.trim();
              const trimR = rightText.trim();
              const keepFirstUpper = /^(?:Chlo[eé]|Gucci|Persol|Ray-?Ban|Oakley|Prada|Dior|LCD|UV)\b/.test(trimR);
              const joinedRight = keepFirstUpper ? trimR : (trimR.charAt(0).toLowerCase() + trimR.slice(1));
              const inlineConn = (pivot.connector === 'pero' || pivot.connector === 'aunque') && /\.\s*$/.test(trimL);
              let composedText;
              if (inlineConn) {
                composedText = `${trimL.replace(/\.+$/, '')}, ${pivot.connector} ${joinedRight}`;
              } else {
                const leftEnded = /[.!?]$/.test(trimL) ? trimL : `${trimL}.`;
                const capConn = pivot.connector.charAt(0).toUpperCase() + pivot.connector.slice(1);
                composedText = `${leftEnded} ${capConn}, ${joinedRight}`;
              }

              const composedEntail = factualGuard.evaluateFactualEntailment(rawPara, composedText, atoms?.discriminativeAnchors, atoms?.signedPolarity);
              if (!composedEntail.polarityContradiction && composedEntail.entailmentScore >= ((lastEntailmentAudit.entailmentScore || 0) + 12)) {
                const nodeLWrap = { brick: nodeL.brick, domain: nodeL.brick.source_domain || 'corpus', score: nodeL.score };
                const nodeRWrap = { brick: nodeR.brick, domain: nodeR.brick.source_domain || 'corpus', score: nodeR.score };
                pickedDonors = [nodeLWrap, nodeRWrap];
                donorsUsedInPara.length = 0;
                donorsUsedInPara.push(nodeL.brick, nodeR.brick);
                graftedDonorDraft = composedText;
                lastEntailmentAudit = composedEntail;

                const dualFit = composedEntail.isHonestFactualGap
                  ? Math.min(5, Math.max(2, Math.round(composedEntail.entailmentScore / 10)))
                  : Math.min(10, Math.max(6, Math.round(composedEntail.entailmentScore / 10)));
                rerankMeta.fitScore = dualFit;
                rerankMeta.reason = `Composición 2-cláusulas (${pivot.connector}) | entail=${composedEntail.entailmentScore}%`;
                donorSelectionAudit.donor_id = `${leftId}, ${nodeR.brick.brick_id}`;
                donorSelectionAudit.source = `${nodeLWrap.domain}, ${nodeRWrap.domain}`;
                donorSelectionAudit.fitScore = dualFit;
                donorSelectionAudit.skeleton = composedText;
                semanticRerankerAudit.donorId = `${leftId} + ${nodeR.brick.brick_id}`;
                semanticRerankerAudit.fitScore = dualFit;
                log(`[FASE_3_PIVOT_2CLAUSULAS] Pivote "${pivot.connector}" activado -> ${leftId} + ${nodeR.brick.brick_id} (entail=${composedEntail.entailmentScore}%, fit=${dualFit}/10)`);
              }
            }
          }
        }
      }
    }

    commitChosenDonors(pickedDonors, usedDonorIds, usedDomainsCount);
    reconstructedPara = graftedDonorDraft;
  }

  return {
    reconstructedPara,
    donorsUsedInPara,
    pickedDonors,
    centering,
    rerankMeta,
    donorSelectionAudit,
    semanticRerankerAudit,
    lastEntailmentAudit,
    isColonIntro,
    qwenAttemptsUsed,
    rotatedCandidate,
    paraInterventionTokens,
    usedQwenGraft
  };
}

module.exports = {
  runTrackAParagraph
};
