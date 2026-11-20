const fs = require('fs');
const path = require('path');
const { shortBohoArticle } = require('../desktop-app/src/samples/bohoSample.js');

// AI Clichés to Human Workshop mappings
const AI_REPLACEMENTS = [
  { rx: /\bse han erigido en\b/gi, rep: 'se han convertido en' },
  { rx: /\bun papel fundamental\b/gi, rep: 'un papel clave' },
  { rx: /\bun papel crucial\b/gi, rep: 'un papel decisivo' },
  { rx: /\bno cabe duda de que\b/gi, rep: 'está claro que' },
  { rx: /\bes importante destacar que\b/gi, rep: 'conviene tener presente que' },
  { rx: /\bes esencial tener en cuenta que\b/gi, rep: 'lo principal es recordar que' },
  { rx: /\bun equilibrio perfecto entre ([^y]+) y\b/gi, rep: 'la combinación idónea de $1 con' },
  { rx: /\buna opción magnífica para quienes buscan\b/gi, rep: 'una gran alternativa si buscas' },
  { rx: /\buna opción idónea para quienes buscan\b/gi, rep: 'una alternativa excelente si buscas' },
  { rx: /\brepresentan la evolución natural\b/gi, rep: 'marcan la evolución' },
  { rx: /\bpor antonomasia\b/gi, rep: 'por excelencia' },
  { rx: /\bcabe mencionar que\b/gi, rep: 'además,' },
  { rx: /\bsumergirse en\b/gi, rep: 'adentrarse en' },
  { rx: /\buna amplia gama de\b/gi, rep: 'multitud de' },
  { rx: /\ben el mundo de la moda actual\b/gi, rep: 'hoy en día' },
  { rx: /\ben el panorama actual\b/gi, rep: 'actualmente' },
  { rx: /\bbrindan un estilo\b/gi, rep: 'aportan un toque' },
  { rx: /\bproporcionan una protección\b/gi, rep: 'ofrecen una protección' }
];

const OUTRO_CLICHES = [
  /para conservarlas en perfecto estado/i,
  /deben ser guardadas siempre en su estuche/i,
  /guarda siempre tus gafas en un estuche/i,
  /para asegurar la durabilidad de tus/i,
  /siguiendo estos sencillos consejos/i,
  /en conclusión,?\s+/i,
  /en resumen,?\s+/i
];

const GLITCHES = {
  fashion: [
    "Olvídate de las marcas en la cara.",
    "Eso sí: no todas sientan igual a primera vista.",
    "Pruébalas y notarás la diferencia de inmediato.",
    "De ahí que se hayan convertido en un icono atemporal."
  ],
  workshop: [
    "Te durarán años sin perder el ajuste original.",
    "Es un diseño de toda la vida.",
    "A simple vista se aprecia la solidez del material."
  ]
};

function isHeading(text) {
  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 8 && !/[.!?]$/.test(clean)) return true;
  if (/^(?:\d+\s+[A-Za-z]|H[1-6]|#|[A-Z0-9\s/]+:\s+[A-Z])/.test(clean) && words.length <= 10) return true;
  return false;
}

function breakLongSentence(sentence) {
  const words = sentence.trim().split(/\s+/);
  if (words.length < 28) return [sentence];

  // Look for splitting points: ", ya que " -> ". Y es que "
  if (sentence.includes(', ya que ')) {
    const parts = sentence.split(', ya que ');
    return [parts[0] + '.', 'Y es que ' + parts.slice(1).join(', ya que ')];
  }
  if (sentence.includes(', por lo que ')) {
    const parts = sentence.split(', por lo que ');
    return [parts[0] + '.', 'De ahí que ' + parts.slice(1).join(', por lo que ')];
  }
  if (sentence.includes('; ')) {
    const parts = sentence.split('; ');
    return [parts[0] + '.', parts.slice(1).join('; ')];
  }
  if (sentence.includes(', pero ')) {
    const parts = sentence.split(', pero ');
    return [parts[0] + '.', 'Pero también ' + parts.slice(1).join(', pero ')];
  }
  if (sentence.includes(', donde ')) {
    const parts = sentence.split(', donde ');
    return [parts[0] + '.', 'De hecho, ' + parts.slice(1).join(', donde ')];
  }

  return [sentence];
}

function humanizeParagraph(rawPara, isLastPara = false, glitchIndex = 0) {
  if (isHeading(rawPara)) return rawPara;

  let text = rawPara;

  // 1. Clean AI clichés
  for (const item of AI_REPLACEMENTS) {
    text = text.replace(item.rx, item.rep);
  }

  // 2. Split into sentences
  const rawSentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const refinedSentences = [];

  for (const s of rawSentences) {
    const clean = s.trim();
    if (!clean) continue;

    // Check outro cliché
    if (OUTRO_CLICHES.some(rx => rx.test(clean))) {
      continue; // excise outro cliché
    }

    // Split long sentences for burstiness
    const broken = breakLongSentence(clean);
    refinedSentences.push(...broken);
  }

  // 3. Inject subtle human glitch in long descriptive blocks
  if (refinedSentences.length >= 3) {
    const glitchList = GLITCHES.fashion;
    const glitch = glitchList[glitchIndex % glitchList.length];
    // Insert after sentence 1
    refinedSentences.splice(1, 0, glitch);
  }

  return refinedSentences.join(' ');
}

function humanizeArticle(rawArticle) {
  const rawParas = rawArticle.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const resultParas = [];
  let glitchCount = 0;

  for (let i = 0; i < rawParas.length; i++) {
    const p = rawParas[i];
    const isLast = (i === rawParas.length - 1);
    if (isHeading(p)) {
      resultParas.push(p);
    } else {
      const hum = humanizeParagraph(p, isLast, glitchCount);
      if (hum.trim().length > 0) {
        resultParas.push(hum);
        glitchCount++;
      }
    }
  }

  return resultParas.join('\n\n');
}

console.log('=== TEST NEW HUMANIZER ON shortBohoArticle ===');
const output = humanizeArticle(shortBohoArticle);
console.log(output);

// Metrics
const sentences = output.match(/[^.!?]+[.!?]+/g) || [output];
const lengths = sentences.map(s => s.trim().split(/\s+/).filter(Boolean).length);
const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avg, 2), 0) / lengths.length;
const sigma = Math.sqrt(variance);
console.log('\n=== METRICS ===');
console.log('Total sentences:', lengths.length);
console.log('Sentence lengths:', lengths);
console.log('Avg length:', avg.toFixed(2));
console.log('Burstiness (sigma):', sigma.toFixed(2));
