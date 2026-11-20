'use strict';

const fs = require('fs');
const ollamaClient = require('../local-llm-ollama/ollama-local-client.cjs');
const domainRegistry = require('../donor-bank/domain-packs-registry.cjs');
const bankGapTracker = require('../donor-bank/bank-coverage-gap-tracker.cjs');
const {
  createDonorBankState,
  loadBanks,
  computeUsableCleanBlocksCount,
  getBankStats,
  reloadBanks
} = require('../donor-bank/donor-bank-loader.cjs');
const discourseTopology = require('../text-analysis/discourse-topology-analyzer.cjs');
const factualGuard = require('../text-analysis/factual-entailment-guard.cjs');
const {
  tokenize,
  isHeading,
  humanizeHeading,
  neutralizeAiCliches,
  computeNGramOverlapRatio
} = require('../text-analysis/draft-preprocessor.cjs');
const {
  extractDavidsonianAtoms,
  classifyParagraph,
  deconstructToDavidsonianTuples
} = require('../text-analysis/davidsonian-atom-extractor.cjs');
const {
  findAllCorpusOverlaps,
  calculateBurstiness,
  checkPlagiarismShingles,
  computeBluepaperTelemetry
} = require('../anti-plagiarism-and-quality/corpus-shingle-scanner.cjs');
const { applySymbolicShingleBreaker } = require('../anti-plagiarism-and-quality/symbolic-shingle-breaker.cjs');
const { sanitizeDonorSkeleton, applySpanishSlotAgreement } = require('../rewrite-tracks/track-a-donor-grafting/donor-skeleton-cleaner.cjs');
const { fillSlotsInBrick, buildDonorGraftedDraft } = require('../rewrite-tracks/track-a-donor-grafting/donor-slot-filler.cjs');
const { cleanQwenResponse, validateQwenGraft } = require('../rewrite-tracks/track-a-donor-grafting/collocational-llm-grafter.cjs');
const { humanizeParagraph } = require('./humanize-paragraph.cjs');

class HumanizationEngineFacade {
  constructor() {
    this.bankState = createDonorBankState();
  }

  get isLoaded() { return this.bankState.isLoaded; }
  get masterBricks() { return this.bankState.masterBricks; }
  get unifiedCorpusBricks() { return this.bankState.unifiedCorpusBricks; }
  get corpus7GramMap() { return this.bankState.corpus7GramMap; }
  get enableAntiPlagiarism() { return this.bankState.enableAntiPlagiarism; }

  loadBanks() { return loadBanks(this.bankState); }
  computeUsableCleanBlocksCount() { return computeUsableCleanBlocksCount(this.bankState); }
  getBankStats() { return getBankStats(this.bankState); }
  reloadBanks() { return reloadBanks(this.bankState); }

  async humanizeArticle(rawArticleText, options = {}, logCallback = null) {
    const bankState = this.bankState;
    return await runHumanizeArticle(bankState, rawArticleText, options, logCallback);
  }

  // Cohesive helper delegators for IPC & evaluation scripts
  tokenize(text) { return tokenize(text); }
  isHeading(text, paraIndex) { return isHeading(text, paraIndex); }
  humanizeHeading(text) { return humanizeHeading(text); }
  neutralizeAiCliches(text, auditCollector) { return neutralizeAiCliches(text, auditCollector); }
  extractDavidsonianAtoms(text) { return extractDavidsonianAtoms(text); }
  classifyParagraph(text, currentAnchor, activeSubdomains) { return classifyParagraph(text, currentAnchor, activeSubdomains); }
  deconstructToDavidsonianTuples(rawPara, atoms, frame, currentAnchor) { return deconstructToDavidsonianTuples(rawPara, atoms, frame, currentAnchor); }
  sanitizeDonorSkeleton(skeleton, rawText, contextFrame, atoms, rawPara) { return sanitizeDonorSkeleton(skeleton, rawText, contextFrame, atoms, rawPara); }
  applySpanishSlotAgreement(slotType, value, precedingText, localAtoms) { return applySpanishSlotAgreement(slotType, value, precedingText, localAtoms); }
  fillSlotsInBrick(brick, atoms, contextFrame, tuple, rawPara) { return fillSlotsInBrick(brick, atoms, contextFrame, tuple, rawPara); }
  buildDonorGraftedDraft(params) { return buildDonorGraftedDraft(params); }
  cleanQwenResponse(raw) { return cleanQwenResponse(raw); }
  validateQwenGraft(cand, raw, atoms, draft, frame, anchor) { return validateQwenGraft(cand, raw, atoms, draft, frame, anchor); }
  computeNGramOverlapRatio(a, b, n) { return computeNGramOverlapRatio(a, b, n); }
  computeBluepaperTelemetry(params) { return computeBluepaperTelemetry(params); }
  findAllCorpusOverlaps(cand, donors, minLen) { return findAllCorpusOverlaps(this.bankState, cand, donors, minLen); }
  applySymbolicShingleBreaker(text, donors, atoms, used, minLen) { return applySymbolicShingleBreaker(this.bankState, text, donors, atoms, used, minLen); }
  calculateBurstiness(text) { return calculateBurstiness(text); }
  checkPlagiarismShingles(text, minLen) { return checkPlagiarismShingles(this.bankState, text, minLen); }
}

