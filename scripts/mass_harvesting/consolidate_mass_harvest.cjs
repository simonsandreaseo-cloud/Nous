const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { STAGING_DIR } = require('./harvest_core.cjs');

function run() {
  console.log('=== CONSOLIDADOR DE COSECHA MASIVA PRE-2022 ===');
  const files = [
    'harvested_major_chains.json',
    'harvested_clinical.json',
    'harvested_clinical_ophthalmology.json',
    'harvested_artisan_workshops.json',
    'harvested_independent_workshops.json',
    'harvested_visagism_fashion.json',
    'harvested_clinical_baviera.json',
    'harvested_contactology_care.json',
    'harvested_mechanics_artisan.json',
    'harvested_visagism_glitches.json',
    'harvested_live_sitemaps.json',
    'harvested_new_categories_expansion.json'
  ];

  const seenHashes = new Set();
  const combined = [];
  const domainCounts = {};
  const verticalCounts = {};

  for (const f of files) {
    const full = path.join(STAGING_DIR, f);
    if (!fs.existsSync(full)) {
      continue;
    }
    const data = JSON.parse(fs.readFileSync(full, 'utf8'));
    console.log(`[CARGADO] ${f}: ${data.length} párrafos.`);
    data.forEach(item => {
      const hash = crypto.createHash('md5').update(item.text.trim().toLowerCase()).digest('hex');
      if (seenHashes.has(hash)) return;
      seenHashes.add(hash);

      combined.push(item);
      domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
      const vert = item.vertical || (item.tier === 'TIER_2_EDITORIAL_STYLE' ? 'fashion_visagism' : 'workshop_clinical');
      verticalCounts[vert] = (verticalCounts[vert] || 0) + 1;
    });
  }

  const outCombined = path.join(STAGING_DIR, 'massive_pre2022_raw_paragraphs.json');
  fs.writeFileSync(outCombined, JSON.stringify(combined, null, 2), 'utf8');

  console.log(`\n=== REPORTE TOTAL ===`);
  console.log(`Párrafos pre-2022 únicos combinados: ${combined.length}`);
  console.log(`Desglose por vertical:`, verticalCounts);
  console.log(`Desglose por dominio:`, domainCounts);
  console.log(`Guardado en: ${outCombined}`);
}

run();
