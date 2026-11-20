const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { BANK_DIR } = require('../../shared/app-paths.cjs');
const REGISTRY_PATH = path.join(BANK_DIR, 'registro_huecos_banco.json');
const REPORT_MD_PATH = path.join(BANK_DIR, 'REPORTE_HUECOS_ACUMULADOS.md');
const USAGE_LEDGER_PATH = path.join(BANK_DIR, 'registro_uso_donantes.json');

const TOPIC_STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'tras', 'ante',
  'bajo', 'hacia', 'hasta', 'desde', 'segun', 'durante', 'mediante', 'contra',
  'y', 'e', 'o', 'u', 'ni', 'que', 'como', 'cuando', 'donde', 'mas', 'muy',
  'sus', 'tus', 'mis', 'este', 'esta', 'estos', 'estas', 'ese', 'esa',
  'gafa', 'gafas', 'sol', 'montura', 'monturas', 'lente', 'lentes', 'cristal', 'cristales',
  'tendencia', 'estilo', 'modelo', 'modelos', 'look', 'outfit', 'hoy', 'dia',
  'dos', 'tres', 'como', 'mejor', 'mejores', 'escoger', 'elegir', 'armar', 'lleva',
  'llevan', 'hablemos', 'introduccion', 'articulo', 'general', 'molde', 'producto'
]);

const EDITORIAL_DOMAINS = [
  'vogue.es', 'telva.com', 'elle.com', 'revistagq.com',
  'trendencias.com', 'harpersbazaar.com', 'esquire.com', 'smoda.elpais.com'
];

const OPTICAL_DOMAINS = [
  'milyunagafas.com', 'generaloptica.es', 'opticauniversitaria.es',
  'cottet.es', 'opticabassol.com', 'multiopticas.com', 'federopticos.com'
];

const CONCEPT_SYNONYM_GROUPS = [
  { test: /(redond|circular|pantos)/, rx: /\b(?:redond\w*|circular\w*|pantos|ovalad\w*)\b/ },
  { test: /(cuadrad|geometr|rectangul|angul)/, rx: /\b(?:cuadrad\w*|geometr\w*|rectangul\w*|angul\w*)\b/ },
  { test: /(aviador|piloto|gota|lagrima)/, rx: /\b(?:aviador|piloto|gota|lagrima)\b/ },
  { test: /(mariposa|cat.?eye|gatun|oversize)/, rx: /\b(?:mariposa|cat.?eye|gatun\w*|oversize)\b/ },
  { test: /(boho|bohem|hippie)/, rx: /\b(?:boho|bohemi\w*|hippie|setenter\w*|vintage|retro|70)\b/ },
  { test: /(vintage|retro|70|setent)/, rx: /\b(?:vintage|retro|70|setent\w*|clasic\w*|atemporal\w*|decadas?)\b/ },
  { test: /(acetat|pasta|celulosa|algodon)/, rx: /\b(?:acetat\w*|pasta|celulosa|algodon)\b/ },
  { test: /(metal|bronce|dorad|oro|acero|titanio)/, rx: /\b(?:metal\w*|bronce|dorad\w*|oro|acero|titanio)\b/ },
  { test: /(carey|havana|habana|ambar|ocre|tierra|marron)/, rx: /\b(?:carey|havana|habana|ambar|ocre|tierra|marron\w*)\b/ },
  { test: /(lino|cuero|encaje|algodon)/, rx: /\b(?:lino|cuero|encaj\w*|algodon|prendas|ropa|vestidos)\b/ },
  { test: /(ciudad|verano|paseo|playa|fiesta|pasarela|escaparate)/, rx: /\b(?:ciudad|urban\w*|verano|estival|paseo|playa|fiesta|pasarela\w*|calle|diario)\b/ },
  { test: /(fotocrom)/, rx: /\bfotocrom\w*\b/ },
  { test: /(polariz)/, rx: /\bpolariz\w*\b/ },
  { test: /(progresiv)/, rx: /\bprogresiv\w*\b/ },
  { test: /(ocupacional)/, rx: /\b(?:ocupacional\w*|lentes?\s+de\s+oficina)\b/ },
  { test: /(cristal.?mineral)/, rx: /\bcristal\w*\s+mineral\w*\b/ },
  { test: /(policarbonato)/, rx: /\bpolicarbonato\b/ },
  { test: /(plegable)/, rx: /\bplegable\w*\b/ }
];

