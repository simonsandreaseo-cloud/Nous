const fs = require('fs');
const path = require('path');
const baseDir = path.resolve(__dirname, '../banco_ontologico_semantico');
const bricks = JSON.parse(fs.readFileSync(path.join(baseDir, 'banco_maestro_ladrillos_retoricos.json'), 'utf8'));

// Build facet sub-indexes
const facetIndexes = {
  roundFit: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && (b.frame === 'ANATOMICAL_FIT' || b.frame === 'VISAGISM_AESTHETICS') && (b.raw_text.toLowerCase().includes('redond') || b.raw_text.toLowerCase().includes('ovalad'))),
  squareFit: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && (b.frame === 'ANATOMICAL_FIT' || b.frame === 'VISAGISM_AESTHETICS') && (b.raw_text.toLowerCase().includes('cuadrad') || b.raw_text.toLowerCase().includes('geométric') || b.raw_text.toLowerCase().includes('rectangul'))),
  aviatorFit: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && (b.frame === 'ANATOMICAL_FIT' || b.frame === 'VISAGISM_AESTHETICS') && (b.raw_text.toLowerCase().includes('aviador') || b.raw_text.toLowerCase().includes('doble puente'))),
  acetateMat: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && b.frame === 'MATERIAL_COMPOSITION' && (b.raw_text.toLowerCase().includes('acetato') || b.raw_text.toLowerCase().includes('pasta'))),
  metalMat: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && b.frame === 'MATERIAL_COMPOSITION' && (b.raw_text.toLowerCase().includes('metal') || b.raw_text.toLowerCase().includes('titanio'))),
  styleVintage: bricks.filter(b => b.tier === 'TIER_1_WORKSHOP' && (b.frame === 'GENERAL_STYLE' || b.frame === 'HERITAGE_ORIGIN') && (b.raw_text.toLowerCase().includes('retro') || b.raw_text.toLowerCase().includes('vintage') || b.raw_text.toLowerCase().includes('años 70')))
};

console.log('Facet roundFit count:', facetIndexes.roundFit.length);
console.log('Facet squareFit count:', facetIndexes.squareFit.length);
console.log('Facet acetateMat count:', facetIndexes.acetateMat.length);
console.log('Facet styleVintage count:', facetIndexes.styleVintage.length);

function composeProductParagraph(brandModel, shape, material, style, outfit, idx) {
  // 1. Select Visagism/Shape brick
  let fitPool = facetIndexes.roundFit;
  if (shape.includes('cuadrad') || shape.includes('geométric') || shape.includes('rectangul')) {
    fitPool = facetIndexes.squareFit;
  } else if (shape.includes('aviador') || shape.includes('piloto')) {
    fitPool = facetIndexes.aviatorFit;
  }
  const fitBrick = fitPool[idx % fitPool.length];

  // 2. Select Material brick
  let matPool = facetIndexes.acetateMat;
  if (material.includes('metal') || material.includes('titanio')) {
    matPool = facetIndexes.metalMat;
  }
  const matBrick = matPool[(idx * 3 + 1) % matPool.length];

  // 3. Assemble with dynamic slot injection
  let introSentence = `En cuanto al modelo ${brandModel}, destaca por ser una de las opciones con más personalidad de la colección.`;
  if (idx % 2 === 1) {
    introSentence = `Por su parte, las ${brandModel} apuestan por una estética bien diferenciada.`;
  }

  let fitText = fitBrick.raw_text.replace(/^¿Qué sienta mejor\?\s*/i, '').replace(/^¿Qué sienta bien\?\s*/i, '');
  // Clean store/brand mentions inside donor brick if any
  fitText = fitText.replace(/Nos recomiendan este modelo de.*$/i, '').trim();

  let matText = matBrick.raw_text.replace(/En la Colección Afflelou abundan este tipo de modelos\.\s*/i, '').trim();

  return `${introSentence} ${fitText} ${matText}`;
}

const pChloe = composeProductParagraph('Chloé CH0105S 006 55', 'redonda', 'acetato pulido', 'vintage', 'prendas de lino', 0);
console.log('\n--- COMPOSED CHLOÉ ---');
console.log(pChloe);

const pGucci = composeProductParagraph('Gucci GG1084S 003 54', 'geométrica', 'acetato pulido', 'años 70', 'diario', 1);
console.log('\n--- COMPOSED GUCCI ---');
console.log(pGucci);
