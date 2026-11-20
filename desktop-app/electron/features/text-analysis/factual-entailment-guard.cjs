/**
 * @fileoverview Guardián de Integridad Fáctica, Polaridad Ligada y Cobertura Discriminativa
 * para el Carril A de NOUS. Impide alucinaciones fuera de dominio, inversiones de seguridad
 * y falsos "fit=10/10" cuando faltan anclas técnicas críticas.
 */

const domainRegistry = require('../donor-bank/domain-packs-registry.cjs');

const OFF_DOMAIN_RX = domainRegistry.OPTICA_OFF_DOMAIN_MEDICAL_RX;

const DIARY_META_RX = domainRegistry.DIARY_META_JUNK_RX;

const OPTICAL_SUBJECT_RX = domainRegistry.OPTICA_EYEWEAR_SUBJECT_RX;

const OPTICAL_BRANDS = [
  'Chloé', 'Chloe', 'Gucci', 'Persol', 'Ray-Ban', 'Tom Ford', 'Prada', 'Dior',
  'Oakley', 'Carrera', 'Moscot', 'Oliver Peoples', 'Arnette', 'Maui Jim',
  'Polaroid', 'Vogue', 'Versace', 'Dolce', 'Burberry', 'Saint Laurent',
  'Celine', 'Balenciaga', 'Etnia Barcelona', 'Hawkers', 'Mr\\.\\s*Boho'
];

const KNOWN_MODEL_WORDS_RX = /^(?:aviator|classic|wayfarer|clubmaster|original|steve|mcqueen|justin|erika|holbrook|frogskins|sutro|lite|latch|round|metal|meteor|hexagonal|havana|tortoise|po\d+|rb\d+|gg\d+|ch\d+)$/i;
const SKU_STOP_TOKEN_RX = /^(?:plegables?|qu[eé]|debes|saber|antes|para|con|son|como|gu[ií]a|rese[ñn]a|an[aá]lisis|gafas?|monturas?|lentes?|de|la|las|el|los|y|o|en|mujer|hombre|unisex|tiene[ns]?|combinan|destacan|ofrecen)$/i;

const CLAUSE_NEG_RX = /\b(?:nunca\s+(?:debes|deben|deber[ií]as|uses?|utilices?|son)|jam[aá]s|no\s+debes\s+(?:usar\w*|utilizar\w*)|no\s+(?:debes?|deben|deber[ií]as?|hay\s+que|uses?|utilices?|apliques?|expongas?|coloques?|guardes?|sumerjas?|limpies?|cubras?|bloquees?|instales?|mezcles?)|no\s+(?:incluye[ns]?|cuenta[ns]?\s+con|dispone[ns]?\s+de|admite[ns]?|soporta[ns]?|ofrece[ns]?|protege[ns]?|sirve[ns]?|garantiza[ns]?|permite[ns]?|resiste[ns]?|bloquea[ns]?|filtra[ns]?|aporta[ns]?|presenta[ns]?|tiene[ns]?|posee[ns]?|incorpora[ns]?|funciona[ns]?)|carece[ns]?\s+de|no\s+(?:son\s+|est[aá]n\s+|resultan\s+)?(?:permitid\w*|recomendab\w*|apt\w*|ideales?|convenientes?)|no\s+(?:te\s+(?:lo|las|los)\s+)?(?:recomendamos|aconsejamos|conviene)|no\s+deben\s+(?:usarse|utilizarse)|no\s+se\s+recomiend\w*|no\s+(?:se\s+)?oscurec\w*|apenas\s+se\s+oscurec\w*|impide\s+que\s+se\s+oscurezc\w*|conviene\s+evitar\w*|evit(?:a|e|es|en|ar|ando)(?:l[oa]s?|se)?|descartar|prohibid\w*|inconveniente|desventaja|problema|peligro|riesgo|cuidado\s+con|descascarill\w*|quebradiz\w*|degrad\w*|baja\s+calidad|deterior\w*)\b/i;

const DONOR_SLOT_NEG_RX = /\b(?:no\s+(?:son\s+|est[aá]n\s+|resultan\s+)?(?:permitid[oa]s?|apt[oa]s?|recomendab\w*|aconsejab\w*|ideales?|convenientes?)|nunca|jam[aá]s|prohibid[oa]s?|evitar|descartar|huir\s+de|no\s+utilizar\w*|no\s+sirven)\b[^.!?]{0,32}$/i;

const DONOR_SLOT_FOLLOWING_NEG_RX = /^[^.!?]{0,90}\bno\s+(?:te\s+(?:lo|las|los)\s+)?(?:recomendamos|aconsejamos|conviene|son\s+recomendables|debes|deber[ií]as|es\s+buena\s+idea|funciona[ns]?)\b/i;

const POSITIVE_ENDORSEMENT_RX = /\b(?:ideal(?:es)?|perfect[oa]s?|excelentes?|recomendab\w*|obligad[oa]s?|mejor\s+aliad[oa]|imprescindible(?:s)?|es\s+mejor\s+(?:usar|llevar|elegir|optar)|conviene\s+usar|resultan?\s+(?:ideales|id[oó]ne[oa]s|excelentes)|elige|optar\s+por|con\s+seguridad|incluye[ns]?|incorpora[ns]?|cuenta[ns]?\s+con|dispone[ns]?\s+de)\b/i;