function stripAccents(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugToken(str) {
  return stripAccents(str)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function atomicWriteFile(filePath, content) {
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  const tmpPath = `${filePath}.tmp_${process.pid}_${Date.now()}`;
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function defaultRegistry() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    stats: {
      totalArticlesProcessed: 0,
      totalParagraphsEvaluated: 0,
      totalGapsOpen: 0,
      totalGapsCritical: 0,
      totalGapsMedium: 0,
      totalGapsResolved: 0
    },
    recentRuns: [],
    gaps: []
  };
}

function normalizeConceptCovered(concept, donorNorm) {
  const cNorm = stripAccents(concept).trim();
  if (!cNorm) return true;

  for (const grp of CONCEPT_SYNONYM_GROUPS) {
    if (grp.test.test(cNorm)) {
      return grp.rx.test(donorNorm);
    }
  }

  const tokens = cNorm.split(/\s+/).filter(t => t.length >= 4 && !TOPIC_STOPWORDS_ES.has(t));
  if (!tokens.length) return true;
  return tokens.some(tok => {
    const stem = tok.slice(0, Math.max(4, Math.min(tok.length, 6)));
    return donorNorm.includes(stem);
  });
}

function buildHarvestSpec(targetFrame, topicTokens, missingConcepts, isColonIntro, atoms = {}) {
  const kwSet = new Set();
  const addKw = (k) => {
    const clean = String(k || '').trim().toLowerCase();
    if (clean && clean.length >= 3 && kwSet.size < 8) kwSet.add(clean);
  };

  for (const mc of missingConcepts) {
    if (mc === 'molde_producto') {
      addKw('modelo gafas de sol');
    } else {
      addKw(mc.replace(/_/g, ' '));
    }
  }
  for (const s of (atoms.styles || [])) addKw(s);
  for (const sh of (atoms.shapes || [])) addKw(`gafas ${sh}`);
  for (const m of (atoms.materials || [])) addKw(m);
  for (const o of (atoms.outfits || [])) addKw(o);
  for (const tt of topicTokens) {
    if (tt !== 'general' && tt !== 'puente_editorial') addKw(tt.replace(/_/g, ' '));
  }

  if (isColonIntro || targetFrame === 'TRANSITION_CURATION') {
    addKw('colección tendencias gafas de sol');
    addKw('modelos imprescindibles temporada');
  } else if (targetFrame === 'VISAGISM_AESTHETICS') {
    addKw('elegir gafas según tipo de rostro');
    addKw('facciones ajuste cómodo montura');
  } else if (targetFrame === 'HERITAGE_ORIGIN') {
    addKw('historia diseño clásico monturas tradición');
  } else if (targetFrame === 'MATERIAL_COMPOSITION') {
    addKw('montura acetato artesanal carey metal');
  } else if (targetFrame === 'PRODUCT_FACTUAL') {
    addKw('silueta diseño icónico gafas de sol');
  } else {
    addKw('combinar gafas de sol outfit moda');
  }

  const keywords = [...kwSet].slice(0, 7);
  const filterTokens = new Set(['gafas', 'montura', 'lentes-de-sol']);
  for (const kw of keywords) {
    for (const part of stripAccents(kw).split(/\s+/)) {
      if (part.length >= 4 && !TOPIC_STOPWORDS_ES.has(part) && filterTokens.size < 10) {
        filterTokens.add(part);
      }
    }
  }

  const useEditorial = isColonIntro ||
    targetFrame === 'GENERAL_STYLE' ||
    targetFrame === 'HERITAGE_ORIGIN' ||
    targetFrame === 'PRODUCT_FACTUAL' ||
    targetFrame === 'TRANSITION_CURATION';

  return {
    targetFrame,
    targetType: isColonIntro ? 'colon_intro_12_30w' : 'multi_sentence_38_95w',
    keywords,
    cdxUrlFilter: `.*(${[...filterTokens].join('|')}).*`,
    recommendedDomains: useEditorial ? EDITORIAL_DOMAINS.slice(0, 5) : OPTICAL_DOMAINS.slice(0, 5)
  };
}

function computeTopicSignature({ targetFrame, heading, atoms = {}, missingConcepts = [], isColonIntro = false, rawPara = '' }) {
  const candidates = [];
  const seen = new Set();
  const pushSlug = (val) => {
    const s = slugToken(val);
    if (!s || s.length < 3 || TOPIC_STOPWORDS_ES.has(s) || seen.has(s)) return;
    seen.add(s);
    candidates.push(s);
  };

  for (const mc of missingConcepts) pushSlug(mc);
  for (const s of (atoms.styles || [])) pushSlug(s);
  for (const sh of (atoms.shapes || [])) pushSlug(sh);
  for (const m of (atoms.materials || [])) pushSlug(m);
  for (const o of (atoms.outfits || [])) pushSlug(o);

  if (candidates.length < 2 && heading) {
    for (const tok of stripAccents(heading).split(/[^a-z0-9]+/)) {
      if (tok.length >= 4 && !TOPIC_STOPWORDS_ES.has(tok) && !/^(chloe|gucci|persol|ray|ban|prada|dior|[a-z]{2}\d{3,}|00\d|\d{2,})$/.test(tok)) {
        pushSlug(tok);
      }
    }
  }

  if (candidates.length === 0 && rawPara) {
    for (const tok of stripAccents(rawPara).split(/[^a-z0-9]+/)) {
      if (tok.length >= 5 && !TOPIC_STOPWORDS_ES.has(tok)) {
        pushSlug(tok);
        if (candidates.length >= 2) break;
      }
    }
  }

  let selected = candidates.slice(0, 3);
  if (!selected.length) {
    selected = [isColonIntro ? 'puente_editorial' : (targetFrame === 'VISAGISM_AESTHETICS' ? 'ajuste_facciones' : 'general')];
  }
  const signature = [...new Set(selected)].sort().join('+');
  return { signature, topicTokens: selected };
}

function evaluateParagraphCoverage({
  paragraphIndex = null,
  heading = '(Introducción)',
  frame = 'GENERAL_STYLE',
  isColonIntro = false,
  rawPara = '',
  atoms = {},
  donorText = '',
  donorId = 'fallback',
  source = 'corpus',
  poolSize = 0,
  semScore = 0,
  matchedTerms = [],
  fitScore = null,
  chosenRank = 1,
  candidateCount = 0,
  usedReranker = false,
  rerankReason = '',
  qwenAttempts = 0,
  rotatedCandidate = false,
  crossArticleReuseCount = 0,
  entailmentAudit = null
}) {
  let penalty = 0;
  const gapReasons = [];
  const missingConcepts = [];
  const missingSeen = new Set();

  const addMissing = (label) => {
    const clean = String(label || '').trim().toLowerCase();
    if (!clean || missingSeen.has(clean) || missingConcepts.length >= 6) return;
    missingSeen.add(clean);
    missingConcepts.push(clean);
  };

  // Señal 1: Escasez real del pool tras filtros semánticos/coherencia
  if (poolSize === 0) {
    penalty += 45;
    gapReasons.push('Sin candidatos coherentes en el banco');
  } else if (poolSize <= 2) {
    penalty += 28;
    gapReasons.push(`Pool muy escaso (${poolSize} candidatos)`);
  } else if (poolSize <= 4) {
    penalty += 12;
    gapReasons.push(`Pool limitado (${poolSize} candidatos)`);
  }

  // Señal 2: Similitud semántica TF-IDF + clústeres
  const cleanSem = Number(semScore || 0);
  if (isColonIntro) {
    if (cleanSem < 8) {
      penalty += 15;
      gapReasons.push(`Baja afinidad en puente editorial (sem=${cleanSem})`);
    }
  } else if (cleanSem < 8) {
    penalty += 32;
    gapReasons.push(`Baja similitud semántica (sem=${cleanSem})`);
  } else if (cleanSem < 14) {
    penalty += 16;
    gapReasons.push(`Similitud semántica media-baja (sem=${cleanSem})`);
  }

  // Señal 3: Atributos y conceptos requeridos no reflejados en el texto elegido
  const donorNorm = stripAccents(donorText || '');
  const categories = [
    { key: 'forma', list: atoms?.shapes || [] },
    { key: 'material', list: atoms?.materials || [] },
    { key: 'estilo', list: atoms?.styles || [] },
    { key: 'ocasion', list: atoms?.outfits || [] }
  ];

  let missingCatCount = 0;
  for (const cat of categories) {
    if (!cat.list.length) continue;
    const anyCovered = cat.list.some(val => normalizeConceptCovered(val, donorNorm));
    if (!anyCovered) {
      missingCatCount++;
      for (const val of cat.list.slice(0, 2)) addMissing(val);
    }
  }
  if (missingCatCount > 0) {
    const catPen = Math.min(24, missingCatCount * 8);
    penalty += catPen;
    gapReasons.push(`Atributos sin cubrir (${missingConcepts.slice(0, 4).join(', ')})`);
  }

  if (frame === 'PRODUCT_FACTUAL' && /^en el caso de las\b/i.test((donorText || '').trim())) {
    penalty += 18;
    gapReasons.push('Sin molde nativo de producto (SKU prefijado)');
    addMissing('molde_producto');
  }

  // Señal 4: Fricción del Reranker Qwen / Fase 4
  if (fitScore !== null && fitScore !== undefined) {
    if (fitScore <= 4) {
      penalty += 25;
      gapReasons.push(`Encaje reranker bajo (${fitScore}/10)`);
    } else if (fitScore <= 6) {
      penalty += 12;
      gapReasons.push(`Encaje reranker parcial (${fitScore}/10)`);
    }
  }
  if (rotatedCandidate) {
    penalty += 15;
    gapReasons.push('Requirió rotación de donante en Fase 4');
  }
  if ((qwenAttempts || 0) >= 3) {
    penalty += 10;
    gapReasons.push(`Alta fricción morfosintáctica Qwen (${qwenAttempts} intentos)`);
  }

  // Señal 5: Saturación / repetición entre artículos consecutivos
  const isSaturated = (crossArticleReuseCount || 0) >= 1;
  if (isSaturated) {
    penalty += Math.min(28, 18 + (crossArticleReuseCount - 1) * 5);
    gapReasons.push(`Saturación entre artículos: donante ya usado (${crossArticleReuseCount}x previo${crossArticleReuseCount > 1 ? 's' : ''})`);
  }

  // Señal 6: Compuerta Honesta de Implicación Fáctica (Anclas Discriminativas + Polaridad Ligada)
  if (entailmentAudit) {
    if (entailmentAudit.polarityContradiction) {
      penalty += 75;
      gapReasons.push(`Contradicción de polaridad/seguridad (${(entailmentAudit.contradictionDetails || []).join(', ')})`);
    }
    if (entailmentAudit.isHonestFactualGap) {
      for (const ma of (entailmentAudit.missingAnchors || [])) {
        addMissing(ma);
      }
      const crit = entailmentAudit.missingCriticalTech || [];
      if (crit.length > 0) {
        penalty += Math.min(55, crit.length * 25);
        gapReasons.push(`Faltan anclas técnicas críticas (${crit.slice(0, 4).join(', ')})`);
      } else if (entailmentAudit.missingAnchors?.length) {
        penalty += 30;
        gapReasons.push(`Cobertura técnica incompleta (${entailmentAudit.missingAnchors.slice(0, 4).join(', ')})`);
      }
      if (entailmentAudit.missingSafetyWarning && entailmentAudit.unwarnedNegativeContexts?.length) {
        penalty += 25;
        gapReasons.push(`Omite advertencia de seguridad (${entailmentAudit.unwarnedNegativeContexts.join(', ')})`);
      }
    }
  }

  let coverageScore = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  if (entailmentAudit?.isHonestFactualGap) {
    coverageScore = Math.min(coverageScore, Math.round(entailmentAudit.entailmentScore ?? coverageScore));
  }
  let severity = coverageScore < 55 ? 'CRITICO' : (coverageScore < 75 ? 'MEDIO' : 'OK');
  if (entailmentAudit?.isHonestFactualGap) {
    severity = (
      entailmentAudit.missingCriticalTech?.length > 0 ||
      entailmentAudit.polarityContradiction ||
      entailmentAudit.missingSafetyWarning ||
      coverageScore < 45
    ) ? 'CRITICO' : (severity === 'OK' ? 'MEDIO' : severity);
  }
  const isGap = severity !== 'OK';
  const targetFrame = isColonIntro ? 'TRANSITION_CURATION' : frame;

  const { signature: topicSignature, topicTokens } = computeTopicSignature({
    targetFrame,
    heading,
    atoms,
    missingConcepts,
    isColonIntro,
    rawPara
  });
  const gapKey = `${targetFrame}::${topicSignature}`;
  const harvestSpec = buildHarvestSpec(targetFrame, topicTokens, missingConcepts, isColonIntro, atoms);

  return {
    paragraphIndex,
    heading: heading || '(Introducción)',
    frame,
    targetFrame,
    isColonIntro,
    donorId: donorId || 'fallback',
    source: source || 'corpus',
    poolSize,
    semScore: cleanSem,
    matchedTerms: matchedTerms || [],
    fitScore,
    chosenRank,
    candidateCount,
    usedReranker,
    crossArticleReuseCount,
    isSaturated,
    reason: gapReasons.length ? gapReasons.join(' | ') : (rerankReason || 'Cobertura sólida'),
    gapReasons,
    missingConcepts,
    coverageScore,
    severity,
    isGap,
    topicSignature,
    gapKey,
    harvestSpec,
    inputPreview: String(rawPara || '').replace(/\s+/g, ' ').trim().slice(0, 140)
  };
}

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return defaultRegistry();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    if (!parsed || !Array.isArray(parsed.gaps)) return defaultRegistry();
    return {
      ...defaultRegistry(),
      ...parsed,
      stats: { ...defaultRegistry().stats, ...(parsed.stats || {}) },
      recentRuns: Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [],
      gaps: parsed.gaps
    };
  } catch {
    return defaultRegistry();
  }
}

