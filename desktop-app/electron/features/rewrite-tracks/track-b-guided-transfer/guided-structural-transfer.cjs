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
  /\buna opci[oó]n ideal para todos\b/i,
  /\bdise[ñn]o innovador\b/i,
  /\bse vuelve especialmente importante\b/i,
  /\beficazmente\b/i,
  /\bminimizar el\b/i,
  /\bpara seguir reduciendo\b/i,
  /\bmediante la medici[oó]n de\b/i,
  /\bcombinando\s+[^,.]{3,40}\s+con\s+este\b/i,
  /\bel auge de\b/i,
  /\bpieza clave\b/i,
  /\bcomplemento vital\b/i,
  /\bsoluci[oó]n ideal\b/i,
  /\bexplora estas\b/i,
  /\bbrinda[ns]?\s+(?:un|una)\b/i,
  /\b[aá]rea extensa\b/i,
  /\bresulta vital\b/i,
  /\btales (?:modificaciones|procesos|ajustes)\b/i,
  /\best[aá]n compuestos de\b/i,
  /\bdestaca por su tecnolog[ií]a\b/i,
  /\bsalvaguard\w*/i,
  /\bmitigando los efectos\b/i,
  /\bdesaf[ií]a la rutina\b/i
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
  if (/\b(?:pero(?!\s+a\s+la\s+vez)|sin\s+embargo|aunque|en\s+cambio|mientras\s+que|no\s+obstante|a\s+cambio\s+de|a\s+diferencia\s+de)\b/i.test(s)) {
    rstRelations.push('ADVERSATIVE_CONTRAST');
  }
  if (/\b(?:porque|ya\s+que|debido\s+a|por\s+eso|por\s+lo\s+que|lo\s+que\s+permite|hace\s+que|provoca|obliga\s+a|de\s+modo\s+que|gracias\s+a)\b/i.test(s)) {
    rstRelations.push('CAUSAL_MECHANISM');
  }
  if (/\b(?:conviene\s+evitar\w*|evita\s+(?:usar|utilizar|comprar|llevar|elegir)|nunca\s+(?:debes|deben|uses?|utilices?)|no\s+(?:deben|debes|emplees|uses?|utilices?|son\s+(?:apt|recomend|permit)|est[aá]n\s+permitid|conviene(?!\s+olvidar))|no\s+se\s+oscurec\w*|no\s+funcion\w*|no\s+llevan\s+graduaci[oó]n|menos\s+campo\s+[uú]til|no\s+son\s+permitid\w*|impide\s+que\s+(?:se\s+oscurezc|penetr)|prohibid\w*|inconvenientes?|desventajas?|peligro|riesgo|cuidado\s+con|baja\s+calidad|deform\w*|descascarill\w*|quebradiz\w*|apretar|pellizcar|se[ñn]ales\s+marcadas|se\s+resbal\w*|molestias?\s+(?:oculares?|en\s+la\s+nariz)|demasiado\s+(?:r[ií]gid|pesad|estrech|grande|anch|oscur)|tienden\s+a\s+romperse|muy\s+pesad\w*|muy\s+fr[aá]gil)\b/i.test(s)) {
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

const FINITE_SCAFFOLD_VERB_RX = /(?:\b(?:es|son|est[aá]n?|era[ns]?|fue(?:ron)?|ser[aáeé]n?|sea[ns]?|hay|ha[ns]?|hemos|tiene[ns]?|puede[ns]?|podemos|suele[ns]?|debe[ns]?|hace[ns]?|da[ns]?|va[ns]?|viene[ns]?|encaja[ns]?|destaca[ns]?|aporta[ns]?|ofrece[ns]?|permite[ns]?|favorece[ns]?|queda[ns]?|sienta[ns]?|pasa[ns]?|resulta[ns]?|combina[ns]?|protege[ns]?|busca[ns]?|crea[ns]?|logra[ns]?|lleva[ns]?|luce[ns]?|marca[ns]?|define[ns]?|adapta[ns]?|ajusta[ns]?|evita[ns]?|impide[ns]?|bloquea[ns]?|filtra[ns]?|reduce[ns]?|mejora[ns]?|conviene[ns]?|ayuda[ns]?|depende[ns]?|garantiza[ns]?|emplea[ns]?|usa[ns]?|incorpora[ns]?|cuenta[ns]?|exige[ns]?|requiere[ns]?|existe[ns]?)\b|\b[a-záéíóúüñ]{3,}(?:amos|emos|imos|aron|ieron|aban|ían|arán|erán|irán|aría[ns]?)\b)/i;

function isValidStandaloneScaffoldSentence(sent, isFirstSentence = false) {
  const s = String(sent || '').trim();
  if (!s) return false;
  // Reject mini-FAQ question headers ("¿Qué evitar?", "¿Cómo elegir?")
  if (/^¿[^?]{1,32}\?$/.test(s)) return false;
  // Reject incomplete conditional protasis with no comma ("Si las monturas definen el estilo.")
  if (/^si\s+[^,;]+[.!?]$/i.test(s)) return false;
  // Reject gerund-only or orphan subordinate fragments ("Y armonizando con...", "Porque de su...")
  if (/^(?:y|o|e|u)\s+[a-záéíóúüñ]+(?:ando|iendo)\b/i.test(s)) return false;
  if (isFirstSentence && /^(?:porque|ya\s+que|puesto\s+que|dado\s+que|que\s+|o\s+(?:con|de|en|para|por|si|quiz[aá])|y\s+(?:es\s+que|con|as[ií]|adem[aá]s)|para\s+eso,|hacen\s+que|pero\s+si\s+no|adem[aá]s,|sin\s+embargo,|por\s+eso,)/i.test(s)) {
    return false;
  }
  if (!FINITE_SCAFFOLD_VERB_RX.test(s)) return false;
  return true;
}

function buildCleanSentenceWindow(rawText, targetWords, minWords, maxWords, allowTrailingColon = false) {
  // Strip leading mini-FAQ headers like "¿Qué evitar? " before splitting
  const cleanedRaw = String(rawText || '').replace(/^\s*¿[^?]{1,28}\?\s+/, '');
  const sents = splitSentences(cleanedRaw);
  if (!sents.length) return '';

  const fullAllValid = sents.every((st, idx) => isValidStandaloneScaffoldSentence(st, idx === 0));
  const fullText = sents.join(' ');
  const fullWc = tokenizeWords(fullText).length;
  if (fullAllValid && fullWc >= minWords && fullWc <= maxWords) {
    if (!/\.\.\.$|…$/.test(fullText) && (allowTrailingColon || !/:$/.test(fullText))) {
      return fullText;
    }
  }

  let best = '';
  let bestDist = Infinity;

  for (let start = 0; start < sents.length; start++) {
    const first = sents[start];
    if (!isValidStandaloneScaffoldSentence(first, true)) {
      continue;
    }
    let acc = '';
    let accWords = 0;
    for (let end = start; end < sents.length; end++) {
      const piece = sents[end];
      if (!isValidStandaloneScaffoldSentence(piece, end === start)) break;
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

const GENERIC_SCAFFOLD_GLUE = new Set([
  ...EXACT_FUNCTION_WORDS,
  'gafa', 'gafas', 'sol', 'lente', 'lentes', 'montura', 'monturas', 'cristal', 'cristales',
  'vista', 'ojos', 'mirada', 'visual', 'visuales', 'optica', 'optico', 'opticas', 'opticos',
  'estilo', 'modelo', 'modelos', 'forma', 'formas', 'diseno', 'calidad', 'uso', 'usar', 'usos',
  'llevar', 'elegir', 'tipo', 'tipos', 'parte', 'caso', 'casos', 'hora', 'horas', 'dia', 'dias',
  'vez', 'veces', 'gran', 'bien', 'mejor', 'mejores', 'mayor', 'menor', 'poco', 'poca', 'mucho',
  'mucha', 'mismo', 'misma', 'modo', 'manera', 'nivel', 'punto', 'puntos', 'tiempo', 'momento',
  'hecho', 'falta', 'cuenta', 'cambio', 'ademas', 'sino', 'solo', 'toda', 'todo', 'todos', 'todas',
  'esta', 'este', 'estos', 'estas', 'son', 'ser', 'tiene', 'tienen', 'pueden', 'puede', 'hacer',
  'hace', 'hacen', 'resulta', 'resultan', 'ofrece', 'ofrecen', 'permite', 'permiten', 'evitar',
  'riesgo', 'problema', 'problemas', 'ventaja', 'ventajas', 'opcion', 'opciones', 'ejemplo'
]);

function extractDomainTopicTokens(text) {
  return new Set(
    tokenizeWords(text)
      .filter(w => w.length >= 4 && !GENERIC_SCAFFOLD_GLUE.has(w) && !CLOSED_CLASS_RULES.some(r => r.rx.test(w)))
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
  const maxW = Math.min(120, Math.round(srcWc * 1.75));
  const allowColon = /:$/.test(String(rawPara || '').trim());
  const srcLower = String(rawPara || '').toLowerCase();
  const srcTopicTokens = extractDomainTopicTokens(rawPara);
  const activeSubs = activeSubdomains || domainRegistry.detectActiveSubdomains(`${heading || ''} ${rawPara || ''}`, domainId);

  const wantsSports = /\b(?:ciclismo|bici|bicicleta|deportiv|running|senderismo|esqu[ií]|monta[ñn]a|n[aá]utic|golf|acu[aá]tic)\b/i.test(srcLower);
  const wantsKids = /\b(?:niñ[oa]s?|peques|beb[eé]s?|infantil)\b/i.test(srcLower);
  const isTechOrMaterialPara = /\b(?:progresiv|ocupacional|ordenador|fresad|inyectad|planchas|calor|acetato|mineral|policarbonato|fotocrom|polarizad|puente|nariz|tabique|peso|ultraliger|estrech)\b/i.test(srcLower);
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
    'MECHANICAL_FUNCTION',
    'ANATOMICAL_FIT'
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
      (!/\b(?:diabetes|glucosa|insulina|colesterol|hipertensi[oó]n|dieta)\b/i.test(srcLower) && /\b(?:diabetes|diab[eé]tic[oa]s?|glucosa|insulina|colesterol|hipertensi[oó]n|dieta\s+y\s+ejercicio|az[uú]car\s+en\s+sangre)\b/i.test(rLow)) ||
      (!/\b(?:madre|padre|regal|navidad|reyes)\b/i.test(srcLower) && /\b(?:tu\s+madre|d[ií]a\s+de\s+la\s+madre|d[ií]a\s+del\s+padre|regalar\w*|regalos?|navidad|reyes\s+magos|amigo\s+invisible|black\s+friday|rebajas)\b/i.test(rLow)) ||
      (!/\b(?:quemar|quemadur|temperatura|calor\s+extremo|salpicadero)\b/i.test(srcLower) && /\b(?:quemarte|quemaduras?|expuestas?\s+al\s+calor|cuidado\s+con\s+las\s+temperaturas|salpicadero)\b/i.test(rLow)) ||
      (!/\b(?:conduc|coche|volante|carretera|veh[ií]culo)\b/i.test(srcLower) && /\b(?:al\s+volante|sufrir\s+accidentes|cansancio\s+del\s+conductor|conducci[oó]n\s+mucho\s+m[aá]s\s+segura)\b/i.test(rLow)) ||
      (!/\b(?:low\s*cost|barat|econ[oó]mic|precio)\b/i.test(srcLower) && /\b(?:low\s*cost|precios?\s+muy\s+econ[oó]micos?|gafas\s+baratas)\b/i.test(rLow)) ||
      /\b(?:hip-hop|raperos?)\b/i.test(rLow) ||
      /\b(?:p[aá]rrafo\s+anterior|siguiente\s+p[aá]rrafo|siguiente\s+apartado|como\s+vimos\s+antes|en\s+este\s+post|en\s+este\s+art[ií]culo|en\s+este\s+cat[aá]logo|presentamos\s+los\s+modelos|ya\s+dec[ií]amos\s+que|como\s+ya\s+dijimos|estar[ií]amos\s+hablando\s+de)\b/i.test(rLow) ||
      /\b(?:alfombra\s+roja|hollywood|instagram|famos[oa]s|celebrities)\b/i.test(rLow) ||
      (!/\bdioptr[ií]as?\b/i.test(srcLower) && /\bdioptr[ií]as?\b/i.test(rLow)) ||
      (!/\b(?:lentes?\s+de\s+contacto|lentillas?)\b/i.test(srcLower) && /\b(?:lentes?\s+de\s+contacto|lentillas?)\b/i.test(rLow)) ||
      (!/\b(?:carnavales?|halloween)\b/i.test(srcLower) && /\b(?:carnavales?|halloween)\b/i.test(rLow)) ||
      (!/\b(?:buceo|nataci[oó]n|piscina)\b/i.test(srcLower) && /\b(?:gafas?\s+de\s+buceo|antifog|sello\s+ce|referencia\s+iso)\b/i.test(rLow)) ||
      /\b(?:mariah\s+carey|good\s+morning\s+britain|annalynne|reese\s+witherspoon|paula\s+echevarr[ií]a|dicho\s+esto|vamos\s+con\s+la\s+informaci[oó]n\s+que\s+est[aá]s\s+esperando|un\s+saludo|el\s+precio\s+aproximados|l[aá]grimas?\s+artificial(?:es)?|embarazo|eritema|quemaduras\s+solares|cross\s+linking|pendiente\s+roza|mi\s+primera\s+gafa|solo\s+encuentro\s+un\s+problema|nues-tros|exprimera\s+dama|cgcoo|colegios?\s+de\s+[oó]pticos|opticalia|dos\s+por\s+uno|lavaplatos|mascarilla|ritmos?\s+circadianos?|alteraci[oó]n\s+visual|riesgo\s+secundario|p[ií]denos\s+cita|llamando\s+al\s+tel[eé]fono|formulario\s+de\s+contacto|\d{9})\b/i.test(rLow) ||
      (!/\b(?:limpi|jab[oó]n|grifo|funda|agua\s+del\s+mar)\b/i.test(srcLower) && /\b(?:agua\s+del\s+mar|cuando\s+limpies\s+las\s+gafas|bajo\s+el\s+grifo|gota\s+de\s+jab[oó]n|productos?\s+abrasivos?)\b/i.test(rLow)) ||
      (!/\bmigra[ñn]as?\b/i.test(srcLower) && /\bmigra[ñn]as?\b/i.test(rLow)) ||
      (!/\b(?:millones|miles)\b/i.test(srcLower) && /\b\d{2,}\s+(?:millones|miles)\s+de\s+personas\b/i.test(rLow)) ||
      /\b(?:steve\s+mcqueen|mcqueen|boeing|stearman|pilotar|rey\s+de\s+lo\s+cool|edici[oó]n\s+especial|colecci[oó]n\s+consiste\s+en|manicuras?|working\s+girl|borrado\s+de\s+memoria|empezamos\s+hablando\s+de)\b/i.test(rLow)
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

    if (!wantsSports && /\b(?:deportes?|ciclismo|practicar\s+ciclismo|golf|acu[aá]tic[oa]s?|monta[ñn]ismo|running|senderismo|esqu[ií]|tenis)\b/i.test(rLow)) {
      continue;
    }
    if (!wantsKids && /\b(?:peques|m[aá]s\s+peque[ñn]os|niñ[oa]s?|beb[eé]s?|infantil|gorros|viseras|hij[oa]s?)\b/i.test(rLow)) {
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

    // 1. Semantic closeness + pre-covered anchors + competing LENS_TECH guard (-32..+58)
    let semScore = 0;
    if (hybridQueryProfile && enterpriseRetriever?.scoreCandidateHybrid) {
      const hybrid = enterpriseRetriever.scoreCandidateHybrid(hybridQueryProfile, b, cleanText);
      semScore = Math.min(42, Number((hybrid.denseCosine * 46 + Math.min(20, hybrid.bm25Score * 0.7)).toFixed(2)));
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
    const anchorBonus = Math.min(36, matchedAnchorHits * 12);

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
      competingTechPenalty -= 14;
    }
    const axis1Score = Number((Math.min(68, semScore + anchorBonus) + competingTechPenalty).toFixed(2));

    // 2. Polarity & RST alignment con piso semántico (-24..+24)
    let rstScore = 0;
    const matchedRst = [];
    if (srcBlueprint.hasNegativeWarning) {
      if (
        donorBlueprint.hasNegativeWarning ||
        /\b(?:apretar|pellizcar|se[ñn]ales\s+marcadas|se\s+resbal\w*|no\s+llevan\s+graduaci[oó]n|menos\s+campo\s+[uú]til|no\s+son\s+permitid\w*|inconvenientes?|desventajas?|fr[aá]gil|muy\s+pesad|conviene\s+evitar\w*|no\s+(?:son|est[aá]n)\s+(?:recomendab|permitid|apt)|prohibid\w*|no\s+se\s+oscurec|no\s+funcion|deform\w*|descascarill\w*|quebradiz\w*|baja\s+calidad|tienden\s+a\s+romperse|demasiado\s+(?:r[ií]gid|pesad|estrech|oscur))\b/i.test(cleanText)
      ) {
        rstScore += 16;
        matchedRst.push('WARNING');
      } else if (/\b(?:muy\s+frescos|sofisticados|estampados\s+m[aá]s\s+originales|lucen\s+este\s+complemento|toque\s+de\s+color|otro\s+punto\s+a\s+su\s+favor|opci[oó]n\s+perfecta|toque\s+rock|te\s+encantar[aá]|sin\s+ning[uú]n\s+tipo\s+de\s+problema|favorit[oa]s|oto[ñn]o\s+e\s+invierno|looks?\s+m[aá]s\s+arriesgados|tendencias?\s+m[aá]s\s+sobrias|m[aá]s\s+favorecedoras|est[aá]s\s+de\s+suerte)\b/i.test(cleanText)) {
        rstScore -= 24;
      } else if (!donorBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST')) {
        rstScore -= 14;
      }
    }
    if (srcBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST') && donorBlueprint.rstRelations.includes('ADVERSATIVE_CONTRAST')) {
      rstScore += 8;
      matchedRst.push('CONTRAST');
    }
    if (srcBlueprint.rstRelations.includes('CAUSAL_MECHANISM') && donorBlueprint.rstRelations.includes('CAUSAL_MECHANISM')) {
      rstScore += 7;
      matchedRst.push('CAUSAL');
    }
    if (srcBlueprint.rstRelations.includes('COMPARATIVE_EVAL') && donorBlueprint.rstRelations.includes('COMPARATIVE_EVAL')) {
      rstScore += 5;
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
    if (rstScore > 0 && semScore < 18 && anchorBonus === 0) {
      rstScore = Number((rstScore * 0.35).toFixed(2));
    }
    rstScore = Math.max(-24, Math.min(24, rstScore));

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
    if (srcBlueprint.sentenceCount >= 2 && donorBlueprint.sentenceCount >= 2 && donorBlueprint.avgSentenceWords <= 32) {
      cadenceScore += 5;
    } else if (donorBlueprint.sentenceCount === 1 && donorBlueprint.wordCount >= 55) {
      cadenceScore -= 8;
    }
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
    'Aunque este abrigo de lana abriga con eficacia en invierno, su peso elevado lo hace poco práctico en viajes largos; por eso muchos viajeros prefieren prendas más ligeras.',
    '',
    'HECHOS QUE DEBEN APARECER EN TU TEXTO:',
    '- Términos técnicos obligatorios: botas de cuero, membrana impermeable',
    '- Conceptos clave: suela rígida | caminar horas | peso extra',
    '- Límites / advertencias (expresar en sentido negativo natural): senderismo ligero | peso extra',
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

function compressRelationalProposition(clauseText) {
  // De-linearize into telegraphic relational notation so LLM preserves 100% of causal/comparative relations without echoing source syntax
  return String(clauseText || '')
    .replace(/^(?:Por\s+(?:otro\s+lado|su\s+parte|ello|eso|lo\s+tanto|consiguiente)|Sin\s+embargo|No\s+obstante|En\s+(?:cambio|definitiva|resumen|conclusi[oó]n)|Cabe\s+destacar\s+que|Es\s+importante\s+(?:se[ñn]alar|recordar|mencionar)\s+que|Adem[aá]s|Asimismo),?\s+/i, '')
    .replace(/\b(?:aunque|pero|mientras\s+que)\s+/gi, '[CONTRASTE] ')
    .replace(/\b(?:porque|ya\s+que|debido\s+a\s+que|puesto\s+que)\s+/gi, '[CAUSA] ')
    .replace(/\b(?:dentro\s+del|en\s+el\s+interior\s+del)\s+/gi, 'en ')
    .replace(/\b(?:el|la|los|las|un|una|unos|unas|su|sus|este|esta|estos|estas)\s+/gi, '')
    .replace(/\s+\b(?:y|e)\b\s+/gi, ' + ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDeLinearizedFactBullets(rawPara, atoms) {
  const factLines = [];
  const brandModels = Array.isArray(atoms?.brand_models) ? atoms.brand_models.filter(Boolean) : [];
  if (brandModels.length > 0) {
    factLines.push(`- Modelo exacto a mantener: ${brandModels.join(', ')}`);
  }

  const brandLowerSet = new Set(brandModels.map(b => stripAccents(b)));
  const anchors = Array.isArray(atoms?.discriminativeAnchors) ? atoms.discriminativeAnchors : [];
  const rawLowerNorm = stripAccents(rawPara);
  const pickCleanAnchorLabel = (rawLbl) => {
    const lbl = String(rawLbl || '').trim();
    if (!lbl.includes('/')) return lbl;
    const parts = lbl.split('/').map(s => s.trim()).filter(Boolean);
    if (!parts.length) return lbl;
    const matchedPart = parts.find(p => rawLowerNorm.includes(stripAccents(p)));
    return matchedPart || parts[0];
  };

  const intrinsicAnchors = anchors.filter(a => !a?.isComparatorFoil);
  const foilAnchors = anchors.filter(a => a?.isComparatorFoil);

  const anchorLabels = intrinsicAnchors
    .map(a => pickCleanAnchorLabel(a?.label))
    .filter(lbl => lbl && !brandLowerSet.has(stripAccents(lbl)));
  if (anchorLabels.length > 0) {
    factLines.push(`- Términos técnicos obligatorios del sujeto: ${anchorLabels.join(', ')}`);
  }

  const foilLabels = [
    ...foilAnchors.map(a => pickCleanAnchorLabel(a?.label)),
    ...(Array.isArray(atoms?.compared_against) ? atoms.compared_against : [])
  ].map(s => String(s || '').trim()).filter(Boolean);
  const dedupFoils = [];
  for (const fl of foilLabels) {
    const fn = stripAccents(fl);
    if (!dedupFoils.some(prev => stripAccents(prev).includes(fn) || fn.includes(stripAccents(prev)))) {
      dedupFoils.push(fl);
    }
  }
  if (dedupFoils.length > 0) {
    factLines.push(`- Elemento de comparación externa (NO es componente del modelo; úsalo solo como contraste comparativo): ${dedupFoils.join(', ')}`);
  }

  // Extraer proposiciones relacionales completas para impedir inversión de causalidad, comparaciones o advertencias
  const rawClauses = String(rawPara || '')
    .split(/(?:[.;!?]+|\s+(?=(?:aunque|pero|sin\s+embargo|mientras\s+que|por\s+eso|por\s+lo\s+que|ya\s+que|porque|debido\s+a)\b))/i)
    .map(compressRelationalProposition)
    .filter(c => c.split(/\s+/).filter(Boolean).length >= 3);

  if (rawClauses.length > 0) {
    const propNotes = rawClauses.slice(0, 5).map((cl, idx) => `  (${idx + 1}) ${cl}`);
    factLines.push(`- Hechos y relaciones lógicas a expresar (reescríbelos con tus propias palabras dentro de la estructura del TEXTO BASE HUMANO, sin copiar frases literales):\n${propNotes.join('\n')}`);
  }

  const sp = atoms?.signedPolarity || {};
  const srcTokensForAccents = String(rawPara || '').match(/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]+/g) || [];
  const normAccentMap = new Map();
  for (const tk of srcTokensForAccents) {
    const k = stripAccents(tk);
    if (k && !normAccentMap.has(k)) normAccentMap.set(k, tk.toLowerCase());
  }
  const restoreAccentsFromSource = (term) => String(term || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => normAccentMap.get(stripAccents(w)) || w.toLowerCase())
    .join(' ');

  const negAccented = [
    ...(sp.negativeContexts || []),
    ...(sp.negativeMaterials || [])
  ].map(restoreAccentsFromSource).filter(Boolean);
  if (negAccented.length > 0) {
    factLines.push(`- Límites / advertencias obligatorias en sentido negativo: ${[...new Set(negAccented)].join(' | ')}`);
  } else if (extractRhetoricalBlueprint(rawPara, atoms).hasNegativeWarning) {
    factLines.push('- Límites / advertencias obligatorias en sentido negativo: mantén la restricción, contrapartida o desgaste sin suavizarlo ni invertirlo.');
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

  return `Transfiere los hechos técnicos indicados dentro de la arquitectura sintáctica y el ritmo del TEXTO BASE HUMANO en español.

FUNCIÓN EN EL METARRELATO:
${describeDiscourseRole(paraTopology?.role || activeBlueprint.discourseRole, heading)}

TEXTO BASE HUMANO (molde rítmico y sintáctico):
${donorBase}

HECHOS Y RELACIONES QUE DEBEN APARECER EN TU TEXTO:
${factLines.join('\n')}

PAUTAS ESTRICTAS DE TRANSFERENCIA ESTRUCTURAL:
1. Sustituye por completo los sustantivos y predicados del tema viejo del TEXTO BASE HUMANO por los hechos actuales; NO dejes rastros temáticos del molde viejo ni copies tramos de 8 o más palabras literales seguidas del TEXTO BASE HUMANO.
2. Conserva la arquitectura de ${dBlueprint.sentenceCount} ${dBlueprint.sentenceCount === 1 ? 'oración' : 'oraciones'}, los conectores ("aunque", "sin embargo", "debido a", "por eso", "si", "pero", "ya que") y la cadencia humana del TEXTO BASE HUMANO, reformulando los hechos sin calcar las frases de la lista de hechos.
3. Respeta exactamente quién posee cada propiedad en las comparaciones, incluye tanto las ventajas como los inconvenientes de los hechos y expresa toda advertencia o limitación de forma directa y clara en negativo (jamás uses dobles negaciones confusas como "evita que falle en quienes no tengan...").
4. Prohibido añadir clichés de IA ("en resumen", "en conclusión", "cabe destacar", "en definitiva", "es fundamental", "equilibrio perfecto", "sin lugar a dudas", "eficazmente", "diseño innovador"), referencias a otros párrafos ("como vimos antes", "en el párrafo anterior"), títulos, viñetas, Markdown o comillas envolventes.
5. Responde únicamente con el párrafo final limpio en español.
${feedbackBlock}`;
}

function computeDonorTokenPreservation(candidate, donorBase) {
  const candTokens = tokenizeWords(candidate);
  const donorTokens = tokenizeWords(donorBase);
  if (!candTokens.length || !donorTokens.length) {
    return { candPreservation: 0, donorRecall: 0, newTokenRatio: 1 };
  }
  const donorFreq = new Map();
  for (const tk of donorTokens) {
    donorFreq.set(tk, (donorFreq.get(tk) || 0) + 1);
  }
  let kept = 0;
  for (const tk of candTokens) {
    const avail = donorFreq.get(tk) || 0;
    if (avail > 0) {
      kept++;
      donorFreq.set(tk, avail - 1);
    }
  }
  const candPreservation = Number((kept / candTokens.length).toFixed(4));
  const donorRecall = Number((kept / donorTokens.length).toFixed(4));
  const newTokenRatio = Number((1 - candPreservation).toFixed(4));
  return { candPreservation, donorRecall, newTokenRatio };
}

function buildPatchOnlyFewShotMessages() {
  const demoUserPrompt = [
    'Edita el TEXTO BASE HUMANO mediante PARCHES CORTOS en JSON para insertar únicamente los hechos solicitados sin reescribir las frases completas.',
    '',
    'FUNCIÓN EN EL METARRELATO:',
    'Cierre de sección (sintetiza la consecuencia práctica o limitación final).',
    '',
    'TEXTO BASE HUMANO (intocable fuera de los parches):',
    'Cuando sales al campo en invierno, un buen abrigo de lana te quita el frío sin agobiarte. Eso sí, si pesa demasiado acaba molestando al cabo de un rato y conviene dejarlo en casa para rutas largas.',
    '',
    'HECHOS QUE DEBEN APARECER TRAS APLICAR LOS PARCHES:',
    '- Términos técnicos obligatorios: botas de cuero, membrana impermeable',
    '- Conceptos clave: suela rígida | caminar horas | peso extra',
    '- Límites / advertencias (expresar en sentido negativo natural): senderismo ligero | peso extra',
    '',
    'REGLAS ESTRICTAS DE PARCHES:',
    '1. Devuelve exclusivamente un JSON con la clave "parches": una lista de entre 1 y 5 objetos {"buscar":"fragmento literal del texto base","reemplazar":"sustituto breve en español"}.',
    '2. Cada "buscar" debe aparecer literalmente en el TEXTO BASE HUMANO y jamás puede cruzar un punto, exclamación ni interrogación.',
    '3. Respeta el resto del TEXTO BASE HUMANO letra por letra, conservando sus puntos y el número exacto de oraciones (2 oraciones).',
    '4. Prohibido añadir clichés de IA ("diseño innovador", "eficazmente", "minimizar el", "se vuelve especialmente importante", "en conclusión", "cabe destacar") o barras inclinadas.',
    '5. Responde solo con el objeto JSON válido.'
  ].join('\n');

  const demoAssistantReply = JSON.stringify({
    parches: [
      {
        buscar: 'un buen abrigo de lana te quita el frío',
        reemplazar: 'unas buenas botas de cuero con membrana impermeable te protegen de la lluvia'
      },
      {
        buscar: 'si pesa demasiado acaba molestando al cabo de un rato',
        reemplazar: 'su suela rígida y su peso extra acaban cansando tras caminar horas'
      },
      {
        buscar: 'dejarlo en casa para rutas largas',
        reemplazar: 'evitarlas en senderismo ligero'
      }
    ]
  });

  return [
    { role: 'user', content: demoUserPrompt },
    { role: 'assistant', content: demoAssistantReply }
  ];
}

function buildPatchOnlyPrompt({
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

  return `Edita el TEXTO BASE HUMANO mediante PARCHES CORTOS en JSON para insertar únicamente los hechos solicitados sin reescribir las frases completas.

FUNCIÓN EN EL METARRELATO:
${describeDiscourseRole(paraTopology?.role || activeBlueprint.discourseRole, heading)}

TEXTO BASE HUMANO (intocable fuera de los parches):
${donorBase}

HECHOS QUE DEBEN APARECER TRAS APLICAR LOS PARCHES:
${factLines.join('\n')}

REGLAS ESTRICTAS DE PARCHES (MÁXIMA CONSERVACIÓN HUMANA):
1. Devuelve exclusivamente un JSON con la clave "parches": entre 1 y 4 objetos {"buscar":"fragmento literal del texto base","reemplazar":"sustituto breve y llano en español"}.
2. Cada "buscar" debe ser un tramo corto (de 2 a 9 palabras) copiado literalmente del TEXTO BASE HUMANO y nunca debe cruzar un punto, signo de exclamación ni interrogación.
3. Conserva INTACTO al menos el 60% de las palabras del TEXTO BASE HUMANO letra por letra y mantén exactamente ${dBlueprint.sentenceCount} ${dBlueprint.sentenceCount === 1 ? 'oración' : 'oraciones'}; cada "reemplazar" debe ser conciso (máximo 12 palabras) y encajar en género y número con las palabras humanas que quedan a sus lados.
4. Respeta quién posee cada propiedad en las comparaciones y redacta toda advertencia o prohibición de forma directa en sentido negativo ("no sirven para...", "evita...", "pesan más"), sin dobles negaciones.
5. En cada "reemplazar" usa español llano y cotidiano ("llevan", "tienen", "dan", "dejan", "pesan"); PROHIBIDO usar vocabulario artificial de IA ("brindan", "otorgan", "salvaguardan", "resulta vital", "pieza clave", "el auge de", "tales modificaciones", "diseño innovador", "eficazmente", "en conclusión", "cabe destacar") ni barras inclinadas ("/").
6. Responde únicamente con el JSON válido.
${feedbackBlock}`;
}

function applySurgicalPatches(donorBase, rawResponse, maxPatches = 4) {
  const base = String(donorBase || '').replace(/\s+/g, ' ').trim();
  let raw = String(rawResponse || '').trim()
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
    .replace(/^```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```$/i, '$1')
    .trim();

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      } catch {}
    }
  }

  const rawList = Array.isArray(parsed)
    ? parsed
    : (parsed?.parches || parsed?.reemplazos || parsed?.cambios || parsed?.edits || []);

  if (!Array.isArray(rawList) || rawList.length === 0) {
    return {
      text: base,
      patchesProposed: 0,
      patchesApplied: 0,
      patchesSkipped: 0,
      skippedReasons: ['INVALID_OR_EMPTY_JSON'],
      appliedList: [],
      preservation: computeDonorTokenPreservation(base, base)
    };
  }

  const skippedReasons = [];
  const acceptedSpans = [];
  const normEsc = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');

  for (const item of rawList.slice(0, maxPatches)) {
    if (!item || typeof item !== 'object') {
      skippedReasons.push('BAD_PATCH_OBJECT');
      continue;
    }
    let buscar = String(item.buscar ?? item.find ?? item.original ?? '').replace(/\s+/g, ' ').trim();
    let reemplazar = String(item.reemplazar ?? item.replace ?? item.nuevo ?? '').replace(/\s+/g, ' ').trim();
    if (!buscar || !reemplazar) {
      skippedReasons.push('EMPTY_SIDE');
      continue;
    }

    const trailSeek = buscar.match(/([.!?])$/);
    const trailRep = reemplazar.match(/([.!?])$/);
    if (trailSeek && trailRep && trailSeek[1] === trailRep[1]) {
      buscar = buscar.slice(0, -1).trim();
      reemplazar = reemplazar.slice(0, -1).trim();
    } else if (trailSeek && !/[.!?]/.test(reemplazar)) {
      buscar = buscar.slice(0, -1).trim();
    }

    if (!buscar || !reemplazar || buscar === reemplazar) {
      skippedReasons.push('NO_OP_PATCH');
      continue;
    }
    if (/[.!?]/.test(buscar) || /[.!?]/.test(reemplazar)) {
      skippedReasons.push('CROSSES_SENTENCE_BOUNDARY');
      continue;
    }

    const buscarWords = tokenizeWords(buscar).length;
    const repTokens = tokenizeWords(reemplazar);
    const repWords = repTokens.length;
    const nonCodeRepWords = repTokens.filter(t => !/\d/.test(t)).length;
    if (buscarWords === 0 || buscarWords > 14 || repWords === 0 || repWords > 20 || nonCodeRepWords > buscarWords + 10) {
      skippedReasons.push('PATCH_TOO_LONG');
      continue;
    }

    let matchStart = base.indexOf(buscar);
    let matchLen = buscar.length;
    if (matchStart === -1) {
      const ciRx = new RegExp(normEsc(buscar), 'i');
      const m = ciRx.exec(base);
      if (m) {
        matchStart = m.index;
        matchLen = m[0].length;
      }
    }

    if (matchStart === -1) {
      skippedReasons.push('SEEK_NOT_FOUND');
      continue;
    }
    const matchEnd = matchStart + matchLen;
    const overlapsExisting = acceptedSpans.some(sp => Math.max(sp.start, matchStart) < Math.min(sp.end, matchEnd));
    if (overlapsExisting) {
      skippedReasons.push('OVERLAPPING_PATCH');
      continue;
    }

    acceptedSpans.push({ start: matchStart, end: matchEnd, buscar, reemplazar });
  }

  if (acceptedSpans.length === 0) {
    return {
      text: base,
      patchesProposed: rawList.length,
      patchesApplied: 0,
      patchesSkipped: rawList.length,
      skippedReasons,
      appliedList: [],
      preservation: computeDonorTokenPreservation(base, base)
    };
  }

  const BOUNDARY_PREPS = new Set([
    'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en',
    'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'segun', 'sin',
    'sobre', 'tras'
  ]);

  acceptedSpans.sort((a, b) => a.start - b.start);
  let rebuilt = '';
  let cursor = 0;
  for (let idx = 0; idx < acceptedSpans.length; idx++) {
    const sp = acceptedSpans[idx];
    const between = base.slice(cursor, sp.start);
    rebuilt += between;
    let rep = sp.reemplazar.trim();

    // Soldadura general de borde izquierdo (evita palabras duplicadas o choque PREP+PREP)
    const leftMatch = rebuilt.match(/([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]+)(\s+)$/);
    const repHead = rep.match(/^([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]+)\s+([\s\S]+)$/);
    if (leftMatch && repHead) {
      const lw = stripAccents(leftMatch[1]);
      const rw = stripAccents(repHead[1]);
      if (lw === rw) {
        rep = repHead[2].trim();
      } else if (BOUNDARY_PREPS.has(lw) && BOUNDARY_PREPS.has(rw)) {
        rebuilt = rebuilt.slice(0, rebuilt.length - leftMatch[0].length);
        if (rebuilt.length > 0 && !/\s$/.test(rebuilt)) rebuilt += ' ';
      }
    }

    // Soldadura general de borde derecho (evita palabra duplicada o PREP colgante ante el sufijo)
    const nextLimit = idx + 1 < acceptedSpans.length ? acceptedSpans[idx + 1].start : base.length;
    const rightLookahead = base.slice(sp.end, nextLimit);
    const repTail = rep.match(/^([\s\S]+)\s+([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]+)$/);
    const rightMatch = rightLookahead.match(/^\s+([a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9]+)\b/);
    if (repTail && rightMatch) {
      const rtw = stripAccents(repTail[2]);
      const rhw = stripAccents(rightMatch[1]);
      if (rtw === rhw || (BOUNDARY_PREPS.has(rtw) && BOUNDARY_PREPS.has(rhw))) {
        rep = repTail[1].trim();
      }
    }

    const isSentStart = sp.start === 0 || /[.!?]\s+$/.test(base.slice(0, sp.start));
    if (isSentStart && rep.length > 0) {
      rep = rep.charAt(0).toUpperCase() + rep.slice(1);
    }
    rebuilt += rep;
    cursor = sp.end;
  }
  rebuilt += base.slice(cursor);

  const finalText = rebuilt
    .replace(/\b([a-záéíóúüñ]{2,})\s+\1\b/gi, '$1')
    .replace(/\ba el\b/g, 'al')
    .replace(/\bA el\b/g, 'Al')
    .replace(/\bde el\b/g, 'del')
    .replace(/\bDe el\b/g, 'Del')
    .replace(/\b(o)\s+((?:o|ó|ho|hó)[a-záéíóúüñ]+)/gi, (m, conj, nextW) => `${conj === 'O' ? 'U' : 'u'} ${nextW}`)
    .replace(/\b(y)\s+((?:i|í|hi|hí)(?![eaouáéóú])[a-záéíóúüñ]+)/gi, (m, conj, nextW) => `${conj === 'Y' ? 'E' : 'e'} ${nextW}`)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.\s*\./g, '.')
    .trim();

  return {
    text: finalText,
    patchesProposed: rawList.length,
    patchesApplied: acceptedSpans.length,
    patchesSkipped: Math.max(0, rawList.length - acceptedSpans.length),
    skippedReasons,
    appliedList: acceptedSpans.map(s => ({ buscar: s.buscar, reemplazar: s.reemplazar })),
    preservation: computeDonorTokenPreservation(finalText, base)
  };
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
  for (const ctxTerm of [
    ...(atoms?.signedPolarity?.negativeContexts || []),
    ...(atoms?.signedPolarity?.positiveContexts || [])
  ]) {
    const cleanCtx = stripAccents(ctxTerm).trim();
    if (cleanCtx.length >= 4) phraseSet.add(cleanCtx);
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
  let maxEndIdx = 0;
  const dp = Array.from({ length: cw.length + 1 }, () => new Uint16Array(rw.length + 1));
  for (let i = 1; i <= cw.length; i++) {
    for (let j = 1; j <= rw.length; j++) {
      if (cw[i - 1] === rw[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > maxSpan) {
          maxSpan = dp[i][j];
          maxEndIdx = i;
        }
      }
    }
  }

  const maxSpanPhrase = maxSpan > 0 ? cw.slice(maxEndIdx - maxSpan, maxEndIdx).join(' ') : '';
  return { trigramOverlap, maxContiguousSpan: maxSpan, maxSpanPhrase };
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

function hasTelegraphicKeywordSalad(candTrim, donorBase) {
  const checkSegments = (txt) => {
    const parts = String(txt || '').split(',').map(p => p.trim()).filter(Boolean);
    let run = 0;
    for (let i = 0; i < parts.length; i++) {
      const cleanSeg = parts[i].replace(/[.!?]+$/, '').trim();
      const segWords = cleanSeg.split(/\s+/).filter(Boolean);
      const hasConjunction = /\b(?:y|e|o|u|ni|pero|aunque|que|como)\b/i.test(cleanSeg);
      const isShortNominalTag = segWords.length >= 1 && segWords.length <= 2 && cleanSeg.length <= 18 && !hasConjunction;
      if (isShortNominalTag) {
        run++;
        if (run >= 3) return true;
      } else {
        run = 0;
      }
    }
    return false;
  };
  return checkSegments(candTrim) && !checkSegments(donorBase);
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
  baselineEntailment = null,
  patchMeta = null,
  isPostSurgery = false
}) {
  const candTrim = String(candidate || '').trim();
  const failedGates = [];
  const feedbackParts = [];
  const isPatchOnly = patchMeta?.mode === 'patch_only';

  // Gate M1: Grammatical skeleton preservation (function words + structural punctuation LCS)
  const donorSkel = extractFunctionWordSkeleton(donorBase);
  const candSkel = extractFunctionWordSkeleton(candTrim);
  const lcs = computeNormalizedLCS(donorSkel, candSkel);
  if (lcs.f1 < 0.44) {
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
    (isPatchOnly && sentenceCountDelta !== 0) ||
    (donorSents.length >= 2 && candSents.length < 2) ||
    (candSents.length === 1 && candWords > 52 && candWords > donorWords + 10) ||
    wordRatio < 0.52 ||
    wordRatio > 1.85 ||
    candWords < 14 ||
    !/[.!?]$/.test(candTrim) ||
    openParen !== closeParen ||
    openQ !== closeQ ||
    openE !== closeE
  ) {
    failedGates.push('CADENCE_ISOMORPHISM');
    feedbackParts.push(`Mantén exactamente las ${donorSents.length} ${donorSents.length === 1 ? 'oración' : 'oraciones'} originales, sin fusionar ni partir frases, terminando con punto final.`);
  }

  // Gate M3: Factual entailment & signed polarity
  const entail = factualGuard.evaluateFactualEntailment(
    rawPara,
    candTrim,
    atoms?.discriminativeAnchors,
    atoms?.signedPolarity
  );
  const activeAnchorCount = entail.anchorCount || 0;
  const covFloor = activeAnchorCount >= 4 ? 0.68 : 0.72;

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
    baselineEntailment.isHonestFactualGap &&
    typeof baselineEntailment.entailmentScore === 'number' &&
    entail.entailmentScore < 80 &&
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
    maskedStats.trigramOverlap > 0.36 ||
    rawStats.trigramOverlap > 0.52 ||
    maskedStats.maxContiguousSpan >= 8
  ) {
    failedGates.push('SOURCE_SYNTAX_COPY');
    const copiedHint = rawStats.maxSpanPhrase ? ` (tramo calcado: "${rawStats.maxSpanPhrase}")` : '';
    feedbackParts.push(`Evita copiar secuencias sintácticas del borrador${copiedHint}; cambia el orden de los elementos y encájalos dentro de la estructura del TEXTO BASE HUMANO.`);
  }

  // Gate M5: AI style & domain purity
  const purity = factualGuard.assessDomainPurity
    ? factualGuard.assessDomainPurity(candTrim, { domainId, activeSubdomains })
    : factualGuard.assessOpticalDomainPurity(candTrim, activeSubdomains);
  const hasCliche = AI_CLICHE_PATTERNS.some(rx => rx.test(candTrim) && !rx.test(donorBase));
  const hasPromptLeak = /\*\*|^#+\s|\bTEXTO BASE HUMANO\b|\bFICHA DE HECHOS\b|\bAquí tienes\b|\bPárrafo final\s*:|\bEVITAR\s*\/\s*NO\s+USAR\b|\bDato\s+\d+\s*:|\bConceptos clave\s*:|\bTérminos técnicos obligatorios\b|\bModelo exacto a mantener\s*:|\bElemento de comparaci[oó]n externa\b|\bHechos y relaciones l[oó]gicas\b|\bevitar\s+o\s+desaconsejar\s+en\b|\bL[ií]mites\s*\/\s*advertencias\b|\bexpresar\s+en\s+sentido\s+negativo\b|\bAdvertencia\s+o\s+limitaci[oó]n\b/i.test(candTrim);
  const hasMetaBlogDeixis = /\b(?:igual que en el p[aá]rrafo anterior|en el p[aá]rrafo anterior|como vimos en el apartado|en el siguiente apartado|en el siguiente p[aá]rrafo|en este post|en este art[ií]culo)\b/i.test(candTrim) && !/\bp[aá]rrafo|apartado|post\b/i.test(rawPara);
  const fewShotLeakRxs = [
    /\bsenderismo\s+ligero\b/i,
    /\bbotas\s+de\s+cuero\b/i,
    /\babrigo\s+de\s+lana\b/i,
    /\bmembrana\s+impermeable\b/i,
    /\bsuela\s+r[ií]gida\b/i
  ];
  const hasFewShotLeak = fewShotLeakRxs.some(rx => rx.test(candTrim) && !rx.test(rawPara) && !rx.test(donorBase));
  const hasUnbalancedDoubleQuotes = ((candTrim.match(/"/g) || []).length % 2) !== 0;
  const hasForeignChars = /[\u4e00-\u9fff\u0400-\u04ff]/.test(candTrim);
  const rawSlashRx = /\b[a-záéíóúüñ]{3,}\s*\/\s*[a-záéíóúüñ]{3,}\b/i;
  const hasRawSlashAlt = rawSlashRx.test(candTrim) && !rawSlashRx.test(rawPara) && !rawSlashRx.test(donorBase);
  const rawCandWords = tokenizeWords(candTrim);
  const allowedRefWords = new Set(tokenizeWords(`${rawPara} ${donorBase} ${heading || ''}`));
  const englishHits = rawCandWords.filter(w => ENGLISH_STOPWORDS.has(w) && !allowedRefWords.has(w)).length;
  const leakedBrands = detectUnrequestedBrands(candTrim, [rawPara, donorBase, heading, ...(atoms?.brand_models || [])]);
  const materialRedundancy = discourseTopology
    ? discourseTopology.hasContrastiveMaterialRedundancy('', rawPara, atoms, candTrim)
    : false;
  const keywordSalad = hasTelegraphicKeywordSalad(candTrim, donorBase);

  if (hasCliche) {
    failedGates.push('AI_STYLE_CLICHE');
    feedbackParts.push('Elimina expresiones cliché de IA (como "en resumen", "en conclusión", "cabe destacar", "es fundamental", "eficazmente", "diseño innovador", "minimizar el").');
  }
  if (hasPromptLeak || hasMetaBlogDeixis || hasFewShotLeak || hasUnbalancedDoubleQuotes || hasForeignChars || englishHits >= 2 || hasRawSlashAlt) {
    failedGates.push('PROMPT_OR_LANG_LEAK');
    feedbackParts.push('Devuelve exclusivamente español limpio sin encabezados, referencias a otros párrafos, notas, barras inclinadas ni palabras en otros idiomas.');
  }
  if (keywordSalad) {
    failedGates.push('TELEGRAPHIC_KEYWORD_SALAD');
    feedbackParts.push('Integra los términos de forma gramatical dentro de la oración con artículos y preposiciones reales; no apiles palabras sueltas separadas por comas.');
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

  // Gate M6: Donor adaptation & alien donor residue check
  const rawTopicTokens = extractDomainTopicTokens(`${rawPara} ${heading || ''}`);
  const donorTopicTokens = [...extractDomainTopicTokens(donorBase)];
  const alienTokens = donorTopicTokens.filter(t => !rawTopicTokens.has(t));
  const candWordSet = new Set(tokenizeWords(candTrim));
  const keptAlienList = alienTokens.filter(tk => candWordSet.has(tk));
  const keptAlien = keptAlienList.length;
  const alienRetention = alienTokens.length > 0 ? Number((keptAlien / alienTokens.length).toFixed(4)) : 0;
  const donorSpanStats = computeTrigramOverlapAndMaxSpan(candTrim, donorBase);
  const donorRawOverlap = donorSpanStats.trigramOverlap;
  const donorContentRetention = computeContentWordRetention(candTrim, donorBase);

  const hardOffTopicRx = /\b(?:diabetes|diab[eé]tic[oa]s?|glucosa|insulina|colesterol|hipertensi[oó]n|dieta|quemarte|quemaduras?|crema\s+solar|maquillaje|lavaplatos|tu\s+madre|d[ií]a\s+de\s+la\s+madre|reyes\s+magos)\b/i;
  const hasHardOffTopicResidue = hardOffTopicRx.test(candTrim) && !hardOffTopicRx.test(rawPara);

  if (isPatchOnly) {
    if (hasHardOffTopicResidue) {
      failedGates.push('ALIEN_DONOR_RESIDUE');
      feedbackParts.push(`Sustituye con un parche breve el concepto ajeno heredado del molde (${keptAlienList.slice(0, 5).join(', ')}).`);
    } else if (
      candTrim === donorBase.trim() ||
      (patchMeta?.patchesApplied ?? 0) === 0 ||
      (donorRawOverlap > 0.94 && entail.entailmentScore <= (baselineEntailment?.entailmentScore ?? 0))
    ) {
      failedGates.push('UNCHANGED_DONOR');
      feedbackParts.push('Propón parches "buscar" literales tomados exactamente del TEXTO BASE HUMANO para insertar los datos pendientes.');
    }
  } else {
    if (
      hasHardOffTopicResidue ||
      (alienTokens.length >= 4 && keptAlien >= 4 && alienRetention > 0.42)
    ) {
      failedGates.push('ALIEN_DONOR_RESIDUE');
      feedbackParts.push(`Elimina estos conceptos del TEXTO BASE HUMANO que no pertenecen al tema actual: ${keptAlienList.slice(0, 7).join(', ')}.`);
    } else if (
      donorRawOverlap > 0.72 && entail.entailmentScore <= (baselineEntailment?.entailmentScore ?? 0)
    ) {
      failedGates.push('UNCHANGED_DONOR');
      feedbackParts.push('Adapta los conceptos del TEXTO BASE HUMANO incorporando los datos técnicos actuales en lugar de repetir el molde casi intacto.');
    }
  }

  // Gate M7: Bounded rewrite preservation (Patch-Only V2 enforces high human token conservation >= 50-56%)
  const pres = computeDonorTokenPreservation(candTrim, donorBase);
  const minCandPres = isPostSurgery ? 0.46 : (activeAnchorCount >= 4 ? 0.48 : 0.54);
  const minDonorRecall = isPostSurgery ? 0.45 : (activeAnchorCount >= 4 ? 0.48 : 0.52);
  if (isPatchOnly && (pres.candPreservation < minCandPres || pres.donorRecall < minDonorRecall)) {
    failedGates.push('EXCESSIVE_LLM_REWRITE');
    feedbackParts.push(`Conserva al menos el 55-60% de las palabras originales del TEXTO BASE HUMANO (actual: ${(pres.candPreservation * 100).toFixed(0)}%). Usa menos parches y haz cada "buscar" y "reemplazar" más cortos.`);
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
      donorContentRetention,
      donorTokenPreservation: pres.candPreservation,
      donorTokenRecall: pres.donorRecall,
      newTokenRatio: pres.newTokenRatio,
      patchesApplied: patchMeta?.patchesApplied ?? null
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
  maxAttempts = 5,
  timeoutMs = null,
  patchMode = true,
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
      patchMeta: null,
      text: ''
    };
  }

  const blueprint = extractRhetoricalBlueprint(rawPara, atoms, paraTopology);
  const fewShotMessages = patchMode ? buildPatchOnlyFewShotMessages() : buildCarrilBFewShotMessages();
  const attempts = [];
  const tempPlan = [
    { scaffoldIdx: 0, temp: 0.22 },
    { scaffoldIdx: 0, temp: 0.32 },
    { scaffoldIdx: scaffolds.length > 1 ? 1 : 0, temp: 0.25 },
    { scaffoldIdx: scaffolds.length > 1 ? 1 : 0, temp: 0.34 },
    { scaffoldIdx: scaffolds.length > 2 ? 2 : (scaffolds.length > 1 ? 1 : 0), temp: 0.28 }
  ];

  let lastFeedback = null;
  let lastScaffoldIdx = -1;
  let bestRejected = null;
  const maxTries = Math.max(1, Math.min(tempPlan.length, Number(maxAttempts) || tempPlan.length));
  const effectiveTimeoutMs = timeoutMs || (/(?:^|:)(?:3b|4b|7b|8b)/i.test(String(modelName || '')) ? 300000 : 180000);

  for (let i = 0; i < maxTries; i++) {
    const { scaffoldIdx, temp } = tempPlan[i];
    const activeScaffold = scaffolds[scaffoldIdx];
    if (scaffoldIdx !== lastScaffoldIdx) {
      lastFeedback = null;
      lastScaffoldIdx = scaffoldIdx;
    }

    const prompt = patchMode
      ? buildPatchOnlyPrompt({
          donorBase: activeScaffold.cleanText,
          rawPara,
          atoms,
          heading,
          paraTopology,
          blueprint,
          donorBlueprint: activeScaffold.blueprint,
          feedback: lastFeedback
        })
      : buildGuidedTransferPrompt({
          donorBase: activeScaffold.cleanText,
          rawPara,
          atoms,
          heading,
          paraTopology,
          blueprint,
          donorBlueprint: activeScaffold.blueprint,
          feedback: lastFeedback
        });

    const numPredict = patchMode
      ? 260
      : Math.min(340, Math.max(220, Math.round(activeScaffold.blueprint.wordCount * 4.5)));
    const systemPrompt = patchMode
      ? 'Eres un editor lingüístico de precisión en español. Tu única tarea es devolver un JSON con parches mínimos literales sobre un texto humano base, preservando sus puntos, su sintaxis y su voz humana original.'
      : 'Eres un editor lingüístico de precisión en español. Tu tarea es transferir datos técnicos exactos dentro de un texto humano base conservando al máximo su arquitectura gramatical, sus conectores y su naturalidad, sin inventar información ni copiar frases literales de los datos de referencia.';

    try {
      const generateOpts = patchMode
        ? {
            system: systemPrompt,
            fewShotMessages,
            format: 'json',
            temperature: temp,
            top_p: 0.85,
            num_ctx: 2048,
            num_predict: numPredict,
            timeoutMs: effectiveTimeoutMs,
            cleanPlainText: false
          }
        : {
            system: systemPrompt,
            fewShotMessages,
            temperature: temp,
            top_p: 0.88,
            num_ctx: 2048,
            num_predict: numPredict,
            timeoutMs: effectiveTimeoutMs,
            cleanPlainText: true
          };

      const res = await ollamaClient.generate(modelName, prompt, generateOpts);

      if (qwenStats) {
        qwenStats.calls += 1;
        qwenStats.totalDurationMs += res.durationMs || 0;
        qwenStats.totalTokens += res.eval_count || 0;
      }

      let candidateText = '';
      let patchRes = null;
      let patchMeta = null;
      if (patchMode) {
        patchRes = applySurgicalPatches(activeScaffold.cleanText, res.rawResponse || res.response, 4);
        candidateText = patchRes.text;
        patchMeta = {
          mode: 'patch_only',
          patchesProposed: patchRes.patchesProposed,
          patchesApplied: patchRes.patchesApplied,
          patchesSkipped: patchRes.patchesSkipped,
          skippedReasons: patchRes.skippedReasons,
          appliedList: patchRes.appliedList
        };
      } else {
        candidateText = typeof cleanResponseFn === 'function'
          ? cleanResponseFn(res.response)
          : String(res.response || '').trim();
        candidateText = candidateText
          .replace(/^["«“]|["»”]$/g, '')
          .replace(/\b(o)\s+((?:o|ó|ho|hó)[a-záéíóúüñ]+)/gi, (m, conj, nextW) => `${conj === 'O' ? 'U' : 'u'} ${nextW}`)
          .replace(/\b(y)\s+((?:i|í|hi|hí)(?![eaouáéóú])[a-záéíóúüñ]+)/gi, (m, conj, nextW) => `${conj === 'Y' ? 'E' : 'e'} ${nextW}`)
          .replace(/\s+/g, ' ')
          .trim();
      }

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
        baselineEntailment,
        patchMeta
      });

      const attemptEntry = {
        attempt: i + 1,
        scaffoldId: activeScaffold.brick.brick_id,
        scaffoldDomain: activeScaffold.domain,
        scaffoldScore: activeScaffold.scaffoldScore,
        temperature: temp,
        durationMs: res.durationMs || 0,
        text: candidateText,
        patchMeta,
        approved: judge.approved,
        failedGates: judge.failedGates,
        metrics: judge.metrics,
        score: judge.score
      };
      attempts.push(attemptEntry);

      if (patchMode) {
        log(`[CARRIL_B_V2_PATCH] Intento ${i + 1}/${maxTries} | Andamio ${activeScaffold.brick.brick_id} (${activeScaffold.domain}) | Parches=${patchRes.patchesApplied}/${patchRes.patchesProposed} | Pres=${judge.metrics.donorTokenPreservation} | Sents=${splitSentences(candidateText).length}/${activeScaffold.blueprint.sentenceCount} | LCS=${judge.metrics.functionSkeletonLCS} | Entail=${judge.metrics.entailmentScore} | SrcMask3g=${judge.metrics.maskedSourceTrigramOverlap} | ${judge.approved ? 'APROBADO' : `RECHAZADO [${judge.failedGates.join(', ')}]`}`);
      } else {
        log(`[CARRIL_B] Intento ${i + 1}/${maxTries} | Andamio ${activeScaffold.brick.brick_id} (${activeScaffold.domain}) | LCS=${judge.metrics.functionSkeletonLCS} | Entail=${judge.metrics.entailmentScore} | SrcMask3g=${judge.metrics.maskedSourceTrigramOverlap} | ${judge.approved ? 'APROBADO' : `RECHAZADO [${judge.failedGates.join(', ')}]`}`);
      }

      if (judge.approved) {
        return {
          approved: true,
          status: 'APPROVED',
          text: candidateText,
          scaffold: activeScaffold,
          patchMeta,
          judge,
          attempts
        };
      }

      let nextFeedback = judge.feedbackForRetry;
      if (patchMode && patchRes && patchRes.patchesApplied === 0) {
        nextFeedback = `El intento anterior propuso parches no válidos (${patchRes.skippedReasons.join(', ') || 'ninguno aplicado'}). Asegúrate de copiar exactamente cada "buscar" desde el TEXTO BASE HUMANO sin cruzar puntos. ${nextFeedback}`.trim();
      }
      lastFeedback = nextFeedback;
      if (!bestRejected || judge.score > bestRejected.judge.score) {
        bestRejected = {
          text: candidateText,
          scaffold: activeScaffold,
          patchMeta,
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
        failedGates: [err.code || 'LLM_ERROR'],
        error: err.message
      });
      log(`[CARRIL_B_ERROR] Intento ${i + 1}/${maxTries} falló (${err.message})`);
      if (err.code === 'AI_STUDIO_ALL_MODELS_EXHAUSTED' || err.code === 'AI_STUDIO_FATAL_HTTP') {
        err.carrilBAttempts = attempts;
        throw err;
      }
    }
  }

  return {
    approved: false,
    status: 'REJECTED_FALLBACK',
    text: '',
    scaffold: bestRejected?.scaffold || scaffolds[0],
    patchMeta: bestRejected?.patchMeta || null,
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
  computeDonorTokenPreservation,
  buildPatchOnlyFewShotMessages,
  buildPatchOnlyPrompt,
  applySurgicalPatches,
  maskMandatoryTerms,
  judgeCarrilBCandidate,
  runCarrilBForParagraph
};
