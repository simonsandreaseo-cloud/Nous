'use strict';

const domainRegistry = require('../../donor-bank/domain-packs-registry.cjs');
const factualGuardMod = require('../../text-analysis/factual-entailment-guard.cjs');

const CLOSED_CLASS_RULES = [
  { rx: /^(?:el|la|los|las)$/, tag: 'DET_DEF' },
  { rx: /^(?:un|una|unos|unas)$/, tag: 'DET_IND' },
  { rx: /^(?:este|esta|estos|estas|ese|esa|esos|esas|aquel|aquella|aquellos|aquellas)$/, tag: 'DET_DEM' },
  { rx: /^(?:su|sus|tu|tus|mi|mis|nuestro|nuestra|nuestros|nuestras)$/, tag: 'DET_POS' },
  { rx: /^(?:es|son|era|eran|fue|fueron|ser|sea|sean|siendo|sido)$/, tag: 'V_SER' },
  { rx: /^(?:esta|estan|estaba|estaban|estar|este|esten)$/, tag: 'V_ESTAR' },
  { rx: /^(?:tiene|tienen|tenia|tenian|tener|tenga|tengan)$/, tag: 'V_TENER' },
  { rx: /^(?:puede|pueden|podria|podrian|poder|pueda|puedan)$/, tag: 'V_PODER' },
  { rx: /^(?:suele|suelen|solia|solian|soler)$/, tag: 'V_SOLER' },
  { rx: /^(?:debe|deben|deberia|deberian|deber|deba|deban)$/, tag: 'V_DEBER' },
  {
    rx: /^(?:hace|hacen|permite|permiten|ofrece|ofrecen|resulta|resultan|conviene|convienen|evita|evitan|aporta|aportan|brinda|brindan)$/,
    tag: 'V_SUP'
  },
  { rx: /^(?:no|nunca|jamas|tampoco|apenas)$/, tag: 'NEG' },
  { rx: /^(?:pero|aunque|embargo|obstante|cambio|mientras|sino)$/, tag: 'CONJ_ADV' },
  { rx: /^(?:porque|debido|eso|pues)$/, tag: 'CONJ_CAUS' }
];

const EXACT_FUNCTION_WORDS = new Set([
  'de', 'a', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'desde',
  'hacia', 'hasta', 'frente', 'que', 'y', 'e', 'o', 'u', 'si', 'como',
  'cuando', 'donde', 'se', 'le', 'les', 'lo', 'te', 'nos', 'tambien',
  'ademas', 'mas', 'menos', 'muy', 'tan', 'tanto', 'todo', 'toda', 'todos',
  'todas', 'cada', 'otro', 'otra', 'otros', 'otras'
]);

const KNOWN_EYEWEAR_BRANDS = [
  'ray-ban', 'persol', 'gucci', 'chloé', 'chloe', 'prada', 'dior', 'oakley',
  'carrera', 'tom ford', 'moscot', 'oliver peoples', 'tous', 'furla', 'guess',
  'chopard', 'swarovski', 'longchamp', 'kenzo', 'lozza', 'hanukeii', 'hawkers',
  'polaroid', 'arnette', 'vouge', 'vogue', 'versace', 'celine', 'balenciaga',
  'police', 'maui jim', 'serengeti', 'costa', 'etnia barcelona', 'kaleos',
  'mr. boho', 'd.franklin', 'le specs', 'komono', 'gigi studios', 'ralph',
  'michael kors', 'emporio armani', 'giorgio armani', 'burberry', 'coach',
  'hugo boss', 'lacoste', 'dolce', 'gabbana', 'carolina herrera', 'loewe',
  'indo', 'lodi', 'andy wolf', 'essilor', 'zeiss', 'hoya'
];

const KNOWN_EYEWEAR_BRAND_RXS = KNOWN_EYEWEAR_BRANDS.map((brand) => {
  const cleanB = brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const esc = cleanB.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { brand, rx: new RegExp(`\\b${esc}\\b`, 'i') };
});

const AI_CLICHE_PATTERNS = [
  /\ben resumen\b/i,
  /\ben conclusi[oó]n\b/i,
  /\ben definitiva\b/i,
  /\bcabe destacar\b/i,
  /\bno cabe duda\b/i,
  /\bsin lugar a dudas\b/i,
  /\bes fundamental\b/i,
  /\bequilibrio perfecto\b/i,
  /\ben el mundo actual\b/i,
  /\buna opci[oó]n ideal para todos\b/i
];

const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'with', 'for', 'that', 'this', 'are', 'your', 'from',
  'glasses', 'sunglasses', 'lenses', 'frame', 'frames', 'which', 'because'
]);