function computePriorityScore(gap) {
  const occ = Number(gap.occurrences || 1);
  const sevWeight = gap.severity === 'CRITICO' ? 40 : 20;
  const avgCov = Number(gap.avgCoverageScore ?? 50);
  return Math.round(occ * 15 + sevWeight + (100 - avgCov) * 0.5);
}

function recalcRegistryStats(registry) {
  const open = registry.gaps.filter(g => g.status === 'PENDIENTE');
  registry.stats.totalGapsOpen = open.length;
  registry.stats.totalGapsCritical = open.filter(g => g.severity === 'CRITICO').length;
  registry.stats.totalGapsMedium = open.filter(g => g.severity === 'MEDIO').length;
  registry.stats.totalGapsResolved = registry.gaps.filter(g => g.status === 'RESUELTO').length;
}

function sortRegistryGaps(registry) {
  const statusRank = { PENDIENTE: 0, RESUELTO: 1, IGNORADO: 2 };
  registry.gaps.sort((a, b) => {
    const ra = statusRank[a.status] ?? 3;
    const rb = statusRank[b.status] ?? 3;
    if (ra !== rb) return ra - rb;
    if (a.status === 'PENDIENTE') {
      return (b.priorityScore || 0) - (a.priorityScore || 0);
    }
    if (a.status === 'RESUELTO') {
      return String(b.resolvedAt || '').localeCompare(String(a.resolvedAt || ''));
    }
    return String(b.lastSeenAt || '').localeCompare(String(a.lastSeenAt || ''));
  });
}

