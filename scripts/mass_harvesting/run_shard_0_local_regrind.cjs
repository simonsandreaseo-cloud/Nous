const fs = require('fs');
const path = require('path');
const {
  CLINICAL_SURGERY_DOMAINS,
  loadGlobalDedupeState,
  extractGrindedBlocksFromHtml,
  registerIfUnique,
  tagBrickFromRaw,
  writeJsonAtomic,
  writeTextAtomic
} = require('./blog_grinder_core.cjs');

const STAGING_JSON_PATH = path.resolve('banco_ontologico_semantico/staging/shard_0_local_regrind.json');
const REPORT_MD_PATH = path.resolve('banco_ontologico_semantico/staging/shard_0_report.md');

const FASHION_MAGAZINE_KEYS = [
  'vogue',
  'elle',
  'telva',
  'harpersbazaar',
  'glamour',
  'cosmopolitan',
  'instyle',
  'marie-claire',
  'clara',
  'smoda',
  'revistagq',
  'esquire',
  'trendencias',
  'trendenciashombre',
  'lookiero',
  'mujerhoy',
  'hola',
  'okchicas',
  'diariofemenino',
  'lavanguardia',
  'medium'
];

const FASHION_MAGAZINE_RX = new RegExp(`(?:^|\\.)(?:${FASHION_MAGAZINE_KEYS.join('|')})(?:\\.|$)`, 'i');

function resolveDomain(meta, sourceUrl) {
  let domain = String(meta.source_domain || '').toLowerCase().replace(/^www\./, '').trim();
  if (!domain && sourceUrl) {
    try {
      domain = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      domain = '';
    }
  }
  return domain;
}

function isValidPre2022Date(rawDate) {
  if (!rawDate || typeof rawDate !== 'string') return false;
  const dt = rawDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)) return false;
  return dt >= '2004-01-01' && dt < '2022-01-01';
}