function stripAccents(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenizeWords(text) {
  return stripAccents(text)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function extractRhetoricalBlueprint(text, atoms = null, paraTopology = null) {
  const s = String(text || '').trim();
  const sentences = splitSentences(s);
  const wordCount = tokenizeWords(s).length;
  const sentenceLengths = sentences.map(sent => tokenizeWords(sent).length);
  const avgSentenceWords = sentences.length
    ? Number((wordCount / sentences.length).toFixed(1))
    : wordCount;

  const rstRelations = [];
  if (/\b(?:pero(?!\s+a\s+la\s+vez)|sin\s+embargo|aunque|en\s+cambio|mientras\s+que|no\s+obstante|a\s+cambio\s+de|frente\s+a|a\s+diferencia\s+de)\b/i.test(s)) {
    rstRelations.push('ADVERSATIVE_CONTRAST');
  }
  if (/\b(?:porque|ya\s+que|debido\s+a|por\s+eso|por\s+lo\s+que|lo\s+que\s+permite|hace\s+que|provoca|obliga\s+a|de\s+modo\s+que|gracias\s+a)\b/i.test(s)) {
    rstRelations.push('CAUSAL_MECHANISM');
  }
  if (/\b(?:conviene\s+evitar|evitar(?:las|los)?|nunca\s+(?:debes|deben|uses?|utilices?)|no\s+(?:deben|debes|son\s+(?:apt|recomend|permit)|conviene)|descartar|prohibid\w*|inconveniente|desventaja|problema|peligro|riesgo|cuidado\s+con)\b/i.test(s)) {
    rstRelations.push('NEGATIVE_WARNING');
  }
  if (/\b(?:si\s+tienes|si\s+necesitas|si\s+vas\s+a|si\s+buscas|cuando\s+se\s+trata)\b/i.test(s)) {
    rstRelations.push('CONDITIONAL_FRAME');
  }
  if (/\b(?:m[aá]s\s+[a-záéíóúüñ]+\s+que|mejor\s+[a-záéíóúüñ]*\s*que|menos\s+[a-záéíóúüñ]+\s+que|el\s+triple\s+que|en\s+comparaci[oó]n)\b/i.test(s)) {
    rstRelations.push('COMPARATIVE_EVAL');
  }
  if (/\b(?:combinan|incorporan|ofrecen|cuentan\s+con|se\s+corta\s+a\s+partir\s+de|suelen\s+llevar|terminan|constan\s+de)\b/i.test(s)) {
    rstRelations.push('ENUMERATION_SPEC');
  }

  const hasNegativeWarning = Boolean(
    atoms?.signedPolarity?.hasNegativeWarning ||
    rstRelations.includes('NEGATIVE_WARNING')
  );

  return {
    sentences,
    sentenceCount: sentences.length,
    wordCount,
    sentenceLengths,
    avgSentenceWords,
    rstRelations,
    hasNegativeWarning,
    discourseRole: paraTopology?.role || 'SECTION_MEDIAL',
    punctuation: {
      comma: (s.match(/,/g) || []).length,
      semicolon: (s.match(/;/g) || []).length,
      colon: (s.match(/:/g) || []).length,
      question: (s.match(/\?/g) || []).length,
      exclamation: (s.match(/!/g) || []).length
    }
  };
}

function extractFunctionWordSkeleton(text) {
  const s = stripAccents(text);
  const rawTokens = s.match(/[a-z0-9]+|[,;:.!?]/g) || [];
  const skeleton = [];

  for (const tok of rawTokens) {
    if (/^[,;:.!?]$/.test(tok)) {
      skeleton.push(tok);
      continue;
    }
    if (tok === 'al') {
      skeleton.push('a', 'DET_DEF');
      continue;
    }
    if (tok === 'del') {
      skeleton.push('de', 'DET_DEF');
      continue;
    }
    let matchedTag = null;
    for (const rule of CLOSED_CLASS_RULES) {
      if (rule.rx.test(tok)) {
        matchedTag = rule.tag;
        break;
      }
    }
    if (matchedTag) {
      skeleton.push(matchedTag);
    } else if (EXACT_FUNCTION_WORDS.has(tok)) {
      skeleton.push(tok);
    }
  }
  return skeleton;
}

function computeNormalizedLCS(seqA, seqB) {
  const a = Array.isArray(seqA) ? seqA : [];
  const b = Array.isArray(seqB) ? seqB : [];
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) {
    return { lcsLength: 0, f1: 0, recallDonor: 0, precisionCand: 0 };
  }

  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    const ai = a[i - 1];
    for (let j = 1; j <= m; j++) {
      if (ai === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = dp[i - 1][j] >= dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1];
      }
    }
  }

  const lcsLength = dp[n][m];
  const recallDonor = Number((lcsLength / n).toFixed(4));
  const precisionCand = Number((lcsLength / m).toFixed(4));
  const f1 = lcsLength > 0
    ? Number(((2 * lcsLength) / (n + m)).toFixed(4))
    : 0;

  return { lcsLength, f1, recallDonor, precisionCand };
}

function buildCleanSentenceWindow(rawText, targetWords, minWords, maxWords, allowTrailingColon = false) {
  const sents = splitSentences(rawText);
  if (!sents.length) return '';

  const fullText = sents.join(' ');
  const fullWc = tokenizeWords(fullText).length;
  if (fullWc >= minWords && fullWc <= maxWords) {
    if (!/\.\.\.$|…$/.test(fullText) && (allowTrailingColon || !/:$/.test(fullText))) {
      return fullText;
    }
  }

  let best = '';
  let bestDist = Infinity;

  for (let start = 0; start < sents.length; start++) {
    const first = sents[start];
    if (/^(?:o\s+(?:con|de|en|para|por|si|quiz[aá])|y\s+(?:es\s+que|con)|para\s+eso,|hacen\s+que|pero\s+si\s+no|adem[aá]s,|sin\s+embargo,|por\s+eso,)/i.test(first)) {
      continue;
    }
    let acc = '';
    let accWords = 0;
    for (let end = start; end < sents.length; end++) {
      const piece = sents[end];
      if (/\.\.\.$|…$/.test(piece) || (!allowTrailingColon && /:$/.test(piece))) break;
      acc = acc ? `${acc} ${piece}` : piece;
      accWords += tokenizeWords(piece).length;
      if (accWords > maxWords) break;
      if (accWords >= minWords) {
        const dist = Math.abs(accWords - targetWords);
        if (dist < bestDist) {
          bestDist = dist;
          best = acc;
        }
      }
    }
  }
  return best;
}

function detectUnrequestedBrands(text, referenceTexts = []) {
  const lowCand = stripAccents(text);
  const lowRef = Array.isArray(referenceTexts) ? referenceTexts.map(stripAccents).join(' ') : stripAccents(referenceTexts);
  const leaked = [];
  for (const entry of KNOWN_EYEWEAR_BRAND_RXS) {
    if (entry.rx.test(lowCand) && !entry.rx.test(lowRef)) {
      leaked.push(entry.brand);
    }
  }
  return leaked;
}

function extractDomainTopicTokens(text) {
  const stop = new Set([...EXACT_FUNCTION_WORDS, 'gafa', 'gafas', 'sol', 'lente', 'lentes', 'montura', 'monturas', 'esta', 'este', 'son', 'ser', 'tiene', 'pueden', 'puede']);
  return new Set(
    tokenizeWords(text)
      .filter(w => w.length >= 4 && !stop.has(w) && !CLOSED_CLASS_RULES.some(r => r.rx.test(w)))
  );
}

