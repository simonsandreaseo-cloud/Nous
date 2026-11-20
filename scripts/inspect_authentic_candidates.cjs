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

console.log('Total authentic optical_protection candidates:', authentic.length);

// Group by domain
const byDomain = {};
for (const b of authentic) {
  byDomain[b.source_domain] = (byDomain[b.source_domain] || 0) + 1;
}
console.log('By domain:', byDomain);
