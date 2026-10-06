const fs = require('fs');

const raw = fs.readFileSync('task_final_fixed.html', 'utf8');

// Split into H2 sections
const parts = raw.split(/<h2>/i);

const s0 = parts[0]; // H1 + intro
const s1 = '<h2>' + parts[1]; // Transformación
const s2 = '<h2>' + parts[2]; // Diseño y Artesanía
let s3 = '<h2>' + parts[3]; // Catálogo de Tendencias
const s4 = '<h2>' + parts[4]; // Top 3 Modelos

// In S3, remove the out-of-place Ray-Ban Meta section
// from '<h3>Tecnología Integrada al Estilo Aviador</h3>' up to the end of S3
const metaIdx = s3.indexOf('<h3>Tecnología Integrada al Estilo Aviador</h3>');
if (metaIdx !== -1) {
  s3 = s3.substring(0, metaIdx);
}

// Remove emojis from all sections
function cleanHtml(str) {
  let cleaned = str
    .replace(/⚠️\s*/g, '')
    .replace(/💡\s*/g, '')
    // Fix nested lists <ul><li><p>text</p></li></ul> -> <ul><li>text</li></ul>
    .replace(/<ul>\s*<li>\s*<p>(.*?)<\/p>\s*<\/li>\s*<\/ul>/gs, '<ul><li>$1</li></ul>')
    .replace(/<li>\s*<p>(.*?)<\/p>\s*<\/li>/gs, '<li>$1</li>');
  return cleaned;
}

// Reassemble in the requested order: S0 (H1+intro) + S4 (Top 3) + S1 + S2 + S3
const finalHtml = cleanHtml(s0.trim() + '\n\n' + s4.trim() + '\n\n' + s1.trim() + '\n\n' + s2.trim() + '\n\n' + s3.trim());

fs.writeFileSync('task_final_polished_authentic.html', finalHtml, 'utf8');
console.log('Saved task_final_polished_authentic.html with size:', finalHtml.length);