function generateMarkdownReport(registry) {
  const openGaps = registry.gaps.filter(g => g.status === 'PENDIENTE');
  const resolvedGaps = registry.gaps.filter(g => g.status === 'RESUELTO');
  const lines = [
    '# Radar Acumulativo de Huecos del Banco Pre-2022 (Nous)',
    `**Última actualización:** ${registry.updatedAt}  `,
    `**Artículos analizados:** ${registry.stats.totalArticlesProcessed} · **Párrafos evaluados:** ${registry.stats.totalParagraphsEvaluated}  `,
    `**Huecos abiertos:** ${registry.stats.totalGapsOpen} (${registry.stats.totalGapsCritical} críticos, ${registry.stats.totalGapsMedium} medios) · **Auto-resueltos / cerrados:** ${registry.stats.totalGapsResolved}`,
    '',
    '---',
    '',
    '## Huecos Pendientes Priorizados (Para Cosecha Pre-2022)'
  ];

  if (!openGaps.length) {
    lines.push('', '_No hay huecos pendientes registrados en este momento._');
  } else {
    for (const g of openGaps) {
      lines.push(
        '',
        `### [${g.severity}] ${g.gapKey} — Prioridad ${g.priorityScore}`,
        `- **ID:** \`${g.gapId}\` | **Apariciones:** ${g.occurrences} | **Cobertura media:** ${g.avgCoverageScore}% | **Pool medio:** ${g.avgPoolSize} | **SemScore medio:** ${g.avgSemScore}`,
        `- **Motivos:** ${(g.reasons || []).join('; ') || 'Cobertura insuficiente'}`,
        `- **Conceptos faltantes:** ${(g.missingConcepts || []).join(', ') || 'ninguno específico'}`,
        `- **Formato requerido:** \`${g.harvestSpec?.targetType || 'multi_sentence_38_95w'}\``,
        `- **Keywords sugeridas:** ${(g.harvestSpec?.keywords || []).join(', ')}`,
        `- **Filtro Wayback CDX:** \`${g.harvestSpec?.cdxUrlFilter || ''}\``,
        `- **Dominios sugeridos:** ${(g.harvestSpec?.recommendedDomains || []).join(', ')}`
      );
      if (g.sampleHeadings?.length) {
        lines.push(`- **Secciones afectadas:** ${g.sampleHeadings.join(' | ')}`);
      }
      if (g.sampleInputs?.length) {
        lines.push(`- **Muestra de entrada:** "${g.sampleInputs[0]}"`);
      }
    }
  }

  if (resolvedGaps.length) {
    lines.push('', '---', '', '## Huecos Resueltos');
    for (const g of resolvedGaps.slice(0, 20)) {
      lines.push(`- \`${g.gapKey}\` (${g.resolvedAt || 'reciente'}) — Donante verificador: \`${g.resolvedByDonor || g.lastDonorId || 'manual'}\` (Cobertura ${g.resolvedCoverageScore ?? 'OK'}%)`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function saveRegistry(registry) {
  registry.updatedAt = new Date().toISOString();
  for (const g of registry.gaps) {
    g.priorityScore = computePriorityScore(g);
  }
  sortRegistryGaps(registry);
  recalcRegistryStats(registry);
  atomicWriteFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  atomicWriteFile(REPORT_MD_PATH, generateMarkdownReport(registry));
  return registry;
}

function pushUniqueCapped(arr, val, cap = 8) {
  const list = Array.isArray(arr) ? [...arr] : [];
  const clean = String(val || '').trim();
  if (!clean) return list;
  if (!list.includes(clean)) list.push(clean);
  return list.slice(0, cap);
}

function recordArticleCoverage(entries = [], runMeta = {}) {
  const registry = loadRegistry();
  const now = new Date().toISOString();
  const list = Array.isArray(entries) ? entries : [];

  registry.stats.totalArticlesProcessed += 1;
  registry.stats.totalParagraphsEvaluated += list.length;

  let newlyOpened = 0;
  let updatedGaps = 0;
  let autoResolved = 0;

  const byKey = new Map();
  for (const g of registry.gaps) byKey.set(g.gapKey, g);

  for (const entry of list) {
    if (!entry || !entry.gapKey) continue;
    const existing = byKey.get(entry.gapKey);

    if (entry.isGap) {
      if (existing) {
        const prevOcc = Number(existing.occurrences || 1);
        const nextOcc = prevOcc + 1;
        existing.occurrences = nextOcc;
        existing.avgCoverageScore = Number((((existing.avgCoverageScore || 0) * prevOcc + entry.coverageScore) / nextOcc).toFixed(1));
        existing.avgPoolSize = Number((((existing.avgPoolSize || 0) * prevOcc + (entry.poolSize || 0)) / nextOcc).toFixed(1));
        existing.avgSemScore = Number((((existing.avgSemScore || 0) * prevOcc + (entry.semScore || 0)) / nextOcc).toFixed(1));
        existing.severity = (entry.severity === 'CRITICO' || existing.avgCoverageScore < 55) ? 'CRITICO' : 'MEDIO';
        if (existing.status === 'RESUELTO') existing.status = 'PENDIENTE';

        for (const mc of (entry.missingConcepts || [])) {
          existing.missingConcepts = pushUniqueCapped(existing.missingConcepts, mc, 8);
        }
        for (const r of (entry.gapReasons || [])) {
          existing.reasons = pushUniqueCapped(existing.reasons, r, 6);
        }
        if (entry.harvestSpec?.keywords) {
          let kws = existing.harvestSpec?.keywords || [];
          for (const k of entry.harvestSpec.keywords) kws = pushUniqueCapped(kws, k, 10);
          existing.harvestSpec = { ...entry.harvestSpec, ...existing.harvestSpec, keywords: kws };
        }
        existing.sampleHeadings = pushUniqueCapped(existing.sampleHeadings, entry.heading, 3);
        existing.sampleInputs = pushUniqueCapped(existing.sampleInputs, entry.inputPreview, 3);
        existing.lastSeenAt = now;
        existing.lastDonorId = entry.donorId;
        updatedGaps++;
      } else {
        const hash8 = crypto.createHash('sha1').update(entry.gapKey).digest('hex').slice(0, 8);
        const created = {
          gapId: `gap_${hash8}`,
          gapKey: entry.gapKey,
          targetFrame: entry.targetFrame,
          topicSignature: entry.topicSignature,
          severity: entry.severity,
          status: 'PENDIENTE',
          occurrences: 1,
          avgCoverageScore: entry.coverageScore,
          avgPoolSize: entry.poolSize || 0,
          avgSemScore: entry.semScore || 0,
          missingConcepts: (entry.missingConcepts || []).slice(0, 8),
          reasons: (entry.gapReasons || []).slice(0, 6),
          harvestSpec: entry.harvestSpec,
          sampleHeadings: entry.heading ? [entry.heading] : [],
          sampleInputs: entry.inputPreview ? [entry.inputPreview] : [],
          firstSeenAt: now,
          lastSeenAt: now,
          lastDonorId: entry.donorId,
          priorityScore: 0
        };
        registry.gaps.push(created);
        byKey.set(entry.gapKey, created);
        newlyOpened++;
      }
    } else if (existing && existing.status === 'PENDIENTE' && entry.coverageScore >= 75 && (entry.poolSize || 0) >= 4) {
      existing.status = 'RESUELTO';
      existing.resolvedAt = now;
      existing.resolvedByDonor = entry.donorId;
      existing.resolvedCoverageScore = entry.coverageScore;
      autoResolved++;
    }
  }

  const avgRunCov = list.length
    ? Number((list.reduce((acc, e) => acc + (e.coverageScore ?? 100), 0) / list.length).toFixed(1))
    : 100;
  const runGaps = list.filter(e => e.isGap);

  registry.recentRuns.unshift({
    timestamp: now,
    title: String(runMeta.title || 'Artículo').slice(0, 90),
    paragraphsEvaluated: list.length,
    avgCoverageScore: avgRunCov,
    gapsDetected: runGaps.length,
    criticalGaps: runGaps.filter(e => e.severity === 'CRITICO').length,
    model: runMeta.model || 'unknown'
  });
  registry.recentRuns = registry.recentRuns.slice(0, 30);

  saveRegistry(registry);

  return {
    stats: registry.stats,
    newlyOpened,
    updatedGaps,
    autoResolved
  };
}

function markGapStatus(gapId, status) {
  const valid = new Set(['PENDIENTE', 'RESUELTO', 'IGNORADO']);
  if (!valid.has(status)) {
    throw new Error(`Estado inválido de hueco: ${status}`);
  }
  const registry = loadRegistry();
  const target = registry.gaps.find(g => g.gapId === gapId || g.gapKey === gapId);
  if (target) {
    target.status = status;
    if (status === 'RESUELTO') {
      target.resolvedAt = new Date().toISOString();
      target.resolvedByDonor = target.resolvedByDonor || 'manual';
    }
    saveRegistry(registry);
  }
  return registry;
}

function clearResolvedGaps() {
  const registry = loadRegistry();
  registry.gaps = registry.gaps.filter(g => g.status === 'PENDIENTE');
  saveRegistry(registry);
  return registry;
}

function buildHarvesterTaskBrief(maxGaps = 12) {
  const registry = loadRegistry();
  const pending = registry.gaps
    .filter(g => g.status === 'PENDIENTE')
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, maxGaps);

  if (!pending.length) {
    return '# Brief para Cosechador Pre-2022 (Nous)\n\nNo hay huecos pendientes detectados actualmente en `registro_huecos_banco.json`.';
  }

  const lines = [
    '# Brief Automático de Cosecha Pre-2022 (Wayback Machine CDX)',
    `Generado: ${new Date().toISOString()} | Huecos prioritarios: ${pending.length} (de ${registry.stats.totalGapsOpen} pendientes)`,
    'Requisitos obligatorios: fuentes en español verificadas `< 2022-01-01` (`to=20211231235959`), bloques limpios sin clichés clínicos ni CTAs.',
    ''
  ];

  pending.forEach((g, idx) => {
    lines.push(
      `## ${idx + 1}. [${g.severity}] ${g.gapKey} (Prioridad ${g.priorityScore} · ${g.occurrences}x · Cob ${g.avgCoverageScore}%)`,
      `- Marco destino: \`${g.targetFrame}\` | Formato: \`${g.harvestSpec?.targetType || 'multi_sentence_38_95w'}\``,
      `- Conceptos faltantes: ${(g.missingConcepts || []).join(', ') || 'ninguno específico'}`,
      `- Keywords pre-2022: ${(g.harvestSpec?.keywords || []).join(', ')}`,
      `- Filtro CDX: \`${g.harvestSpec?.cdxUrlFilter || ''}\``,
      `- Dominios sugeridos: ${(g.harvestSpec?.recommendedDomains || []).join(', ')}`,
      ''
    );
  });

  return lines.join('\n');
}

function defaultUsageLedger() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    totalArticlesTracked: 0,
    totalDonorUses: 0,
    donorCounts: {},
    donorLastUsedAt: {},
    sentenceStemCounts: {},
    recentArticles: []
  };
}

function normalizeUsageStem(text) {
  return stripAccents(String(text || '').replace(/\[SLOT_[A-Z_]+\]/g, ' '))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 64);
}

