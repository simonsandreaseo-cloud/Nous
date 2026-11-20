'use strict';

const ollamaClient = require('../../local-llm-ollama/ollama-local-client.cjs');
const bankGapTracker = require('../../donor-bank/bank-coverage-gap-tracker.cjs');
const enterpriseRetriever = require('../../donor-bank/hybrid-donor-retriever.cjs');
const discourseTopology = require('../../text-analysis/discourse-topology-analyzer.cjs');
const factualGuard = require('../../text-analysis/factual-entailment-guard.cjs');
const { computeNGramOverlapRatio, countTokenDelta } = require('../../text-analysis/draft-preprocessor.cjs');
const { findAllCorpusOverlaps } = require('../../anti-plagiarism-and-quality/corpus-shingle-scanner.cjs');
const { applyCentralGrammaticalSurgery } = require('../../anti-plagiarism-and-quality/symbolic-shingle-breaker.cjs');
const { commitChosenDonors } = require('../../donor-selection/centering-dag-router.cjs');
const { enforceBrandSku } = require('../track-a-donor-grafting/donor-slot-filler.cjs');
const { cleanQwenResponse } = require('../track-a-donor-grafting/collocational-llm-grafter.cjs');
const carrilBEditor = require('./guided-structural-transfer.cjs');

async function runTrackBParagraph({
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
}) {
    log(`[CARRIL_B] Activado en P${paragraphIndex} (${coverageEntry.severity}, cob=${coverageEntry.coverageScore}%) -> buscando andamio humano estructural...`);

    if (ollamaLazyState && !ollamaLazyState.checked) {
      const srv = await ollamaClient.ensureServerRunning(log);
      ollamaLazyState.checked = true;
      if (srv.available) {
        const names = (srv.models || []).map(m => m.name);
        const targetReq = ollamaLazyState.requestedModel || activeModel || 'qwen2.5:1.5b';
        const resolved = names.includes(targetReq)
          ? targetReq
          : (names.includes('qwen2.5:1.5b')
              ? 'qwen2.5:1.5b'
              : (names.includes('qwen2.5:0.5b') ? 'qwen2.5:0.5b' : names.find(n => n.toLowerCase().includes('qwen'))));
        if (resolved) {
          ollamaLazyState.available = true;
          ollamaLazyState.model = resolved;
          if (qwenStats) {
            qwenStats.enabled = true;
            qwenStats.activeModel = resolved;
          }
        }
      }
    }

    if (!ollamaLazyState?.available || !ollamaLazyState?.model) {
      carrilBStats.offline += 1;
      coverageEntry.track = 'CARRIL_B_OFFLINE_FALLBACK';
      log(`[CARRIL_B_OFFLINE] Ollama/Qwen no disponible para P${paragraphIndex}. Conservado fallback seguro de Carril A.`);
      auditSteps.push({
        stage: 'CARRIL_B_GUIDED_TRANSFER',
        status: 'OFFLINE_FALLBACK',
        model: ollamaLazyState?.requestedModel || activeModel,
        reason: 'Ollama o modelo Qwen local no disponible; conservado el borrador seguro de Carril A.'
      });
    } else {
      const carrilBRes = await carrilBEditor.runCarrilBForParagraph({
        rawPara,
        atoms,
        frame,
        heading: currentAnchor || '',
        paraTopology,
        masterBricks: bankState.masterBricks,
        usedDonorIds,
        factualGuard,
        discourseTopology,
        enterpriseRetriever,
        domainId,
        activeSubdomains,
        ollamaClient,
        cleanResponseFn: (r) => cleanQwenResponse(r),
        modelName: ollamaLazyState.model,
        baselineEntailment: finalLiveEntailment,
        qwenStats,
        log
      });

      if (carrilBRes.approved && carrilBRes.text) {
        let cbText = enforceBrandSku(carrilBRes.text, atoms);
        const cbOverlaps = findAllCorpusOverlaps(bankState, cbText, [carrilBRes.scaffold.brick], 7);
        if (cbOverlaps.length > 0) {
          const cbSurg = applyCentralGrammaticalSurgery(bankState, cbText, [carrilBRes.scaffold.brick], atoms, 7, log, auditSteps);
          const postSurgJudge = carrilBEditor.judgeCarrilBCandidate({
            candidate: cbSurg.text,
            donorBase: carrilBRes.scaffold.cleanText,
            rawPara,
            atoms,
            heading: currentAnchor || '',
            factualGuard,
            discourseTopology,
            paraTopology,
            domainId,
            activeSubdomains,
            baselineEntailment: finalLiveEntailment
          });
          if (postSurgJudge.approved) {
            cbText = cbSurg.text;
          }
        }

        reconstructedPara = cbText;
        paraInterventionTokens = countTokenDelta(carrilBRes.scaffold.cleanText, reconstructedPara);
        commitChosenDonors([{ brick: carrilBRes.scaffold.brick, domain: carrilBRes.scaffold.domain }], usedDonorIds, usedDomainsCount);
        donorsUsedInPara.length = 0;
        donorsUsedInPara.push(carrilBRes.scaffold.brick);

        finalLiveEntailment = factualGuard.evaluateFactualEntailment(
          rawPara,
          reconstructedPara,
          atoms?.discriminativeAnchors,
          atoms?.signedPolarity
        );
        const cbFit = finalLiveEntailment.isHonestFactualGap
          ? Math.min(6, Math.max(4, Math.round(finalLiveEntailment.entailmentScore / 15)))
          : Math.min(10, Math.max(8, Math.round((carrilBRes.judge.score + 10) / 10)));

        rerankMeta.fitScore = cbFit;
        donorSelectionAudit.donor_id = carrilBRes.scaffold.brick.brick_id;
        donorSelectionAudit.source = `${carrilBRes.scaffold.domain} (Carril B)`;
        donorSelectionAudit.fitScore = cbFit;
        donorSelectionAudit.skeleton = carrilBRes.scaffold.cleanText;
        trigramOverlap = computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
        divergencePct = Number(((1 - trigramOverlap) * 100).toFixed(1));

        coverageEntry = bankGapTracker.evaluateParagraphCoverage({
          paragraphIndex,
          heading: currentAnchor || '(Introducción)',
          frame,
          isColonIntro,
          rawPara,
          atoms,
          donorText: reconstructedPara,
          donorId: carrilBRes.scaffold.brick.brick_id,
          source: `${carrilBRes.scaffold.domain} [Carril B]`,
          poolSize: centering.rawCoherentPoolSize ?? (centering.topCandidates?.length || pickedDonors.length),
          semScore: Math.max(pickedDonors[0]?.brick?._semScore ?? 0, carrilBRes.scaffold.scaffoldScore),
          matchedTerms: pickedDonors[0]?.brick?._matchedTerms || [],
          fitScore: cbFit,
          chosenRank: 1,
          candidateCount: carrilBRes.attempts.length,
          usedReranker: true,
          rerankReason: `Carril B Aprobado (LCS=${carrilBRes.judge.metrics.functionSkeletonLCS}, Entail=${finalLiveEntailment.entailmentScore}%, SrcMask3g=${carrilBRes.judge.metrics.maskedSourceTrigramOverlap})`,
          qwenAttempts: carrilBRes.attempts.length,
          rotatedCandidate: carrilBRes.attempts.some(a => a.attempt >= 3),
          crossArticleReuseCount: 0,
          entailmentAudit: finalLiveEntailment
        });
        coverageEntry.track = 'CARRIL_B_APROBADO';
        coverageEntry.resolvedByCarrilB = true;
        coverageEntry.carrilBMetrics = carrilBRes.judge.metrics;

        carrilBStats.approved += 1;
        carrilBStats.lcsSamples.push(carrilBRes.judge.metrics.functionSkeletonLCS);

        auditSteps.push({
          stage: 'CARRIL_B_GUIDED_TRANSFER',
          status: 'APPROVED',
          model: ollamaLazyState.model,
          scaffoldId: carrilBRes.scaffold.brick.brick_id,
          scaffoldDomain: carrilBRes.scaffold.domain,
          scaffoldMatch: carrilBRes.scaffold.matchSummary,
          scaffoldText: carrilBRes.scaffold.cleanText,
          attemptsCount: carrilBRes.attempts.length,
          attempts: carrilBRes.attempts,
          metrics: carrilBRes.judge.metrics,
          resultText: reconstructedPara,
          reason: `Transferencia guiada aprobada por Juez Mecánico (LCS=${carrilBRes.judge.metrics.functionSkeletonLCS}, Entail=${carrilBRes.judge.metrics.entailmentScore}%, SrcMask3g=${carrilBRes.judge.metrics.maskedSourceTrigramOverlap}).`
        });
      } else {
        carrilBStats.rejected += 1;
        const failedList = carrilBRes.judge?.failedGates || [carrilBRes.status];
        coverageEntry.track = 'CARRIL_B_RECHAZADO_FALLBACK';
        coverageEntry.carrilBFailedGates = failedList;
        log(`[CARRIL_B_FALLBACK] P${paragraphIndex} rechazado tras ${carrilBRes.attempts.length} intentos (${failedList.join(', ')}). Conservado fallback seguro de Carril A.`);

        auditSteps.push({
          stage: 'CARRIL_B_GUIDED_TRANSFER',
          status: carrilBRes.status || 'REJECTED_FALLBACK',
          model: ollamaLazyState.model,
          scaffoldId: carrilBRes.scaffold?.brick?.brick_id || null,
          scaffoldDomain: carrilBRes.scaffold?.domain || null,
          scaffoldMatch: carrilBRes.scaffold?.matchSummary || null,
          scaffoldText: carrilBRes.scaffold?.cleanText || null,
          attemptsCount: carrilBRes.attempts.length,
          attempts: carrilBRes.attempts,
          failedGates: failedList,
          bestScore: carrilBRes.judge?.score ?? null,
          reason: `Juez Mecánico rechazó todos los intentos (${failedList.join(', ')}); conservado borrador seguro de Carril A.`
        });
      }
    }

  return {
    reconstructedPara,
    paraInterventionTokens,
    trigramOverlap,
    divergencePct,
    coverageEntry,
    finalLiveEntailment
  };
}

module.exports = {
  runTrackBParagraph
};