async function runHumanizeArticle(bankState, rawArticleText, options = {}, logCallback = null) {
  const domainId = options.domainId || 'optica';
  const domainPack = domainRegistry.getDomainPack(domainId);
  if (domainId !== 'optica') {
    const customBankPath = domainRegistry.resolveBankFilePath(domainId);
    if (!fs.existsSync(customBankPath)) {
      const subdomainsList = Object.keys(domainPack.subdomains || {}).join(', ');
      const msg = `El nicho "${domainPack.label}" está preparado arquitectónicamente (subdominios: ${subdomainsList}), pero todavía no tiene ladrillos cosechados en "${domainPack.bankDir}/${domainPack.masterBankFile}".`;
      return {
        text: '',
        bankEmptyForDomain: true,
        domainId,
        domainLabel: domainPack.label,
        message: msg,
        paragraphCount: 0,
        wordCount: 0,
        bankCoverageReport: [],
        auditTrail: [],
        metrics: {
          wordCount: 0,
          burstinessSigma: 0,
          plagiarismRunsCount: 0,
          bankCoverageGapsCount: 0,
          criticalGapsCount: 0,
          domainId
        }
      };
    }
  }

  if (!bankState.isLoaded) loadBanks(bankState);
  bankState.enableAntiPlagiarism = options.antiPlagiarism === true;
  const paragraphs = rawArticleText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const allSections = [];
  let activeSecBuilder = {
    headingIndex: -1,
    headingText: '',
    bodyParagraphs: [],
    bodyText: ''
  };
  allSections.push(activeSecBuilder);
  const sectionMetaByParaIndex = new Array(paragraphs.length);
  for (let idx = 0; idx < paragraphs.length; idx++) {
    const p = paragraphs[idx];
    if (isHeading(p, idx)) {
      activeSecBuilder = {
        headingIndex: idx,
        headingText: p,
        bodyParagraphs: [],
        bodyText: ''
      };
      allSections.push(activeSecBuilder);
      sectionMetaByParaIndex[idx] = activeSecBuilder;
    } else {
      activeSecBuilder.bodyParagraphs.push(p);
      sectionMetaByParaIndex[idx] = activeSecBuilder;
    }
  }
  for (const sec of allSections) {
    sec.bodyText = sec.bodyParagraphs.join(' ');
  }
  const articleActiveSubdomains = new Set();
  const sectionSubdomainsLog = [];
  const humanizedParas = [];
  const auditTrail = [];
  const bankCoverageReport = [];
  let currentAnchor = null;
  let isFirstAfterHeading = false;
  let glitchIdx = 0;
  const usedDonorIds = new Set();
  const usedDomainsCount = new Map();
  const allUsedDonorsForArticle = [];
  const usageLedger = options.crossArticleRotation !== false ? bankGapTracker.loadUsageLedger() : null;
  const sectionTopology = discourseTopology.computeSectionTopology(paragraphs, (p, idx) => isHeading(p, idx));
  const articleState = {
    prevOpener2w: null,
    prevPersona: null,
    articleMacroStyle: sectionTopology.articleMacroStyle
  };
  const centeringTransitions = { CONTINUE: 0, RETAIN: 0, SMOOTH_SHIFT: 0, ROUGH_SHIFT: 0 };
  const usedGlitches = new Set();
  const usedHinges = new Set();
  const usedBridgeWords = new Set();
  let totalInterventionTokens = 0;

  const log = (msg) => {
    if (logCallback) {
      logCallback(msg);
    } else {
      console.log(`[NeurosymbolicEngine] ${msg}`);
    }
  };

  const requestedLocalLLM = options.useLocalLLM !== false;
  let activeModel = options.modelName || 'qwen2.5:1.5b';
  let useLocalLLM = false;
  const carrilBMode = options.carrilBMode || (options.enableCarrilB === false ? 'off' : 'auto');
  const carrilBRequested = options.enableCarrilB !== undefined
    ? (options.enableCarrilB !== false && carrilBMode !== 'off')
    : (requestedLocalLLM && carrilBMode !== 'off');

  const qwenStats = {
    enabled: false,
    requestedModel: activeModel,
    activeModel: null,
    calls: 0,
    failures: 0,
    totalDurationMs: 0,
    totalTokens: 0
  };
  const carrilBStats = {
    enabled: Boolean(carrilBRequested),
    mode: carrilBMode,
    triggered: 0,
    approved: 0,
    rejected: 0,
    offline: 0,
    avgSkeletonLCS: null,
    lcsSamples: []
  };
  const ollamaLazyState = {
    checked: false,
    available: false,
    requestedModel: activeModel,
    model: null
  };

  log(`==========================================================================`);
  log(`COMPILADOR BLUEPAPER NOUS: DECONSTRUCCIÓN Y RECONSTRUCCIÓN FÁCTICA PURA`);
  log(`Total párrafos de entrada: ${paragraphs.length} | Caracteres: ${rawArticleText.length}`);
  log(`Bancos activos: ${bankState.masterBricks.length} ladrillos + ${(bankState.unifiedCorpusBricks || []).length} bloques unificados + ${(bankState.goldenMM?.length || 0) + (bankState.goldenOP?.length || 0) + (bankState.goldenVH?.length || 0)} marcos dorados (${bankState.corpus7GramMap?.size || 0} 7-gramas)`);
  log(`Modo Qwen solicitado: ${requestedLocalLLM ? `SÍ (${activeModel})` : 'NO (Modo Determinista)'} | Anti-Plagio: ${bankState.enableAntiPlagiarism ? 'ACTIVO' : 'DESACTIVADO (Humanización Pura)'} | Anti-Outro: ${options.antiOutro !== false} | Glitches: ${options.injectGlitches !== false}`);

  if (requestedLocalLLM) {
    const serverState = await ollamaClient.ensureServerRunning(log);
    if (serverState.available) {
      const installedNames = (serverState.models || []).map(m => m.name);
      if (installedNames.includes(activeModel)) {
        useLocalLLM = true;
      } else if (installedNames.includes('qwen2.5:0.5b')) {
        log(`[OLLAMA] Modelo "${activeModel}" no instalado. Fallback automático a "qwen2.5:0.5b".`);
        activeModel = 'qwen2.5:0.5b';
        useLocalLLM = true;
      } else {
        const anyQwen = installedNames.find(n => n.toLowerCase().includes('qwen'));
        if (anyQwen) {
          log(`[OLLAMA] Fallback automático al modelo Qwen disponible: "${anyQwen}".`);
          activeModel = anyQwen;
          useLocalLLM = true;
        } else {
          log(`[OLLAMA] No se encontraron modelos Qwen instalados (${installedNames.join(', ') || 'ninguno'}). Ejecutando modo determinista.`);
        }
      }
    } else {
      log(`[OLLAMA] Servidor local no disponible. Ejecutando fallback determinista sin Qwen.`);
    }
  }

  qwenStats.enabled = useLocalLLM;
  qwenStats.activeModel = useLocalLLM ? activeModel : null;
  if (requestedLocalLLM) {
    ollamaLazyState.checked = true;
    ollamaLazyState.available = useLocalLLM;
    ollamaLazyState.model = useLocalLLM ? activeModel : null;
  }
  log(`Motor Neuronal Activo: ${useLocalLLM ? `Qwen (${activeModel})` : 'Desactivado (Simbólico Determinista)'}${carrilBStats.enabled ? ` | Carril B Guiado: ACTIVO (${carrilBStats.mode}, solo críticos)` : ''}`);
  log(`Nicho Activo: ${domainId} (${domainPack.label}) | Enrutamiento por H2: ACTIVO (aislamiento estanco por sección)`);
  log(`==========================================================================`);

  for (let i = 0; i < paragraphs.length; i++) {
    const rawPara = paragraphs[i];
    const paraNum = i + 1;
    const auditSteps = [];
    const sec = sectionMetaByParaIndex[i] || null;

    log(`--------------------------------------------------------------------------`);
    log(`[PÁRRAFO ${paraNum}/${paragraphs.length}] Iniciando deconstrucción y reconstrucción...`);

    // FASE 0: Blindaje y Humanización de Encabezados
    if (isHeading(rawPara, i)) {
      const humanizedHeadingText = humanizeHeading(rawPara);
      currentAnchor = humanizedHeadingText;
      isFirstAfterHeading = true;
      const headingSubdomains = domainRegistry.resolveSectionSubdomains({
        headingText: rawPara,
        sectionBodyText: sec?.bodyText || '',
        paragraphText: '',
        domainId
      });
      for (const sd of headingSubdomains) articleActiveSubdomains.add(sd);
      sectionSubdomainsLog.push({
        paragraphIndex: paraNum,
        heading: humanizedHeadingText,
        subdomains: [...headingSubdomains]
      });

      log(`[FASE 0 - ESTRUCTURA] Encabezado procesado: "${rawPara}" -> "${humanizedHeadingText}"`);
      log(` -> Fijado como Entidad de Anclaje de Centrado (Cb) para los siguientes párrafos.`);
      log(`[FASE 0 - SUBDOMINIO H2] Sección "${humanizedHeadingText}" -> [${[...headingSubdomains].join(', ')}]`);

      auditSteps.push({
        stage: 'HEADING_HUMANIZATION',
        original: rawPara,
        text: humanizedHeadingText,
        subdomains: [...headingSubdomains],
        reason: 'Encabezado des-robotizado: eliminación de dos puntos sintéticos de ChatGPT ("Tema: Subtema") y conversión a titulación periodística orgánica sin alterar marcas ni modelos.'
      });

      humanizedParas.push(humanizedHeadingText);
      auditTrail.push({
        paragraphIndex: paraNum,
        totalParagraphs: paragraphs.length,
        isHeading: true,
        subdomains: [...headingSubdomains],
        originalText: rawPara,
        humanizedText: humanizedHeadingText,
        steps: auditSteps
      });
      continue;
    }

    const paraSubdomains = domainRegistry.resolveSectionSubdomains({
      headingText: currentAnchor || sec?.headingText || '',
      sectionBodyText: sec?.bodyText || '',
      paragraphText: rawPara,
      domainId
    });
    for (const sd of paraSubdomains) articleActiveSubdomains.add(sd);
    log(`[FASE 0 - SUBDOMINIO H2] P${paraNum} (H2: "${currentAnchor || 'Introducción'}") -> [${[...paraSubdomains].join(', ')}]`);

    // FASE 1 (Heurística rápida): Clasificación de Marco y Átomos Deterministas
    const { type, atoms } = classifyParagraph(rawPara, currentAnchor, paraSubdomains);
    if (
      type === 'PRODUCT_FACTUAL' &&
      currentAnchor &&
      /^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(currentAnchor)
    ) {
      const strictAnchorSkus = factualGuard.extractStrictBrandSkus(rawPara, currentAnchor);
      if (strictAnchorSkus.length > 0 && (atoms.brand_models.length === 0 || strictAnchorSkus[0].length > (atoms.brand_models[0] || '').length)) {
        atoms.brand_models = strictAnchorSkus;
      }
      atoms.discriminativeAnchors = factualGuard.extractDiscriminativeAnchors(rawPara, atoms);
    }

    const atomSummary = [];
    if (atoms.brand_models.length) atomSummary.push(`Marcas: [${atoms.brand_models.join(', ')}]`);
    if (atoms.proper_entities?.length) atomSummary.push(`Entidades: [${atoms.proper_entities.join(', ')}]`);
    if (atoms.shapes.length) atomSummary.push(`Formas: [${atoms.shapes.join(', ')}]`);
    if (atoms.styles.length) atomSummary.push(`Estilos: [${atoms.styles.join(', ')}]`);
    if (atoms.materials.length) atomSummary.push(`Materiales: [${atoms.materials.join(', ')}]`);
    if (atoms.outfits.length) atomSummary.push(`Outfits: [${atoms.outfits.join(', ')}]`);
    if (atoms.coatings.length) atomSummary.push(`Protección: [${atoms.coatings.join(', ')}]`);
    if (atoms.key_concepts?.length) atomSummary.push(`Conceptos: [${atoms.key_concepts.slice(0, 4).join(', ')}]`);

    const atomSummaryText = atomSummary.length ? atomSummary.join(' | ') : 'Hechos narrativos generales';
    const tuples = deconstructToDavidsonianTuples(rawPara, atoms, type, currentAnchor);
    const tuplesLog = tuples.map(t => `${t.id}=<${t.entity}, ${t.predicate}[${t.relationType}], ${t.argument}, [${t.requiredSlots.join(',') || 'CORE'}]}>`).join(' ; ');
    log(`[FASE 1 - ATOMIZACIÓN] Marco: ${type} | Átomos base: ${atomSummaryText}`);
    log(`[FASE 1 - TUPLAS DAVIDSON] ${tuplesLog}`);
    if (atoms.relations && atoms.relations.length) {
      const relCardsLog = atoms.relations
        .filter(r => r.relation !== 'HAS_ATTRIBUTE')
        .slice(0, 5)
        .map(r => `[${r.subject} -> ${r.relation} -> ${r.target}]`)
        .join(' | ');
      if (relCardsLog) log(`[FASE 1 - FICHAS RELACIONALES] ${relCardsLog}`);
    }
    auditSteps.push({
      stage: 'DAVIDSON_ATOMIZATION',
      atoms: atomSummaryText,
      tuples,
      frame: type,
      reason: 'Deconstrucción lógica de Davidson: extracción de entidades, predicados, marcos e invariantes (Bedeutung).'
    });

    const recon = await humanizeParagraph({ bankState,
      paragraphIndex: paraNum,
      frame: type,
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
      usageLedger,
      articleState,
      paraTopology: sectionTopology.items[i] || null,
      carrilBStats,
      ollamaLazyState,
      domainId,
      activeSubdomains: paraSubdomains
    });

    if (Array.isArray(recon.donorsUsedInPara)) {
      allUsedDonorsForArticle.push(...recon.donorsUsedInPara);
    }

    totalInterventionTokens += recon.interventionTokens || 0;
    isFirstAfterHeading = false;

    // Limpieza tipográfica final
    let reconstructedPara = recon.text
      .replace(/\b([a-záéíóúüñ]+[áéíóú])\s+(lic[oa]s?|tic[oa]s?|gic[oa]s?|mic[oa]s?|nic[oa]s?)\b/gi, '$1$2')
      .replace(/\ba el\b/g, 'al')
      .replace(/\bA el\b/g, 'Al')
      .replace(/\bde el\b/g, 'del')
      .replace(/\bDe el\b/g, 'Del')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/\.\s*\./g, '.')
      .replace(/;\s*\./g, '.')
      .replace(/:\s*\./g, ':')
      .trim();

    if (reconstructedPara.length > 0) {
      reconstructedPara = reconstructedPara.charAt(0).toUpperCase() + reconstructedPara.slice(1);
      if (!/[.!?:]$/.test(reconstructedPara)) reconstructedPara += '.';
    }

    const paraOverlaps7 = findAllCorpusOverlaps(bankState, reconstructedPara, recon.donorsUsedInPara, 7);
    const paraWords = reconstructedPara.split(/\s+/).filter(Boolean).length;
    const paraTrigramOverlap = computeNGramOverlapRatio(reconstructedPara, rawPara, 3);
    const paraDivergencePct = Number(((1 - paraTrigramOverlap) * 100).toFixed(1));

    humanizedParas.push(reconstructedPara);

    if (recon.coverageEntry) {
      bankCoverageReport.push({
        paragraphIndex: paraNum,
        sectionHeading: currentAnchor || '(Introducción)',
        subdomains: [...paraSubdomains],
        ...recon.coverageEntry
      });
    }

    auditTrail.push({
      paragraphIndex: paraNum,
      totalParagraphs: paragraphs.length,
      isHeading: false,
      sectionHeading: currentAnchor || '(Introducción)',
      subdomains: [...paraSubdomains],
      originalText: rawPara,
      humanizedText: reconstructedPara,
      trigramOverlap: paraTrigramOverlap,
      divergencePct: paraDivergencePct,
      coverage: recon.coverageEntry || null,
      steps: auditSteps
    });

    log(`[TEXTO ORIGINAL] "${rawPara}"`);
    log(`[TEXTO TRANSFORMADO] "${reconstructedPara}"`);
    log(`[MÉTRICAS_PÁRRAFO ${paraNum}] Palabras: ${paraWords} | Divergencia vs Original: ${paraDivergencePct}% (Trigramas=${(paraTrigramOverlap * 100).toFixed(1)}%) | Solapamientos >=7w: ${paraOverlaps7.length}`);
    glitchIdx++;
  }

  const fullResult = humanizedParas.join('\n\n');
  const burstiness = calculateBurstiness(fullResult);
  const shingleIssues = checkPlagiarismShingles(bankState, fullResult, 7);
  const totalWords = fullResult.split(/\s+/).filter(Boolean).length;
  const telemetry = computeBluepaperTelemetry({
    uniqueDomainsCount: usedDomainsCount.size,
    centeringTransitions
  });
  const bodyEntries = auditTrail.filter(p => !p.isHeading);
  const avgDivergencePct = bodyEntries.length
    ? Number((bodyEntries.reduce((acc, p) => acc + (p.divergencePct ?? 100), 0) / bodyEntries.length).toFixed(1))
    : 100;

  const coverageGaps = bankCoverageReport.filter(e => e.isGap);
  const criticalGapsCount = coverageGaps.filter(e => e.severity === 'CRITICO').length;
  const mediumGapsCount = coverageGaps.filter(e => e.severity === 'MEDIO').length;
  const avgFitScore = bankCoverageReport.length
    ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.fitScore ?? 0), 0) / bankCoverageReport.length).toFixed(1))
    : 0;
  const avgSemScore = bankCoverageReport.length
    ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.semScore ?? 0), 0) / bankCoverageReport.length).toFixed(1))
    : 0;
  const avgCoverageScore = bankCoverageReport.length
    ? Number((bankCoverageReport.reduce((acc, e) => acc + (e.coverageScore ?? 100), 0) / bankCoverageReport.length).toFixed(1))
    : 100;

  let registryUpdate = null;
  if (options.recordBankGaps !== false && bankCoverageReport.length > 0) {
    try {
      registryUpdate = bankGapTracker.recordArticleCoverage(bankCoverageReport, {
        title: paragraphs[0]?.slice(0, 90) || 'Artículo',
        inputWords: rawArticleText.split(/\s+/).filter(Boolean).length,
        outputWords: totalWords,
        model: useLocalLLM ? activeModel : 'symbolic'
      });
    } catch (gapErr) {
      log(`[RADAR_HUECOS_ERROR] No se pudo persistir el registro acumulado: ${gapErr.message}`);
    }
  }

  let usageUpdate = null;
  if (options.trackDonorUsage !== false && allUsedDonorsForArticle.length > 0) {
    try {
      usageUpdate = bankGapTracker.recordUsedDonors(allUsedDonorsForArticle, {
        title: paragraphs[0]?.slice(0, 90) || 'Artículo'
      });
    } catch (usageErr) {
      log(`[ROTACION_USO_ERROR] No se pudo registrar uso de donantes: ${usageErr.message}`);
    }
  }
  const cleanCapacity = getBankStats(bankState)?.usableCleanBlocks || null;
  const usageStats = bankGapTracker.getUsageStats(cleanCapacity);
  const crossArticleRepeatsCount = bankCoverageReport.filter(e => (e.crossArticleReuseCount || 0) > 0).length;

  if (carrilBStats.lcsSamples.length > 0) {
    const sumLcs = carrilBStats.lcsSamples.reduce((a, b) => a + b, 0);
    carrilBStats.avgSkeletonLCS = Number((sumLcs / carrilBStats.lcsSamples.length).toFixed(4));
  }
  const { lcsSamples: _dropLcs, ...publicCarrilBStats } = carrilBStats;

  log(`==================== RESUMEN DE COMPILACIÓN FÁCTICA ====================`);
  log(`Palabras entrada: ${rawArticleText.split(/\s+/).filter(Boolean).length} -> Palabras salida: ${totalWords}`);
  log(`Divergencia promedio vs Original: ${avgDivergencePct}%`);
  log(`Burstiness (σ): ${burstiness.sigma}`);
  log(`Dispersión de donantes: ${telemetry.uniqueDonorDomains} dominios distintos`);
  log(`Transiciones Centrado DAG: CONTINUE=${centeringTransitions.CONTINUE}, RETAIN=${centeringTransitions.RETAIN}, SMOOTH_SHIFT=${centeringTransitions.SMOOTH_SHIFT}, ROUGH_SHIFT=${centeringTransitions.ROUGH_SHIFT}`);
  log(`Coincidencias de plagio (>=7-gram shingles contra banco): ${shingleIssues.length}`);
  log(`Procesos Qwen: ${qwenStats.calls} llamadas | Fallos: ${qwenStats.failures} | Tokens generados: ${qwenStats.totalTokens} | Tiempo Qwen total: ${(qwenStats.totalDurationMs / 1000).toFixed(2)}s`);
  log(`[CARRIL_B] Disparados: ${publicCarrilBStats.triggered} | Aprobados: ${publicCarrilBStats.approved} | Rechazados: ${publicCarrilBStats.rejected} | Offline: ${publicCarrilBStats.offline} | LCS medio: ${publicCarrilBStats.avgSkeletonLCS ?? '—'}`);
  log(`=== AUDITORÍA DE COBERTURA DEL BANCO (HUECOS: ${coverageGaps.length}/${bankCoverageReport.length} [${criticalGapsCount} críticos, ${mediumGapsCount} medios] | Cobertura media: ${avgCoverageScore}% | SemScore medio: ${avgSemScore}) ===`);
  for (const entry of bankCoverageReport) {
    const flag = entry.severity === 'CRITICO' ? '[CRITICO]' : (entry.severity === 'MEDIO' ? '[MEDIO]  ' : '[OK]     ');
    const missingTag = entry.missingConcepts?.length ? ` | Faltan: [${entry.missingConcepts.join(', ')}]` : '';
    log(`${flag} P${entry.paragraphIndex} (${entry.heading}) | ${entry.targetFrame || entry.frame} | Cob: ${entry.coverageScore}% | Pool: ${entry.poolSize ?? '?'} | Sem: ${entry.semScore} | Donante: ${entry.donorId} (${entry.source})${missingTag} | ${entry.reason}`);
  }
  if (registryUpdate && registryUpdate.stats) {
    log(`[RADAR_HUECOS] Registro acumulado actualizado: ${registryUpdate.stats.totalGapsOpen} huecos pendientes (${registryUpdate.stats.totalGapsCritical} críticos, ${registryUpdate.autoResolved} auto-resueltos).`);
  }
  log(`[ROTACIÓN_ENTRE_ARTÍCULOS] Donantes registrados: ${usageUpdate?.recordedBricks || allUsedDonorsForArticle.length} | Repeticiones inter-artículo en este texto: ${crossArticleRepeatsCount}/${bankCoverageReport.length} | Únicos usados en historial: ${usageStats.uniqueDonorsUsed}${usageStats.totalCleanCapacity ? `/${usageStats.totalCleanCapacity} (${usageStats.coverageRatioPct}%)` : ''}`);
  log(`========================================================================`);

  return {
    text: fullResult,
    paragraphCount: humanizedParas.length,
    wordCount: totalWords,
    metrics: {
      wordCount: totalWords,
      divergencePct: avgDivergencePct,
      burstiness: burstiness.sigma,
      burstinessSigma: burstiness.sigma,
      avgSentenceLength: burstiness.avg,
      plagiarismRunsCount: shingleIssues.length,
      shingleViolationsCount: shingleIssues.length,
      shingleViolations: shingleIssues,
      uniqueDonorDomains: telemetry.uniqueDonorDomains,
      centeringTransitions: telemetry.centeringTransitions,
      avgFitScore,
      avgSemScore,
      avgCoverageScore,
      bankCoverageGapsCount: coverageGaps.length,
      criticalGapsCount,
      mediumGapsCount,
      crossArticleRepeatsCount,
      usageStats,
      bankGapRegistrySummary: registryUpdate?.stats || null,
      qwenStats,
      carrilBStats: publicCarrilBStats,
      domainId,
      activeSubdomains: [...articleActiveSubdomains],
      sectionSubdomains: sectionSubdomainsLog
    },
    bankCoverageReport,
    auditTrail
  };
}

module.exports = new HumanizationEngineFacade();