function selectStructuralScaffolds({
  rawPara,
  atoms,
  frame,
  heading = '',
  paraTopology,
  masterBricks,
  usedDonorIds = new Set(),
  factualGuard,
  discourseTopology,
  enterpriseRetriever = null,
  domainId = 'optica',
  activeSubdomains = null,
  topK = 3
}) {
  if (!Array.isArray(masterBricks) || !masterBricks.length) return [];
  const srcBlueprint = extractRhetoricalBlueprint(rawPara, atoms, paraTopology);
  const srcWc = Math.max(12, srcBlueprint.wordCount);
  const minW = Math.max(18, Math.round(srcWc * 0.58));
  const maxW = Math.min(115, Math.round(srcWc * 1.55));
  const allowColon = /:$/.test(String(rawPara || '').trim());
  const srcLower = String(rawPara || '').toLowerCase();
  const srcTopicTokens = extractDomainTopicTokens(rawPara);
  const activeSubs = activeSubdomains || domainRegistry.detectActiveSubdomains(`${heading || ''} ${rawPara || ''}`, domainId);

  const wantsSports = /\b(?:ciclismo|bici|bicicleta|deportiv|running|senderismo|esqu[ií]|monta[ñn]a|n[aá]utic|golf|acu[aá]tic)\b/i.test(srcLower);
  const wantsKids = /\b(?:niñ[oa]s?|peques|beb[eé]s?|infantil)\b/i.test(srcLower);
  const isTechOrMaterialPara = /\b(?:progresiv|ocupacional|ordenador|fresad|inyectad|planchas|calor|acetato|mineral|policarbonato|fotocrom|polarizad)\b/i.test(srcLower);
  const srcAnchors = Array.isArray(atoms?.discriminativeAnchors) ? atoms.discriminativeAnchors : [];
  const reqTechKeys = new Set(srcAnchors.filter(a => a.category === 'LENS_TECH').map(a => a.key));
  const isTechPara = Boolean(
    srcAnchors.length > 0 ||
    /\b(?:polarizad|fotocrom|progresiv|ocupacional|mineral|policarbonato|acetato|inyectad|meflecto|calor|puente)\b/i.test(srcLower)
  );
  const hybridQueryProfile = (enterpriseRetriever && enterpriseRetriever.isIndexed)
    ? enterpriseRetriever.analyzeQuery(`${heading || ''} ${rawPara || ''}`.trim(), frame, atoms)
    : null;
  const brandRefList = [rawPara, heading, ...(atoms?.brand_models || [])];

  const technicalFrames = new Set([
    'OPTICAL_PROTECTION',
    'LENS_PROPERTIES',
    'MATERIAL_COMPOSITION',
    'PRODUCT_FACTUAL',
    'MECHANICAL_FUNCTION'
  ]);

  const candidates = [];

  for (const b of masterBricks) {
    if (!b || b.exclude_from_humanization) continue;
    const bId = b.brick_id || b.golden_id || b.donor_id;
    if (!bId || usedDonorIds.has(bId)) continue;
    if (b.domain && b.domain !== domainId) continue;
    if (b.subdomain && !domainRegistry.isSubdomainCompatible(b.subdomain, activeSubs, domainId)) continue;

    const raw = String(b.raw_text || b.text || '');
    if (!raw.trim() || /[\uFFFD\u05f4]|[\u0590-\u06ff\u0400-\u04ff]/.test(raw)) continue;
    if (/[“”"@]/.test(raw)) continue;

    const purity = factualGuard.assessDomainPurity
      ? factualGuard.assessDomainPurity(raw, { domainId, activeSubdomains: activeSubs })
      : factualGuard.assessOpticalDomainPurity(raw, activeSubs);
    if (!purity.isCleanOptical) continue;

    const allowsClinicalOrAudio = activeSubs instanceof Set && (activeSubs.has('OPTICAL_CLINICAL') || activeSubs.has('AUDIOLOGY'));
    const rLow = raw.toLowerCase();
    if (
      /^\d+[ºª.)]\s/.test(raw.trim()) ||
      /\b\d{2,}\s+(?:colores|tonos|modelos|gafas|monturas|opciones|razones|consejos)\b/i.test(rLow) ||
      /\b(?:a[ñn]adir al carrito|ver cat[aá]logo|consulta nuestro ranking|gu[ií]a de compra|consejos para elegir|saber c[oó]mo elegir)\b/i.test(rLow) ||
      /\b(?:yo\s+(?:creo|pienso|tengo|prefiero|quiero|uso)|quiero\s+desmentir|mis\s+anteriores|compr[eé]|me\s+encanta|me\s+gusta|a\s+m[ií]\s+me)\b/i.test(rLow) ||
      /\bque\s+la\s+lente\s+un\s+tama[ñn]o\b/i.test(rLow) ||
      (!allowsClinicalOrAudio && /\b(?:cl[ií]nica|miop[ií]a|astigmatismo|ojo vago|estrabismo|ambliop[ií]a|cataratas|glaucoma|colirio|oftalm[oó]logo|estos\s+pacientes)\b/i.test(rLow)) ||
      /\b(?:alfombra\s+roja|hollywood|instagram|famos[oa]s|celebrities)\b/i.test(rLow) ||
      (!/\bdioptr[ií]as?\b/i.test(srcLower) && /\bdioptr[ií]as?\b/i.test(rLow)) ||
      (!/\b(?:lentes?\s+de\s+contacto|lentillas?)\b/i.test(srcLower) && /\b(?:lentes?\s+de\s+contacto|lentillas?)\b/i.test(rLow)) ||
      (!/\b(?:carnavales?|halloween)\b/i.test(srcLower) && /\b(?:carnavales?|halloween)\b/i.test(rLow))
    ) {
      continue;
    }

    const foreignSkus = raw.match(/\b(?:[A-Z]{2,3}\d{3,4}[A-Z]*|RB\d{4}[A-Z]*|PO\d{4}[A-Z]*|PLD\s*\d{4})\b/g);
    if (foreignSkus && foreignSkus.some(code => !srcLower.includes(code.toLowerCase()))) {
      continue;
    }

    const years = raw.match(/\b(19\d\d|20[0-2]\d)\b/g);
    if (years && years.some(y => !srcLower.includes(y))) {
      continue;
    }

    if (!wantsSports && /\b(?:ciclismo|practicar\s+ciclismo|golf|acu[aá]tic[oa]s?|monta[ñn]ismo|running|senderismo|esqu[ií]|tenis)\b/i.test(rLow)) {
      continue;
    }
    if (!wantsKids && /\b(?:peques|niñ[oa]s?|beb[eé]s?)\b/i.test(rLow)) {
      continue;
    }

    const cleanTextRaw = buildCleanSentenceWindow(raw, srcWc, minW, maxW, allowColon);
    if (!cleanTextRaw) continue;
    let cleanText = cleanTextRaw
      .replace(/^(?:Cristal\s+mineral|Material\s+org[aá]nico|Policarbonato)\s*:\s*/i, '')
      .replace(/\s+,/g, ',')
      .replace(/\s+\./g, '.')
      .trim();
    if (cleanText.length > 1) {
      cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
    }

    if (/^(?:\d+[ºª.)]\s|o\s+(?:con|de|en|para|por|si|quiz[aá])|para\s+eso,|hacen\s+que|pero\s+si\s+no|te\s+hace\s+ser)/i.test(cleanText)) {
      continue;
    }
    if (/\bque\s+la\s+lente\s+un\s+tama[ñn]o\b/i.test(cleanText)) {
      continue;
    }
    if (detectUnrequestedBrands(cleanText, brandRefList).length > 0) {
      continue;
    }

    const donorBlueprint = extractRhetoricalBlueprint(cleanText, null, null);
    if (donorBlueprint.wordCount < minW || donorBlueprint.wordCount > maxW) continue;

    // 1. Semantic closeness + pre-covered anchors + competing LENS_TECH guard (-32..+42)
    let semScore = 0;
    if (hybridQueryProfile && enterpriseRetriever?.scoreCandidateHybrid) {
      const hybrid = enterpriseRetriever.scoreCandidateHybrid(hybridQueryProfile, b, cleanText);
      semScore = Math.min(34, Number((hybrid.denseCosine * 38 + Math.min(18, hybrid.bm25Score * 0.6)).toFixed(2)));
    } else {
      const donorTopics = extractDomainTopicTokens(cleanText);
      let topicHits = 0;
      for (const tk of srcTopicTokens) {
        if (donorTopics.has(tk)) topicHits++;
      }
      semScore = Math.min(24, topicHits * 5);
    }

    let matchedAnchorHits = 0;
    for (const anc of srcAnchors) {
      if (!anc?.verifyRx) continue;
      anc.verifyRx.lastIndex = 0;
      if (anc.verifyRx.test(cleanText)) matchedAnchorHits++;
    }
    const anchorBonus = Math.min(18, matchedAnchorHits * 9);

    const donorEntail = factualGuard.evaluateFactualEntailment
      ? factualGuard.evaluateFactualEntailment(rawPara, cleanText, atoms?.discriminativeAnchors, atoms?.signedPolarity)
      : { unrequestedTechLeak: false, polarityContradiction: false };
    let competingTechPenalty = 0;
    if (reqTechKeys.size > 0 && (donorEntail.unrequestedTechLeak || (/\blentillas?\b/i.test(cleanText) && !/\blentillas?\b/i.test(srcLower)))) {
      competingTechPenalty -= 32;
    }
    if (donorEntail.polarityContradiction) {
      competingTechPenalty -= 24;
    }
    if (isTechOrMaterialPara && b.frame === 'CARE_MAINTENANCE') {
      competingTechPenalty -= 10;
    }
    const axis1Score = Number((Math.min(42, semScore + anchorBonus) + competingTechPenalty).toFixed(2));

    // 2. Polarity & RST alignment (-24..+32)
    let rstScore = 0;
    const matchedRst = [];
    if (srcBlueprint.hasNegativeWarning) {
      if (
        donorBlueprint.hasNegativeWarning ||
        /\b(?:inconvenientes?|desventajas?|fr[aá]gil|pesad[oa]s?|evitar|no\s+son\s+recomendab|deform\w*|descascarill\w*|peligro|riesgo)\b/i.test(cleanText)
      ) {
        rstScore += 22;
        matchedRst.push('WARNING');
      } else if (/\b(?:muy\s+frescos|sofisticados|estampados\s+m[aá]s\s+originales|lucen\s+este\s+complemento|toque\s+de\s+color|otro\s+punto\s+a\s+su\s+favor|opci[oó]n\s+perfecta|toque\s+rock|te\s+encantar[aá]|sin\s+ning[uú]n\s+tipo\s+de\s+problema)\b/i.test(cleanText)) {
        rstScore -= 24;
      } else if (!donorBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST')) {
        rstScore -= 14;
      }
    }
    if (srcBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST') && donorBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST')) {
      rstScore += 12;
      matchedRst.push('CONTRAST');
    }
    if (srcBlueprint.rstRelations.includes('CAUSAL_MECHANISM') && donorBlueprint.rstRelations.includes('CAUSAL_MECHANISM')) {
      rstScore += 10;
      matchedRst.push('CAUSAL');
    }
    if (srcBlueprint.rstRelations.includes('COMPARATIVE_EVAL') && donorBlueprint.rstRelations.includes('COMPARATIVE_EVAL')) {
      rstScore += 8;
      matchedRst.push('COMPARE');
    }
    if (srcBlueprint.rstRelations.includes('CONDITIONAL_FRAME') && donorBlueprint.rstRelations.includes('CONDITIONAL_FRAME')) {
      rstScore += 4;
      matchedRst.push('COND');
    }
    if (srcBlueprint.rstRelations.includes('ENUMERATION_SPEC') && donorBlueprint.rstRelations.includes('ENUMERATION_SPEC')) {
      rstScore += 4;
      matchedRst.push('SPEC');
    }
    rstScore = Math.max(-24, Math.min(32, rstScore));

    // 3. Discourse metanarrative role (-12..+18)
    let topoScore = 0;
    if (discourseTopology) {
      const donorTopo = discourseTopology.analyzeBrickDiscourseProfile(
        cleanText,
        b.syntactic_skeleton || cleanText,
        b.slots
      );
      const compat = discourseTopology.scoreTopologyCompatibility(
        paraTopology?.role || 'SECTION_MEDIAL',
        donorTopo,
        frame
      );
      topoScore = Math.max(-12, Math.min(18, Number((compat.score * 0.7).toFixed(2))));
    }

    // 4. Sentence count & cadence isomorphism (-10..+18)
    const deltaSents = Math.abs(donorBlueprint.sentenceCount - srcBlueprint.sentenceCount);
    let cadenceScore = deltaSents === 0 ? 10 : (deltaSents === 1 ? 5 : -10);
    const wcRatio = donorBlueprint.wordCount / Math.max(1, srcWc);
    cadenceScore = Math.max(-10, Math.min(18, Number((cadenceScore + Math.max(0, 8 - Math.abs(1 - wcRatio) * 14)).toFixed(2))));

    // 5. Subdomain/Frame purity & slot readiness (0..10)
    let frameSlotScore = 0;
    if (b.subdomain && activeSubs.has(b.subdomain)) frameSlotScore += 3;
    if (isTechPara && technicalFrames.has(b.frame)) frameSlotScore += 4;
    else if (b.frame === frame) frameSlotScore += 3;
    if (Array.isArray(b.slots) && b.slots.length >= 1) frameSlotScore += 3;
    frameSlotScore = Math.min(10, frameSlotScore);

    const scaffoldScore = Number((axis1Score + rstScore + topoScore + cadenceScore + frameSlotScore).toFixed(2));
    candidates.push({
      brick: b,
      domain: b.source_domain || b.domain_source || 'corpus',
      cleanText,
      blueprint: donorBlueprint,
      scaffoldScore,
      matchSummary: `RST=[${matchedRst.join(',') || 'NEUTRAL'}] sents=${donorBlueprint.sentenceCount}/${srcBlueprint.sentenceCount} words=${donorBlueprint.wordCount}/${srcWc} sem=${semScore.toFixed(1)} anc=+${anchorBonus} pen=${competingTechPenalty} rst=${rstScore} topo=${topoScore} cad=${cadenceScore.toFixed(1)} frm=${frameSlotScore}`
    });
  }

  candidates.sort((a, b) => b.scaffoldScore - a.scaffoldScore);

  const selected = [];
  const usedDomains = new Set();
  for (const c of candidates) {
    if (usedDomains.has(c.domain)) continue;
    usedDomains.add(c.domain);
    selected.push(c);
    if (selected.length >= topK) break;
  }
  if (selected.length < topK) {
    for (const c of candidates) {
      if (!selected.includes(c)) {
        selected.push(c);
        if (selected.length >= topK) break;
      }
    }
  }
  return selected;
}

