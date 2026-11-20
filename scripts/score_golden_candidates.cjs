const fs = require('fs');

const op = JSON.parse(fs.readFileSync('banco_ontologico_semantico/marcos/optical_protection.json', 'utf8'));

console.log('Available approved optical protection bricks:', op.length);

// Score candidates by clinical authority, slot density, rhetorical structure, and glitch presence
const scored = op.map(b => {
  let score = 0;
  const d = (b.source_domain || '').toLowerCase();
  
  // Domain authority
  if (d.includes('barraquer') || d.includes('pico')) score += 30;
  else if (d.includes('qvision')) score += 30;
  else if (d.includes('gasset') || d.includes('florida') || d.includes('vipsual')) score += 20;
  else if (d.includes('afflelou') || d.includes('cottet') || d.includes('generaloptica') || d.includes('opticauniversitaria')) score += 15;

  // Slot density
  score += (b.slots_count || 0) * 8;

  // Specific high-value slot types
  const slotTypes = new Set((b.slots || []).map(s => s.slot_type));
  if (slotTypes.has('SLOT_MEASURE')) score += 12;
  if (slotTypes.has('SLOT_PROPERTY')) score += 10;
  if (slotTypes.has('SLOT_COMPONENT')) score += 8;
  if (slotTypes.has('SLOT_TECHNIQUE')) score += 15;

  // Glitch presence (CAT_01 to CAT_06)
  if (b.metrics.has_human_glitch) score += 25;
  if (b.rhetorical_relation === 'CONCESSION_CONTRAST') score += 15;
  if (b.rhetorical_relation === 'CAUSE_EFFECT') score += 10;

  // Word count balance (ideal 25 to 80 words)
  if (b.word_count >= 25 && b.word_count <= 85) score += 15;

  return { brick: b, score, slotTypes: Array.from(slotTypes) };
});

scored.sort((a, b) => b.score - a.score);

console.log('Top 40 candidates:');
scored.slice(0, 40).forEach((item, idx) => {
  const b = item.brick;
  console.log(`[${idx+1}] Score: ${item.score} | ID: ${b.brick_id} | Domain: ${b.source_domain} | Rhet: ${b.rhetorical_relation} | Slots (${b.slots_count}): [${item.slotTypes.join(', ')}]`);
  console.log(`    TEXT: ${b.raw_text.substring(0, 110)}...`);
});