function loadUsageLedger() {
  if (!fs.existsSync(USAGE_LEDGER_PATH)) {
    return defaultUsageLedger();
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(USAGE_LEDGER_PATH, 'utf8'));
    if (!parsed || typeof parsed !== 'object') return defaultUsageLedger();
    return {
      ...defaultUsageLedger(),
      ...parsed,
      donorCounts: parsed.donorCounts && typeof parsed.donorCounts === 'object' ? parsed.donorCounts : {},
      donorLastUsedAt: parsed.donorLastUsedAt && typeof parsed.donorLastUsedAt === 'object' ? parsed.donorLastUsedAt : {},
      sentenceStemCounts: parsed.sentenceStemCounts && typeof parsed.sentenceStemCounts === 'object' ? parsed.sentenceStemCounts : {},
      recentArticles: Array.isArray(parsed.recentArticles) ? parsed.recentArticles : []
    };
  } catch {
    return defaultUsageLedger();
  }
}

function saveUsageLedger(ledger) {
  const stemEntries = Object.entries(ledger.sentenceStemCounts || {});
  if (stemEntries.length > 5000) {
    stemEntries.sort((a, b) => (b[1] || 0) - (a[1] || 0));
    ledger.sentenceStemCounts = Object.fromEntries(stemEntries.slice(0, 4000));
  }
  ledger.updatedAt = new Date().toISOString();
  atomicWriteFile(USAGE_LEDGER_PATH, JSON.stringify(ledger, null, 2));
}

