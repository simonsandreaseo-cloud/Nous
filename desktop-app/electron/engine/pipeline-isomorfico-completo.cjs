const fs = require('fs');
const path = require('path');
const julian = require('./julian.cjs');

// Ensure bank is loaded
julian.loadBank();

const targetHtmlPath = path.join(__dirname, '..', '..', 'target_for_subagent.html');
const outputHtmlPath = path.join(__dirname, '..', '..', 'pipeline_humanized_output.html');
const outputPlainPath = path.join(__dirname, '..', '..', 'pipeline_humanized_plain.txt');

const rawHtml = fs.readFileSync(targetHtmlPath, 'utf8');

// Global registry of used donors to guarantee ZERO duplicate donor reuse across the article
const usedDonorIds = new Set();
const seenParagraphPrefixes = new Set();

// Cliché connector patterns and commercial scraping leaks to eliminate
const CLICHE_PATTERNS = [
  /\bpor ello\b/i,
  /\blo que hace la gafa oscura\b/i,
  /\ben ocasiones,\s*puede resultar\b/i,
  /\bventajas de las gafas de pasta\b/i,
  /\bgafas de pasta\b/i,
  /\bmarco grueso\b/i,
  /vipsual/i,
  /óptica & audiología/i,
  /general óptica/i,
  /persol/i,
  /como todos los aspectos relacionados/i,
  /[¿?]/,
  /lasgafas/i
];

function isClicheOrContradictory(text) {
  for (const regex of CLICHE_PATTERNS) {
    if (regex.test(text)) return true;
  }
  if (/aviator|gota/i.test(text) && /diseño redondo/i.test(text)) return true;
  if (/mariposa/i.test(text) && /lágrima/i.test(text)) return true;
  return false;
}

// Check if a heading is an artificial FAQ question or synthetic template
function isSyntheticFaqHeading(text) {
  const clean = text.replace(/&amp;/g, '&').trim();
  if (/\b(?:¿qué|¿cómo|¿cuáles|¿cuándo|¿dónde|qué modelos clásicos)\b/i.test(clean)) return true;
  if (/¿|\?/i.test(clean)) return true;
  if (/:\s*¿/i.test(clean)) return true;
  if (/aniversario.*coincide.*colección/i.test(clean)) return true;
  if (/análisis del modelo.*incluye/i.test(clean)) return true;
  if (/cómo logran el efecto/i.test(clean)) return true;
  return false;
}

// Find a fresh, unique donor
function getFreshDonor(text, options = {}) {
  const count = options.count || 5;
  const maxWords = options.maxWords || null;
  const requireTier0 = options.requireTier0 || false;

  const matches = julian.findBestDonors(text, count * 3, {
    excludeIds: usedDonorIds,
    requireTier0,
    excludePasta: true
  });

  let candidates = matches;
  if (maxWords) {
    const byWords = matches.filter(m => m.words <= maxWords);
    if (byWords.length > 0) candidates = byWords;
  }

  // Pick first unused donor
  for (const c of candidates) {
    if (!usedDonorIds.has(c.id)) {
      usedDonorIds.add(c.id);
      return c;
    }
  }

  // Fallback
  const fallback = candidates[0] || { text, id: 'fallback_' + Date.now(), words: text.split(/\s+/).length, tier: 2 };
  usedDonorIds.add(fallback.id);
  return fallback;
}

console.log('[Pipeline Isomórfico 6 Reglas] Iniciando procesamiento...');

// Parse blocks
const lines = rawHtml.split(/\n\s*\n/);
const transformedBlocks = [];

let stats = {
  headingsProcessed: 0,
  paragraphsProcessed: 0,
  listItemsProcessed: 0,
  tableCellsProcessed: 0,
  contradictionsResolved: 0,
  clichesReplaced: 0,
  uniqueDonorsUsed: 0
};