const SIGNED_CONTEXT_RULES = [];

const SPANISH_STOPWORDS_CONCEPT = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'lo', 'al', 'del',
  'de', 'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'desde', 'hacia', 'hasta',
  'que', 'como', 'cuando', 'donde', 'si', 'pero', 'aunque', 'porque', 'pues', 'mientras',
  'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'su', 'sus', 'tu', 'tus', 'mi', 'mis',
  'muy', 'mas', 'menos', 'tan', 'tanto', 'todo', 'toda', 'todos', 'todas', 'cada', 'otro', 'otra', 'otros', 'otras',
  'ser', 'es', 'son', 'era', 'fue', 'estar', 'esta', 'estan', 'haber', 'hay', 'tener', 'tiene', 'tienen',
  'hacer', 'hace', 'hacen', 'poder', 'puede', 'pueden', 'deber', 'debe', 'deben', 'soler', 'suele', 'suelen',
  'usar', 'utilizar', 'llevar', 'elegir', 'buscar', 'necesitar', 'tienes', 'buscas', 'necesitas', 'evitar',
  'gafa', 'gafas', 'lente', 'lentes', 'montura', 'monturas', 'modelo', 'modelos', 'diseno', 'disenos',
  'tipo', 'tipos', 'forma', 'formas', 'uso', 'usos', 'caso', 'casos', 'modo', 'manera', 'parte', 'problema',
  'debido', 'precisamente', 'resulta', 'resultan', 'cambio', 'renunciar', 'seguidas', 'seguidos',
  'mucho', 'mejor', 'peor', 'solo', 'solamente', 'apenas', 'casi', 'siempre', 'nunca', 'jamas',
  'ademas', 'tambien', 'incluso', 'embargo', 'obstante', 'antes', 'despues', 'durante',
  'pocos', 'pocas', 'segundos', 'minutos', 'horas', 'salen', 'llevan', 'terminan', 'combinan',
  'ofrece', 'ofrecen', 'resuelven', 'ampliando', 'incrementa', 'permiten', 'permite', 'existen', 'existe',
  'excelente', 'excelentes', 'ideal', 'ideales', 'perfecto', 'perfecta', 'perfectos', 'perfectas',
  'necesario', 'necesaria', 'notar', 'volver', 'volviendose', 'pasa', 'pasan', 'convierte', 'convierten'
]);

const NOUNS_AR_ER_IR = new Set([
  'calor', 'color', 'dolor', 'exterior', 'interior', 'factor', 'sector', 'valor',
  'sudor', 'grosor', 'espesor', 'error', 'corredor', 'ordenador', 'conductor',
  'protector', 'sensor', 'cristal', 'metal', 'mar', 'par', 'lugar', 'hogar', 'aire'
]);

function stripAccentsAscii(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toAccentInsensitivePattern(asciiStem) {
  return String(asciiStem || '')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/a/g, '[aá]')
    .replace(/e/g, '[eé]')
    .replace(/i/g, '[ií]')
    .replace(/o/g, '[oó]')
    .replace(/u/g, '[uúü]');
}

function stemForSpanishVerify(asciiTok) {
  let s = String(asciiTok || '').replace(/[^a-z0-9]/g, '');
  if (s.length >= 6 && /(?:ar|er|ir)$/.test(s)) {
    s = s.slice(0, -2);
  } else if (s.length >= 6) {
    s = s.replace(/(?:aciones|amiento|imiento|es|as|os|a|o|e)$/, '');
  }
  s = s.replace(/z$/, '[zc]');
  return s;
}

function buildStemVerifyRx(phrase) {
  const tokens = stripAccentsAscii(phrase)
    .split(/[^a-z0-9]+/)
    .filter(t => t.length >= 3 && !SPANISH_STOPWORDS_CONCEPT.has(t));
  if (!tokens.length) {
    const esc = toAccentInsensitivePattern(stripAccentsAscii(phrase).trim());
    return new RegExp(`\\b${esc}\\b`, 'i');
  }
  const parts = tokens.map(tok => {
    if (/^\d+$/.test(tok)) return `\\b${tok}\\b`;
    const stem = stemForSpanishVerify(tok);
    if (stem.endsWith('[zc]')) {
      const prefix = toAccentInsensitivePattern(stem.slice(0, -4));
      return `\\b${prefix}(?:z|c[a-záéíóúüñ]*)[a-záéíóúüñ]*\\b`;
    }
    return `\\b${toAccentInsensitivePattern(stem)}[a-záéíóúüñ]*\\b`;
  });
  return new RegExp(parts.map(p => `(?=.*${p})`).join(''), 'i');
}