function getDonorReuseInfo(ledger, donorId, sentStems = []) {
  if (!ledger) {
    return { brickUses: 0, stemUses: 0, totalFreshnessPenalty: 0, isCrossArticleRepeat: false };
  }
  const brickUses = Number(ledger.donorCounts?.[donorId] || 0);
  let stemUses = 0;
  if (Array.isArray(sentStems) && ledger.sentenceStemCounts) {
    for (const rawSt of sentStems) {
      if (!rawSt || rawSt.length < 16) continue;
      const c1 = Number(ledger.sentenceStemCounts[rawSt] || 0);
      const norm = normalizeUsageStem(rawSt);
      const c2 = norm.length >= 18 ? Number(ledger.sentenceStemCounts[norm] || 0) : 0;
      const maxC = Math.max(c1, c2);
      if (maxC > stemUses) stemUses = maxC;
    }
  }
  const brickPenalty = brickUses > 0 ? Math.min(68, 26 + (brickUses - 1) * 18) : 0;
  const stemPenalty = stemUses > 0 ? Math.min(28, stemUses * 14) : 0;
  const totalFreshnessPenalty = Math.min(82, brickPenalty + stemPenalty);
  return {
    brickUses,
    stemUses,
    totalFreshnessPenalty,
    isCrossArticleRepeat: brickUses > 0 || stemUses > 0
  };
}

