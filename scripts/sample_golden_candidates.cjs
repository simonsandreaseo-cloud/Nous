const fs = require('fs');

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é').replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó').replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó').replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
    .replace(/&uuml;/g, 'ü').replace(/&Uuml;/g, 'Ü')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '...')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec));
}

const op = JSON.parse(fs.readFileSync('banco_ontologico_semantico/marcos/optical_protection.json', 'utf8'));

// Filter out all wikipedia and optimoda
const authentic = op.filter(b => {
  const d = (b.source_domain || '').toLowerCase();
  return !d.includes('wikipedia') && d !== 'es' && !d.includes('optimoda');
});

// Look at candidates from Barraquer, Dr. Andrés Picó, QVision, Óptica Gasset, Cottet, Afflelou, Vipsual, General Óptica
const clinicalAndWorkshop = authentic.filter(b => {
  const d = (b.source_domain || '').toLowerCase();
  return d.includes('barraquer') || d.includes('pico') || d.includes('qvision') ||
         d.includes('gasset') || d.includes('florida') || d.includes('cottet') ||
         d.includes('generaloptica') || d.includes('afflelou') || d.includes('vipsual') ||
         d.includes('opticauniversitaria') || d.includes('barrea');
});

console.log('Total clinical and workshop candidates:', clinicalAndWorkshop.length);

clinicalAndWorkshop.slice(0, 35).forEach((b, i) => {
  const decoded = decodeHtml(b.raw_text);
  console.log(`[${i+1}] ID: ${b.brick_id} | Domain: ${b.source_domain} | Words: ${b.word_count} | Rhet: ${b.rhetorical_relation}`);
  console.log('  ' + decoded.substring(0, 140) + '...');
});
