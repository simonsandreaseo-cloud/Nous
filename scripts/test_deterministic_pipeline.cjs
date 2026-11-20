const fs = require('fs');
const path = require('path');
const { shortBohoArticle } = require('../desktop-app/src/samples/bohoSample.js');

const GENERIC_BIOLOGICAL_SKELETONS = {
  GENERAL_STYLE: [
    "Las [SLOT_COMPONENT] de silueta [SLOT_FRAME_SHAPE] tienen ese toque [SLOT_AESTHETIC_STYLE] que, combinado con [SLOT_OCCASION_OUTFIT], añade un aire fresco a cualquier conjunto.",
    "El estilo [SLOT_AESTHETIC_STYLE] se mantiene fiel a las formas de silueta [SLOT_FRAME_SHAPE], convirtiéndose en una opción segura para quienes buscan desmarcarse de lo común.",
    "Una propuesta de aire [SLOT_AESTHETIC_STYLE] con silueta [SLOT_FRAME_SHAPE], concebida para encajar con naturalidad junto a [SLOT_OCCASION_OUTFIT].",
    "Con una estética marcadamente [SLOT_AESTHETIC_STYLE], este diseño de silueta [SLOT_FRAME_SHAPE] recupera la esencia de las décadas doradas sin perder sobriedad diaria."
  ],
  MATERIAL_COMPOSITION: [
    "Fabricadas en [SLOT_MATERIAL] de primera calidad, las [SLOT_COMPONENT] destacan por su tacto consistente y un acabado que soporta el uso continuado sin perder brillo.",
    "El cuerpo en [SLOT_MATERIAL] proporciona una solidez palpable, manteniendo un peso comedido sobre el puente.",
    "La combinación de [SLOT_MATERIAL] con detalles cuidados garantiza una resistencia sobresaliente frente a roces o pequeñas caídas."
  ],
  OPTICAL_PROTECTION: [
    "Sus cristales incorporan filtro [SLOT_COATING], garantizando una visión descansada y libre de reflejos incluso bajo sol directo en [SLOT_OCCASION_OUTFIT].",
    "La protección con filtro [SLOT_COATING] reduce la fatiga visual en exteriores despejados, logrando una percepción cromática fiel y contrastada."
  ],
  ANATOMICAL_FIT: [
    "El puente se asienta con suavidad sobre la nariz, evitando deslizamientos involuntarios o presiones molestas al cabo de varias horas de uso.",
    "Gracias a su ergonomía cuidada, la montura no oprime las sienes y se mantiene firme con cualquier movimiento natural de la cabeza."
  ]
};

const CERTIFIED_BIOLOGICAL_GLITCHES = {
  fashion: [
    "Olvídate de las marcas en la cara.",
    "Eso sí: no todas sientan igual a primera vista.",
    "Pruébalas y notarás la diferencia de inmediato.",
    "De ahí que se hayan convertido en un icono atemporal.",
    "Es un detalle sutil que lo cambia todo.",
    "Sin rodeos ni artificios.",
    "Cuestión de proporciones y tacto.",
    "Un acierto seguro para el día a día."
  ],
  workshop: [
    "Te durarán años sin perder el ajuste original.",
    "Es un diseño de toda la vida.",
    "Al tacto se nota la solidez del material.",
    "La varilla ajusta con suavidad sin presionar la sien.",
    "El alma metálica interior garantiza que no se deformen.",
    "Un trabajo de pulido manual impecable."
  ]
};

function humanizeHeading(heading) {
  let clean = heading.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':').map(p => p.trim());
    if (parts.length === 2) {
      const part1 = parts[0].toLowerCase();
      let part2 = parts[1].toLowerCase();
      if (part2.startsWith('el ')) part2 = part2.substring(3);
      clean = part1.charAt(0).toUpperCase() + part1.slice(1) + ' y las claves del ' + part2;
    }
  }
  clean = clean.replace(/^(\d+)\s+([A-Za-z])/g, (m, num, next) => {
    const nums = { '1': 'Un', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco' };
    return (nums[num] || num) + ' ' + next.toLowerCase();
  });
  return clean;
}

function extractDavidsonianAtoms(text) {
  const atoms = {
    brand_models: [],
    shapes: [],
    styles: [],
    materials: [],
    outfits: [],
    coatings: []
  };

  const modelMatches = text.match(/\b(Chloé|Gucci|Persol|Ray-Ban|Tom Ford|Prada|Dior|Oakley)\s+([A-Z0-9\s/-]+?\b(?:\d{2,3})?)/gi);
  if (modelMatches) atoms.brand_models.push(...modelMatches.map(m => m.trim()));

  const shapeRx = /\b(redonda|redondas|redondeada|redondeadas|cuadrada|cuadradas|geométrica|geométricas|aviador|cat\s*eye|oversize|mariposa|ovalada|ovaladas)\b/gi;
  const shapes = text.match(shapeRx);
  if (shapes) atoms.shapes.push(...[...new Set(shapes.map(s => s.toLowerCase()))]);

  const styleRx = /\b(boho\s*chic|vintage|retro|hippie|moderno|artesanal|setentero|años\s*70|clásico|atemporal|elegante|urbano|sofisticado)\b/gi;
  const styles = text.match(styleRx);
  if (styles) atoms.styles.push(...[...new Set(styles.map(s => s.toLowerCase()))]);

  const matRx = /\b(acetato\s*pulido|acetato|pasta|carey|metal|titanio|oro|bronce|acero|celulosa)\b/gi;
  const mats = text.match(matRx);
  if (mats) atoms.materials.push(...[...new Set(mats.map(m => m.toLowerCase()))]);

  const outRx = /\b(vestidos\s*sueltos|prendas\s*de\s*lino|sombrero|playa|ciudad|paseo|verano|boda|evento)\b/gi;
  const oMatches = text.match(outRx);
  if (oMatches) atoms.outfits.push(...[...new Set(oMatches.map(o => o.toLowerCase()))]);

  const coatRx = /\b(uv\s*400|filtro\s*uv|polarizado|polarizadas|antirreflejante|espejado|cristal\s*mineral)\b/gi;
  const cMatches = text.match(coatRx);
  if (cMatches) atoms.coatings.push(...[...new Set(cMatches.map(c => c.toLowerCase()))]);

  return atoms;
}

