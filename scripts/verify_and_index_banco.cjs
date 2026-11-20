const fs = require('fs');
const path = require('path');

const MASTER_PATH = 'banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json';

if (!fs.existsSync(MASTER_PATH)) {
  console.error('Master bank does not exist yet!');
  process.exit(1);
}

const master = JSON.parse(fs.readFileSync(MASTER_PATH, 'utf8'));
console.log(`Auditing Master Semantic Bank with ${master.length} entries...`);

// 1. Inverted Slot Index
const slotIndex = {};
const frameIndex = {};
const rhetoricalIndex = {};
const duplicateCheck = new Set();
let duplicates = 0;

for (const brick of master) {
  // Check duplicate raw text
  const norm = brick.raw_text.toLowerCase().replace(/[^\w]/g, '');
  if (duplicateCheck.has(norm)) {
    duplicates++;
  } else {
    duplicateCheck.add(norm);
  }

  // Index by Frame
  if (!frameIndex[brick.frame]) frameIndex[brick.frame] = [];
  frameIndex[brick.frame].push(brick.brick_id);

  // Index by Rhetorical Relation
  if (!rhetoricalIndex[brick.rhetorical_relation]) rhetoricalIndex[brick.rhetorical_relation] = [];
  rhetoricalIndex[brick.rhetorical_relation].push(brick.brick_id);

  // Index by Slot
  for (const slot of brick.slots) {
    if (!slotIndex[slot.slot_type]) slotIndex[slot.slot_type] = [];
    slotIndex[slot.slot_type].push(brick.brick_id);
  }
}

// Deduplicate IDs in slotIndex
for (const k of Object.keys(slotIndex)) {
  slotIndex[k] = Array.from(new Set(slotIndex[k]));
}

fs.writeFileSync('banco_ontologico_semantico/indice_invertido_ranuras.json', JSON.stringify(slotIndex, null, 2), 'utf8');
fs.writeFileSync('banco_ontologico_semantico/indice_marcos.json', JSON.stringify(frameIndex, null, 2), 'utf8');
fs.writeFileSync('banco_ontologico_semantico/indice_retorico.json', JSON.stringify(rhetoricalIndex, null, 2), 'utf8');

console.log('Inverted indices generated:');
console.log('- indice_invertido_ranuras.json:', Object.keys(slotIndex));
console.log('- indice_marcos.json:', Object.keys(frameIndex));
console.log('- indice_retorico.json:', Object.keys(rhetoricalIndex));
console.log(`Duplicate check: ${duplicates} duplicates found.`);

// Generate Summary Report
const report = `# Reporte de Auditoría: Banco Ontológico de Ladrillos Retóricos Nous v1.0
**Fecha:** ${new Date().toISOString()}  
**Estándar:** BLUEPAPER_MOTOR_HUMANIZACION_NEUROSIMBOLICA.md  

---

## 1. Métricas Globales
* **Total de Ladrillos Retóricos Indexados:** ${master.length}
* **Ladrillos de Taller Óptico / Clínico Puro (Tier 1):** ${master.filter(b => b.tier === 'TIER_1_WORKSHOP' && !b.exclude_from_humanization).length}
* **Ladrillos con Glitches y Anomalías Humanas (CAT_01 a CAT_06):** ${master.filter(b => b.metrics.has_human_glitch).length}
* **Contenido Corporativo / Enciclopédico Excluido de Humanización:** ${master.filter(b => b.exclude_from_humanization).length}
* **Tasa de Duplicados en Raw Corpus:** ${(duplicates / master.length * 100).toFixed(2)}%

---

## 2. Distribución por Marco Semántico (FrameNet)
| Marco Semántico | Ladrillos Totales | Ladrillos de Taller Aprobados |
| :--- | :---: | :---: |
${Object.entries(frameIndex).map(([f, ids]) => {
  const approved = master.filter(b => b.frame === f && !b.exclude_from_humanization).length;
  return `| **${f}** | ${ids.length} | ${approved} |`;
}).join('\n')}

---

## 3. Cobertura de Ranuras Nominales Tipadas ([SLOTS])
| Tipo de Ranura | Ladrillos que la contienen |
| :--- | :---: |
${Object.entries(slotIndex).map(([s, ids]) => `| \`${s}\` | ${ids.length} |`).join('\n')}

---

## 4. Distribución de Relaciones Retóricas y Anomalías (RST)
| Relación Retórica / Glitch | Ladrillos |
| :--- | :---: |
${Object.entries(rhetoricalIndex).map(([r, ids]) => `| \`${r}\` | ${ids.length} |`).join('\n')}
`;

fs.writeFileSync('banco_ontologico_semantico/REPORTE_BANCO_ONTOLOGICO_NOUS_v1.md', report, 'utf8');
console.log('Saved audit report to banco_ontologico_semantico/REPORTE_BANCO_ONTOLOGICO_NOUS_v1.md');
