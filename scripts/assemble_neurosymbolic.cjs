const fs = require('fs');

/**
 * Motor Compilador Neuro-Simbólico Nous v1.0
 * Ensamblador determinista de ladrillos retóricos por homología de marcos semánticos
 * Basado en: BLUEPAPER_MOTOR_HUMANIZACION_NEUROSIMBOLICA.md
 */

const MASTER_BANK = JSON.parse(fs.readFileSync('banco_ontologico_semantico/banco_maestro_ladrillos_retoricos.json', 'utf8'));
const FRAME_INDEX = JSON.parse(fs.readFileSync('banco_ontologico_semantico/indice_marcos.json', 'utf8'));
const SLOT_INDEX = JSON.parse(fs.readFileSync('banco_ontologico_semantico/indice_invertido_ranuras.json', 'utf8'));

// Lookup map for fast retrieval
const BRICK_MAP = new Map();
for (const b of MASTER_BANK) {
  BRICK_MAP.set(b.brick_id, b);
}

/**
 * Busca candidatos donantes por Marco Semántico y ranuras requeridas
 */
function findDonorBricks(frame, requiredSlots = [], options = {}) {
  const candidateIds = FRAME_INDEX[frame] || [];
  const results = [];

  for (const id of candidateIds) {
    const brick = BRICK_MAP.get(id);
    if (!brick || brick.exclude_from_humanization) continue;

    if (options.requireWorkshopOnly && brick.tier !== 'TIER_1_WORKSHOP') continue;
    if (options.requireGlitchOnly && !brick.metrics.has_human_glitch) continue;

    // Check if brick contains all required slot types
    const brickSlotTypes = new Set(brick.slots.map(s => s.slot_type));
    const hasAllSlots = requiredSlots.every(s => brickSlotTypes.has(s));

    if (hasAllSlots || requiredSlots.length === 0) {
      results.push(brick);
    }
  }

  // Sort by priority: glitches first, then workshop tier, then word count
  results.sort((a, b) => {
    if (a.metrics.has_human_glitch && !b.metrics.has_human_glitch) return -1;
    if (!a.metrics.has_human_glitch && b.metrics.has_human_glitch) return 1;
    return b.metrics.functional_token_ratio - a.metrics.functional_token_ratio;
  });

  return results;
}

/**
 * Injerta átomos fácticos en las ranuras del esqueleto sintáctico
 */
function graftSlots(skeleton, slotMappings) {
  let text = skeleton;
  for (const [slotTag, value] of Object.entries(slotMappings)) {
    const regex = new RegExp('\\' + slotTag, 'g');
    text = text.replace(regex, value);
  }
  return text;
}

console.log('=== TEST DEL MOTOR ENSAMBLADOR NEURO-SIMBÓLICO ===');
console.log(`Base indexada disponible: ${MASTER_BANK.length} ladrillos.`);

// Test Case: Ensamblar automáticamente un párrafo de Material y Montura
console.log('\n[Caso 1] Buscando ladrillos para Marco: MATERIAL_COMPOSITION con ranuras [SLOT_MATERIAL]');
const candidates = findDonorBricks('MATERIAL_COMPOSITION', ['SLOT_MATERIAL'], { requireWorkshopOnly: true });
console.log(`Candidatos óptimos de taller encontrados: ${candidates.length}`);

if (candidates.length > 0) {
  const chosen = candidates[0];
  console.log(`\nLadrillo Seleccionado: ${chosen.brick_id} (${chosen.source_domain})`);
  console.log(`Relación Retórica: ${chosen.rhetorical_relation}`);
  console.log(`Esqueleto Original:\n"${chosen.syntactic_skeleton}"`);

  // Injerto Fáctico
  const grafted = graftSlots(chosen.syntactic_skeleton, {
    '[SLOT_MATERIAL]': 'acetato de celulosa derivado del algodón',
    '[SLOT_COMPONENT]': 'la montura',
    '[SLOT_PROPERTY]': 'un tacto cálido y gran resistencia'
  });

  console.log(`\nTexto Ensamblado por el Compilador:\n"${grafted}"`);
}