function selectDonorSkeleton(atoms, text, idx = 0) {
  let frame = 'GENERAL_STYLE';
  if (/acetato|pasta|metal|titanio|bisagra|pulido|tornillo|montura/i.test(text)) {
    frame = 'MATERIAL_COMPOSITION';
  } else if (/uv|polarizado|filtro|cristal|antirreflejante/i.test(text)) {
    frame = 'OPTICAL_PROTECTION';
  } else if (/nariz|puente|oreja|apoyo|almohadilla|ajuste/i.test(text)) {
    frame = 'ANATOMICAL_FIT';
  }

  const list = GENERIC_BIOLOGICAL_SKELETONS[frame] || GENERIC_BIOLOGICAL_SKELETONS.GENERAL_STYLE;
  const skeleton = list[idx % list.length];
  return { skeleton, frame };
}

function deterministicSlotGraft(skeleton, atoms, anchorSubject = null) {
  let text = skeleton;
  const shape = atoms.shapes[0] || 'redondeada';
  const style = atoms.styles[0] || 'vintage';
  const material = atoms.materials[0] || 'acetato pulido';
  
  let outfit = atoms.outfits[0] || 'prendas de lino';
  if (outfit === 'ciudad') outfit = 'un paseo por la ciudad';
  if (outfit === 'playa') outfit = 'una jornada de playa';
  if (outfit === 'verano') outfit = 'el día a día de verano';

  const coating = atoms.coatings[0] || 'UV 400';
  
  let comp = 'gafas';
  if (atoms.brand_models && atoms.brand_models.length) {
    comp = atoms.brand_models[0];
  } else if (anchorSubject) {
    let candidate = anchorSubject.split(':')[0].trim();
    if (candidate.length > 25) candidate = 'monturas';
    comp = candidate;
  }

  text = text.replace(/\[SLOT_FRAME_SHAPE\]/g, shape);
  text = text.replace(/\[SLOT_AESTHETIC_STYLE\]/g, style);
  text = text.replace(/\[SLOT_MATERIAL\]/g, material);
  text = text.replace(/\[SLOT_OCCASION_OUTFIT\]/g, outfit);
  text = text.replace(/\[SLOT_COATING\]/g, coating);
  text = text.replace(/\[SLOT_COMPONENT\]/g, comp);
  text = text.replace(/\[SLOT_[A-Z_]+\]/g, 'detalle');

  return text;
}

function runFullHumanization(input) {
  const paragraphs = input.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const outParas = [];
  let currentAnchor = null;
  let glitchIdx = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const raw = paragraphs[i];
    const isHead = (raw.length <= 60 && !/[.!?]$/.test(raw)) || (raw.includes(':') && raw.split(/\s+/).length <= 14);

    if (isHead) {
      const humHead = humanizeHeading(raw);
      currentAnchor = humHead;
      outParas.push(humHead);
      continue;
    }

    const atoms = extractDavidsonianAtoms(raw);
    const { skeleton, frame } = selectDonorSkeleton(atoms, raw, glitchIdx);
    const primarySentence = deterministicSlotGraft(skeleton, atoms, currentAnchor);

    let secondaryFrame = 'MATERIAL_COMPOSITION';
    if (frame === 'MATERIAL_COMPOSITION') secondaryFrame = 'GENERAL_STYLE';
    else if (atoms.coatings.length) secondaryFrame = 'OPTICAL_PROTECTION';
    else if (atoms.outfits.length) secondaryFrame = 'ANATOMICAL_FIT';

    const secList = GENERIC_BIOLOGICAL_SKELETONS[secondaryFrame] || GENERIC_BIOLOGICAL_SKELETONS.GENERAL_STYLE;
    const secSkeleton = secList[(glitchIdx + 1) % secList.length];
    const secondarySentence = deterministicSlotGraft(secSkeleton, atoms, currentAnchor);

    const pool = (frame === 'MATERIAL_COMPOSITION' || frame === 'ANATOMICAL_FIT')
      ? CERTIFIED_BIOLOGICAL_GLITCHES.workshop
      : CERTIFIED_BIOLOGICAL_GLITCHES.fashion;
    const glitch = pool[glitchIdx % pool.length];

    let fullPara = `${primarySentence} ${glitch} ${secondarySentence}`;
    fullPara = fullPara
      .replace(/\ba el\b/g, 'al')
      .replace(/\bA el\b/g, 'Al')
      .replace(/\bde el\b/g, 'del')
      .replace(/\bDe el\b/g, 'Del')
      .replace(/\s+([.,;:!?])/g, '$1')
      .replace(/\.\s*\./g, '.');

    outParas.push(fullPara);
    glitchIdx++;
  }

  return outParas.join('\n\n');
}

const res = runFullHumanization(shortBohoArticle);
console.log('=== RESULTADO COMPILADO BIOLÓGICO DETERMINISTA ===\n');
console.log(res);
