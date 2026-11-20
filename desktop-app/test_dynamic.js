const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, '../banco_ontologico_semantico');
const bricks = JSON.parse(fs.readFileSync(path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json'), 'utf8'));

const frameIndex = {};
for (const b of bricks) {
  if (b.exclude_from_humanization) continue;
  if (!frameIndex[b.frame]) frameIndex[b.frame] = [];
  frameIndex[b.frame].push(b);
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»""'']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function searchBestDonorBrick(frame, text) {
  const candidates = frameIndex[frame] || [];
  if (!candidates.length) return null;

  const textTokens = tokenize(text).filter(t => t.length > 3);
  let best = null;
  let bestScore = -1;

  for (const c of candidates) {
    let score = 0;
    if (c.tier === 'TIER_1_WORKSHOP') score += 5;
    if (c.slots_count > 0) score += 3;
    const cText = (c.raw_text || '').toLowerCase();

    for (const t of textTokens) {
      if (cText.includes(t)) score += 3;
    }

    if (c.word_count < 18 || c.word_count > 95) score -= 2;

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return { best, bestScore };
}

// Test 1: Random driving article
const t1 = "Consejos para elegir gafas de sol para conducir. Las gafas de sol polarizadas son ideales para reducir los reflejos en la carretera. Cuando conducimos en verano, la luz del sol rebota en el asfalto y puede causar deslumbramientos peligrosos.";
const r1 = searchBestDonorBrick('OPTICAL_PROTECTION', t1);
console.log('--- TEST 1: Conducir ---');
console.log('Score:', r1.bestScore);
console.log('Brick:', r1.best.raw_text);

// Test 2: Random Ray-Ban Aviator article
const t2 = "Las Ray-Ban Aviator son gafas de sol con montura metálica de doble puente. Son ideales para hombres y mujeres que buscan un diseño atemporal para protegerse del sol en verano.";
const r2 = searchBestDonorBrick('GENERAL_STYLE', t2);
console.log('\n--- TEST 2: Ray-Ban Aviator ---');
console.log('Score:', r2.bestScore);
console.log('Brick:', r2.best.raw_text);

// Test 3: Random Visagism article
const t3 = "Para las personas que tienen el rostro redondo, conviene buscar monturas cuadradas o rectangulares que estilicen y alarguen las facciones.";
const r3 = searchBestDonorBrick('ANATOMICAL_FIT', t3);
console.log('\n--- TEST 3: Visagismo ---');
console.log('Score:', r3.bestScore);
console.log('Brick:', r3.best.raw_text);