function extractSpanishCompoundNPs(text, maxItems = 4) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const results = [];
  const seen = new Set();

  const pushNP = (raw) => {
    const clean = raw.replace(/\s+/g, ' ').trim();
    const ascii = stripAccentsAscii(clean);
    const content = ascii.split(/[^a-z0-9]+/).filter(t => t.length >= 4 && !SPANISH_STOPWORDS_CONCEPT.has(t));
    if (content.length === 0 || seen.has(ascii) || results.length >= maxItems) return;
    seen.add(ascii);
    results.push({ label: clean, rx: buildStemVerifyRx(clean) });
  };

  // 1. Sustantivo + Adjetivo derivativo en español
  const npAdjRx = /\b([a-záéíóúüñ]{4,})\s+([a-záéíóúüñ]{4,}(?:ad[oa]s?|id[oa]s?|ic[oa]s?|iv[oa]s?|al(?:es)?|ar(?:es)?|os[oa]s?|bl[ea]s?|nt[ea]s?|ech[oa]s?|ger[oa]s?|or(?:es|as?)?))\b/gi;
  let m;
  while ((m = npAdjRx.exec(s)) !== null) {
    const w1 = stripAccentsAscii(m[1]);
    const w2 = stripAccentsAscii(m[2]);
    if (/mente$/.test(w1) || /mente$/.test(w2)) continue;
    if (!SPANISH_STOPWORDS_CONCEPT.has(w1) && !SPANISH_STOPWORDS_CONCEPT.has(w2)) {
      pushNP(`${m[1]} ${m[2]}`);
    }
  }

  // 2. Sustantivo + de + Sustantivo
  const npDeRx = /\b([a-záéíóúüñ]{4,})\s+de\s+([a-záéíóúüñ]{4,})\b/gi;
  while ((m = npDeRx.exec(s)) !== null) {
    const w1 = stripAccentsAscii(m[1]);
    const w2 = stripAccentsAscii(m[2]);
    if (/mente$/.test(w1) || /mente$/.test(w2)) continue;
    if (/(?:ar|er|ir)$/.test(w2) && !NOUNS_AR_ER_IR.has(w2)) continue;
    if (!SPANISH_STOPWORDS_CONCEPT.has(w1) && !SPANISH_STOPWORDS_CONCEPT.has(w2)) {
      pushNP(`${m[1]} de ${m[2]}`);
    }
  }

  return results;
}

function extractClauseKeyConcepts(clause, isNegClause = false) {
  let targetSlice = String(clause || '').trim();
  if (isNegClause) {
    const negTrigger = /\b(?:evit(?:a|e|es|en|ar|ando)(?:l[oa]s?|se)?|nunca\s+(?:debes|deben|deber[ií]as|uses?|utilices?)|no\s+deben\s+(?:usarse|utilizarse)|no\s+(?:incluye[ns]?|cuenta[ns]?\s+con|dispone[ns]?\s+de|admite[ns]?|soporta[ns]?|ofrece[ns]?|protege[ns]?|permite[ns]?|expongas?|uses?|utilices?|apliques?|coloques?|cubras?|bloquees?|instales?)|no\s+(?:te\s+(?:lo|las|los)\s+)?(?:recomendamos|aconsejamos|conviene)|prohibid\w*|descartar|cuidado\s+con)\b/i.exec(targetSlice);
    if (negTrigger) {
      const after = targetSlice.slice(negTrigger.index + negTrigger[0].length).trim();
      if (after.split(/\s+/).filter(Boolean).length >= 2) {
        targetSlice = after;
      }
    }
  }

  const concepts = [];
  const seen = new Set();
  const addConcept = (label, rx) => {
    const key = stripAccentsAscii(label).trim();
    if (!key || seen.has(key) || concepts.length >= 4) return;
    seen.add(key);
    concepts.push({ key, label: label.trim(), rx });
  };

  // Infinitivos de uso tras preposición ("para conducir", "al trabajar")
  const infRx = /\b(?:para|al)\s+([a-záéíóúüñ]{4,}(?:ar|er|ir))\b/gi;
  let im;
  while ((im = infRx.exec(targetSlice)) !== null) {
    const w = stripAccentsAscii(im[1]);
    if (!SPANISH_STOPWORDS_CONCEPT.has(w)) {
      addConcept(im[1], buildStemVerifyRx(im[1]));
    }
  }

  // Contextos locativos ("en la oficina", "frente al ordenador", "en el coche")
  const locRx = /\b(?:en\s+(?:la|el|los|las)|frente\s+al?)\s+([a-záéíóúüñ]{4,})\b/gi;
  let lm;
  while ((lm = locRx.exec(targetSlice)) !== null) {
    const w = stripAccentsAscii(lm[1]);
    if (!SPANISH_STOPWORDS_CONCEPT.has(w)) {
      addConcept(lm[1], buildStemVerifyRx(lm[1]));
    }
  }

  // Sintagmas nominales compuestos
  for (const np of extractSpanishCompoundNPs(targetSlice, 3)) {
    addConcept(np.label, np.rx);
  }

  // Sustantivos significativos si aún no hay suficientes conceptos
  if (concepts.length < 2) {
    const words = targetSlice.match(/\b[a-záéíóúüñ]{5,}\b/gi) || [];
    for (const w of words) {
      const wn = stripAccentsAscii(w);
      if (SPANISH_STOPWORDS_CONCEPT.has(wn)) continue;
      if (/^(?:porque|cuando|mientras|aunque|entonces|precisamente|demasiado|bastante|siempre|nunca|jamas)$/.test(wn)) continue;
      addConcept(w, buildStemVerifyRx(w));
      if (concepts.length >= 3) break;
    }
  }

  return concepts;
}

const SIGNED_MATERIAL_RULES = [
  { key: 'acetato', rx: /\b(?:acetato|pasta|celulosa)\b/i },
  { key: 'plástico', rx: /\bpl[aá]stico\b/i },
  { key: 'cristal', rx: /\bcristal(?:es)?\b/i },
  { key: 'policarbonato', rx: /\bpolicarbonato\b/i },
  { key: 'metal', rx: /\b(?:metal|met[aá]lic[oa]s?|titanio|acero|bronce|oro)\b/i },
  { key: 'madera', rx: /\b(?:madera|bamb[uú])\b/i }
];

