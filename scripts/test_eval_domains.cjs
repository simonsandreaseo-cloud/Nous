const fs = require('fs');
const path = require('path');

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é').replace(/&iacute;/gi, 'í')
    .replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/gi, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&#39;/g, "'")
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ').replace(/&hellip;/gi, '...')
    .replace(/&ndash;/gi, '–').replace(/&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec));
}

function evaluateDomain(sourceDomain) {
  const d = (sourceDomain || '').toLowerCase();
  
  if (d.includes('wikipedia') || d === 'es') {
    return {
      tier: 'TIER_4_WIKIPEDIA',
      voice_category: 'ENCYCLOPEDIC',
      exclude_from_humanization: true
    };
  }

  if (d.includes('optimoda')) {
    return {
      tier: 'TIER_3_CORPORATE_PR',
      voice_category: 'CORPORATE_B2B',
      exclude_from_humanization: true
    };
  }

  if (d.includes('barraquer') || d.includes('pico') || d.includes('qvision')) {
    return {
      tier: 'TIER_1_WORKSHOP',
      voice_category: 'WORKSHOP_CLINICAL',
      exclude_from_humanization: false
    };
  }

  if (d.includes('opticagasset') || d.includes('gasset') ||
      d.includes('opticasflorida') || d.includes('florida') ||
      d.includes('opticauniversitaria') || d.includes('opticafernandezbaca') ||
      d.includes('generaloptica') || d.includes('cottet') ||
      d.includes('afflelou') || d.includes('vipsual') ||
      d.includes('barrea') || d.includes('xn--opticabarrea') ||
      d.includes('costasol') || d.includes('optiveropticos') ||
      d.includes('villalba') || d.includes('frases_raras') ||
      d === 'verified_pre2022_workshop') {
    return {
      tier: 'TIER_1_WORKSHOP',
      voice_category: 'WORKSHOP_CLINICAL',
      exclude_from_humanization: false
    };
  }

  return {
    tier: 'TIER_2_EDITORIAL',
    voice_category: 'EDITORIAL_LIFESTYLE',
    exclude_from_humanization: false
  };
}

const raw = JSON.parse(fs.readFileSync('banco_ontologico_semantico/staging/raw_harvested_paragraphs.json', 'utf8'));
const mb = JSON.parse(fs.readFileSync('banco_maestro_retorico_unificado.json', 'utf8'));
const allMb = [...(mb.triads || []), ...(mb.duos || []), ...(mb.singles || [])];

console.log('Testing total items:', raw.length + allMb.length);

let totalExcluded = 0;
let totalApproved = 0;
let clinicalWorkshopApproved = 0;
let editorialApproved = 0;

for (const item of raw) {
  const { exclude_from_humanization, tier } = evaluateDomain(item.source_domain);
  if (exclude_from_humanization) totalExcluded++;
  else {
    totalApproved++;
    if (tier === 'TIER_1_WORKSHOP') clinicalWorkshopApproved++;
    else editorialApproved++;
  }
}

for (const item of allMb) {
  const { exclude_from_humanization, tier } = evaluateDomain(item.source_domain);
  if (exclude_from_humanization) totalExcluded++;
  else {
    totalApproved++;
    if (tier === 'TIER_1_WORKSHOP') clinicalWorkshopApproved++;
    else editorialApproved++;
  }
}

console.log(`Total items evaluated: ${totalExcluded + totalApproved}`);
console.log(`Excluded (Wikipedia + Optimoda): ${totalExcluded}`);
console.log(`Approved (Genuine Human Donors): ${totalApproved}`);
console.log(`- Tier 1 Clinical / Workshop: ${clinicalWorkshopApproved}`);
console.log(`- Tier 2 Editorial / Lifestyle: ${editorialApproved}`);