function describeDiscourseRole(role, heading) {
  const roleMap = {
    ARTICLE_INTRO: 'Apertura general del artículo (presenta el tema al lector con entrada autónoma).',
    SECTION_OPENING: 'Inicio de sección (abre un argumento o presenta un elemento nuevo bajo el encabezado).',
    SECTION_MEDIAL: 'Desarrollo intermedio (amplía, compara o explica un mecanismo causal concreto).',
    SECTION_CLOSING: 'Cierre de sección (sintetiza la consecuencia práctica, contrapartida o recomendación final).',
    SINGLETON: 'Párrafo autónomo único bajo el encabezado (se entiende completo sin depender de párrafos previos ni posteriores).'
  };
  const baseDesc = roleMap[role] || roleMap.SECTION_MEDIAL;
  return heading ? `${baseDesc} Encabezado actual: "${heading}".` : baseDesc;
}

function buildCarrilBFewShotMessages() {
  const demoUserPrompt = [
    'Transfiere hechos técnicos concretos dentro de la arquitectura sintáctica del TEXTO BASE HUMANO sin copiar redacciones literales de la ficha.',
    '',
    'FUNCIÓN EN EL METARRELATO:',
    'Cierre de sección (sintetiza la consecuencia práctica o limitación final).',
    '',
    'TEXTO BASE HUMANO (molde gramatical obligatorio):',
    '"Aunque este abrigo de lana abriga con eficacia en invierno, su peso elevado lo hace poco práctico en viajes largos; por eso muchos viajeros prefieren prendas más ligeras."',
    '',
    'HECHOS QUE DEBEN APARECER EN TU TEXTO:',
    '- Términos técnicos obligatorios: botas de cuero, membrana impermeable',
    '- Conceptos clave: suela rígida | caminar horas | peso extra',
    '- Advertencia o limitación en sentido negativo: evitar en senderismo ligero',
    '',
    'PAUTAS ESTRICTAS DE EDICIÓN MÍNIMA:',
    '1. Sustituye el tema del TEXTO BASE HUMANO por los hechos indicados manteniendo sus conectores lógicos, estructura y cadencia de oraciones.',
    '2. Mantén toda advertencia o prohibición en sentido explícitamente negativo.',
    '3. Responde solo con el párrafo final limpio en español.'
  ].join('\n');

  const demoAssistantReply = 'Aunque estas botas de cuero con membrana impermeable protegen con eficacia de la lluvia, su suela rígida y su peso extra las hacen poco prácticas al caminar horas; por eso conviene evitarlas en senderismo ligero.';

  return [
    { role: 'user', content: demoUserPrompt },
    { role: 'assistant', content: demoAssistantReply }
  ];
}