function recordUsedDonors(donorsList = [], articleMeta = {}) {
  const ledger = loadUsageLedger();
  const now = new Date().toISOString();
  const uniqueIds = [];
  const seenIds = new Set();
  const stemSet = new Set();

  for (const item of donorsList || []) {
    const brick = item?.brick || item;
    if (!brick) continue;
    const id = brick.brick_id;
    if (id && id !== 'fallback' && !seenIds.has(id)) {
      seenIds.add(id);
      uniqueIds.push(id);
      ledger.donorCounts[id] = Number(ledger.donorCounts[id] || 0) + 1;
      ledger.donorLastUsedAt[id] = now;
    }
    const stems = Array.isArray(brick._winSentStems) ? brick._winSentStems : [];
    for (const st of stems) {
      if (st && st.length >= 16) stemSet.add(st);
      const norm = normalizeUsageStem(st);
      if (norm.length >= 18) stemSet.add(norm);
    }
    if (brick._cleanWindow) {
      const sents = String(brick._cleanWindow).split(/(?<=[.!?])\s+/);
      for (const s of sents) {
        const norm = normalizeUsageStem(s);
        if (norm.length >= 18) stemSet.add(norm);
      }
    }
  }

  for (const st of stemSet) {
    ledger.sentenceStemCounts[st] = Number(ledger.sentenceStemCounts[st] || 0) + 1;
  }

  ledger.totalArticlesTracked = Number(ledger.totalArticlesTracked || 0) + 1;
  ledger.totalDonorUses = Number(ledger.totalDonorUses || 0) + uniqueIds.length;
  ledger.recentArticles.unshift({
    timestamp: now,
    title: String(articleMeta.title || 'Artículo').slice(0, 90),
    donorCount: uniqueIds.length,
    donorIds: uniqueIds.slice(0, 30)
  });
  ledger.recentArticles = ledger.recentArticles.slice(0, 30);

  saveUsageLedger(ledger);
  return { ledger, recordedBricks: uniqueIds.length, recordedStems: stemSet.size };
}