const DISCRIMINATIVE_ANCHOR_CATALOG = [
  // CRITICAL LENS TECH
  {
    key: 'fotocromaticas',
    label: 'fotocromáticas',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bfotocrom[aá]tic[oa]s?\b/i,
    verifyRx: /\bfotocrom[aá]tic[oa]s?\b/i
  },
  {
    key: 'polarizadas',
    label: 'polarizadas',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bpolarizad[oa]s?\b/i,
    verifyRx: /\bpolarizad[oa]s?\b/i
  },
  {
    key: 'progresivas',
    label: 'progresivas',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bprogresiv[oa]s?\b/i,
    verifyRx: /\bprogresiv[oa]s?\b/i
  },
  {
    key: 'ocupacionales',
    label: 'ocupacionales',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bocupacional(?:es)?\b/i,
    verifyRx: /\b(?:ocupacional(?:es)?|lentes?\s+de\s+oficina|visi[oó]n\s+intermedia\s+y\s+cercana)\b/i
  },
  {
    key: 'monofocales',
    label: 'monofocales',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bmonofocal(?:es)?\b/i,
    verifyRx: /\bmonofocal(?:es)?\b/i
  },
  {
    key: 'cristal_mineral',
    label: 'cristal mineral',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bcristal(?:es)?\s+mineral(?:es)?\b/i,
    verifyRx: /\bcristal(?:es)?\s+mineral(?:es)?\b/i
  },
  {
    key: 'policarbonato',
    label: 'policarbonato',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\bpolicarbonato\b/i,
    verifyRx: /\bpolicarbonato\b/i
  },
  {
    key: 'luz_azul',
    label: 'filtro luz azul',
    category: 'LENS_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\b(?:filtro\s+)?luz\s+azul\b/i,
    verifyRx: /\bluz\s+azul\b/i
  },

  // HIGH GENERAL MECHANISMS
  {
    key: 'radiacion_uv',
    label: 'radiación UV',
    category: 'MECHANISM',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\b(?:radiaci[oó]n\s+ultravioleta|luz\s+uv|uv\s*400|rayos?\s+uv)\b/i,
    verifyRx: /\b(?:uv|ultravioleta|uv\s*400)\b/i
  },
  {
    key: 'deslumbramiento',
    label: 'deslumbramiento / reflejos',
    category: 'MECHANISM',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\b(?:deslumbramiento|reflejos?\s+horizontales)\b/i,
    verifyRx: /\b(?:deslumbramiento|reflejos?)\b/i
  },

  // AUDIOLOGY ANCHORS (aislados de LENS_TECH para evitar interferencias ópticas)
  {
    key: 'audifonos',
    label: 'audífonos / aparato auditivo',
    category: 'AUDIOLOGY_TECH',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\b(?:aud[ií]fonos?|aparato\s+auditivo|pr[oó]tesis\s+auditiva)\b/i,
    verifyRx: /\b(?:aud[ií]fonos?|aparato\s+auditivo|pr[oó]tesis\s+auditiva)\b/i
  },
  {
    key: 'perdida_auditiva',
    label: 'pérdida auditiva / hipoacusia',
    category: 'AUDIOLOGY_CLINICAL',
    severity: 'CRITICAL',
    weight: 3.0,
    detectRx: /\b(?:p[eé]rdida\s+auditiva|hipoacusia|sordera|problemas?\s+de\s+audici[oó]n)\b/i,
    verifyRx: /\b(?:p[eé]rdida\s+auditiva|hipoacusia|sordera|problemas?\s+de\s+audici[oó]n)\b/i
  },
  {
    key: 'audiometria',
    label: 'audiometría / revisión auditiva',
    category: 'AUDIOLOGY_TECH',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\b(?:audiometr[ií]a|revisi[oó]n\s+auditiva|prueba\s+auditiva|evaluaci[oó]n\s+auditiva)\b/i,
    verifyRx: /\b(?:audiometr[ií]a|revisi[oó]n\s+auditiva|prueba\s+auditiva|evaluaci[oó]n\s+auditiva)\b/i
  },
  {
    key: 'acufenos',
    label: 'acúfenos / tinnitus',
    category: 'AUDIOLOGY_CLINICAL',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\b(?:ac[uú]fenos?|tinnitus|zumbidos?\s+en\s+(?:el|los)\s+o[ií]dos?)\b/i,
    verifyRx: /\b(?:ac[uú]fenos?|tinnitus|zumbidos?\s+en\s+(?:el|los)\s+o[ií]dos?)\b/i
  },
  {
    key: 'otitis',
    label: 'otitis',
    category: 'AUDIOLOGY_CLINICAL',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\botitis\b/i,
    verifyRx: /\botitis\b/i
  },
  {
    key: 'vertigo',
    label: 'vértigo / vestibular',
    category: 'AUDIOLOGY_CLINICAL',
    severity: 'HIGH',
    weight: 2.0,
    detectRx: /\b(?:v[eé]rtigo|laberintitis|vestibular)\b/i,
    verifyRx: /\b(?:v[eé]rtigo|laberintitis|vestibular)\b/i
  }
];

