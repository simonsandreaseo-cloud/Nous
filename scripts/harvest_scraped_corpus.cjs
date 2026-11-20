const fs = require('fs');
const path = require('path');

const RAW_DIR = 'raw_web_evidence';
const OUT_FILE = 'banco_ontologico_semantico/staging/raw_harvested_paragraphs.json';

function getDomainTier(filename) {
  const f = filename.toLowerCase();
  if (f.startsWith('optimoda')) return { tier: 'TIER_3_CORPORATE_PR', voice: 'CORPORATE_B2B', exclude_humanization: true };
  if (f.startsWith('es_wikipedia')) return { tier: 'TIER_4_WIKIPEDIA', voice: 'ENCYCLOPEDIC', exclude_humanization: true };
  
  if (f.includes('barraquer') || f.includes('barrea') || f.includes('opticabarrea') ||
      f.includes('generaloptica') || f.includes('opticagasset') || f.includes('opticasflorida') ||
      f.includes('opticauniversitaria') || f.includes('opticafernandezbaca') || f.includes('afflelou') ||
      f.includes('vipsual') || f.includes('qvision') || f.includes('cottet') || f.includes('costasol') ||
      f.includes('optiveropticos')) {
    return { tier: 'TIER_1_WORKSHOP', voice: 'WORKSHOP_CLINICAL', exclude_humanization: false };
  }
  
  return { tier: 'TIER_2_EDITORIAL', voice: 'EDITORIAL_LIFESTYLE', exclude_humanization: false };
}

function cleanHtmlToParagraphs(html) {
  // Remove script, style, svg, noscript, header, footer, nav
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                  .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                  .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
                  .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
                  .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
                  .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
                  .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');

  // Extract p, li, blockquote, h2, h3
  const matches = clean.match(/<(p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi) || [];
  const results = [];

  const boilerplate = [
    'cookie', 'política de privacidad', 'aviso legal', 'todos los derechos reservados',
    'suscríbete', 'newsletter', 'compartir en', 'facebook', 'twitter', 'instagram',
    'carrito', 'cesta de compra', 'iniciar sesión', 'más información sobre',
    'whatsapp', 'teléfono:', 'email:', 'dirección:', 'horario:'
  ];

  for (const m of matches) {
    const text = m.replace(/<[^>]+>/g, ' ')
                  .replace(/&nbsp;/g, ' ')
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/\s+/g, ' ')
                  .trim();

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 15 && words.length <= 130) {
      const lower = text.toLowerCase();
      const isBoilerplate = boilerplate.some(b => lower.includes(b));
      if (!isBoilerplate) {
        results.push(text);
      }
    }
  }

  return results;
}

const files = fs.readdirSync(RAW_DIR).filter(f => f.endsWith('.html'));
console.log(`Analyzing ${files.length} HTML files in ${RAW_DIR}...`);

const harvested = [];
const seenTexts = new Set();
let countByTier = {};

for (const file of files) {
  const filePath = path.join(RAW_DIR, file);
  const metaPath = filePath.replace(/\.html$/, '.meta.json');
  let meta = {};
  if (fs.existsSync(metaPath)) {
    try { meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) {}
  }

  const { tier, voice, exclude_humanization } = getDomainTier(file);
  countByTier[tier] = (countByTier[tier] || 0) + 1;

  const html = fs.readFileSync(filePath, 'utf8');
  const paras = cleanHtmlToParagraphs(html);

  for (const p of paras) {
    // Basic deduplication
    const norm = p.toLowerCase().replace(/[^\w]/g, '');
    if (norm.length >= 40 && !seenTexts.has(norm)) {
      seenTexts.add(norm);
      harvested.push({
        harvest_id: `raw_${harvested.length + 1}`,
        source_file: file,
        url: meta.url || meta.canonical_url || file,
        source_domain: file.split('_')[0],
        tier,
        voice_category: voice,
        exclude_humanization,
        text: p,
        word_count: p.split(/\s+/).filter(Boolean).length
      });
    }
  }
}

console.log('Harvesting complete!');
console.log('HTML files by tier:', countByTier);
console.log(`Total unique harvested paragraphs: ${harvested.length}`);

fs.writeFileSync(OUT_FILE, JSON.stringify(harvested, null, 2), 'utf8');
console.log(`Saved harvested pool to ${OUT_FILE}`);
