const fs = require('fs');
const path = require('path');
const { shortBohoArticle } = require('../desktop-app/src/shared/sample-drafts/boho-eyewear-sample.js');

// 1. Load real pre-2022 banks
const baseDir = path.resolve(__dirname, '../banco_ontologico_semantico');
const masterBricks = JSON.parse(fs.readFileSync(path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json'), 'utf8'));
const goldenMM = JSON.parse(fs.readFileSync(path.join(baseDir, 'marcos', 'golden_material_mechanics.json'), 'utf8'));
const goldenVH = JSON.parse(fs.readFileSync(path.join(baseDir, 'marcos', 'golden_visagism_heritage.json'), 'utf8'));
const goldenOP = JSON.parse(fs.readFileSync(path.join(baseDir, 'marcos', 'golden_optical_protection.json'), 'utf8'));
const generalStyle = JSON.parse(fs.readFileSync(path.join(baseDir, 'marcos', 'general_style.json'), 'utf8'));

// Filter authentic, clean editorial bricks from pre-2022
const editorialStylePool = generalStyle.filter(b => 
  (b.voice_category === 'EDITORIAL_LIFESTYLE' || b.source_domain === 'afflelou' || b.source_domain === 'general_optica') &&
  b.slots_count >= 1 &&
  b.word_count >= 20 && b.word_count <= 65 &&
  !b.raw_text.includes('niños') && !b.raw_text.includes('videojuegos') && !b.raw_text.includes('María Pombo')
);

console.log(`Bancos cargados: ${editorialStylePool.length} editorial style, ${goldenMM.length} golden MM, ${goldenVH.length} golden VH, ${goldenOP.length} golden OP.`);

// 2. FASE 1: Extractor de Átomos Fácticos de Davidson
function extractAtoms(text) {
  const atoms = {
    brand_models: [],
    shapes: [],
    styles: [],
    materials: [],
    outfits: [],
    coatings: []
  };

  const brandRx = /\b(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\s+([A-Z0-9\s/-]+?\b(?:\d{2,3})?)/gi;
  const bMatches = text.match(brandRx);
  if (bMatches) atoms.brand_models.push(...bMatches.map(m => m.trim()));

  const shapeRx = /\b(redonda|redondas|redondeada|redondeadas|cuadrada|cuadradas|geométrica|geométricas|aviador|cat\s*eye|oversize|mariposa|ovalada|ovaladas)\b/gi;
  const sMatches = text.match(shapeRx);
  if (sMatches) atoms.shapes.push(...[...new Set(sMatches.map(s => s.toLowerCase()))]);

  const styleRx = /\b(boho\s*chic|vintage|retro|hippie|moderno|artesanal|setentero|años\s*70|clásico|atemporal|elegante|urbano|sofisticado)\b/gi;
  const stMatches = text.match(styleRx);
  if (stMatches) atoms.styles.push(...[...new Set(stMatches.map(s => s.toLowerCase()))]);

  const matRx = /\b(acetato\s*pulido|acetato|pasta|carey|metal|titanio|oro|bronce|acero|celulosa)\b/gi;
  const mMatches = text.match(matRx);
  if (mMatches) atoms.materials.push(...[...new Set(mMatches.map(m => m.toLowerCase()))]);

  const outRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|lino|algodón|seda|sombrero|playa|ciudad|paseo|verano|boda|evento)\b/gi;
  const oMatches = text.match(outRx);
  if (oMatches) atoms.outfits.push(...[...new Set(oMatches.map(o => o.toLowerCase()))]);

  return atoms;
}

// 3. FASE 2: Selección de Donante Real Pre-2022
function selectRealDonor(atoms, text, paraIdx) {
  if (atoms.materials.length || /acetato|pasta|material|resistencia|artesan/i.test(text)) {
    return { donor: goldenMM[paraIdx % goldenMM.length], frame: 'MATERIAL_COMPOSITION' };
  }
  if (atoms.coatings.length || /filtro|uv|polarizado|cristal|protec/i.test(text)) {
    return { donor: goldenOP[paraIdx % goldenOP.length], frame: 'OPTICAL_PROTECTION' };
  }
  if (/rostro|facciones|cara|ergonom|sien|puente/i.test(text)) {
    return { donor: goldenVH[paraIdx % goldenVH.length], frame: 'VISAGISM_AESTHETICS' };
  }
  return { donor: editorialStylePool[paraIdx % editorialStylePool.length], frame: 'GENERAL_STYLE' };
}

// 4. FASE 4: Injerto Fáctico en Ranuras Tipadas
function graftSlots(skeleton, atoms, anchor = null) {
  let text = skeleton;
  const shape = atoms.shapes[0] || 'redondeada';
  const style = atoms.styles[0] || 'vintage';
  const material = atoms.materials[0] || 'acetato pulido';
  const outfit = atoms.outfits[0] || 'prendas de lino';
  const brand = atoms.brand_models[0] || anchor || 'monturas';

  text = text.replace(/\[SLOT_FRAME_SHAPE\]/g, shape);
  text = text.replace(/\[SLOT_AESTHETIC_STYLE\]/g, style);
  text = text.replace(/\[SLOT_MATERIAL\]/g, material);
  text = text.replace(/\[SLOT_OCCASION_OUTFIT\]/g, outfit);
  text = text.replace(/\[SLOT_COMPONENT\]/g, brand);
  text = text.replace(/\[SLOT_FACIAL_FEATURE\]/g, 'facciones del rostro');
  text = text.replace(/\[SLOT_MODEL\]/g, brand);
  text = text.replace(/\[SLOT_BRAND\]/g, brand);
  text = text.replace(/\[SLOT_COLOR\]/g, 'tonos carey');
  text = text.replace(/\[SLOT_COATING\]/g, 'polarizado UV 400');
  text = text.replace(/\[SLOT_MEASURE\]/g, '400 nm');
  text = text.replace(/\[SLOT_PROPERTY\]/g, 'resistencia y ligereza');
  text = text.replace(/\[SLOT_[A-Z_]+\]/g, 'detalle');

  // Limpieza de espacios y concordancias
  text = text.replace(/\s+([.,;:!?])/g, '$1');
  text = text.replace(/\ba el\b/g, 'al').replace(/\bA el\b/g, 'Al');
  text = text.replace(/\bde el\b/g, 'del').replace(/\bDe el\b/g, 'Del');
  return text;
}

// Probar con párrafos de shortBohoArticle
const paras = shortBohoArticle.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
let currentAnchor = null;
const reconstructedBlocks = [];

for (let i = 0; i < paras.length; i++) {
  const p = paras[i];
  const isHead = (p.length <= 60 && !/[.!?]$/.test(p)) || (p.includes(':') && p.split(/\s+/).length <= 14);

  if (isHead) {
    let cleanHead = p;
    if (cleanHead.includes(':')) {
      const parts = cleanHead.split(':').map(x => x.trim());
      cleanHead = parts[0] + ' y las claves del ' + parts[1].toLowerCase().replace(/^el\s+/, '');
    }
    cleanHead = cleanHead.replace(/^(\d+)\s+([A-Za-z])/g, (m, num, next) => {
      const nums = { '1': 'Un', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco' };
      return (nums[num] || num) + ' ' + next.toLowerCase();
    });
    currentAnchor = cleanHead;
    reconstructedBlocks.push(cleanHead);
    continue;
  }

  const atoms = extractAtoms(p);
  const { donor, frame } = selectRealDonor(atoms, p, i);
  const grafted = graftSlots(donor.syntactic_skeleton || donor.raw_text, atoms, currentAnchor);
  
  console.log(`\n--- PÁRRAFO ${i+1} [Marco: ${frame} | Donante: ${donor.donor_id || donor.brick_id}] ---`);
  console.log('DONANTE PRE-2022 ORIGINAL:\n', donor.raw_text || donor.syntactic_skeleton);
  console.log('RECONSTRUCCIÓN CON HECHOS:\n', grafted);
  reconstructedBlocks.push(grafted);
}

console.log('\n================ TEXTO RECONSTRUIDO CON DONANTES REALES ================');
console.log(reconstructedBlocks.join('\n\n'));