for (let i = 0; i < lines.length; i++) {
  let block = lines[i].trim();
  if (!block) continue;

  // Clean unclosed blockquote tags or wrap bare text
  block = block.replace(/<\/blockquote>/gi, '').trim();
  if (!block) continue;
  if (!/^<(?:p|h[1-6]|ul|ol|table|figure|video|img|blockquote|div)\b/i.test(block)) {
    block = `<p>${block}</p>`;
  }

  // 1. Figures, Images, Videos (Keep 100% intact)
  if (/^<figure\b/i.test(block) || /^<video\b/i.test(block) || /^<img\b/i.test(block)) {
    transformedBlocks.push(block);
    continue;
  }

  // 2. Headings (h1 to h6)
  const headingMatch = block.match(/^<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>$/i);
  if (headingMatch) {
    const tag = headingMatch[1];
    const text = headingMatch[2].trim();

    // If it's a robotic FAQ question, transform into a DECLARATIVE headline
    if (isSyntheticFaqHeading(text)) {
      stats.headingsProcessed++;
      const declarative = julian.formatDeclarativeHeading(text);
      transformedBlocks.push(`<${tag}>${declarative}</${tag}>`);
      console.log(`[Heading Refinada] "${text}" -> "${declarative}"`);
    } else {
      // Factual declarative heading (e.g. "Top 3 Modelos...", "1. Ray-Ban x Dolce&Gabbana..."): Keep intact!
      transformedBlocks.push(block);
    }
    continue;
  }

  // 3. Lists (ul / ol)
  if (/^<(?:ul|ol)\b/i.test(block)) {
    const listTag = /^<ol\b/i.test(block) ? 'ol' : 'ul';
    const items = [...block.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(m => m[1]);
    
    const transformedItems = [];
    for (const rawItem of items) {
      stats.listItemsProcessed++;
      const cleanItem = rawItem.replace(/<\/?p\b[^>]*>/gi, '').trim();
      const liNorm = cleanItem.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
      const isLiDup = liNorm.length >= 20 && seenParagraphPrefixes.has(liNorm);
      const isLiNoise = /recetas|cocina fácil|coches|pinheads|sweat bar/i.test(cleanItem);

      // Check if it's a synthetic technical bullet, duplicate, noise, or has contradiction
      const needsDonor = isClicheOrContradictory(cleanItem) || isLiDup || isLiNoise;
      if (needsDonor) {
        stats.contradictionsResolved++;
        const donor = getFreshDonor(cleanItem, { count: 3 });
        let mutated = julian.applyDeterministicSlotFallback(donor.text, cleanItem);
        mutated = julian.breakPlagiarismRuns(mutated);
        const newLiNorm = mutated.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
        if (newLiNorm.length >= 20) seenParagraphPrefixes.add(newLiNorm);
        transformedItems.push(`<li><p>${mutated}</p></li>`);
      } else {
        if (liNorm.length >= 20) seenParagraphPrefixes.add(liNorm);
        transformedItems.push(`<li><p>${cleanItem}</p></li>`);
      }
    }
    transformedBlocks.push(`<${listTag}>${transformedItems.join('\n')}</${listTag}>`);
    continue;
  }

  // 4. Tables: Iterate each cell (th and td) to clean scraping glitches, cliches, duplicates, and contradictions
  if (/^<table\b/i.test(block)) {
    let tableHtml = block;

    tableHtml = tableHtml.replace(/<(t[dh])\b([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, content) => {
      stats.tableCellsProcessed++;
      const cleanCell = content.replace(/<\/?p\b[^>]*>/gi, '').trim();
      const cellNorm = cleanCell.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
      const isCellDup = cellNorm.length >= 20 && seenParagraphPrefixes.has(cellNorm);
      const isCellNoise = /recetas|coches|motos|vehículos|camper/i.test(cleanCell);

      if (isClicheOrContradictory(cleanCell) || isCellDup || isCellNoise) {
        stats.contradictionsResolved++;
        const donor = getFreshDonor(cleanCell, { count: 3, requireTier0: true });
        let mutated = julian.applyDeterministicSlotFallback(donor.text, cleanCell);
        mutated = julian.breakPlagiarismRuns(mutated);
        const newCellNorm = mutated.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
        if (newCellNorm.length >= 20) seenParagraphPrefixes.add(newCellNorm);
        return `<${tag}${attrs}><p>${mutated}</p></${tag}>`;
      }
      if (cellNorm.length >= 20) seenParagraphPrefixes.add(cellNorm);
      return match;
    });

    transformedBlocks.push(tableHtml);
    continue;
  }

  // 5. Paragraphs (<p>)
  const pMatch = block.match(/^<p\b[^>]*>([\s\S]*?)<\/p>$/i);
  if (pMatch) {
    stats.paragraphsProcessed++;
    const text = pMatch[1].trim();
    const cleanNorm = text.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
    const isDup = cleanNorm.length >= 20 && seenParagraphPrefixes.has(cleanNorm);
    const isNoise = /recetas|cocina fácil|coches,\s*motos|estrenos en cartelera|lasgafas|gafas de sol redondas lasgafas/i.test(text);

    // Check for duplicate, cliché connectors, scraping noise or contradictions
    if (isClicheOrContradictory(text) || isDup || isNoise) {
      stats.clichesReplaced++;
      const donor = getFreshDonor(text, { count: 4, requireTier0: true });
      let mutated = julian.applyDeterministicSlotFallback(donor.text, text);
      mutated = julian.breakPlagiarismRuns(mutated);
      const newNorm = mutated.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 35);
      if (newNorm.length >= 20) seenParagraphPrefixes.add(newNorm);
      transformedBlocks.push(`<p>${mutated}</p>`);
      console.log(`[Párrafo Armonizado] "${text.slice(0, 50)}..." -> "${mutated.slice(0, 50)}..." (Donor: ${donor.id})`);
    } else {
      if (cleanNorm.length >= 20) seenParagraphPrefixes.add(cleanNorm);
      transformedBlocks.push(block);
    }
    continue;
  }

  // Fallback for any other block
  transformedBlocks.push(block);
}

stats.uniqueDonorsUsed = usedDonorIds.size;
console.log('\n[Estadísticas del Pipeline Isomórfico - Pase 1]:', stats);

// ==========================================
// PASE 2: DESDUPLICACIÓN GLOBAL TOTAL (0% DUPLICADOS)
// ==========================================
console.log('[Pipeline Isomórfico - Pase 2] Ejecutando desduplicación global...');
const globalSeen = new Set();
let duplicatesReplaced = 0;

let pass1Html = transformedBlocks.join('\n\n');

let pass2Html = pass1Html.replace(/<(p|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi, (match, tag, content) => {
  const clean = content.replace(/<[^>]+>/g, '').trim();
  const norm = clean.toLowerCase().replace(/[^\w]/g, '').slice(0, 26);
  if (norm.length >= 18) {
    if (globalSeen.has(norm)) {
      duplicatesReplaced++;
      let donor;
      let mutated;
      let newNorm;
      do {
        donor = getFreshDonor(clean, { count: 4, requireTier0: true });
        mutated = julian.applyDeterministicSlotFallback(donor.text, clean);
        mutated = julian.breakPlagiarismRuns(mutated);
        newNorm = mutated.replace(/<[^>]+>/g, '').toLowerCase().replace(/[^\w]/g, '').slice(0, 26);
      } while (globalSeen.has(newNorm));
      
      globalSeen.add(newNorm);
      console.log(`[Duplicado Eliminado] "${clean.slice(0, 40)}..." -> "${mutated.slice(0, 40)}..." (Donor: ${donor.id})`);
      return `<${tag}>${mutated}</${tag}>`;
    }
    globalSeen.add(norm);
  }
  return match;
});

console.log(`[Pase 2 Completado] ${duplicatesReplaced} bloques duplicados reemplazados por donantes humanos únicos.`);

const finalHtml = pass2Html;
fs.writeFileSync(outputHtmlPath, finalHtml, 'utf8');
console.log(`HTML guardado en: ${outputHtmlPath} (${finalHtml.length} caracteres)`);

// Generate clean plain text
function toPlainText(html) {
  let t = html;
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '');
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '');
  t = t.replace(/<figure[\s\S]*?<\/figure>/gi, '\n\n');
  t = t.replace(/<video[\s\S]*?<\/video>/gi, '');
  t = t.replace(/<img[\s\S]*?>/gi, '');
  t = t.replace(/<br\s*\/?>/gi, '\n');
  t = t.replace(/<\/h[1-6]>/gi, '\n\n');
  t = t.replace(/<h[1-6][^>]*>/gi, '\n\n');
  t = t.replace(/<li[^>]*>\s*<p[^>]*>/gi, '\n• ');
  t = t.replace(/<li[^>]*>/gi, '\n• ');
  t = t.replace(/<\/p>\s*<\/li>/gi, '\n');
  t = t.replace(/<\/li>/gi, '\n');
  t = t.replace(/<\/?(?:ul|ol)[^>]*>/gi, '\n');
  t = t.replace(/<\/tr>/gi, '\n');
  t = t.replace(/<tr[^>]*>/gi, '\n');
  t = t.replace(/<\/t[dh]>/gi, '   ');
  t = t.replace(/<t[dh][^>]*>/gi, ' ');
  t = t.replace(/<\/?(?:table|tbody|thead|tfoot|colgroup|col)[^>]*>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/blockquote>/gi, '\n\n');
  t = t.replace(/<p[^>]*>/gi, '');
  t = t.replace(/<blockquote[^>]*>/gi, '');
  t = t.replace(/<[^>]+>/g, '');
  t = t.replace(/\*\*(.*?)\*\*/g, '$1');
  t = t.replace(/\[\*\d+\*\]/g, '');
  t = t.replace(/Llámanos para concertar una cita al \d[\d\s]+\.?/gi, 'Te asesoramos para que encuentres tus modelos favoritos.');
  t = t.replace(/\b\d{3}\s*\d{3}\s*\d{3}\b/g, '');

  const entityMap = {
    '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
    '&lt;': '<', '&gt;': '>', '&nbsp;': ' ',
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú', '&ntilde;': 'ñ',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú', '&Ntilde;': 'Ñ'
  };
  for (const [e, c] of Object.entries(entityMap)) t = t.replaceAll(e, c);
  t = t.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  t = t.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  t = t.replace(/^[ \t]*•[ \t]*$/gm, '');

  return t
    .split('\n')
    .map(line => line.trim())
    .filter((line, i, arr) => !(line === '' && i > 0 && arr[i - 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const plainText = toPlainText(finalHtml);
fs.writeFileSync(outputPlainPath, plainText, 'utf8');
console.log(`Texto plano guardado en: ${outputPlainPath} (${plainText.split(/\s+/).length} palabras)`);
