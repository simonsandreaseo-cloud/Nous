'use strict';

const { tokenize } = require('../text-analysis/draft-preprocessor.cjs');
const { CERTIFIED_BIOLOGICAL_GLITCHES } = require('../text-analysis/lexical-constants.cjs');

function findShingleOverlaps(candidateText, sourceEntries, minShingleLen = 7) {
  const candWords = tokenize(candidateText);
  const overlaps = [];
  if (candWords.length < minShingleLen) return overlaps;

  const seenShingles = new Set();
  for (const src of sourceEntries) {
    const srcStr = typeof src === 'string' ? src : (src.raw_text || src.text || '');
    const srcWords = tokenize(srcStr);
    if (srcWords.length < minShingleLen) continue;
    const srcJoined = ` ${srcWords.join(' ')} `;

    for (let i = 0; i <= candWords.length - minShingleLen; i++) {
      const shingle = candWords.slice(i, i + minShingleLen).join(' ');
      if (srcJoined.includes(` ${shingle} `) && !seenShingles.has(shingle)) {
        seenShingles.add(shingle);
        overlaps.push({
          shingle,
          index: i,
          sourceId: typeof src === 'string' ? 'fuente' : (src.brick_id || src.donor_id || 'donante')
        });
      }
    }
  }
  return overlaps;
}

function checkPlagiarismShingles(bankState, text, minViolationLen = 7) {
  const textWords = tokenize(text);
  const violations = [];
  if (textWords.length < minViolationLen) return violations;

  if (minViolationLen === 7 && bankState.corpus7GramMap && bankState.corpus7GramMap.size > 0) {
    const seenMatches = new Set();
    for (let i = 0; i <= textWords.length - 7; i++) {
      const s7 = textWords.slice(i, i + 7).join(' ');
      if (bankState.corpus7GramMap.has(s7) && !seenMatches.has(s7)) {
        seenMatches.add(s7);
        violations.push({
          shingle: s7,
          index: i,
          brick_id: bankState.corpus7GramMap.get(s7)
        });
      }
    }
    return violations;
  }

  // Fallback for custom shingle lengths
  const outputShingles = new Map();
  for (let i = 0; i <= textWords.length - minViolationLen; i++) {
    const shingle = textWords.slice(i, i + minViolationLen).join(' ');
    if (!outputShingles.has(shingle)) outputShingles.set(shingle, i);
  }

  const seenMatches = new Set();
  const allBricks = [
    ...bankState.masterBricks,
    ...(bankState.unifiedCorpusBricks || []),
    ...(bankState.goldenMM || []),
    ...(bankState.goldenOP || []),
    ...(bankState.goldenVH || [])
  ];

  for (const item of allBricks) {
    const donorWords = tokenize(item.raw_text || item.text || '');
    if (donorWords.length < minViolationLen) continue;
    for (let j = 0; j <= donorWords.length - minViolationLen; j++) {
      const dShingle = donorWords.slice(j, j + minViolationLen).join(' ');
      if (outputShingles.has(dShingle) && !seenMatches.has(dShingle)) {
        seenMatches.add(dShingle);
        violations.push({
          shingle: dShingle,
          index: outputShingles.get(dShingle),
          brick_id: item.brick_id || item.golden_id || item.donor_id
        });
        break;
      }
    }
  }
  return violations;
}

function findAllCorpusOverlaps(bankState, candidateText, donorsUsedInPara = [], minShingleLen = 7) {
  const donorOverlaps = findShingleOverlaps(candidateText, donorsUsedInPara, minShingleLen);
  const corpusOverlaps = checkPlagiarismShingles(bankState, candidateText, minShingleLen);
  const merged = [];
  const seen = new Set();
  for (const o of [...donorOverlaps, ...corpusOverlaps]) {
    if (!seen.has(o.shingle)) {
      seen.add(o.shingle);
      merged.push(o);
    }
  }
  return merged;
}

function calculateBurstiness(text) {
  // Excluir encabezados para medir el burstiness (σ) real exclusivamente sobre oraciones de cuerpo
  const bodyParas = (text || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !(p.split(/\s+/).filter(Boolean).length <= 20 && !/[.!?]$/.test(p)));
  const sentences = bodyParas
    .flatMap(p => p.split(/(?<=[.!?])\s+/))
    .map(s => s.trim())
    .filter(s => s.length > 5);
  if (!sentences.length) return { sigma: 0, avg: 0, lengths: [] };
  const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const avg = lengths.reduce((acc, l) => acc + l, 0) / lengths.length;
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - avg, 2), 0) / lengths.length;
  return {
    sigma: Number(Math.sqrt(variance).toFixed(2)),
    avg: Number(avg.toFixed(2)),
    lengths
  };
}

function selectUnusedGlitch(frame, usedGlitches, excludeContextText = '') {
  const pool = frame === 'MATERIAL_COMPOSITION' || frame === 'PRODUCT_FACTUAL' || frame === 'ANATOMICAL_FIT'
    ? [...CERTIFIED_BIOLOGICAL_GLITCHES.workshop, ...CERTIFIED_BIOLOGICAL_GLITCHES.fashion]
    : [...CERTIFIED_BIOLOGICAL_GLITCHES.fashion, ...CERTIFIED_BIOLOGICAL_GLITCHES.workshop];

  const ctxLower = (excludeContextText || '').toLowerCase();
  return pool.find(g => {
    if (usedGlitches.has(g.text)) return false;
    const stem = g.text.toLowerCase().split(/\s+/).slice(0, 3).join(' ');
    if (ctxLower && ctxLower.includes(stem)) return false;
    return true;
  }) || null;
}

function computeBluepaperTelemetry({ uniqueDomainsCount, centeringTransitions }) {
  return {
    uniqueDonorDomains: uniqueDomainsCount,
    centeringTransitions
  };
}

module.exports = {
  findShingleOverlaps,
  checkPlagiarismShingles,
  findAllCorpusOverlaps,
  calculateBurstiness,
  selectUnusedGlitch,
  computeBluepaperTelemetry
};