function buildDeLinearizedFactBullets(rawPara, atoms) {
  const factLines = [];
  const brandModels = Array.isArray(atoms?.brand_models) ? atoms.brand_models.filter(Boolean) : [];
  if (brandModels.length > 0) {
    factLines.push(`- Modelo exacto a mantener: ${brandModels.join(', ')}`);
  }

  const brandLowerSet = new Set(brandModels.map(b => stripAccents(b)));
  const anchors = Array.isArray(atoms?.discriminativeAnchors) ? atoms.discriminativeAnchors : [];
  const anchorLabels = anchors
    .map(a => String(a?.label || '').trim())
    .filter(lbl => lbl && !brandLowerSet.has(stripAccents(lbl)));
  if (anchorLabels.length > 0) {
    factLines.push(`- Términos técnicos obligatorios: ${anchorLabels.join(', ')}`);
  }

  const coveredNorms = new Set([
    ...brandLowerSet,
    ...anchorLabels.flatMap(l => stripAccents(l).split(/[\/,\s]+/)).filter(Boolean)
  ]);

  const conceptPills = [];
  const seenPills = new Set();
  const pushPill = (raw) => {
    const words = String(raw || '')
      .replace(/[.;:!?()"«»]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 3);
    if (!words.length) return;
    const pill = words.join(' ');
    const normTokens = words.map(w => stripAccents(w));
    if (normTokens.every(t => t.length < 3 || EXACT_FUNCTION_WORDS.has(t) || coveredNorms.has(t))) return;
    const key = normTokens.join(' ');
    if (seenPills.has(key)) return;
    seenPills.add(key);
    conceptPills.push(pill.toLowerCase());
  };

  if (typeof factualGuardMod.extractSpanishCompoundNPs === 'function') {
    for (const np of factualGuardMod.extractSpanishCompoundNPs(rawPara, 10)) {
      if (np?.label) pushPill(np.label);
    }
  }
  for (const m of (atoms?.materials || [])) pushPill(m);
  for (const o of (atoms?.outfits || [])) pushPill(o);
  for (const sh of (atoms?.shapes || [])) pushPill(sh);

  const extraWords = tokenizeWords(rawPara).filter(w =>
    w.length >= 5 &&
    !EXACT_FUNCTION_WORDS.has(w) &&
    !CLOSED_CLASS_RULES.some(r => r.rx.test(w)) &&
    !coveredNorms.has(w) &&
    !/^(?:embargo|precisamente|cambio|mucho|mejor|sobre|suelen|llevan|tienen|pueden|ofrece|combinan|resuelven|ampliando|resultan|bloquean|reaccionan)$/i.test(w)
  );
  for (const ew of extraWords) {
    if (conceptPills.length >= 7) break;
    const alreadyInPills = conceptPills.some(p => stripAccents(p).includes(ew));
    if (!alreadyInPills) pushPill(ew);
  }

  if (conceptPills.length > 0) {
    factLines.push(`- Conceptos clave: ${conceptPills.slice(0, 7).join(' | ')}`);
  }

  const sp = atoms?.signedPolarity || {};
  if (sp.positiveContexts?.length) {
    factLines.push(`- Contexto favorable: ${sp.positiveContexts.join(', ').toLowerCase()}`);
  }
  const negParts = [
    ...(sp.negativeContexts || []),
    ...(sp.negativeMaterials || [])
  ].map(x => String(x || '').toLowerCase()).filter(Boolean);
  if (negParts.length > 0) {
    factLines.push(`- Advertencia o limitación en sentido negativo: evitar o desaconsejar en ${[...new Set(negParts)].join(', ')}`);
  } else if (extractRhetoricalBlueprint(rawPara, atoms).hasNegativeWarning) {
    factLines.push('- Advertencia o limitación en sentido negativo: mantén la crítica, desgaste o restricción de uso sin suavizarla.');
  }

  return factLines.length ? factLines : ['- Conserva los conceptos técnicos principales del aviso.'];
}

function buildGuidedTransferPrompt({
  donorBase,
  rawPara,
  atoms,
  heading,
  paraTopology,
  blueprint,
  donorBlueprint,
  feedback = null
}) {
  const factLines = buildDeLinearizedFactBullets(rawPara, atoms);
  const activeBlueprint = blueprint || extractRhetoricalBlueprint(rawPara, atoms, paraTopology);
  const dBlueprint = donorBlueprint || extractRhetoricalBlueprint(donorBase, null, null);
  const feedbackBlock = feedback
    ? `\nAJUSTE OBLIGATORIO TRAS EL INTENTO ANTERIOR:\n${feedback}\n`
    : '';

  return `Transfiere hechos técnicos concretos dentro de la arquitectura sintáctica del TEXTO BASE HUMANO en español.

FUNCIÓN EN EL METARRELATO:
${describeDiscourseRole(paraTopology?.role || activeBlueprint.discourseRole, heading)}

TEXTO BASE HUMANO (molde gramatical obligatorio):
"${donorBase}"

HECHOS QUE DEBEN APARECER EN TU TEXTO:
${factLines.join('\n')}

PAUTAS ESTRICTAS DE EDICIÓN MÍNIMA:
1. Reemplaza el contenido del TEXTO BASE HUMANO por los hechos indicados arriba; no devuelvas el tema viejo del molde ni concatenes ambos textos.
2. Conserva la arquitectura de ${dBlueprint.sentenceCount} ${dBlueprint.sentenceCount === 1 ? 'oración' : 'oraciones'}, sus conectores lógicos ("aunque", "sin embargo", "debido a", "por eso", "si", "pero", "ya que"), el orden sintáctico y el ritmo del TEXTO BASE HUMANO, ajustando artículos, verbos, género y número solo lo mínimo indispensable.
3. Si los hechos incluyen una advertencia o prohibición, redacta la frase en sentido explícitamente negativo en español natural; nunca copies etiquetas de instrucción ni conviertas una advertencia en recomendación.
4. Prohibido añadir clichés de IA ("en resumen", "en conclusión", "cabe destacar", "en definitiva", "es fundamental", "equilibrio perfecto", "sin lugar a dudas"), títulos, viñetas, Markdown o comillas envolventes.
5. Responde únicamente con el párrafo final en español.
${feedbackBlock}`;
}

function maskMandatoryTerms(text, atoms, rawPara = '') {
  let out = stripAccents(text);
  const phraseSet = new Set();
  for (const sku of (atoms?.brand_models || [])) {
    if (sku) phraseSet.add(stripAccents(sku));
  }
  for (const pe of (atoms?.proper_entities || [])) {
    if (pe) phraseSet.add(stripAccents(pe));
  }
  for (const anc of (atoms?.discriminativeAnchors || [])) {
    if (anc?.label) {
      for (const part of String(anc.label).split('/')) {
        const clean = stripAccents(part).trim();
        if (clean.length >= 3) phraseSet.add(clean);
      }
    }
  }
  const srcForExtract = String(rawPara || text || '');
  const numSpecs = srcForExtract.match(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|m|nm|%|h|horas?|d[ií]as?|a[ñn]os?|g|gr|mg|kg|db|hz|khz|mhz|uv\s*\d+)\b/gi) || [];
  for (const ns of numSpecs) {
    phraseSet.add(stripAccents(ns).replace(/\s+/g, ' ').trim());
  }
  for (const np of factualGuardMod.extractSpanishCompoundNPs(srcForExtract, 8)) {
    const clean = stripAccents(np.label).trim();
    if (clean.length >= 5) phraseSet.add(clean);
  }
  const phrases = [...phraseSet].filter(Boolean).sort((a, b) => b.length - a.length);
  for (let i = 0; i < phrases.length; i++) {
    const p = phrases[i];
    const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    out = out.replace(new RegExp(`\\b${esc}\\b`, 'g'), ` mterm${i} `);
  }
  return out;
}

function computeTrigramOverlapAndMaxSpan(candStr, refStr) {
  const cw = tokenizeWords(candStr);
  const rw = tokenizeWords(refStr);
  if (cw.length < 3 || rw.length < 3) {
    return { trigramOverlap: 0, maxContiguousSpan: 0 };
  }

  const refTrigrams = new Set();
  for (let i = 0; i <= rw.length - 3; i++) {
    refTrigrams.add(`${rw[i]} ${rw[i + 1]} ${rw[i + 2]}`);
  }
  const candTrigrams = [];
  let matches = 0;
  for (let i = 0; i <= cw.length - 3; i++) {
    const tg = `${cw[i]} ${cw[i + 1]} ${cw[i + 2]}`;
    candTrigrams.push(tg);
    if (refTrigrams.has(tg)) matches++;
  }
  const trigramOverlap = candTrigrams.length
    ? Number((matches / candTrigrams.length).toFixed(4))
    : 0;

  let maxSpan = 0;
  const dp = Array.from({ length: cw.length + 1 }, () => new Uint16Array(rw.length + 1));
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= rw.length; j++) {
      if (cw[i - 1] === rw[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxSpan) maxSpan = dp[i][j];
      }
    }
  }

  return { trigramOverlap, maxContiguousSpan: maxSpan };
}

