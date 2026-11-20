'use strict';

const { OUTRO_CLICHES, AI_CLICHE_REPLACEMENTS, FRAME_SHAPE_ONTOLOGY } = require('./lexical-constants.cjs');

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»""''“”‘’¡?¿–—…´]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function getShapeKeysFromText(text) {
  const keys = new Set();
  const str = (text || '').toLowerCase();
  for (const [k, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
    if (def.detectRx.test(str)) keys.add(k);
  }
  return keys;
}

function isShapeCompatible(donorText, targetShapes) {
  const donorKeys = getShapeKeysFromText(donorText);
  if (donorKeys.size === 0) return true; // shape-neutral
  if (!targetShapes || !targetShapes.length) return false;

  const targetKeys = new Set();
  for (const ts of targetShapes) {
    const tsNorm = (ts || '').toLowerCase();
    for (const [k, def] of Object.entries(FRAME_SHAPE_ONTOLOGY)) {
      if (def.detectRx.test(tsNorm) || def.canonical.toLowerCase() === tsNorm || k === tsNorm) {
        targetKeys.add(k);
      }
    }
  }

  for (const dk of donorKeys) {
    if (!targetKeys.has(dk)) return false;
  }
  return true;
}

function isHeading(text, paraIndex = -1) {
  const clean = text.trim();
  if (!clean) return false;
  const words = clean.split(/\s+/).filter(Boolean);
  
  // Markdown headings
  if (/^#{1,6}\s+/.test(clean)) return true;
  
  // Very first block of document: If <= 22 words and not a multiline paragraph, it is the title!
  if (paraIndex === 0 && words.length <= 22 && !clean.includes('\n')) return true;

  // Colon subtitle headings (e.g. "Gafas de Sol Boho Chic: El Outfit Hippie Moderno"), NOT intro paragraphs ending with ':'
  if (!clean.endsWith(':') && clean.includes(':') && words.length <= 18) return true;

  // Question headings
  if (/^¿.*\?$/.test(clean) && words.length <= 18) return true;

  // Numbered sections like "2 Modelos de tendencia..."
  if (/^\d+\s+[A-Za-z]/.test(clean) && words.length <= 16) return true;

  // Brand and model titles (e.g. "Chloé CH0105S 006 55", "Gucci GG1084S 003 54", "Persol PO0202S 95/31 57")
  if (/^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley|Carrera|Moscot|Oliver Peoples)\b/i.test(clean) && words.length <= 10) {
    return true;
  }

  // Short/medium phrase without sentence-ending punctuation, trailing colon, or internal clause commas (supports 13-18w Spanish H2 headings)
  if (!clean.endsWith(':') && words.length <= 18 && !/[.!?]$/.test(clean) && !clean.includes(',')) {
    return true;
  }

  // Explicit editorial heading openers without trailing sentence period (up to 20w)
  if (!clean.endsWith(':') && words.length <= 20 && !/[.!?]$/.test(clean) && /^(?:c[oó]mo|gu[íi]a|por\s+qu[eé]|dudas|preguntas|qu[eé]|cu[aá]les|hablemos|as[ií]\s+es|otro\s+estilo|\d+\s+)/i.test(clean)) {
    return true;
  }

  return false;
}

function humanizeHeading(text) {
  let clean = text.trim();
  let prefix = '';
  const mdMatch = clean.match(/^(#{1,6}\s+)/);
  if (mdMatch) {
    prefix = mdMatch[1];
    clean = clean.slice(prefix.length).trim();
  }

  // Preserve brand & model titles intact
  if (/^(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\b/i.test(clean)) {
    return prefix + clean;
  }

  // Humanize colon patterns by converting GPT "Topic: Subtopic" into organic journalistic phrasing
  if (clean.includes(':')) {
    const parts = clean.split(':').map(p => p.trim());
    if (parts.length === 2 && parts[0] && parts[1] && !/[0-9]/.test(parts[0])) {
      const part1 = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const part2 = parts[1].charAt(0).toLowerCase() + parts[1].slice(1);
      const aiAppositionRx = /^(?:el|un|la|una)\s+(?:icono|símbolo|clásico|referente|accesorio|complemento|secreto|guía)\s*(?:atemporal|indiscutible|definitivo|imprescindible|esencial|clásico|definitiva)?\s+(?:de\s+|para\s+|en\s+)/i;
      if (aiAppositionRx.test(part2)) {
        const remainder = part2.replace(aiAppositionRx, '').trim();
        clean = remainder ? `${part1} en ${remainder}` : part1;
      } else if (/^(?:cómo|qué|cuándo|dónde|por qué|claves|consejos|elegir|escoger|combinar|usar)\b/i.test(part2)) {
        clean = `${part1} y ${part2}`;
      } else if (/^(?:el|la|un|una)\b/i.test(part2)) {
        clean = `${part1} para ${part2}`;
      } else {
        clean = `${part1} en ${part2}`;
      }
    }
  }

  // Spell out leading digits: "2 Modelos" -> "Dos modelos"
  clean = clean.replace(/^(\d+)\s+([A-Za-z])/g, (m, num, next) => {
    const nums = { '1': 'Un', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco' };
    return (nums[num] || num) + ' ' + next.toLowerCase();
  });

  return prefix + clean;
}

function detectOutroCliché(sentence) {
  for (const item of OUTRO_CLICHES) {
    if (item.rx.test(sentence)) {
      return item;
    }
  }
  return null;
}

function neutralizeAiCliches(text, auditCollector = null) {
  let cleaned = text;
  for (const item of AI_CLICHE_REPLACEMENTS) {
    if (item.rx.test(cleaned)) {
      const matches = cleaned.match(item.rx);
      if (auditCollector) {
        auditCollector.push({
          stage: 'CLICHE_NEUTRALIZATION',
          original: matches[0],
          replacement: item.rep,
          reason: item.reason
        });
      }
      cleaned = cleaned.replace(item.rx, item.rep);
    }
  }
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/([.!?]\s+)([a-záéíóúñ])/g, (_, punct, ch) => punct + ch.toUpperCase())
    .trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

function breakLongSentence(sentence, auditCollector = null) {
  const clean = sentence.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 22) return [clean];

  // Splitting patterns to enhance human burstiness rhythm
  const patterns = [
    { target: ', ya que ', prefix: 'Y es que ', reason: 'División de cláusula subordinada causal para romper monotonía de periodo largo.' },
    { target: ', por lo que ', prefix: 'De ahí que ', reason: 'División de cláusula consecutiva en dos compases humanos.' },
    { target: '; ', prefix: '', reason: 'Conversión de punto y coma en punto y seguido para aumentar la perplejidad y burstiness.' },
    { target: ', pero ', prefix: 'Pero ', reason: 'División adversativa: introduce inicio en conjunción disyuntiva típico del habla humana.' },
    { target: ', siendo ', prefix: 'Hablamos de ', reason: 'Sustitución de gerundio de posterioridad por oración principal asertiva.' },
    { target: ', dado que ', prefix: 'Y dado que ', reason: 'Ruptura de subordinada larga en periodo independiente.' },
    { target: ', lo que ', prefix: 'Esto ', reason: 'Eliminación de pronombre relativo acumulativo por demostrativo directo.' },
    { target: ', donde ', prefix: 'En este sentido, ', reason: 'División de cláusula locativa/relativa.' },
    { target: ', así como ', prefix: 'También ', reason: 'Fragmentación de enumeración larga para crear asimetría métrica.' },
    { target: ', garantizando que ', prefix: 'Esto garantiza que ', reason: 'Puntuación fuerte antes de verbo de garantía.' }
  ];

  for (const p of patterns) {
    if (clean.includes(p.target)) {
      const idx = clean.indexOf(p.target);
      let part1 = clean.slice(0, idx).trim();
      if (!/[.!?]$/.test(part1)) part1 += '.';
      
      let remainder = clean.slice(idx + p.target.length).trim();
      if (p.prefix) {
        remainder = p.prefix + remainder;
      }
      
      remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
      part1 = part1.replace(/\s*\.\s*\./g, '.');
      remainder = remainder.replace(/\s*\.\s*\./g, '.');

      if (auditCollector) {
        auditCollector.push({
          stage: 'BURSTINESS_SPLIT',
          originalSentence: clean,
          splitTarget: p.target,
          part1,
          part2: remainder,
          originalWords: words.length,
          reason: p.reason
        });
      }

      return [part1, remainder];
    }
  }

  return [clean];
}

function cleanScrapingArtifacts(text) {
  return (text || '')
    .replace(/^(?:Este|En)\s+20\d\d,?\s*/i, '')
    .replace(/^Rostro\s+[a-záéíóúñ]+\s*(?=[A-ZÁÉÍÓÚÑ])/, '')
    .replace(/\bA\s+los\s+los\b/gi, 'A los')
    .replace(/\ba\s+los\s+los\b/gi, 'a los')
    .replace(/^Para\s+caras\s+(?:cuadradas|redondas|alargadas)\s+([A-Z])/i, 'Para este tipo de fisonomías, $1')
    .replace(/\b(?:Alain\s+)?Afflelou\b/gi, 'la firma')
    .replace(/\bGeneral\s+Óptica\b/gi, 'los especialistas')
    .replace(/\bCottet\b/gi, 'el taller')
    .replace(/\bOptica\s+Universitaria\b/gi, 'la óptica')
    .replace(/\bcon una tecnología exclusiva de la firma\b/gi, 'con una tecnología de taller')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function computeNGramOverlapRatio(textA, textB, n = 3) {
  const tokensA = tokenize(textA || '');
  const tokensB = tokenize(textB || '');
  if (tokensA.length < n || tokensB.length < n) return 0;

  const gramsB = new Set();
  for (let i = 0; i <= tokensB.length - n; i++) {
    gramsB.add(tokensB.slice(i, i + n).join(' '));
  }

  let totalA = 0;
  let shared = 0;
  for (let i = 0; i <= tokensA.length - n; i++) {
    const gram = tokensA.slice(i, i + n).join(' ');
    totalA++;
    if (gramsB.has(gram)) shared++;
  }
  return totalA > 0 ? Number((shared / totalA).toFixed(4)) : 0;
}

function countTokenDelta(beforeText, afterText) {
  const a = tokenize(beforeText || '');
  const b = tokenize(afterText || '');
  const freqA = new Map();
  for (const t of a) freqA.set(t, (freqA.get(t) || 0) + 1);
  let unchanged = 0;
  for (const t of b) {
    const c = freqA.get(t) || 0;
    if (c > 0) {
      unchanged++;
      freqA.set(t, c - 1);
    }
  }
  return Math.max(0, b.length - unchanged);
}

function sanitizeDraftInput(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let text = rawText.replace(/\u00A0/g, ' ');

  if (/<\/?(?:p|div|h[1-6]|li|ul|ol|br|strong|em|b|i|span|a|blockquote|section|article|script|style)\b/i.test(text)) {
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<(?:svg|video|audio|iframe)[\s\S]*?<\/(?:svg|video|audio|iframe)>/gi, '')
      .replace(/<img[^>]*>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<h[1-6][^>]*>/gi, '\n\n')
      .replace(/<li[^>]*>\s*<p[^>]*>/gi, '\n• ')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/p>\s*<\/li>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n')
      .replace(/<\/(?:p|div|blockquote|section|article|tr)>/gi, '\n\n')
      .replace(/<(?:p|div|blockquote|section|article|tr)[^>]*>/gi, '\n\n')
      .replace(/<\/t[dh]>/gi, ' ')
      .replace(/<t[dh][^>]*>/gi, ' ')
      .replace(/<\/?[a-z][a-z0-9:-]*(?:\s+[^>]*)?>/gi, '');
  }

  const entities = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&iexcl;': '¡',
    '&iquest;': '¿',
    '&euro;': '€',
    '&mdash;': '—',
    '&ndash;': '–',
    '&laquo;': '«',
    '&raquo;': '»',
    '&aacute;': 'á',
    '&eacute;': 'é',
    '&iacute;': 'í',
    '&oacute;': 'ó',
    '&uacute;': 'ú',
    '&uuml;': 'ü',
    '&ntilde;': 'ñ',
    '&Aacute;': 'Á',
    '&Eacute;': 'É',
    '&Iacute;': 'Í',
    '&Oacute;': 'Ó',
    '&Uacute;': 'Ú',
    '&Uuml;': 'Ü',
    '&Ntilde;': 'Ñ'
  };
  for (const [ent, ch] of Object.entries(entities)) {
    text = text.replaceAll(ent, ch);
  }
  text = text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

module.exports = {
  tokenize,
  getShapeKeysFromText,
  isShapeCompatible,
  isHeading,
  humanizeHeading,
  detectOutroCliché,
  neutralizeAiCliches,
  breakLongSentence,
  cleanScrapingArtifacts,
  computeNGramOverlapRatio,
  countTokenDelta,
  sanitizeDraftInput
};