function resetUsageLedger() {
  const fresh = defaultUsageLedger();
  saveUsageLedger(fresh);
  return fresh;
}

function getUsageStats(totalCleanCapacity = null) {
  const ledger = loadUsageLedger();
  const counts = Object.entries(ledger.donorCounts || {});
  const uniqueDonorsUsed = counts.filter(([, c]) => Number(c) > 0).length;
  const repeatedDonorsCount = counts.filter(([, c]) => Number(c) >= 2).length;
  const maxDonorUses = counts.reduce((m, [, c]) => Math.max(m, Number(c) || 0), 0);
  const cleanCap = Number(totalCleanCapacity || 0);
  const coverageRatioPct = cleanCap > 0
    ? Number(Math.min(100, (uniqueDonorsUsed / cleanCap) * 100).toFixed(1))
    : null;
  const topReusedDonors = counts
    .filter(([, c]) => Number(c) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 10)
    .map(([brickId, uses]) => ({
      brickId,
      uses: Number(uses),
      lastUsedAt: ledger.donorLastUsedAt?.[brickId] || null
    }));

  return {
    updatedAt: ledger.updatedAt,
    totalArticlesTracked: Number(ledger.totalArticlesTracked || 0),
    totalDonorUses: Number(ledger.totalDonorUses || 0),
    uniqueDonorsUsed,
    repeatedDonorsCount,
    maxDonorUses,
    trackedSentenceStems: Object.keys(ledger.sentenceStemCounts || {}).length,
    totalCleanCapacity: cleanCap || null,
    coverageRatioPct,
    recentArticles: (ledger.recentArticles || []).slice(0, 10),
    topReusedDonors
  };
}

module.exports = {
  REGISTRY_PATH,
  REPORT_MD_PATH,
  USAGE_LEDGER_PATH,
  evaluateParagraphCoverage,
  recordArticleCoverage,
  loadRegistry,
  markGapStatus,
  clearResolvedGaps,
  buildHarvesterTaskBrief,
  loadUsageLedger,
  getDonorReuseInfo,
  recordUsedDonors,
  resetUsageLedger,
  getUsageStats
};