function computeContentWordRetention(candidate, donorBase) {
  const donorTokens = [...extractDomainTopicTokens(donorBase)];
  if (!donorTokens.length) return 0;
  const candSet = new Set(tokenizeWords(candidate));
  let kept = 0;
  for (const tk of donorTokens) {
    if (candSet.has(tk)) kept++;
  }
  return Number((kept / donorTokens.length).toFixed(4));
}

function judgeCarrilBCandidate({
  candidate,
  donorBase,
  rawPara,
  atoms,
  heading = '',
  factualGuard,
  discourseTopology,
  paraTopology,
  domainId = 'optica',
  activeSubdomains = null,
  baselineEntailment = null
}) {
  const candTrim = String(candidate || '').trim();
  const failedGates = [];
  const feedbackParts = [];

  // Gate M1: Grammatical skeleton preservation (function words + structural punctuation LCS)
  const donorSkel = extractFunctionWordSkeleton(donorBase);
  const candSkel = extractFunctionWordSkeleton(candTrim);
  const lcs = computeNormalizedLCS(donorSkel, candSkel);
  if (lcs.f1 < 0.42) {
    failedGates.push('LOW_SKELETON_LCS');
    feedbackParts.push('Conserva mucho más los conectores, preposiciones, artículos y la estructura sintáctica del TEXTO BASE HUMANO sin reescribir libremente.');
  }

  // Gate M2: Sentence cadence & balanced punctuation
  const donorSents = splitSentences(donorBase);
  const candSents = splitSentences(candTrim);
  const donorWords = tokenizeWords(donorBase).length;
  const candWords = tokenizeWords(candTrim).length;
  const sentenceCountDelta = Math.abs(candSents.length - donorSents.length);
  const wordRatio = Number((candWords / Math.max(1, donorWords)).toFixed(3));
  const openParen = (candTrim.match(/\(/g) || []).length;
  const closeParen = (candTrim.match(/\)/g) || []).length;
  const openQ = (candTrim.match(/¿/g) || []).length;
  const closeQ = (candTrim.match(/\?/g) || []).length;
  const openE = (candTrim.match(/¡/g) || []).length;
  const closeE = (candTrim.match(/!/g) || []).length;

  if (
    candSents.length === 0 ||
    sentenceCountDelta > 1 ||
    wordRatio < 0.52 ||
    wordRatio > 1.85 ||
    candWords < 14 ||
    !/[.!?]$/.test(candTrim) ||
    openParen !== closeParen ||
    openQ !== closeQ ||
    openE !== closeE
  ) {
    failedGates.push('CADENCE_ISOMORPHISM');
    feedbackParts.push(`Mantén el mismo número de oraciones (${donorSents.length}) y extensión equilibrada, terminando siempre con punto final completo.`);
  }

  // Gate M3: Factual entailment & signed polarity
  const entail = factualGuard.evaluateFactualEntailment(
    rawPara,
    candTrim,
    atoms?.discriminativeAnchors,
    atoms?.signedPolarity
  );
  const activeAnchorCount = entail.anchorCount || 0;
  const covFloor = activeAnchorCount >= 4 ? 0.60 : 0.68;

  if (entail.polarityContradiction) {
    failedGates.push('POLARITY_CONTRADICTION');
    feedbackParts.push(`No contradigas ni inviertas la polaridad de la ficha (${(entail.contradictionDetails || []).join(', ')}).`);
  }
  if (entail.missingCriticalTech?.length > 0) {
    failedGates.push('MISSING_CRITICAL_TECH');
    feedbackParts.push(`Incluye obligatoriamente estos elementos técnicos exactos: ${entail.missingCriticalTech.join(', ')}.`);
  }
  if (entail.missingSafetyWarning) {
    failedGates.push('MISSING_SAFETY_WARNING');
    feedbackParts.push(`Falta la advertencia explícita en forma negativa sobre: ${entail.unwarnedNegativeContexts.join(', ')}.`);
  }
  if (entail.unrequestedTechLeak) {
    failedGates.push('UNREQUESTED_TECH_LEAK');
    feedbackParts.push(`Elimina tecnologías ópticas no pedidas en la ficha (${entail.unrequestedTechLeaks.join(', ')}).`);
  }
  if (activeAnchorCount > 0 && entail.anchorCoverageRatio < covFloor) {
    failedGates.push('LOW_FACTUAL_COVERAGE');
    feedbackParts.push(`Incorpora los hechos y mecanismos pendientes: ${(entail.missingAnchors || []).join(', ')}.`);
  }
  if (
    baselineEntailment &&
    typeof baselineEntailment.entailmentScore === 'number' &&
    baselineEntailment.entailmentScore < 100 &&
    entail.entailmentScore <= baselineEntailment.entailmentScore
  ) {
    failedGates.push('NO_FACTUAL_GAIN_OVER_CARRIL_A');
    feedbackParts.push('Integra todos los datos técnicos y restricciones que faltan en el borrador base.');
  }

  // Gate M4: Divergence vs rawPara (masked technical terms)
  const maskedCand = maskMandatoryTerms(candTrim, atoms, rawPara);
  const maskedSrc = maskMandatoryTerms(rawPara, atoms, rawPara);
  const maskedStats = computeTrigramOverlapAndMaxSpan(maskedCand, maskedSrc);
  const rawStats = computeTrigramOverlapAndMaxSpan(candTrim, rawPara);

  if (
    maskedStats.trigramOverlap > 0.38 ||
    rawStats.trigramOverlap > 0.52 ||
    maskedStats.maxContiguousSpan >= 6
  ) {
    failedGates.push('SOURCE_SYNTAX_COPY');
    feedbackParts.push('Evita copiar secuencias de frases de los DATOS FÁCTICOS DE REFERENCIA; encaja cada dato dentro de la sintaxis del TEXTO BASE HUMANO.');
  }

  // Gate M5: AI style & domain purity
  const purity = factualGuard.assessDomainPurity
    ? factualGuard.assessDomainPurity(candTrim, { domainId, activeSubdomains })
    : factualGuard.assessOpticalDomainPurity(candTrim, activeSubdomains);
  const hasCliche = AI_CLICHE_PATTERNS.some(rx => rx.test(candTrim) && !rx.test(donorBase));
  const hasPromptLeak = /\*\*|^#+\s|\bTEXTO BASE HUMANO\b|\bFICHA DE HECHOS\b|\bAquí tienes\b|\bPárrafo final\s*:|\bEVITAR\s*\/\s*NO\s+USAR\b|\bDato\s+\d+\s*:|\bConceptos clave\s*:|\bTérminos técnicos obligatorios\s*:|\bModelo exacto a mantener\s*:/i.test(candTrim);
  const hasForeignChars = /[\u4e00-\u9fff\u0400-\u04ff]/.test(candTrim);
  const rawCandWords = tokenizeWords(candTrim);
  const allowedRefWords = new Set(tokenizeWords(`${rawPara} ${donorBase} ${heading || ''}`));
  const englishHits = rawCandWords.filter(w => ENGLISH_STOPWORDS.has(w) && !allowedRefWords.has(w)).length;
  const leakedBrands = detectUnrequestedBrands(candTrim, [rawPara, donorBase, heading, ...(atoms?.brand_models || [])]);
  const materialRedundancy = discourseTopology
    ? discourseTopology.hasContrastiveMaterialRedundancy('', rawPara, atoms, candTrim)
    : false;

  if (hasCliche) {
    failedGates.push('AI_STYLE_CLICHE');
    feedbackParts.push('Elimina expresiones cliché de IA (como "en resumen", "en conclusión", "cabe destacar", "es fundamental").');
  }
  if (hasPromptLeak || hasForeignChars || englishHits >= 2) {
    failedGates.push('PROMPT_OR_LANG_LEAK');
    feedbackParts.push('Devuelve exclusivamente un párrafo limpio en español sin encabezados, notas, ni palabras en otros idiomas.');
  }
  if (!purity.isCleanOptical) {
    failedGates.push('OPTICAL_DOMAIN_IMPURITY');
    feedbackParts.push('Mantén el vocabulario dentro del dominio limpio sin intrusiones ajenas.');
  }
  if (leakedBrands.length > 0) {
    failedGates.push('UNREQUESTED_BRAND_LEAK');
    feedbackParts.push(`Elimina marcas no solicitadas: ${leakedBrands.join(', ')}.`);
  }
  if (materialRedundancy) {
    failedGates.push('CONTRASTIVE_MATERIAL_REDUNDANCY');
    feedbackParts.push('No contrapongas materiales equivalentes (como acetato frente a celulosa o pasta) si el origen trata una sola familia.');
  }

  // Gate M6: Donor adaptation check (tolerant when donor was already semantically close)
  const rawTopicTokens = extractDomainTopicTokens(rawPara);
  const donorTopicTokens = [...extractDomainTopicTokens(donorBase)];
  const alienTokens = donorTopicTokens.filter(t => !rawTopicTokens.has(t));
  const candWordSet = new Set(tokenizeWords(candTrim));
  const keptAlien = alienTokens.filter(tk => candWordSet.has(tk)).length;
  const alienRetention = alienTokens.length > 0 ? Number((keptAlien / alienTokens.length).toFixed(4)) : 0;
  const donorRawOverlap = computeTrigramOverlapAndMaxSpan(candTrim, donorBase).trigramOverlap;
  const donorContentRetention = computeContentWordRetention(candTrim, donorBase);
  if (
    ((baselineEntailment?.entailmentScore ?? 0) < 75 && alienTokens.length >= 4 && alienRetention > 0.85) ||
    (donorRawOverlap > 0.85 && entail.entailmentScore <= (baselineEntailment?.entailmentScore ?? 0))
  ) {
    failedGates.push('UNCHANGED_DONOR');
    feedbackParts.push('Adapta los conceptos del TEXTO BASE HUMANO incorporando los datos técnicos de la ficha en lugar de repetir el molde casi intacto.');
  }

  const approved = failedGates.length === 0;
  const score = Number((
    lcs.f1 * 38 +
    entail.entailmentScore * 0.45 +
    (1 - maskedStats.trigramOverlap) * 17 -
    failedGates.length * 20
  ).toFixed(2));

  return {
    approved,
    score,
    failedGates,
    feedbackForRetry: [...new Set(feedbackParts)].join(' '),
    metrics: {
      functionSkeletonLCS: lcs.f1,
      functionSkeletonRecall: lcs.recallDonor,
      functionSkeletonPrecision: lcs.precisionCand,
      sentenceCountDelta,
      wordRatio,
      anchorCoverageRatio: entail.anchorCoverageRatio,
      entailmentScore: entail.entailmentScore,
      missingCriticalTech: entail.missingCriticalTech || [],
      missingAnchors: entail.missingAnchors || [],
      missingSafetyWarning: Boolean(entail.missingSafetyWarning),
      polarityContradiction: Boolean(entail.polarityContradiction),
      maskedSourceTrigramOverlap: maskedStats.trigramOverlap,
      rawSourceTrigramOverlap: rawStats.trigramOverlap,
      maxSourceCopySpan: maskedStats.maxContiguousSpan,
      donorContentRetention
    }
  };
}

