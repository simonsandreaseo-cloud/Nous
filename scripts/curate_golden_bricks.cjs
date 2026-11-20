const fs = require('fs');

const op = JSON.parse(fs.readFileSync('banco_ontologico_semantico/marcos/optical_protection.json', 'utf8'));

// Filter only approved workshop and clinical bricks
const workshop = op.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization);
console.log('Total Tier 1 Workshop bricks in optical_protection:', workshop.length);

// Deduplicate overlapping texts
const selected = [];
const seenSubstrings = [];

function isOverlapping(text) {
  const norm = text.toLowerCase().replace(/[^\w]/g, '');
  for (const s of seenSubstrings) {
    if (s.includes(norm.substring(0, 45)) || norm.includes(s.substring(0, 45))) {
      return true;
    }
  }
  return false;
}

// 1. First priority: certified glitches and high clinical authority (Barraquer, Dr. Picó, QVision)
const clinical = workshop.filter(b => {
  const d = b.source_domain.toLowerCase();
  return d.includes('barraquer') || d.includes('pico') || d.includes('qvision');
});

console.log('Clinical pool size:', clinical.length);

for (const b of clinical) {
  if (selected.length >= 30) break;
  if (!isOverlapping(b.raw_text) && b.word_count >= 20 && b.word_count <= 95) {
    const norm = b.raw_text.toLowerCase().replace(/[^\w]/g, '');
    seenSubstrings.push(norm);
    selected.push(b);
  }
}

console.log('Selected from clinical pool:', selected.length);

// 2. Next priority: master workshop opticians (Gasset, Florida, Cottet, Afflelou, Vipsual, General Optica)
const workshopGeneral = workshop.filter(b => {
  const d = b.source_domain.toLowerCase();
  return !d.includes('barraquer') && !d.includes('pico') && !d.includes('qvision');
});

// Sort by slots_count and word_count balance
workshopGeneral.sort((a, b) => (b.slots_count || 0) - (a.slots_count || 0));

for (const b of workshopGeneral) {
  if (selected.length >= 30) break;
  if (!isOverlapping(b.raw_text) && b.word_count >= 22 && b.word_count <= 95) {
    const norm = b.raw_text.toLowerCase().replace(/[^\w]/g, '');
    seenSubstrings.push(norm);
    selected.push(b);
  }
}

console.log('Total selected for golden collection:', selected.length);

selected.forEach((b, i) => {
  console.log(`\n--- [${i+1}] ${b.brick_id} (${b.source_domain}) Rhet: ${b.rhetorical_relation} Slots: ${b.slots_count} ---`);
  console.log('RAW: ' + b.raw_text);
  console.log('SKELETON: ' + b.syntactic_skeleton);
  console.log('SLOTS: ' + JSON.stringify(b.slots.map(s => s.slot_type + ':' + s.raw_value)));
});