function assessDomainPurity(text, { domainId = 'optica', activeSubdomains = null } = {}) {
  const s = String(text || '').trim();
  if (!s) {
    return {
      subdomain: 'EMPTY',
      isCleanOptical: false,
      isOffDomainIntruder: false,
      hasDiaryMetaJunk: false,
      opticalHits: 0,
      reason: 'EMPTY'
    };
  }

  const cls = domainRegistry.classifyBrickSubdomain(s, domainId);
  const pack = domainRegistry.getDomainPack(domainId);
  const defaultSet = domainId === 'optica'
    ? new Set(['OPTICAL_EYEWEAR', 'GENERAL_LIFESTYLE'])
    : new Set([pack.defaultSubdomain].filter(Boolean));
  const active = activeSubdomains || defaultSet;
  const compatible = domainRegistry.isSubdomainCompatible(cls.subdomain, active, domainId);

  const hasDiaryMetaJunk = cls.hasMetaJunk || DIARY_META_RX.test(s);
  const isOffDomainAudioOrMed = cls.subdomain === 'AUDIOLOGY' || cls.subdomain === 'OFF_DOMAIN_JUNK' || cls.subdomain === 'OPTICAL_CLINICAL';
  const isOffDomainIntruder = !compatible && isOffDomainAudioOrMed;
  const wordCount = s.split(/\s+/).filter(Boolean).length;
  const lowOpticalSubject = wordCount >= 20 && cls.hits === 0 && cls.subdomain === 'LOW_DOMAIN_DENSITY';

  let reason = domainId === 'optica' ? 'CLEAN_OPTICAL' : 'CLEAN_DOMAIN';
  if (hasDiaryMetaJunk) {
    reason = 'PERSONAL_DIARY_META_JUNK';
  } else if (!compatible) {
    if (domainId === 'optica' && (cls.subdomain === 'AUDIOLOGY' || cls.subdomain === 'OFF_DOMAIN_JUNK')) {
      reason = 'OFF_DOMAIN_AUDIOLOGY_OR_MEDICAL';
    } else if (lowOpticalSubject) {
      reason = 'ZERO_OPTICAL_DENSITY';
    } else {
      reason = `SUBDOMAIN_MISMATCH:${cls.subdomain}`;
    }
  }

  return {
    subdomain: cls.subdomain,
    isCleanOptical: compatible && !hasDiaryMetaJunk && !lowOpticalSubject,
    isOffDomainIntruder,
    hasDiaryMetaJunk,
    opticalHits: cls.hits,
    reason
  };
}

function assessOpticalDomainPurity(text, activeSubdomains = null) {
  return assessDomainPurity(text, { domainId: 'optica', activeSubdomains });
}