async function runCarrilBForParagraph({
  rawPara,
  atoms,
  frame,
  heading,
  paraTopology,
  masterBricks,
  usedDonorIds,
  factualGuard,
  discourseTopology,
  enterpriseRetriever = null,
  domainId = 'optica',
  activeSubdomains = null,
  ollamaClient,
  cleanResponseFn,
  modelName = 'qwen2.5:1.5b',
  baselineEntailment = null,
  qwenStats = null,
  log = () => {}
}) {
  const scaffolds = selectStructuralScaffolds({
    rawPara,
    atoms,
    frame,
    heading,
    paraTopology,
    masterBricks,
    usedDonorIds,
    factualGuard,
    discourseTopology,
    enterpriseRetriever,
    domainId,
    activeSubdomains,
    topK: 3
  });

  if (!scaffolds.length) {
    return {
      approved: false,
      status: 'NO_SCAFFOLD',
      attempts: [],
      scaffold: null,
      judge: null,
      text: ''
    };
  }

  const blueprint = extractRhetoricalBlueprint(rawPara, atoms, paraTopology);
  const fewShotMessages = buildCarrilBFewShotMessages();
  const attempts = [];
  const tempPlan = [
    { scaffoldIdx: 0, temp: 0.20 },
    { scaffoldIdx: 0, temp: 0.30 },
    { scaffoldIdx: scaffolds.length > 1 ? 1 : 0, temp: 0.24 },
    { scaffoldIdx: scaffolds.length > 1 ? 1 : 0, temp: 0.32 }
  ];

  let lastFeedback = null;
  let lastScaffoldIdx = -1;
  let bestRejected = null;

  for (let i = 0; i < tempPlan.length; i++) {
    const { scaffoldIdx, temp } = tempPlan[i];
    const activeScaffold = scaffolds[scaffoldIdx];
    if (scaffoldIdx !== lastScaffoldIdx) {
      lastFeedback = null;
      lastScaffoldIdx = scaffoldIdx;
    }

    const prompt = buildGuidedTransferPrompt({
      donorBase: activeScaffold.cleanText,
      rawPara,
      atoms,
      heading,
      paraTopology,
      blueprint,
      donorBlueprint: activeScaffold.blueprint,
      feedback: lastFeedback
    });

    const numPredict = Math.min(340, Math.max(220, Math.round(activeScaffold.blueprint.wordCount * 4.5)));
    const systemPrompt = 'Eres un editor lingüístico de precisión en español. Tu tarea es transferir datos técnicos exactos dentro de un texto humano base conservando al máximo su arquitectura gramatical, sus conectores y su naturalidad, sin inventar información ni copiar frases literales de los datos de referencia.';

    try {
      const res = await ollamaClient.generate(modelName, prompt, {
        system: systemPrompt,
        fewShotMessages,
        temperature: temp,
        top_p: 0.88,
        num_ctx: 2048,
        num_predict: numPredict,
        cleanPlainText: true
      });

      if (qwenStats) {
        qwenStats.calls += 1;
        qwenStats.totalDurationMs += res.durationMs || 0;
        qwenStats.totalTokens += res.eval_count || 0;
      }

      let candidateText = typeof cleanResponseFn === 'function'
        ? cleanResponseFn(res.response)
        : String(res.response || '').trim();
      candidateText = candidateText.replace(/^["«“]|["»”]$/g, '').replace(/\s+/g, ' ').trim();

      const judge = judgeCarrilBCandidate({
        candidate: candidateText,
        donorBase: activeScaffold.cleanText,
        rawPara,
        atoms,
        heading,
        factualGuard,
        discourseTopology,
        paraTopology,
        domainId,
        activeSubdomains,
        baselineEntailment
      });

      const attemptEntry = {
        attempt: i + 1,
        scaffoldId: activeScaffold.brick.brick_id,
        scaffoldDomain: activeScaffold.domain,
        scaffoldScore: activeScaffold.scaffoldScore,
        temperature: temp,
        durationMs: res.durationMs || 0,
        text: candidateText,
        approved: judge.approved,
        failedGates: judge.failedGates,
        metrics: judge.metrics,
        score: judge.score
      };
      attempts.push(attemptEntry);

      log(`[CARRIL_B] Intento ${i + 1}/4 | Andamio ${activeScaffold.brick.brick_id} (${activeScaffold.domain}) | LCS=${judge.metrics.functionSkeletonLCS} | Entail=${judge.metrics.entailmentScore} | SrcMask3g=${judge.metrics.maskedSourceTrigramOverlap} | ${judge.approved ? 'APROBADO' : `RECHAZADO [${judge.failedGates.join(', ')}]`}`);

      if (judge.approved) {
        return {
          approved: true,
          status: 'APPROVED',
          text: candidateText,
          scaffold: activeScaffold,
          judge,
          attempts
        };
      }

      lastFeedback = judge.feedbackForRetry;
      if (!bestRejected || judge.score > bestRejected.judge.score) {
        bestRejected = {
          text: candidateText,
          scaffold: activeScaffold,
          judge
        };
      }
    } catch (err) {
      if (qwenStats) qwenStats.failures += 1;
      attempts.push({
        attempt: i + 1,
        scaffoldId: activeScaffold.brick.brick_id,
        scaffoldDomain: activeScaffold.domain,
        temperature: temp,
        approved: false,
        failedGates: ['OLLAMA_ERROR'],
        error: err.message
      });
      log(`[CARRIL_B_ERROR] Intento ${i + 1}/4 falló (${err.message})`);
    }
  }

  return {
    approved: false,
    status: 'REJECTED_FALLBACK',
    text: '',
    scaffold: bestRejected?.scaffold || scaffolds[0],
    bestRejected,
    judge: bestRejected?.judge || null,
    attempts
  };
}

module.exports = {
  extractRhetoricalBlueprint,
  extractFunctionWordSkeleton,
  computeNormalizedLCS,
  selectStructuralScaffolds,
  buildCarrilBFewShotMessages,
  buildDeLinearizedFactBullets,
  buildGuidedTransferPrompt,
  maskMandatoryTerms,
  judgeCarrilBCandidate,
  runCarrilBForParagraph
};
