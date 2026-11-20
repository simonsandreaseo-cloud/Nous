const fs = require('fs');
const path = require('path');

const tax = JSON.parse(fs.readFileSync('banco_ontologico_semantico/TAXONOMIA_MARCOS_Y_RANURAS.json', 'utf8'));
const baviera = JSON.parse(fs.readFileSync('banco_ontologico_semantico/staging/harvested_clinical_baviera.json', 'utf8'));

const frameKeywords = tax.frames.CLINICAL_OPHTHALMOLOGY.keywords;

const pathologyTerms = [
  'miopía', 'hipermetropía', 'astigmatismo', 'presbicia', 'cataratas', 'catarata',
  'glaucoma', 'ojo seco', 'sequedad ocular', 'queratitis', 'conjuntivitis',
  'blefaritis', 'degeneración macular', 'dmae', 'desprendimiento de retina',
  'retinopatía', 'retinopatía diabética', 'ambliopía', 'estrabismo', 'uveítis',
  'orzuelo', 'chalazión', 'pterigión', 'hipertensión ocular', 'edema macular',
  'ceguera', 'baja visión', 'defecto refractivo', 'defectos refractivos',
  'problemas visuales', 'patología', 'patologías', 'triquiasis'
];

const anatomyTerms = [
  'córnea', 'cristalino', 'retina', 'mácula', 'conjuntiva', 'párpado', 'párpados',
  'humor vítreo', 'humor acuoso', 'nervio óptico', 'iris', 'pupila', 'esclera',
  'esclerótica', 'superficie ocular', 'globo ocular', 'fondo de ojo', 'glándula lagrimal',
  'glándulas de meibomio', 'cámara anterior', 'cámara posterior'
];

let clinicalMatchCount = 0;
let pathologyMatchCount = 0;
let anatomyMatchCount = 0;
let bothSlotsCount = 0;
let anySlotCount = 0;

const pathologyDist = {};
const anatomyDist = {};

baviera.forEach(p => {
  const textLower = p.text.toLowerCase();
  
  const matchedFrameKw = frameKeywords.filter(kw => textLower.includes(kw.toLowerCase()));
  if (matchedFrameKw.length > 0) clinicalMatchCount++;

  let hasPath = false;
  pathologyTerms.forEach(term => {
    const rx = new RegExp(`(^|[^a-záéíóúüñ])${term}([^a-záéíóúüñ]|$)`, 'i');
    if (rx.test(textLower)) {
      hasPath = true;
      pathologyDist[term] = (pathologyDist[term] || 0) + 1;
    }
  });
  if (hasPath) pathologyMatchCount++;

  let hasAnat = false;
  anatomyTerms.forEach(term => {
    const rx = new RegExp(`(^|[^a-záéíóúüñ])${term}([^a-záéíóúüñ]|$)`, 'i');
    if (rx.test(textLower)) {
      hasAnat = true;
      anatomyDist[term] = (anatomyDist[term] || 0) + 1;
    }
  });
  if (hasAnat) anatomyMatchCount++;

  if (hasPath && hasAnat) bothSlotsCount++;
  if (hasPath || hasAnat) anySlotCount++;
});

console.log('=== REPORTE DE COBERTURA SEMÁNTICA STREAM A (CLÍNICA) ===');
console.log('Total de párrafos:', baviera.length);
console.log('Activación Marco CLINICAL_OPHTHALMOLOGY:', clinicalMatchCount, `(${(clinicalMatchCount / baviera.length * 100).toFixed(2)}%)`);
console.log('Presencia de SLOT_PATHOLOGY:', pathologyMatchCount, `(${(pathologyMatchCount / baviera.length * 100).toFixed(2)}%)`);
console.log('Presencia de SLOT_ANATOMY_EYE:', anatomyMatchCount, `(${(anatomyMatchCount / baviera.length * 100).toFixed(2)}%)`);
console.log('Párrafos con AMBAS ranuras (Patología + Anatomía):', bothSlotsCount, `(${(bothSlotsCount / baviera.length * 100).toFixed(2)}%)`);
console.log('Párrafos con AL MENOS UNA ranura:', anySlotCount, `(${(anySlotCount / baviera.length * 100).toFixed(2)}%)`);

console.log('\nTop 10 Patologías Identificadas:');
Object.entries(pathologyDist)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([t, c]) => console.log(`  - ${t}: ${c} ocurrencias`));

console.log('\nTop 10 Estructuras Anatómicas Identificadas:');
Object.entries(anatomyDist)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 10)
  .forEach(([t, c]) => console.log(`  - ${t}: ${c} ocurrencias`));
