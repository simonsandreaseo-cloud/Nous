'use strict';

/**
 * Sistema de Micro-Cirugía Gramatical Central para Ruptura de K-Gramas (Grammatical Shingle Surgery).
 *
 * Diseñado específicamente para mantener intactos los bordes discursivos de cada oración
 * (primeras 3 y últimas 3 palabras: conectores, anclaje Cb y cadencia de cierre) mientras
 * bisecciona rachas continuas >= 7 palabras actuando exclusivamente en el interior [3, L - 4].
 */

const TOKEN_MATCH_RX = /[^.,/#!$%^&*;:{}=\-_`~()«»"'“”‘’¡?¿–—…´\s]+/g;

function normalizeSimple(str) {
  return String(str || '').toLowerCase();
}

function normalizeWordAscii(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

/**
 * Tokeniza una oración preservando los offsets exactos sobre el string original.
 * Coincide 1-a-1 con NeurosymbolicEngine.tokenize(text).
 */
function tokenizeWithOffsets(text) {
  const tokens = [];
  if (!text) return tokens;
  TOKEN_MATCH_RX.lastIndex = 0;
  let m;
  while ((m = TOKEN_MATCH_RX.exec(text)) !== null) {
    tokens.push({
      idx: tokens.length,
      word: m[0],
      norm: m[0].toLowerCase(),
      start: m.index,
      end: m.index + m[0].length
    });
  }
  return tokens;
}

/**
 * Divide un párrafo en oraciones respetando signos de apertura y cierres decimales/abreviados.
 */
function splitSentencesWithSeparators(paragraphText) {
  const clean = String(paragraphText || '').trim();
  if (!clean) return [];
  const rawParts = clean.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¡¿"«])/);
  return rawParts.map(s => s.trim()).filter(Boolean);
}

/**
 * Construye el conjunto de 7-gramas normalizados presentes en los donantes usados del párrafo.
 */
function buildDonor7GramSet(donorsUsedInPara = [], tokenizeFn = null) {
  const set = new Set();
  const tokFn = typeof tokenizeFn === 'function'
    ? tokenizeFn
    : (t) => tokenizeWithOffsets(t).map(x => x.norm);

  for (const src of (donorsUsedInPara || [])) {
    const raw = typeof src === 'string' ? src : (src.raw_text || src.text || '');
    const words = tokFn(raw);
    if (words.length < 7) continue;
    for (let i = 0; i <= words.length - 7; i++) {
      set.add(words.slice(i, i + 7).join(' '));
    }
  }
  return set;
}

/**
 * Localiza las rachas continuas de coincidencia (>= minShingleLen palabras) de una oración
 * frente a los donantes del párrafo y al índice global corpus7GramMap.
 */
function findSentenceContiguousRuns(tokens, donor7GramSet, engine, minShingleLen = 7) {
  const L = tokens.length;
  if (L < minShingleLen) {
    return { runs: [], maxRunLen: 0, matchedShinglesCount: 0, matchedStarts: [] };
  }

  const matchedStarts = [];
  const corpusMap = engine?.corpus7GramMap || null;

  for (let i = 0; i <= L - minShingleLen; i++) {
    const s7 = tokens.slice(i, i + minShingleLen).map(t => t.norm).join(' ');
    const inDonors = donor7GramSet && donor7GramSet.has(s7);
    const inCorpus = corpusMap && corpusMap.has(s7);
    if (inDonors || inCorpus) {
      matchedStarts.push(i);
    }
  }

  if (!matchedStarts.length) {
    return { runs: [], maxRunLen: 0, matchedShinglesCount: 0, matchedStarts: [] };
  }

  const runs = [];
  let curStart = matchedStarts[0];
  let curEnd = matchedStarts[0] + minShingleLen - 1;
  let hitCount = 1;

  for (let k = 1; k < matchedStarts.length; k++) {
    const s = matchedStarts[k];
    const e = s + minShingleLen - 1;
    // Unir ventanas solapadas o directamente adyacentes que conforman la misma racha continua
    if (s <= curEnd + 1) {
      if (e > curEnd) curEnd = e;
      hitCount++;
    } else {
      runs.push({ start: curStart, end: curEnd, len: curEnd - curStart + 1, hitCount });
      curStart = s;
      curEnd = e;
      hitCount = 1;
    }
  }
  runs.push({ start: curStart, end: curEnd, len: curEnd - curStart + 1, hitCount });

  let maxRunLen = 0;
  for (const r of runs) {
    if (r.len > maxRunLen) maxRunLen = r.len;
  }

  return {
    runs,
    maxRunLen,
    matchedShinglesCount: matchedStarts.length,
    matchedStarts
  };
}

/**
 * Construye una máscara booleana de tokens protegidos (marcas, SKUs, entidades propias, números).
 */
function buildProtectedMask(tokens, atoms) {
  const L = tokens.length;
  const mask = new Array(L).fill(false);

  const entityWords = new Set();
  for (const bm of (atoms?.brand_models || [])) {
    for (const tk of tokenizeWithOffsets(bm)) entityWords.add(tk.norm);
  }
  for (const pe of (atoms?.proper_entities || [])) {
    for (const tk of tokenizeWithOffsets(pe)) entityWords.add(tk.norm);
  }

  for (let i = 0; i < L; i++) {
    const tok = tokens[i];
    if (entityWords.has(tok.norm)) {
      mask[i] = true;
      continue;
    }
    if (/\d/.test(tok.word)) {
      mask[i] = true;
      continue;
    }
    if (i > 0 && /^[A-ZÁÉÍÓÚÑ][a-záéíóúñ0-9-]+$/.test(tok.word) && !/[.!?¿¡«(]$/.test(tokens[i - 1]?.word || '')) {
      // Nombres propios o marcas en mitad de oración (excluyendo estaciones, meses y días del calendario)
      if (!/^(?:Otoño|Primavera|Verano|Invierno|Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre|Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo)$/i.test(tok.word) || entityWords.has(tok.norm)) {
        mask[i] = true;
      }
    }
  }
  return mask;
}

const NON_COMMUTABLE_COORD_PAIRS = new Set([
  'antes|despues', 'primero|segundo', 'segundo|tercero', 'ida|vuelta',
  'blanco|negro', 'principio|fin', 'causa|efecto', 'agua|jabon',
  'norte|sur', 'este|oeste', 'dia|noche', 'largo|ancho',
  'entrada|salida', 'origen|destino', 'pasado|futuro', 'compra|venta',
  'oferta|demanda', 'izquierda|derecha', 'arriba|abajo', 'cerca|lejos',
  'inicio|final', 'apertura|cierre', 'vida|muerte', 'si|no'
]);

const NON_ADJ_OR_CLOSED_WORDS = new Set([
  'antes', 'despues', 'luego', 'ahora', 'nunca', 'siempre', 'todo', 'toda', 'todos', 'todas',
  'nada', 'algo', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'poca', 'pocos', 'pocas',
  'varios', 'varias', 'otros', 'otras', 'mismos', 'mismas', 'propios', 'propias',
  'ciertos', 'ciertas', 'primeros', 'primeras', 'ultimos', 'ultimas', 'siguientes', 'anteriores',
  'estado', 'resultado', 'resultados', 'lado', 'lados', 'modo', 'modos', 'mercado', 'mercados',
  'cuidado', 'cuidados', 'sentido', 'sentidos', 'contenido', 'contenidos', 'pedido', 'pedidos',
  'partido', 'partidos', 'tejido', 'tejidos', 'sonido', 'sonidos', 'vestido', 'vestidos',
  'acabado', 'acabados', 'modelo', 'modelos', 'elemento', 'elementos', 'momento', 'momentos',
  'caso', 'casos', 'paso', 'pasos', 'peso', 'pesos', 'uso', 'usos', 'tipo', 'tipos',
  'proceso', 'procesos', 'periodo', 'periodos', 'ganado', 'poblado', 'tratado', 'certificado',
  'significado', 'apartado', 'comunicado', 'recuerdo', 'acuerdo', 'detalle', 'parte', 'frente',
  'fuente', 'gente', 'mente', 'corriente', 'ambiente', 'cliente', 'clientes', 'agente', 'agentes',
  'presidente', 'docente', 'paciente', 'pacientes', 'componente', 'componentes', 'continente',
  'accidente', 'incidente', 'presente', 'oriente', 'occidente', 'durante', 'mediante', 'bastante',
  'adelante', 'delante', 'instante', 'restante', 'habitante', 'habitantes', 'estudiante', 'estudiantes',
  'fabricante', 'fabricantes', 'comerciante', 'comerciantes', 'visitante', 'representante'
]);

const ENUM_SEQ_STOPWORDS = new Set([
  ...NON_ADJ_OR_CLOSED_WORDS,
  'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'primero', 'primera', 'segundo', 'segunda', 'tercero', 'tercera',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'octubre', 'noviembre', 'diciembre',
  'pero', 'aunque', 'porque', 'cuando', 'donde', 'mientras', 'como', 'para',
  'entre', 'sobre', 'desde', 'hasta', 'tiene', 'tienen', 'puede', 'pueden',
  'debe', 'deben', 'hace', 'hacen', 'suele', 'suelen', 'esta', 'estan', 'eran', 'fueron'
]);

function joinSpanishCoord(a, b) {
  const conj = /^(?:i|í|hi|hí)(?!e)/i.test(String(b || '').trim()) ? 'e' : 'y';
  return `${a} ${conj} ${b}`;
}

function isNonCommutablePair(a, b) {
  const na = normalizeWordAscii(a);
  const nb = normalizeWordAscii(b);
  return NON_COMMUTABLE_COORD_PAIRS.has(`${na}|${nb}`) || NON_COMMUTABLE_COORD_PAIRS.has(`${nb}|${na}`);
}

function getSpanishAdjMorph(word) {
  const n = normalizeWordAscii(word);
  if (!n || n.length < 5 || NON_ADJ_OR_CLOSED_WORDS.has(n)) return null;
  if (/(?:os|iv|ic|ad|id|er|tor|dor)as$/.test(n)) return { num: 'pl', gen: 'f', norm: n };
  if (/(?:os|iv|ic|ad|id|er|tor|dor)os$/.test(n)) return { num: 'pl', gen: 'm', norm: n };
  if (/(?:abl|ibl|ant|ent|al|il|ul|ol)es$/.test(n)) return { num: 'pl', gen: 'n', norm: n };
  if (/(?:os|iv|ic|ad|id|er|tor|dor)a$/.test(n)) return { num: 'sg', gen: 'f', norm: n };
  if (/(?:os|iv|ic|ad|id|er|tor|dor)o$/.test(n)) return { num: 'sg', gen: 'm', norm: n };
  if (/(?:abl|ibl|ant|ent)e$|(?:al|il|ular|olar)$/.test(n)) return { num: 'sg', gen: 'n', norm: n };
  return null;
}

/**
 * Catálogo jerárquico de reglas morfosintácticas generales del español por familia.
 * Solo modifica el interior estricto [3, L - 4].
 */
const SURGICAL_RULE_CATALOG = [
  // =========================================================================
  // FAMILIA 1: MICRO_SUPPRESSION (Peso +30) — Pleonasmos e intensificadores generales
  // =========================================================================
  {
    id: 'sup_prefijo_coloquial_adj',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 4,
    rx: /\b(?:s[uú]per|mega|h[ií]per)\s+([a-záéíóúüñ]{4,})\b/i,
    rep: '$1'
  },
  {
    id: 'sup_muy_adj_derivativo',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 3,
    guardBeforeNoNeg: true,
    rx: /\bmuy\s+([a-záéíóúüñ]{4,}(?:ad[oa]s?|id[oa]s?|bl[ea]s?|ent[ea]s?|ant[ea]s?|os[oa]s?|iv[oa]s?|ic[oa]s?|er[oa]s?|al(?:es)?|il(?:es)?|or(?:es|as?)?))\b/i,
    rep: (full, adj) => (NON_ADJ_OR_CLOSED_WORDS.has(normalizeWordAscii(adj)) ? full : adj)
  },
  {
    id: 'sup_totalizador_adj_derivativo',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 4,
    guardBeforeNoNeg: true,
    rx: /\b(?:totalmente|completamente|absolutamente)\s+([a-záéíóúüñ]{4,}(?:ad[oa]s?|id[oa]s?|bl[ea]s?|ent[ea]s?|ant[ea]s?|os[oa]s?|iv[oa]s?|ic[oa]s?|al(?:es)?|il(?:es)?))\b/i,
    rep: (full, adj) => (NON_ADJ_OR_CLOSED_WORDS.has(normalizeWordAscii(adj)) ? full : adj)
  },
  {
    id: 'sup_bastante_adj_derivativo',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 3,
    guardBeforeNoNeg: true,
    rx: /\bbastante\s+([a-záéíóúüñ]{4,}(?:ad[oa]s?|id[oa]s?|bl[ea]s?|os[oa]s?|iv[oa]s?|ic[oa]s?|er[oa]s?|al(?:es)?|il(?:es)?))\b/i,
    rep: (full, adj) => (NON_ADJ_OR_CLOSED_WORDS.has(normalizeWordAscii(adj)) ? full : adj)
  },
  {
    id: 'sup_casi_adj_grado',
    family: 'MICRO_SUPPRESSION',
    weight: 29,
    styleGain: 3,
    guardBeforeNoNeg: true,
    rx: /\bcasi\s+([a-záéíóúüñ]{5,}(?:bl[ea]s?|ad[oa]s?|id[oa]s?|nt[ea]s?))\b/i,
    rep: (full, adj) => (NON_ADJ_OR_CLOSED_WORDS.has(normalizeWordAscii(adj)) ? full : adj)
  },
  {
    id: 'sup_pleonasmo_temporal_aun',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 5,
    rx: /\b(?:a[uú]n|todav[ií]a)\s+(sigue[ns]?\s+siendo|mantiene[ns]?|conserva[ns]?)\b/i,
    rep: '$1'
  },
  {
    id: 'sup_verbo_muchisimo',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 4,
    rx: /\b([a-záéíóúüñ]{4,}(?:a|an|e|en))\s+much[ií]simo\b/i,
    rep: (full, verb) => (NON_ADJ_OR_CLOSED_WORDS.has(normalizeWordAscii(verb)) ? full : verb)
  },
  {
    id: 'sup_que_de_hecho_verbo',
    family: 'MICRO_SUPPRESSION',
    weight: 28,
    styleGain: 4,
    rx: /\bque\s+de\s+hecho\s+([a-záéíóúüñ]{4,})\b/i,
    rep: 'que $1'
  },
  {
    id: 'sup_plus_extra',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 5,
    rx: /\bun\s+plus\s+extra\s+de\b/i,
    rep: 'un plus de'
  },
  {
    id: 'sup_sin_duda_alguna',
    family: 'MICRO_SUPPRESSION',
    weight: 30,
    styleGain: 4,
    rx: /\bsin\s+duda\s+alguna\b/i,
    rep: 'sin duda'
  },

  // =========================================================================
  // FAMILIA 2: GRAMMATICAL_COMPRESSION (Peso +24) — Perífrasis y locuciones generales
  // =========================================================================
  {
    id: 'comp_a_la_hora_de_inf',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 25,
    styleGain: 4,
    rx: /\ba\s+la\s+hora\s+de\s+([a-záéíóúüñ]{3,}(?:ar|er|ir))\b/i,
    rep: 'al $1'
  },
  {
    id: 'comp_con_el_objetivo_de',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\bcon\s+el\s+(?:objetivo|prop[oó]sito|fin)\s+de\b/i,
    rep: 'para'
  },
  {
    id: 'comp_a_pesar_de_que',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\ba\s+pesar\s+de\s+que\b/i,
    rep: 'aunque'
  },
  {
    id: 'comp_debido_a_que',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\bdebido\s+a\s+que\b/i,
    rep: 'porque'
  },
  {
    id: 'comp_se_trata_de_np_que',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 4,
    rx: /\bse\s+trata\s+de\s+(un|una|unos|unas)\s+([a-záéíóúüñ]{3,})\s+que\b/i,
    rep: (full, art, noun) => `${/^un[oa]s$/i.test(art) ? 'son' : 'es'} ${art} ${noun} que`
  },
  {
    id: 'comp_suelen_estar_relacionados',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 4,
    rx: /\bsuele(n?)\s+estar\s+relacionad[oa]s?\s+con\b/i,
    rep: (full, pl) => `${pl ? 'se asocian' : 'se asocia'} con`
  },
  {
    id: 'comp_se_ha_convertido_en_todo',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 4,
    rx: /\bse\s+ha(n?)\s+convertido\s+en\s+todo\s+(un|una)\b/i,
    rep: (full, pl, art) => `${pl ? 'son' : 'es'} ya ${art}`
  },
  {
    id: 'comp_tiene_capacidad_de_inf',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 4,
    rx: /\btiene(n?)\s+la\s+capacidad\s+de\s+([a-záéíóúüñ]{3,}(?:ar|er|ir))\b/i,
    rep: (full, pl, inf) => `${pl ? 'pueden' : 'puede'} ${inf}`
  },
  {
    id: 'comp_en_el_terreno_de',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 4,
    rx: /\ben\s+el\s+terreno\s+de\s+(las|los|la|el)\b/i,
    rep: 'dentro de $1'
  },
  {
    id: 'comp_a_lo_largo_de_art',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\ba\s+lo\s+largo\s+de\s+(los|las)\b/i,
    rep: 'durante $1'
  },
  {
    id: 'comp_con_el_paso_del_tiempo',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\bcon\s+el\s+paso\s+del\s+tiempo\b/i,
    rep: 'con el tiempo'
  },
  {
    id: 'comp_no_tiene_por_que_ser',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\bno\s+tiene(n?)\s+por\s+qu[eé]\s+ser\b/i,
    rep: 'no tiene$1 por qué resultar'
  },
  {
    id: 'comp_publico_en_general',
    family: 'GRAMMATICAL_COMPRESSION',
    weight: 24,
    styleGain: 3,
    rx: /\bp[uú]blico\s+en\s+general\b/i,
    rep: 'gran público'
  },

  // =========================================================================
  // FAMILIA 3: SYMMETRIC_COORDINATION_SWAP (Peso +20) — Coordinación simétrica general
  // =========================================================================
  {
    id: 'swap_adj_coord_es',
    family: 'SYMMETRIC_COORDINATION_SWAP',
    weight: 20,
    styleGain: 4,
    guardNotAfterAuxVerb: true,
    rx: /\b([a-záéíóúüñ]{5,}(?:os|as|es|al|ar|il|or|[oa]))\s+(?:y|e)\s+([a-záéíóúüñ]{5,}(?:os|as|es|al|ar|il|or|[oa]))\b/i,
    rep: (full, a, b) => {
      if (/^[A-ZÁÉÍÓÚÑ]/.test(a) || /^[A-ZÁÉÍÓÚÑ]/.test(b)) return full;
      const m1 = getSpanishAdjMorph(a);
      const m2 = getSpanishAdjMorph(b);
      if (!m1 || !m2 || m1.norm === m2.norm) return full;
      if (m1.num !== m2.num) return full;
      if (m1.gen !== 'n' && m2.gen !== 'n' && m1.gen !== m2.gen) return full;
      if (isNonCommutablePair(a, b)) return full;
      return joinSpanishCoord(b, a);
    }
  },
  {
    id: 'swap_tanto_prep_como_prep',
    family: 'SYMMETRIC_COORDINATION_SWAP',
    weight: 20,
    styleGain: 4,
    rx: /\btanto\s+(en|por|con|para)\s+([a-záéíóúüñ]{4,})\s+como\s+\1\s+([a-záéíóúüñ]{4,})\b/i,
    rep: (full, prep, a, b) => {
      if (normalizeWordAscii(a) === normalizeWordAscii(b) || isNonCommutablePair(a, b)) return full;
      return `tanto ${prep} ${b} como ${prep} ${a}`;
    }
  },
  {
    id: 'swap_o_bien_correlativo',
    family: 'SYMMETRIC_COORDINATION_SWAP',
    weight: 20,
    styleGain: 4,
    rx: /\bo\s+bien\s+([^,.;:!?]{4,28}?)\s+o\s+bien\s+([^,.;:!?]{4,28}?)(?=[,.;:!?]|$)/i,
    rep: (full, a, b) => {
      const ca = a.trim();
      const cb = b.trim();
      if (!ca || !cb || ca.toLowerCase() === cb.toLowerCase()) return full;
      if (/\b(?:que|porque|cuando|si|es|son|puede|pueden|tiene|tienen)\b/i.test(`${ca} ${cb}`)) return full;
      if (isNonCommutablePair(ca, cb)) return full;
      return `o bien ${cb} o bien ${ca}`;
    }
  },
  {
    id: 'swap_enum_triad_es',
    family: 'SYMMETRIC_COORDINATION_SWAP',
    weight: 20,
    styleGain: 4,
    guardNotAfterAuxVerb: true,
    rx: /\b([a-záéíóúüñ]{4,}),\s+([a-záéíóúüñ]{4,})\s+(?:y|e)\s+([a-záéíóúüñ]{4,})\b/i,
    rep: (full, w1, w2, w3) => {
      if (/^[A-ZÁÉÍÓÚÑ]/.test(w1) || /^[A-ZÁÉÍÓÚÑ]/.test(w2) || /^[A-ZÁÉÍÓÚÑ]/.test(w3)) return full;
      const n1 = normalizeWordAscii(w1);
      const n2 = normalizeWordAscii(w2);
      const n3 = normalizeWordAscii(w3);
      if (n1 === n2 || n2 === n3 || n1 === n3) return full;
      if (ENUM_SEQ_STOPWORDS.has(n1) || ENUM_SEQ_STOPWORDS.has(n2) || ENUM_SEQ_STOPWORDS.has(n3)) return full;
      if (isNonCommutablePair(w1, w2) || isNonCommutablePair(w2, w3) || isNonCommutablePair(w1, w3)) return full;
      const allPlural = n1.endsWith('s') && n2.endsWith('s') && n3.endsWith('s');
      const m1 = getSpanishAdjMorph(w1);
      const m2 = getSpanishAdjMorph(w2);
      const m3 = getSpanishAdjMorph(w3);
      const compatAdj = Boolean(m1 && m2 && m3 && m1.num === m2.num && m2.num === m3.num);
      if (!allPlural && !compatAdj) return full;
      return `${w2}, ${joinSpanishCoord(w1, w3)}`;
    }
  },

  // =========================================================================
  // FAMILIA 4: CENTRAL_FUNCTIONAL_PIVOT (Peso +12) — Conectores discursivos generales
  // =========================================================================
  {
    id: 'piv_pero_sobre_todo',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 3,
    rx: /\bpero\s+sobre\s+todo\b/i,
    rep: 'y, ante todo'
  },
  {
    id: 'piv_sobre_todo_prep',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bsobre\s+todo\s+(en|por|para|con|si|cuando)\b/i,
    rep: 'especialmente $1'
  },
  {
    id: 'piv_y_es_que',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\by\s+es\s+que\b/i,
    rep: 'puesto que'
  },
  {
    id: 'piv_gracias_a_det',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bgracias\s+a\s+(su|sus|la|el|las|los)\b/i,
    rep: 'por $1'
  },
  {
    id: 'piv_ademas_copula',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\badem[aá]s,\s*(son|resultan|ofrecen|permiten|aportan)\b/i,
    rep: 'asimismo, $1'
  },
  {
    id: 'piv_lo_cierto_es_que',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\blo\s+cierto\s+es\s+que\b/i,
    rep: 'la realidad es que'
  },
  {
    id: 'piv_sin_embargo_to_no_obstante',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bsin\s+embargo,\b/i,
    rep: 'no obstante,'
  },
  {
    id: 'piv_no_obstante_to_sin_embargo',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bno\s+obstante,\b/i,
    rep: 'sin embargo,'
  },
  {
    id: 'piv_por_otro_lado',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bpor\s+otro\s+lado,\b/i,
    rep: 'por otra parte,'
  },
  {
    id: 'piv_por_otra_parte',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bpor\s+otra\s+parte,\b/i,
    rep: 'por otro lado,'
  },
  {
    id: 'piv_por_lo_que',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bpor\s+lo\s+que\b/i,
    rep: 'de modo que'
  },
  {
    id: 'piv_de_esta_forma',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bde\s+esta\s+(?:forma|manera)\b/i,
    rep: 'de este modo'
  },
  {
    id: 'piv_de_igual_forma',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bde\s+igual\s+(?:forma|manera)\b/i,
    rep: 'del mismo modo'
  },
  {
    id: 'piv_hoy_en_dia',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bhoy\s+en\s+d[ií]a\b/i,
    rep: 'actualmente'
  },
  {
    id: 'piv_mientras_que',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bmientras\s+que\b/i,
    rep: 'en tanto que'
  },
  {
    id: 'piv_por_eso',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\bpor\s+eso,\b/i,
    rep: 'por ello,'
  },
  {
    id: 'piv_aunque_verbo',
    family: 'CENTRAL_FUNCTIONAL_PIVOT',
    weight: 12,
    styleGain: 2,
    rx: /\baunque\s+(es|son|puede|pueden|suele|suelen|tiene|tienen)\b/i,
    rep: 'si bien $1'
  }
];

/**
 * Respaldo estricto 1-a-1 invariante para rachas centrales sin ningún patrón multipalabra.
 * Solo actúa en el interior [3, L - 4], nunca repite una palabra ya existente en la oración
 * y conserva exactamente género, número y tiempo verbal.
 */
const INVARIANT_CENTRAL_TOKENS = {
  favorecen: ['estilizan'],
  favorece: ['estiliza'],
  estilizan: ['favorecen'],
  estiliza: ['favorece'],
  combinan: ['armonizan'],
  combina: ['armoniza'],
  aportan: ['brindan'],
  aporta: ['brinda'],
  ofrecen: ['brindan'],
  ofrece: ['brinda'],
  protegen: ['resguardan'],
  protege: ['resguarda'],
  destacan: ['resaltan'],
  destaca: ['resalta'],
  encuentran: ['hallan'],
  encontramos: ['hallamos'],
  buscas: ['prefieres'],
  opciones: ['alternativas'],
  alternativas: ['opciones'],
  modelos: ['diseños'],
  diseños: ['modelos'],
  atemporal: ['intemporal'],
  esencial: ['fundamental'],
  icónicos: ['emblemáticos'],
  icónicas: ['emblemáticas'],
  perfecto: ['idóneo'],
  perfecta: ['idónea'],
  perfectos: ['idóneos'],
  perfectas: ['idóneas'],
  colores: ['tonos'],
  tonos: ['colores']
};

const SPANISH_GENDER_EXCEPTIONS = {
  mascPluralEndingInAs: new Set([
    'dias', 'mapas', 'temas', 'problemas', 'sistemas', 'programas', 'esquemas', 'dilemas',
    'climas', 'idiomas', 'poemas', 'dramas', 'traumas', 'panoramas', 'sintomas', 'planetas',
    'cometas', 'poetas', 'sofas', 'pijamas', 'aromas', 'prismas', 'lemas', 'teoremas',
    'enigmas', 'fantasmas', 'extras', 'ultras', 'curas', 'espias', 'guias', 'policias',
    'colegas', 'atletas', 'artistas', 'turistas', 'especialistas', 'deportistas', 'periodistas',
    'modistas', 'estilistas', 'optometristas', 'oculistas', 'dentistas', 'analistas', 'demas',
    'paraguas', 'cumpleanos', 'guardaespaldas', 'rompecabezas', 'sacacorchos'
  ]),
  invariantOrMiscEndingInOs: new Set([
    'dos', 'unos', 'otros', 'muchos', 'pocos', 'varios', 'todos', 'ambos', 'menos',
    'lejos', 'nos', 'vos', 'os', 'caos', 'cosmos', 'dios', 'adios', 'cumpleanos', 'portafolios'
  ]),
  femSgEndingInO: new Set(['mano', 'foto', 'moto', 'radio', 'libido', 'dinamo', 'polio', 'seo']),
  mascSgDeterminers: new Set(['el', 'un', 'este', 'ese', 'algun', 'ningun']),
  femSgDeterminers: new Set(['la', 'una', 'esta', 'esa', 'alguna', 'ninguna']),
  mascPlDeterminers: new Set(['los', 'unos', 'estos', 'esos']),
  femPlDeterminers: new Set(['las', 'unas', 'estas', 'esas'])
};

/**
 * Valida la concordancia morfosintáctica general determinante-sustantivo/adjetivo en español.
 */
function hasGeneralSpanishAgreementError(sentence) {
  const words = tokenizeWithOffsets(sentence).map(t => ({
    raw: t.word,
    norm: normalizeWordAscii(t.word)
  }));

  for (let i = 0; i < words.length - 1; i++) {
    const det = words[i].norm;
    const w = words[i + 1].norm;
    if (!w || w.length < 3) continue;

    // 1. Determinante masculino singular + sustantivo femenino inequívoco o plural claro
    if (SPANISH_GENDER_EXCEPTIONS.mascSgDeterminers.has(det)) {
      if (/(?:cion|sion|dad|tad|tud|umbre|ciones|siones|dades|tades|tudes|umbres)$/.test(w)) {
        return true;
      }
      if (/(?:as|os)$/.test(w) && w.length >= 4 &&
          !SPANISH_GENDER_EXCEPTIONS.invariantOrMiscEndingInOs.has(w) &&
          !SPANISH_GENDER_EXCEPTIONS.mascPluralEndingInAs.has(w) &&
          !/(?:mas|menos|lejos|atras|demas|jamas|detras|alias|atlas|compas|gas)$/.test(w)) {
        return true;
      }
    }

    // 2. Determinante femenino singular + sustantivo masculino inequívoco (-aje/-amiento/-imiento) o plural claro
    if (SPANISH_GENDER_EXCEPTIONS.femSgDeterminers.has(det)) {
      if (/(?:aje|ajes|amiento|imientos|amiento|amientos|ciones|siones|dades|tades|tudes|umbres)$/.test(w)) {
        return true;
      }
      if (/os$/.test(w) && w.length >= 4 && !SPANISH_GENDER_EXCEPTIONS.invariantOrMiscEndingInOs.has(w)) {
        return true;
      }
      if (/^(?:tipo|estilo|corte|diseno|modelo|armazon|puente)s?$/.test(w) && w !== 'modelo') {
        return true;
      }
    }

    // 3. Determinante plural + sustantivo singular derivativo inequívoco
    if (SPANISH_GENDER_EXCEPTIONS.mascPlDeterminers.has(det) || SPANISH_GENDER_EXCEPTIONS.femPlDeterminers.has(det)) {
      if (/(?:cion|sion|dad|tad|tud|umbre|aje|amiento|imiento)$/.test(w) && w !== 'traje') {
        return true;
      }
    }

    // 4. Determinante masculino plural + sustantivo femenino plural derivativo inequívoco
    if (SPANISH_GENDER_EXCEPTIONS.mascPlDeterminers.has(det)) {
      if (/(?:ciones|siones|dades|tades|tudes|umbres|encias|ancias|anzas|uras)$/.test(w) && w !== 'curas') {
        return true;
      }
    }

    // 5. Determinante femenino plural + sustantivo masculino plural derivativo inequívoco
    if (SPANISH_GENDER_EXCEPTIONS.femPlDeterminers.has(det)) {
      if (/(?:ajes|amientos|imientos)$/.test(w)) {
        return true;
      }
    }
  }

  // 6. Núcleo masculino ("estilo/corte/diseño/modelo/tipo") seguido de adjetivo femenino inequívoco
  // (omite "modelo" con determinante femenino como "la modelo", y evita verbos finitos como "explica" o "consolida")
  const mascHeadFemAdjRx = /(?:^|[\s,.;:!?¿¡("«])(?:(la|una|esta|esa|aquella)\s+)?(estilo|corte|dise[ñn]o|modelo|tipo)\s+([a-záéíóúüñ]+)/gi;
  let mhMatch;
  while ((mhMatch = mascHeadFemAdjRx.exec(sentence)) !== null) {
    const femDet = mhMatch[1];
    const headNoun = mhMatch[2];
    const adj = mhMatch[3];
    if (femDet && /^modelo$/i.test(headNoun)) continue;

    if (/^[a-záéíóúüñ]{2,}(?:ada|ida|osa|onda)$/i.test(adj)) {
      if (!/^(?:salida|medida|comida|bebida|herida|ca[ií]da|subida|bajada|entrada|llegada|llamada|mirada|parada|jornada|temporada|d[eé]cada|vida|duda|ayuda|nada|cada|toda|moda|boda|seda|rueda|moneda|sonda|ronda|fonda|onda|agrada|traslada|degrada|enfada|olvida|valida|revalida|invalida|cuida|anida|consolida|liquida|dilapida|intimida|oxida|presida|coincida|acosa|reposa|endosa|esposa|desglosa|rebosa|glosa|posa|osa|ahonda)$/i.test(adj)) {
        return true;
      }
    } else if (/^[a-záéíóúüñ]*[áéíóú][a-zñ]*ica$/i.test(adj)) {
      return true;
    } else if (/^[a-záéíóúüñ]{2,}(?:tiva|siva)$/i.test(adj)) {
      if (!/^(?:motiva|activa|reactiva|desactiva|cultiva|incentiva)$/i.test(adj)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validador gramatical estricto post-cirugía.
 */
function validateSurgicalSentence(beforeSent, afterSent, protectedTokensSet, minInteriorIdx = 3) {
  if (!beforeSent || !afterSent || beforeSent === afterSent) {
    return { ok: false, reason: 'Sin cambio efectivo' };
  }

  const beforeTokens = tokenizeWithOffsets(beforeSent);
  const afterTokens = tokenizeWithOffsets(afterSent);
  const L = beforeTokens.length;
  if (L < 8 || afterTokens.length < 6) {
    return { ok: false, reason: 'Oración demasiado corta' };
  }

  // 1. Border Lock estricto: primeras 3 y últimas 3 palabras y su puntuación intactas
  const lockedPrefix = beforeSent.slice(0, beforeTokens[minInteriorIdx - 1].end);
  const lockedSuffix = beforeSent.slice(beforeTokens[L - 3].start);
  if (!afterSent.startsWith(lockedPrefix) || !afterSent.endsWith(lockedSuffix)) {
    return { ok: false, reason: 'Violación de Border Lock en bordes de oración' };
  }

  // 2. Preservación absoluta de entidades/marcas/SKUs/números protegidos
  const afterNormCounts = new Map();
  for (const t of afterTokens) afterNormCounts.set(t.norm, (afterNormCounts.get(t.norm) || 0) + 1);
  for (const pTok of protectedTokensSet) {
    const beforeCount = beforeTokens.filter(t => t.norm === pTok).length;
    const afterCount = afterNormCounts.get(pTok) || 0;
    if (afterCount < beforeCount) {
      return { ok: false, reason: `Entidad protegida alterada (${pTok})` };
    }
  }

  // 3. Control estricto de delta de longitud (preserva el Burstiness de las oraciones largas)
  const absDelta = Math.abs(afterTokens.length - L);
  if (absDelta > 3) {
    return { ok: false, reason: `Cambio de longitud excesivo para preservar Burstiness (${L} -> ${afterTokens.length})` };
  }

  // 4. Higiene sintáctica y morfológica general en español
  if (/\b([a-záéíóúñ]{2,})\s+\1\b/i.test(afterSent)) {
    return { ok: false, reason: 'Palabra duplicada consecutiva' };
  }
  if (hasGeneralSpanishAgreementError(afterSent)) {
    return { ok: false, reason: 'Discordancia de género/número en determinante o modificador' };
  }
  if (/\b(de|en|con|por|para|a)\s+\1\b/i.test(afterSent) ||
      /\b(?:a|de)\s+el\b/i.test(afterSent)) {
    return { ok: false, reason: 'Preposición duplicada o contracción rota (a el / de el)' };
  }
  if (/[.,;:]{2,}|^\s*[,;:]|\s+[.,;:!?]/.test(afterSent)) {
    return { ok: false, reason: 'Puntuación anómala generada' };
  }

  return { ok: true };
}

/**
 * Aplica reemplazo sobre [matchStart, matchEnd] ajustando capitalización y espacios.
 */
function buildEditedSentence(sent, matchStart, matchEnd, ruleRep, regexMatch) {
  let outStr = typeof ruleRep === 'function'
    ? ruleRep(...regexMatch)
    : String(ruleRep).replace(/\$(\d)/g, (_, d) => (regexMatch[Number(d)] || ''));

  const firstRaw = regexMatch[0] || '';
  if (/^[A-ZÁÉÍÓÚÑ]/.test(firstRaw) && /^[a-záéíóúñ]/.test(outStr)) {
    outStr = outStr.charAt(0).toUpperCase() + outStr.slice(1);
  }

  const rawJoined = sent.slice(0, matchStart) + outStr + sent.slice(matchEnd);
  return {
    text: rawJoined
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,;:!?])/g, '$1')
      .trim(),
    replacement: outStr.trim()
  };
}

const ECHO_STOPWORDS_ES = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'en',
  'con', 'por', 'para', 'sin', 'sobre', 'entre', 'como', 'cuando', 'donde', 'que',
  'quien', 'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas', 'muy',
  'mas', 'más', 'pero', 'aunque', 'sino', 'porque', 'pues', 'todo', 'toda', 'todos',
  'todas', 'cada', 'mucho', 'mucha', 'muchos', 'muchas', 'poco', 'tienen', 'tiene',
  'pueden', 'puede', 'suelen', 'suele', 'estan', 'están'
]);

/**
 * Indexa lemas y bigramas de las demás oraciones del párrafo para detectar eco léxico.
 */
function buildSentenceEchoIndex(sentences, editedSentences, curIdx) {
  const otherSentNormSet = new Set();
  const otherSentBigrams = new Set();
  const otherSents = [
    ...editedSentences,
    ...sentences.slice(curIdx + 1)
  ];

  for (const os of otherSents) {
    const toks = tokenizeWithOffsets(os);
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i].norm;
      if (w.length >= 6 && !ECHO_STOPWORDS_ES.has(w)) {
        otherSentNormSet.add(w);
      }
      if (i + 1 < toks.length) {
        const w2 = toks[i + 1].norm;
        if ((w.length >= 5 || w2.length >= 5) && !(ECHO_STOPWORDS_ES.has(w) && ECHO_STOPWORDS_ES.has(w2))) {
          otherSentBigrams.add(`${w} ${w2}`);
        }
      }
    }
  }

  return { otherSentNormSet, otherSentBigrams };
}

/**
 * Penaliza reemplazos que introducen bigramas o lemas distintivos ya presentes en otras oraciones.
 */
function computeCandidateEchoPenalty(beforeSnippet, replacement, otherSentNormSet, otherSentBigrams) {
  if (!otherSentNormSet && !otherSentBigrams) return 0;
  const beforeToks = tokenizeWithOffsets(beforeSnippet);
  const afterToks = tokenizeWithOffsets(replacement);

  const beforeNorms = new Set(beforeToks.map(t => t.norm));
  const beforeBigrams = new Set();
  for (let i = 0; i < beforeToks.length - 1; i++) {
    beforeBigrams.add(`${beforeToks[i].norm} ${beforeToks[i + 1].norm}`);
  }

  let penalty = 0;
  if (otherSentNormSet) {
    const seenNew = new Set();
    for (const tk of afterToks) {
      if (tk.norm.length >= 6 && !ECHO_STOPWORDS_ES.has(tk.norm) && !beforeNorms.has(tk.norm) && !seenNew.has(tk.norm)) {
        seenNew.add(tk.norm);
        if (otherSentNormSet.has(tk.norm)) penalty += 14;
      }
    }
  }
  if (otherSentBigrams) {
    const seenBg = new Set();
    for (let i = 0; i < afterToks.length - 1; i++) {
      const a = afterToks[i].norm;
      const b = afterToks[i + 1].norm;
      const bg = `${a} ${b}`;
      if ((a.length >= 5 || b.length >= 5) && !(ECHO_STOPWORDS_ES.has(a) && ECHO_STOPWORDS_ES.has(b)) && !beforeBigrams.has(bg) && !seenBg.has(bg)) {
        seenBg.add(bg);
        if (otherSentBigrams.has(bg)) penalty += 28;
      }
    }
  }
  return penalty;
}

/**
 * Genera y puntúa todos los candidatos quirúrgicos válidos para la racha activa [run.start, run.end]
 * estrictamente dentro de [minInteriorIdx, maxInteriorIdx].
 */
function findBestSurgicalEditForRun({
  sent,
  tokens,
  run,
  protectedMask,
  protectedTokensSet,
  minInteriorIdx,
  maxInteriorIdx,
  modifiedRanges,
  donor7GramSet,
  engine,
  usedRuleIds,
  paragraphNormSet = null,
  otherSentNormSet = null,
  otherSentBigrams = null,
  allowSingleTokenFallback = true
}) {
  const L = tokens.length;
  const runCenter = (run.start + run.end) / 2;
  const currentStats = findSentenceContiguousRuns(tokens, donor7GramSet, engine, 7);
  const beforeTotalHits = currentStats.matchedShinglesCount;

  const leftCharBound = tokens[minInteriorIdx - 1].end;
  const rightCharBound = tokens[L - 3].start;
  const candidates = [];

  for (const rule of SURGICAL_RULE_CATALOG) {
    if (usedRuleIds && usedRuleIds.has(rule.id)) continue;

    const rx = new RegExp(rule.rx.source, rule.rx.flags.includes('g') ? rule.rx.flags : `${rule.rx.flags}g`);
    let m;
    while ((m = rx.exec(sent)) !== null) {
      const mStart = m.index;
      const mEnd = mStart + m[0].length;

      // Bloqueo estricto de bordes a nivel de carácter y token
      if (mStart < leftCharBound || mEnd > rightCharBound) continue;

      const affected = tokens.filter(t => t.end > mStart && t.start < mEnd);
      if (!affected.length) continue;

      const affStart = affected[0].idx;
      const affEnd = affected[affected.length - 1].idx;
      if (affStart < minInteriorIdx || affEnd > maxInteriorIdx) continue;

      // Debe solapar realmente con la racha activa
      if (affEnd < run.start || affStart > run.end) continue;

      // Prohibido tocar tokens protegidos
      let touchesProtected = false;
      for (let idx = affStart; idx <= affEnd; idx++) {
        if (protectedMask[idx]) {
          touchesProtected = true;
          break;
        }
      }
      if (touchesProtected) continue;

      // Guard negación antes de intensificador "muy"
      if (rule.guardBeforeNoNeg) {
        const beforeSlice = sent.slice(Math.max(0, mStart - 24), mStart).toLowerCase();
        if (/\b(?:no|ni|tampoco|o)\s+(?:es|son|est[aá]n?|era[ns]?|resulta[ns]?|parece[n]?)?\s*$/i.test(beforeSlice)) {
          continue;
        }
      }

      // Guard para no permutar participios tras verbos auxiliares/copulativos
      if (rule.guardNotAfterAuxVerb) {
        const beforeSlice = sent.slice(Math.max(0, mStart - 32), mStart).toLowerCase();
        if (/\b(?:ha|han|he|hemos|hab[ií]a[ns]?|fue|fueron|es|son|est[aá]n?|ser|estar|viene[ns]?|lleva[ns]?|sigue[ns]?|queda[ns]?)\s+(?:sido\s+)?$/i.test(beforeSlice)) {
          continue;
        }
      }

      // Guard distancia mínima (>= 3.5 tokens en centros, sin solapar) respecto a cirugías previas en la misma oración
      const opMid = (affStart + affEnd) / 2;
      if (modifiedRanges.some(mr => (affStart <= mr.end && affEnd >= mr.start) || Math.abs(opMid - mr.mid) < 3.5)) {
        continue;
      }

      const { text: candidateSent, replacement } = buildEditedSentence(sent, mStart, mEnd, rule.rep, m);
      const val = validateSurgicalSentence(sent, candidateSent, protectedTokensSet, minInteriorIdx);
      if (!val.ok) continue;

      const afterTokens = tokenizeWithOffsets(candidateSent);
      const afterStats = findSentenceContiguousRuns(afterTokens, donor7GramSet, engine, 7);
      const hitDrop = beforeTotalHits - afterStats.matchedShinglesCount;
      const maxLenDrop = currentStats.maxRunLen - afterStats.maxRunLen;
      if (hitDrop <= 0 && maxLenDrop <= 0) continue;

      const normDist = Math.abs(opMid - runCenter) / Math.max(1, run.len / 2);
      const centralityScore = Math.max(0, 20 * (1 - normDist));
      const lengthPenalty = Math.abs(afterTokens.length - L) * 3;
      const echoPenalty = computeCandidateEchoPenalty(m[0], replacement, otherSentNormSet, otherSentBigrams);
      const totalScore = rule.weight + (rule.styleGain || 0) + centralityScore + hitDrop * 3 + maxLenDrop * 2.5 - lengthPenalty - echoPenalty;

      candidates.push({
        ruleId: rule.id,
        family: rule.family,
        beforeSnippet: m[0],
        afterSnippet: replacement,
        candidateSent,
        affStart,
        affEnd,
        opMid,
        afterTokensCount: afterTokens.length,
        deltaWords: afterTokens.length - L,
        beforeMaxRun: currentStats.maxRunLen,
        afterMaxRun: afterStats.maxRunLen,
        beforeHits: beforeTotalHits,
        afterHits: afterStats.matchedShinglesCount,
        centralityScore: Number(centralityScore.toFixed(1)),
        totalScore
      });
    }
  }

  // Respaldo estrictamente central de 1 token invariante si no hubo coincidencia de Familias 1-3 ni pivote multipalabra
  if (allowSingleTokenFallback && candidates.length === 0) {
    const sentNormSet = new Set(tokens.map(t => t.norm));
    const lowStart = Math.max(minInteriorIdx, run.start);
    const highEnd = Math.min(maxInteriorIdx, run.end);

    const interiorIndices = [];
    for (let idx = lowStart; idx <= highEnd; idx++) {
      interiorIndices.push(idx);
    }
    interiorIndices.sort((a, b) => Math.abs(a - runCenter) - Math.abs(b - runCenter));

    for (const idx of interiorIndices) {
      if (protectedMask[idx]) continue;
      if (modifiedRanges.some(mr => Math.abs(idx - mr.mid) < 5)) continue;

      const tok = tokens[idx];
      const syns = INVARIANT_CENTRAL_TOKENS[tok.norm];
      if (!syns || !syns.length) continue;

      // Guards contextuales estrictos en español
      const prevNorm = tokens[idx - 1]?.norm || '';
      const nextNorm = tokens[idx + 1]?.norm || '';
      if (tok.norm === 'complemento' && prevNorm === 'un' && nextNorm === 'más') continue;
      if (tok.norm === 'diseños' && /\b(?:de|los)\b/.test(prevNorm) && /\bretro\b/.test(nextNorm)) {
        // "los diseños retro" -> "los modelos retro" es válido, pero no si "modelo/s" ya existe en la oración
      }

      for (const syn of syns) {
        const synNorm = normalizeSimple(syn);
        if (sentNormSet.has(synNorm) || (paragraphNormSet && paragraphNormSet.has(synNorm))) continue;

        const outWord = /^[A-ZÁÉÍÓÚÑ]/.test(tok.word)
          ? syn.charAt(0).toUpperCase() + syn.slice(1)
          : syn;
        const candidateSent = sent.slice(0, tok.start) + outWord + sent.slice(tok.end);
        const val = validateSurgicalSentence(sent, candidateSent, protectedTokensSet, minInteriorIdx);
        if (!val.ok) continue;

        const afterTokens = tokenizeWithOffsets(candidateSent);
        const afterStats = findSentenceContiguousRuns(afterTokens, donor7GramSet, engine, 7);
        const hitDrop = beforeTotalHits - afterStats.matchedShinglesCount;
        const maxLenDrop = currentStats.maxRunLen - afterStats.maxRunLen;
        if (hitDrop <= 0 && maxLenDrop <= 0) continue;

        const normDist = Math.abs(idx - runCenter) / Math.max(1, run.len / 2);
        const centralityScore = Math.max(0, 20 * (1 - normDist));
        const totalScore = 10 + centralityScore + hitDrop * 3 + maxLenDrop * 2.5;

        candidates.push({
          ruleId: `central_invariant:${tok.norm}->${syn}`,
          family: 'CENTRAL_FUNCTIONAL_PIVOT',
          beforeSnippet: tok.word,
          afterSnippet: outWord,
          candidateSent,
          affStart: idx,
          affEnd: idx,
          opMid: idx,
          afterTokensCount: afterTokens.length,
          deltaWords: 0,
          beforeMaxRun: currentStats.maxRunLen,
          afterMaxRun: afterStats.maxRunLen,
          beforeHits: beforeTotalHits,
          afterHits: afterStats.matchedShinglesCount,
          centralityScore: Number(centralityScore.toFixed(1)),
          totalScore
        });
        break;
      }
      if (candidates.length > 0) break;
    }
  }

  candidates.sort((a, b) => b.totalScore - a.totalScore);
  return candidates[0] || null;
}

/**
 * Aplica la Micro-Cirugía Gramatical Central a un párrafo completo.
 */
function applyCentralGrammaticalSurgery(paragraphText, donorsUsedInPara = [], engine = null, atoms = null, options = {}) {
  const minShingleLen = options.minShingleLen || 7;
  const sentences = splitSentencesWithSeparators(paragraphText);
  if (!sentences.length) {
    return {
      text: paragraphText,
      operations: [],
      stats: { overlapsBefore: 0, overlapsAfter: 0, sentencesEdited: 0, borderViolations: 0 }
    };
  }

  const donor7GramSet = buildDonor7GramSet(donorsUsedInPara, engine ? (t) => engine.tokenize(t) : null);
  const paragraphNormSet = new Set();
  for (const s of sentences) {
    for (const tk of tokenizeWithOffsets(s)) {
      paragraphNormSet.add(tk.norm);
    }
  }
  const usedRuleIds = new Set();
  const operations = [];
  const editedSentences = [];
  let totalBeforeOverlaps = 0;
  let totalAfterOverlaps = 0;
  let borderViolations = 0;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    let curSent = sentences[sIdx];
    const origSent = curSent;
    const origTokens = tokenizeWithOffsets(origSent);
    const L0 = origTokens.length;

    const initialStats = findSentenceContiguousRuns(origTokens, donor7GramSet, engine, minShingleLen);
    totalBeforeOverlaps += initialStats.matchedShinglesCount;

    if (L0 < 8 || initialStats.runs.length === 0) {
      editedSentences.push(curSent);
      totalAfterOverlaps += initialStats.matchedShinglesCount;
      continue;
    }

    const protectedMask0 = buildProtectedMask(origTokens, atoms);
    const protectedTokensSet = new Set();
    for (let i = 0; i < L0; i++) {
      if (protectedMask0[i]) protectedTokensSet.add(origTokens[i].norm);
    }

    const { otherSentNormSet, otherSentBigrams } = buildSentenceEchoIndex(sentences, editedSentences, sIdx);

    // Presupuesto adaptativo proporcional en oraciones medianas y largas dentro de [3, L - 4]
    const maxOps = L0 >= 48
      ? 5
      : (L0 >= 30 ? 4 : (L0 >= 22 || initialStats.maxRunLen >= 20 ? 3 : (initialStats.maxRunLen >= 14 && L0 >= 16 ? 2 : 1)));
    const modifiedRanges = [];

    for (let opNum = 0; opNum < maxOps; opNum++) {
      const curTokens = tokenizeWithOffsets(curSent);
      const L = curTokens.length;
      if (L < 8) break;

      const minInteriorIdx = 3;
      const maxInteriorIdx = L - 4;
      if (maxInteriorIdx < minInteriorIdx) break;

      const statsNow = findSentenceContiguousRuns(curTokens, donor7GramSet, engine, minShingleLen);
      const minTargetRunLen = minShingleLen;
      const candidateRuns = statsNow.runs.filter(r => r.len >= minTargetRunLen);
      if (!candidateRuns.length) break;

      candidateRuns.sort((a, b) => b.len - a.len);
      const curProtectedMask = buildProtectedMask(curTokens, atoms);
      let bestEdit = null;

      for (const targetRun of candidateRuns) {
        bestEdit = findBestSurgicalEditForRun({
          sent: curSent,
          tokens: curTokens,
          run: targetRun,
          protectedMask: curProtectedMask,
          protectedTokensSet,
          minInteriorIdx,
          maxInteriorIdx,
          modifiedRanges,
          donor7GramSet,
          engine,
          usedRuleIds,
          paragraphNormSet,
          otherSentNormSet,
          otherSentBigrams,
          allowSingleTokenFallback: true
        });
        if (bestEdit) break;
      }

      if (!bestEdit) break;

      usedRuleIds.add(bestEdit.ruleId);
      const shift = bestEdit.afterTokensCount - L;
      for (const mr of modifiedRanges) {
        if (mr.start > bestEdit.affStart) {
          mr.start += shift;
          mr.end += shift;
          mr.mid += shift;
        }
      }
      const newSpanEnd = Math.max(bestEdit.affStart, bestEdit.affEnd + shift);
      modifiedRanges.push({
        start: bestEdit.affStart,
        end: newSpanEnd,
        mid: (bestEdit.affStart + newSpanEnd) / 2
      });

      operations.push({
        sentenceIndex: sIdx + 1,
        opIndex: opNum + 1,
        sentenceWordCount: L,
        interiorPosition: `${bestEdit.affStart}..${bestEdit.affEnd}/${L}`,
        ruleId: bestEdit.ruleId,
        family: bestEdit.family,
        beforeSnippet: bestEdit.beforeSnippet,
        afterSnippet: bestEdit.afterSnippet,
        beforeMaxRun: bestEdit.beforeMaxRun,
        afterMaxRun: bestEdit.afterMaxRun,
        beforeHits: bestEdit.beforeHits,
        afterHits: bestEdit.afterHits,
        centralityScore: bestEdit.centralityScore
      });

      curSent = bestEdit.candidateSent;
      for (const tk of tokenizeWithOffsets(bestEdit.afterSnippet || '')) {
        paragraphNormSet.add(tk.norm);
      }
    }

    const finalTokens = tokenizeWithOffsets(curSent);
    const finalStats = findSentenceContiguousRuns(finalTokens, donor7GramSet, engine, minShingleLen);
    totalAfterOverlaps += finalStats.matchedShinglesCount;

    // Auditoría estricta de Border Lock respecto a la oración original
    const lockedPrefix = origSent.slice(0, origTokens[2].end);
    const lockedSuffix = origSent.slice(origTokens[L0 - 3].start);
    if (!curSent.startsWith(lockedPrefix) || !curSent.endsWith(lockedSuffix)) {
      borderViolations++;
      curSent = origSent; // Failsafe absoluto: nunca entregar una oración con bordes rotos
    }

    editedSentences.push(curSent);
  }

  return {
    text: editedSentences.join(' ').trim(),
    operations,
    stats: {
      overlapsBefore: totalBeforeOverlaps,
      overlapsAfter: totalAfterOverlaps,
      sentencesEdited: new Set(operations.map(o => o.sentenceIndex)).size,
      borderViolations
    }
  };
}

module.exports = {
  tokenizeWithOffsets,
  splitSentencesWithSeparators,
  buildDonor7GramSet,
  findSentenceContiguousRuns,
  hasGeneralSpanishAgreementError,
  validateSurgicalSentence,
  applyCentralGrammaticalSurgery,
  SURGICAL_RULE_CATALOG,
  INVARIANT_CENTRAL_TOKENS
};