function isValidSkuToken(tok) {
  const clean = String(tok || '').replace(/^[("'«]+|[.,;:!?)"'»]+$/g, '');
  if (!clean || SKU_STOP_TOKEN_RX.test(clean)) return false;
  if (/^(?:de|del|la|el|y|con|para)$/i.test(clean)) return false;
  if (/\d/.test(clean) && /^[A-Za-z0-9\/-]{1,14}$/.test(clean)) return true;
  if (KNOWN_MODEL_WORDS_RX.test(clean)) return true;
  if (/^[A-Z]{1,4}[0-9]{2,5}[A-Z0-9]*$/.test(clean)) return true;
  return false;
}

function extractSkusFromString(str) {
  const results = [];
  const cleanStr = String(str || '').replace(/^#{1,6}\s+/, '').trim();
  if (!cleanStr) return results;

  const segments = cleanStr.split(/[:.,();—–\n]+/);
  const brandStartRx = new RegExp(`\\b(${OPTICAL_BRANDS.join('|')})\\b`, 'gi');

  for (const seg of segments) {
    const trimmedSeg = seg.trim();
    if (!trimmedSeg) continue;
    brandStartRx.lastIndex = 0;
    let m;
    while ((m = brandStartRx.exec(trimmedSeg)) !== null) {
      const brand = m[1].trim();
      const tailTokens = trimmedSeg.slice(m.index + m[0].length).trim().split(/\s+/).filter(Boolean);
      const kept = [];
      for (let i = 0; i < tailTokens.length && kept.length < 4; i++) {
        const rawTok = tailTokens[i];
        if (/[.,:;!?—–()]$/.test(rawTok)) {
          const stripped = rawTok.replace(/[.,:;!?—–()]+$/g, '');
          if (isValidSkuToken(stripped)) kept.push(stripped);
          break;
        }
        if (!isValidSkuToken(rawTok)) break;
        kept.push(rawTok);
      }
      if (kept.length > 0) {
        results.push(`${brand} ${kept.join(' ')}`);
      }
    }
  }
  return results;
}

/**
 * Extrae únicamente SKUs/modelos reales (<Marca> <Código/Modelo>), sin arrastrar jamás encabezados H1 completos.
 */
function extractStrictBrandSkus(text, headingAnchor = '') {
  const fromText = extractSkusFromString(text);
  const fromHeading = extractSkusFromString(headingAnchor);
  const combined = [...fromText];
  for (const hs of fromHeading) {
    const hsLow = hs.toLowerCase();
    const alreadyCovered = combined.some(ts => ts.toLowerCase() === hsLow || ts.toLowerCase().includes(hsLow));
    if (!alreadyCovered) combined.push(hs);
  }
  return [...new Set(combined)];
}

function detectDonorSlotPolarity(precedingText, followingText = '') {
  const tail = String(precedingText || '').slice(-65);
  if (DONOR_SLOT_NEG_RX.test(tail)) return 'NEGATIVE';
  const head = String(followingText || '').slice(0, 90);
  if (DONOR_SLOT_FOLLOWING_NEG_RX.test(head)) return 'NEGATIVE';
  return 'POSITIVE';
}

function extractSignedPolarityAtoms(rawPara) {
  const text = String(rawPara || '').trim();
  const posCtx = new Set();
  const negCtx = new Set();
  const posMat = new Set();
  const negMat = new Set();
  const contextMatchers = {};

  // Split by punctuation + discourse contrast pivots
  const clauses = text
    .split(/(?:[.;!?]+|\b(?:pero|sin\s+embargo|aunque|en\s+cambio|mientras\s+que|a\s+diferencia\s+de|salvo\s+que)\b)/i)
    .map(c => c.trim())
    .filter(Boolean);

  for (const cl of clauses) {
    const isNeg = CLAUSE_NEG_RX.test(cl);
    const isPosEndorsement = !isNeg && POSITIVE_ENDORSEMENT_RX.test(cl);
    const targetMat = isNeg ? negMat : posMat;

    if (isNeg || isPosEndorsement) {
      const targetCtx = isNeg ? negCtx : posCtx;
      const extracted = extractClauseKeyConcepts(cl, isNeg);
      for (const c of extracted) {
        if (targetCtx.size < 4) {
          targetCtx.add(c.key);
          if (!contextMatchers[c.key]) contextMatchers[c.key] = c.rx;
        }
      }
    }
    for (const mr of SIGNED_MATERIAL_RULES) {
      if (mr.rx.test(cl)) targetMat.add(mr.key);
    }
  }

  return {
    positiveContexts: [...posCtx],
    negativeContexts: [...negCtx],
    positiveMaterials: [...posMat],
    negativeMaterials: [...negMat],
    contextMatchers,
    hasNegativeWarning: negCtx.size > 0 || negMat.size > 0 || CLAUSE_NEG_RX.test(text)
  };
}

function extractDiscriminativeAnchors(rawPara, atoms = {}) {
  const text = String(rawPara || '');
  const anchors = [];
  const seenKeys = new Set();
  const seenLabels = [];

  const isDuplicateLabel = (lbl) => {
    const n = stripAccentsAscii(lbl);
    return seenLabels.some(prev => prev === n || prev.includes(n) || n.includes(prev));
  };

  for (const sku of (atoms?.brand_models || [])) {
    const cleanSku = String(sku || '').trim();
    if (!cleanSku) continue;
    const key = `sku:${cleanSku.toLowerCase()}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    seenLabels.push(stripAccentsAscii(cleanSku));
    const esc = cleanSku.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    anchors.push({
      key,
      label: cleanSku,
      category: 'BRAND_SKU',
      severity: 'CRITICAL',
      weight: 3.0,
      verifyRx: new RegExp(esc, 'i')
    });
  }

  for (const entry of DISCRIMINATIVE_ANCHOR_CATALOG) {
    if (entry.detectRx.test(text) && !seenKeys.has(entry.key)) {
      seenKeys.add(entry.key);
      seenLabels.push(stripAccentsAscii(entry.label));
      anchors.push(entry);
    }
  }

  // 1. Especificaciones numéricas con unidad física/temporal (dinámicas, sin valores fijos)
  const numSpecRx = /\b(\d+(?:[.,]\d+)?\s*(?:mm|cm|m|nm|%|h|horas?|d[ií]as?|a[ñn]os?|g|gr|mg|kg|db|hz|khz|mhz|uv\s*\d+|fps|px|gb|tb))\b/gi;
  let nm;
  while ((nm = numSpecRx.exec(text)) !== null) {
    const rawSpec = nm[1].replace(/\s+/g, ' ').trim();
    const specKey = `num:${stripAccentsAscii(rawSpec).replace(/\s+/g, '')}`;
    if (seenKeys.has(specKey) || isDuplicateLabel(rawSpec)) continue;
    seenKeys.add(specKey);
    seenLabels.push(stripAccentsAscii(rawSpec));
    const parts = rawSpec.split(/\s+/);
    const escNum = parts[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const unitPat = parts[1] ? `\\s*${toAccentInsensitivePattern(stripAccentsAscii(parts[1]).replace(/s$/, ''))}s?` : '';
    anchors.push({
      key: specKey,
      label: rawSpec,
      category: 'NUMERIC_SPEC',
      severity: 'HIGH',
      weight: 2.0,
      verifyRx: new RegExp(`\\b${escNum}${unitPat}\\b`, 'i')
    });
  }

  // 2. Siglas técnicas y nombres propios técnicos en mitad de oración
  const acronymRx = /\b([A-ZÁÉÍÓÚÑ]{2,5}\d*)\b/g;
  let am;
  while ((am = acronymRx.exec(text)) !== null) {
    const ac = am[1];
    if (/^(?:II|III|IV|VI|VII|VIII|IX|XI|XII|XX|XXI|UV|EL|LA|DE|EN|ES|UN|NO|SI)$/.test(ac)) continue;
    const key = `tech:${ac.toLowerCase()}`;
    if (seenKeys.has(key) || isDuplicateLabel(ac)) continue;
    seenKeys.add(key);
    seenLabels.push(ac.toLowerCase());
    anchors.push({
      key,
      label: ac,
      category: 'PROPER_TECH',
      severity: 'HIGH',
      weight: 2.0,
      verifyRx: new RegExp(`\\b${ac.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    });
  }

  const properTechRx = /\b([A-ZÁÉÍÓÚÑ][a-záéíóúüñ]{3,})\b/g;
  let pm;
  while ((pm = properTechRx.exec(text)) !== null) {
    if (pm.index === 0 || /[.!?]\s+$/.test(text.slice(Math.max(0, pm.index - 4), pm.index))) continue;
    const term = pm[1];
    if (/^(?:Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo|Otoño|Primavera|Verano|Invierno)$/.test(term)) continue;
    const key = `prop:${stripAccentsAscii(term)}`;
    if (seenKeys.has(key) || isDuplicateLabel(term)) continue;
    seenKeys.add(key);
    seenLabels.push(stripAccentsAscii(term));
    anchors.push({
      key,
      label: term,
      category: 'PROPER_TECH',
      severity: 'HIGH',
      weight: 2.0,
      verifyRx: buildStemVerifyRx(term)
    });
  }

  // 3. Sintagmas nominales técnicos compuestos extraídos dinámicamente por morfosintaxis
  const dynamicNPs = extractSpanishCompoundNPs(text, 6);
  let dynamicAdded = 0;
  for (const np of dynamicNPs) {
    if (dynamicAdded >= 4) break;
    const npKey = `np:${stripAccentsAscii(np.label).replace(/\s+/g, '_')}`;
    if (seenKeys.has(npKey) || isDuplicateLabel(np.label)) continue;
    seenKeys.add(npKey);
    seenLabels.push(stripAccentsAscii(np.label));
    anchors.push({
      key: npKey,
      label: np.label,
      category: 'DYNAMIC_NP',
      severity: 'HIGH',
      weight: 1.8,
      verifyRx: np.rx
    });
    dynamicAdded++;
  }

  return anchors;
}

function evaluateFactualEntailment(rawPara, candidateText, anchors = null, signedPolarity = null) {
  const cand = String(candidateText || '');
  const activeAnchors = Array.isArray(anchors) ? anchors : extractDiscriminativeAnchors(rawPara);
  const activePolarity = signedPolarity || extractSignedPolarityAtoms(rawPara);

  let totalWeight = 0;
  let hitWeight = 0;
  const missingCriticalTech = [];
  const missingAnchors = [];

  for (const a of activeAnchors) {
    const w = Number(a.weight || 1);
    totalWeight += w;
    a.verifyRx.lastIndex = 0;
    if (a.verifyRx.test(cand)) {
      hitWeight += w;
    } else {
      missingAnchors.push(a.label);
      if (a.severity === 'CRITICAL') {
        missingCriticalTech.push(a.label);
      }
    }
  }

  const anchorCoverageRatio = totalWeight > 0 ? Number((hitWeight / totalWeight).toFixed(3)) : 1.0;

  // Polarity contradiction check over clauses of candidateText
  let polarityContradiction = false;
  const contradictionDetails = [];
  const posOnlyCtx = (activePolarity.positiveContexts || []).filter(c => !(activePolarity.negativeContexts || []).includes(c));
  const negOnlyCtx = (activePolarity.negativeContexts || []).filter(c => !(activePolarity.positiveContexts || []).includes(c));
  const resolveCtxRx = (ctxKey) => activePolarity.contextMatchers?.[ctxKey] || buildStemVerifyRx(ctxKey);

  const candClauses = cand
    .split(/(?:[.;!?]+|\b(?:pero|sino|sin\s+embargo|aunque|en\s+cambio|mientras\s+que)\b)/i)
    .map(c => c.trim())
    .filter(Boolean);

  for (const cl of candClauses) {
    const clIsNeg = CLAUSE_NEG_RX.test(cl) || DONOR_SLOT_NEG_RX.test(cl);
    const clIsPos = POSITIVE_ENDORSEMENT_RX.test(cl) && !clIsNeg;

    if (clIsNeg) {
      for (const pc of posOnlyCtx) {
        const rx = resolveCtxRx(pc);
        if (rx && rx.test(cl)) {
          polarityContradiction = true;
          contradictionDetails.push(`POSITIVE_CONTEXT_NEGATED:${pc}`);
        }
      }
    }
    if (clIsPos) {
      for (const nc of negOnlyCtx) {
        const rx = resolveCtxRx(nc);
        if (rx && rx.test(cl)) {
          polarityContradiction = true;
          contradictionDetails.push(`NEGATIVE_CONTEXT_PRAISED:${nc}`);
        }
      }
    }
  }

  // Check for unrequested competing lens technologies leaked by the donor
  const reqTechAnchors = activeAnchors.filter(a => a.category === 'LENS_TECH');
  const reqTechKeys = new Set(reqTechAnchors.map(a => a.key));
  const rawSrcStr = String(rawPara || '');
  const unrequestedTechLeaks = [];
  if (reqTechAnchors.length > 0) {
    for (const entry of DISCRIMINATIVE_ANCHOR_CATALOG) {
      if (entry.category !== 'LENS_TECH' || reqTechKeys.has(entry.key)) continue;
      entry.detectRx.lastIndex = 0;
      if (entry.detectRx.test(cand) && !entry.detectRx.test(rawSrcStr)) {
        unrequestedTechLeaks.push(entry.label);
      }
    }
  }
  const unrequestedTechLeak = unrequestedTechLeaks.length > 0;

  // Check whether negative safety/usage contexts from the source were omitted without negation
  const unwarnedNegativeContexts = [];
  let warnedCount = 0;
  for (const nc of negOnlyCtx) {
    const rx = resolveCtxRx(nc);
    if (!rx) continue;
    const warned = candClauses.some(cl => {
      const clIsNeg = CLAUSE_NEG_RX.test(cl) || DONOR_SLOT_NEG_RX.test(cl);
      return clIsNeg && rx.test(cl);
    });
    if (warned) {
      warnedCount++;
    } else {
      unwarnedNegativeContexts.push(nc);
    }
  }
  const missingSafetyWarning = negOnlyCtx.length > 0 && warnedCount === 0;

  let entailmentScore = activeAnchors.length > 0 ? Math.round(anchorCoverageRatio * 100) : 100;
  if (missingCriticalTech.length > 0) {
    entailmentScore = Math.min(entailmentScore, Math.max(0, 55 - missingCriticalTech.length * 20));
  }
  if (activeAnchors.length >= 1 && anchorCoverageRatio === 0) {
    entailmentScore = Math.min(entailmentScore, 25);
  }
  if (missingSafetyWarning) {
    entailmentScore = Math.min(entailmentScore, 54);
  }
  if (unrequestedTechLeak) {
    entailmentScore = Math.max(0, entailmentScore - 25);
  }
  if (polarityContradiction) {
    entailmentScore = 0;
  }

  const isHonestFactualGap = Boolean(
    polarityContradiction ||
    missingSafetyWarning ||
    (activeAnchors.length >= 1 && anchorCoverageRatio === 0) ||
    (activeAnchors.length >= 2 && (missingCriticalTech.length > 0 || anchorCoverageRatio < 0.45)) ||
    (activeAnchors.length === 1 && missingCriticalTech.length > 0) ||
    (unrequestedTechLeak && entailmentScore < 55)
  );

  return {
    anchorCount: activeAnchors.length,
    anchorCoverageRatio,
    missingCriticalTech,
    missingAnchors,
    unrequestedTechLeak,
    unrequestedTechLeaks,
    missingSafetyWarning,
    unwarnedNegativeContexts,
    polarityContradiction,
    contradictionDetails,
    isHonestFactualGap,
    entailmentScore
  };
}

function detectAdversativePivot(rawPara) {
  const text = String(rawPara || '').trim();
  const pivotRx = /(?:(;\s*sin\s+embargo,?\s+)|(,\s*sin\s+embargo,?\s+)|(,\s*pero\s+)|(\.\s+En\s+cambio,?\s+)|(\.\s+Sin\s+embargo,?\s+)|(\.\s+No\s+obstante,?\s+)|(,\s*aunque\s+)|(\.\s+Por\s+su\s+parte,?\s+)|(;\s*en\s+cambio,?\s+))/i;
  const m = pivotRx.exec(text);
  if (!m) return { hasPivot: false, connector: '', leftClause: text, rightClause: '' };

  const leftClause = text.slice(0, m.index).trim();
  const rightClause = text.slice(m.index + m[0].length).trim();
  const leftWc = leftClause.split(/\s+/).filter(Boolean).length;
  const rightWc = rightClause.split(/\s+/).filter(Boolean).length;

  if (leftWc < 8 || rightWc < 8) {
    return { hasPivot: false, connector: '', leftClause: text, rightClause: '' };
  }

  const leftAnchors = new Set(extractDiscriminativeAnchors(leftClause).map(a => a.key));
  const rightAnchors = new Set(extractDiscriminativeAnchors(rightClause).map(a => a.key));
  const leftPol = extractSignedPolarityAtoms(leftClause);
  const rightPol = extractSignedPolarityAtoms(rightClause);

  const differsInAnchors = [...leftAnchors].some(k => !rightAnchors.has(k)) || [...rightAnchors].some(k => !leftAnchors.has(k));
  const differsInPolarity = leftPol.hasNegativeWarning !== rightPol.hasNegativeWarning;

  if (!differsInAnchors && !differsInPolarity) {
    return { hasPivot: false, connector: '', leftClause: text, rightClause: '' };
  }

  const rawConn = m[0].replace(/^[;.,\s]+/, '').replace(/[,\s]+$/, '').toLowerCase();
  return {
    hasPivot: true,
    connector: rawConn || 'sin embargo',
    leftClause,
    rightClause
  };
}

module.exports = {
  assessDomainPurity,
  assessOpticalDomainPurity,
  extractStrictBrandSkus,
  detectDonorSlotPolarity,
  extractSignedPolarityAtoms,
  extractDiscriminativeAnchors,
  extractSpanishCompoundNPs,
  evaluateFactualEntailment,
  detectAdversativePivot,
  SIGNED_CONTEXT_RULES,
  SIGNED_MATERIAL_RULES,
  DISCRIMINATIVE_ANCHOR_CATALOG
};