function main() {
  const tStart = Date.now();
  const dedupe = loadGlobalDedupeState();
  const initialSeenEs = dedupe.seenEs.size;
  const initialSeenUrls = dedupe.seenUrls.size;

  const allBlocks = [];
  const stats = {
    totalEvidenceMetas: dedupe.evidenceMetas.length,
    skippedInvalidDate: 0,
    skippedClinicalDomain: 0,
    skippedUnknownDomain: 0,
    processedFiles: 0,
    filesWithAcceptedBlocks: 0,
    rawExtractedBlocks: 0,
    rejectedDuplicate: 0,
    rejectedBadSlot: 0
  };

  const byDomain = new Map();
  const byFrame = new Map();
  const byTag = new Map();
  const byMode = new Map();
  const byTier = new Map();

  for (const { meta, htmlPath } of dedupe.evidenceMetas) {
    const sourceUrl = meta.source_url || meta.url || null;
    const domain = resolveDomain(meta, sourceUrl);
    if (!domain) {
      stats.skippedUnknownDomain++;
      continue;
    }

    if (CLINICAL_SURGERY_DOMAINS.has(domain)) {
      stats.skippedClinicalDomain++;
      continue;
    }

    if (!isValidPre2022Date(meta.publish_date)) {
      stats.skippedInvalidDate++;
      continue;
    }

    const publishDate = String(meta.publish_date).trim().slice(0, 10);
    const mode = FASHION_MAGAZINE_RX.test(domain) ? 'fashion_magazine' : 'optical_blog';

    let html;
    try {
      html = fs.readFileSync(htmlPath, 'utf8');
    } catch {
      continue;
    }

    stats.processedFiles++;
    const domRow = byDomain.get(domain) || {
      domain,
      mode,
      files: 0,
      filesWithBlocks: 0,
      rawExtracted: 0,
      accepted: 0,
      duplicates: 0,
      badSlots: 0
    };
    domRow.files++;

    const blocks = extractGrindedBlocksFromHtml(html, {
      domain,
      source_url: sourceUrl,
      publish_date: publishDate,
      date_verification_method: meta.date_verification_method || 'local_verified_pre2022',
      mode,
      excludeClinical: true
    });

    stats.rawExtractedBlocks += blocks.length;
    domRow.rawExtracted += blocks.length;

    let acceptedHere = 0;
    for (const blk of blocks) {
      if (!registerIfUnique(blk, dedupe)) {
        stats.rejectedDuplicate++;
        domRow.duplicates++;
        continue;
      }
      const tagged = tagBrickFromRaw(blk);
      if (!tagged) {
        stats.rejectedBadSlot++;
        domRow.badSlots++;
        continue;
      }
      allBlocks.push(tagged);
      acceptedHere++;
      domRow.accepted++;

      byMode.set(mode, (byMode.get(mode) || 0) + 1);
      byFrame.set(tagged.frame, (byFrame.get(tagged.frame) || 0) + 1);
      byTier.set(tagged.tier, (byTier.get(tagged.tier) || 0) + 1);
      for (const tg of tagged.topic_tags || []) {
        byTag.set(tg, (byTag.get(tg) || 0) + 1);
      }
    }

    if (acceptedHere > 0) {
      stats.filesWithAcceptedBlocks++;
      domRow.filesWithBlocks++;
    }
    byDomain.set(domain, domRow);
  }

  writeJsonAtomic(STAGING_JSON_PATH, allBlocks);

  const elapsedSec = ((Date.now() - tStart) / 1000).toFixed(2);
  const domainRows = [...byDomain.values()].sort((a, b) => b.accepted - a.accepted || b.files - a.files);
  const frameRows = [...byFrame.entries()].sort((a, b) => b[1] - a[1]);
  const tagRows = [...byTag.entries()].sort((a, b) => b[1] - a[1]);
  const modeRows = [...byMode.entries()].sort((a, b) => b[1] - a[1]);
  const tierRows = [...byTier.entries()].sort((a, b) => b[1] - a[1]);

  const mdLines = [
    '# Reporte Shard 0 Local Re-Grinder',
    `**Fecha:** ${new Date().toISOString()} | **Duración:** ${elapsedSec}s`,
    `**Base dedupe inicial:** ${initialSeenEs} bloques únicos en banco maestro, ${initialSeenUrls} URLs cacheadas`,
    `**Total pares cacheados en \`raw_web_evidence/\`:** ${stats.totalEvidenceMetas}`,
    `- Excluidos por dominio clínico (\`CLINICAL_SURGERY_DOMAINS\`): ${stats.skippedClinicalDomain}`,
    `- Excluidos por fecha inválida o fuera de rango (\`2004-01-01\`..` + `\`2021-12-31\`): ${stats.skippedInvalidDate}`,
    `- Excluidos sin dominio resoluble: ${stats.skippedUnknownDomain}`,
    `- Archivos HTML elegibles procesados: ${stats.processedFiles} (con bloques aceptados: ${stats.filesWithAcceptedBlocks})`,
    `- Candidatos extraídos antes de dedupe: ${stats.rawExtractedBlocks}`,
    `- Descartados por duplicado/solapamiento global: ${stats.rejectedDuplicate}`,
    `- Descartados por colisión de slot en esqueleto: ${stats.rejectedBadSlot}`,
    `**Total bloques únicos nuevos etiquetados y guardados:** ${allBlocks.length}`,
    '',
    '## Distribución por Modo (`mode`)',
    ...modeRows.map(([k, v]) => `- **${k}:** ${v}`),
    '',
    '## Distribución por Tier',
    ...tierRows.map(([k, v]) => `- **${k}:** ${v}`),
    '',
    '## Desglose por Dominio',
    '| Dominio | Mode | Archivos | Con Bloques | Extraídos Brutos | Duplicados | Slots Inválidos | Aceptados |',
    '| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
    ...domainRows.map(r => `| ${r.domain} | ${r.mode} | ${r.files} | ${r.filesWithBlocks} | ${r.rawExtracted} | ${r.duplicates} | ${r.badSlots} | ${r.accepted} |`),
    '',
    '## Distribución por Marco (`frame`)',
    '| Frame | Cantidad |',
    '| :--- | :---: |',
    ...frameRows.map(([k, v]) => `| ${k} | ${v} |`),
    '',
    '## Distribución por Etiquetas Temáticas (`topic_tags`)',
    '| Topic Tag | Cantidad |',
    '| :--- | :---: |',
    ...tagRows.map(([k, v]) => `| \`${k}\` | ${v} |`)
  ];

  writeTextAtomic(REPORT_MD_PATH, mdLines.join('\n'));

  console.log(`=== [Shard 0 Local Re-Grinder] COMPLETADO en ${elapsedSec}s ===`);
  console.log(`Pares cacheados: ${stats.totalEvidenceMetas} | Elegibles procesados: ${stats.processedFiles} | Excluidos clínicos: ${stats.skippedClinicalDomain} | Excluidos fecha: ${stats.skippedInvalidDate}`);
  console.log(`Extraídos brutos: ${stats.rawExtractedBlocks} | Duplicados descartados: ${stats.rejectedDuplicate} | Slots inválidos: ${stats.rejectedBadSlot}`);
  console.log(`Bloques únicos nuevos guardados: ${allBlocks.length}`);
  console.log(`JSON: ${STAGING_JSON_PATH}`);
  console.log(`Reporte: ${REPORT_MD_PATH}`);
}

main();
