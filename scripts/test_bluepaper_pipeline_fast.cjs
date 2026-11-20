const fs = require('fs');
const path = require('path');
const { shortBohoArticle, fullBohoArticle } = require('../desktop-app/src/shared/sample-drafts/boho-eyewear-sample.js');

// Load banks
const baseDir = path.resolve(__dirname, '../banco_ontologico_semantico');
const masterBricks = JSON.parse(fs.readFileSync(path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json'), 'utf8'));
const slotIndex = JSON.parse(fs.readFileSync(path.join(baseDir, 'indice_invertido_ranuras.json'), 'utf8'));
const glitches = JSON.parse(fs.readFileSync(path.join(baseDir, 'glitches_humanos_certificados.json'), 'utf8'));

console.log(`Bancos: ${masterBricks.length} ladrillos, ${Object.keys(slotIndex).length} tipos de ranuras.`);

// 1. FASE 1: EXTRACTOR DE ÁTOMOS FÁCTICOS PUROS (Davidson)
function extractDavidsonianAtoms(text) {
  const atoms = {
    brand_models: [],
    shapes: [],
    styles: [],
    materials: [],
    outfits: [],
    components: [],
    raw_facts: []
  };

  // Detect brands & models
  const modelMatches = text.match(/\b(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\s+([A-Z0-9\s/-]+?\b(?:\d{2,3})?)/gi);
  if (modelMatches) {
    atoms.brand_models.push(...modelMatches.map(m => m.trim()));
  }

  // Detect shapes
  const shapeRx = /\b(redonda|redondas|cuadrada|cuadradas|geométrica|geométricas|aviador|cat\s*eye|oversize|mariposa|ovalada|ovaladas)\b/gi;
  const shapes = text.match(shapeRx);
  if (shapes) atoms.shapes.push(...[...new Set(shapes.map(s => s.toLowerCase()))]);

  // Detect styles
  const styleRx = /\b(boho\s*chic|vintage|retro|hippie|moderno|artesanal|setentero|años\s*70|clásico|atemporal|elegante|urbano|sofisticado)\b/gi;
  const styles = text.match(styleRx);
  if (styles) atoms.styles.push(...[...new Set(styles.map(s => s.toLowerCase()))]);

  // Detect materials
  const matRx = /\b(acetato|pasta|carey|metal|titanio|oro|bronce|acero|celulosa|lino|algodón|cuero)\b/gi;
  const mats = text.match(matRx);
  if (mats) atoms.materials.push(...[...new Set(mats.map(m => m.toLowerCase()))]);

  // Detect outfits / occasions
  const outfitRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|sombrero|playa|ciudad|paseo|verano|boda|evento)\b/gi;
  const outfits = text.match(outfitRx);
  if (outfits) atoms.outfits.push(...[...new Set(outfits.map(o => o.toLowerCase()))]);

  return atoms;
}

// 2. FASE 2: SELECCIÓN DE DONANTE HUMANO PRE-2022 POR HOMOLOGÍA DE MARCO
function findHomologousDonor(atoms, preferredFrame = 'GENERAL_STYLE') {
  // Candidate pool from Master Bank (Editorial & Workshop)
  const pool = masterBricks.filter(b => 
    b.frame !== 'CLINICAL_OPHTHALMOLOGY' &&
    b.frame !== 'CONTACT_LENS_CARE' &&
    (b.voice_category === 'EDITORIAL_LIFESTYLE' || b.tier === 'TIER_1_WORKSHOP') &&
    b.slots_count >= 1
  );

  let bestDonor = null;
  let bestScore = -1;

  for (const brick of pool) {
    let score = 0;
    if (brick.frame === preferredFrame) score += 5;

    // Check matching slots
    for (const slot of brick.slots) {
      if (slot.slot_type === 'SLOT_FRAME_SHAPE' && atoms.shapes.length) score += 3;
      if (slot.slot_type === 'SLOT_AESTHETIC_STYLE' && atoms.styles.length) score += 3;
      if (slot.slot_type === 'SLOT_MATERIAL' && atoms.materials.length) score += 3;
      if (slot.slot_type === 'SLOT_OCCASION_OUTFIT' && atoms.outfits.length) score += 3;
      if (slot.slot_type === 'SLOT_BRAND' && atoms.brand_models.length) score += 4;
    }

    if (score > bestScore) {
      bestScore = score;
      bestDonor = brick;
    }
  }

  return bestDonor || pool[0];
}

// 3. FASE 3: CENTERING SOLVER & PRO-DROP HEALING
function healProDropAndCenter(skeleton, anchorSubject = null) {
  let text = skeleton;
  // If skeleton begins with a lower case or pro-drop verb, prepend explicit anchor
  if (/^(?:son|resulta|resultan|tienen|destacan|ofrecen|permiten|cuenta|cuentan)\b/i.test(text.trim())) {
    const subject = anchorSubject || 'Estas monturas';
    text = `${subject} ${text.trim().toLowerCase()}`;
  }
  return text;
}

// 4. FASE 4: INJERTO DE HECHOS EN RANURAS (Compilación Colocacional)
function graftAtomsIntoSkeleton(skeleton, atoms, anchorSubject = null) {
  let result = healProDropAndCenter(skeleton, anchorSubject);

  // Substitute typed slots with extracted atoms
  if (atoms.shapes.length) {
    result = result.replace(/\[SLOT_FRAME_SHAPE\]/g, atoms.shapes[0]);
  } else {
    result = result.replace(/\[SLOT_FRAME_SHAPE\]/g, 'redondeada');
  }

  if (atoms.styles.length) {
    result = result.replace(/\[SLOT_AESTHETIC_STYLE\]/g, atoms.styles[0]);
  } else {
    result = result.replace(/\[SLOT_AESTHETIC_STYLE\]/g, 'vintage');
  }

  if (atoms.materials.length) {
    result = result.replace(/\[SLOT_MATERIAL\]/g, atoms.materials[0]);
  } else {
    result = result.replace(/\[SLOT_MATERIAL\]/g, 'acetato');
  }

  if (atoms.outfits.length) {
    result = result.replace(/\[SLOT_OCCASION_OUTFIT\]/g, atoms.outfits[0]);
  } else {
    result = result.replace(/\[SLOT_OCCASION_OUTFIT\]/g, 'prendas de temporada');
  }

  if (atoms.brand_models.length) {
    result = result.replace(/\[SLOT_BRAND\]/g, atoms.brand_models[0]);
  } else if (anchorSubject) {
    result = result.replace(/\[SLOT_BRAND\]/g, anchorSubject);
  } else {
    result = result.replace(/\[SLOT_BRAND\]/g, 'óptica');
  }

  // Cleanup remaining generic slots if any
  result = result.replace(/\[SLOT_[A-Z_]+\]/g, 'detalle');

  return result;
}

// Test on shortBohoArticle paragraphs
console.log('\n=== PRUEBA DE COMPILADOR BLUEPAPER FASE 1 -> FASE 5 ===');
const paras = shortBohoArticle.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

let anchor = null;
for (let i = 0; i < paras.length; i++) {
  const p = paras[i];
  console.log(`\n--- PÁRRAFO ${i+1} ---`);
  console.log('ORIGINAL:\n', p);

  // Phase 0: Heading check
  if (p.length < 50 && !/[.!?]$/.test(p)) {
    console.log('-> ENCABEZADO / ANCHOR: Preservado.');
    anchor = p;
    continue;
  }

  // Phase 1: Atomization
  const atoms = extractDavidsonianAtoms(p);
  console.log('-> FASE 1 (Átomos Davidson):', JSON.stringify(atoms));

  // Phase 2: Donor retrieval
  const donor = findHomologousDonor(atoms);
  console.log('-> FASE 2 (Donante Pre-2022):', donor.brick_id, '| Marco:', donor.frame);
  console.log('   Esqueleto:', donor.syntactic_skeleton);

  // Phase 3 & 4: Centering & Grafting
  const reconstructed = graftAtomsIntoSkeleton(donor.syntactic_skeleton, atoms, anchor);
  console.log('-> FASE 4 (Reconstrucción Fáctica en Esqueleto):');
  console.log('  ', reconstructed);
}
