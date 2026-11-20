const fs = require('fs');
const path = require('path');
const { fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const SITEMAPS = [
  { url: 'https://opticagasset.com/post-sitemap.xml', domain: 'opticagasset.com', vertical: 'mechanics_materials', tier: 'TIER_1_WORKSHOP' },
  { url: 'https://vipsual.com/post-sitemap.xml', domain: 'vipsual.com', vertical: 'visagism_aesthetics', tier: 'TIER_1_WORKSHOP' },
  { url: 'https://opticasflorida.com/post-sitemap.xml', domain: 'opticasflorida.com', vertical: 'artisan_workshop', tier: 'TIER_1_WORKSHOP' },
  { url: 'https://www.clinicabaviera.com/blog/post-sitemap.xml', domain: 'clinicabaviera.com', vertical: 'clinical_ophthalmology', tier: 'TIER_1_WORKSHOP' }
];

async function harvestSitemap(cfg) {
  console.log(`\n=== Procesando Sitemap: ${cfg.domain} (${cfg.url}) ===`);
  const sitemapRes = await fetchUrl(cfg.url, 10000);
  if (!sitemapRes || !sitemapRes.html) {
    console.log(`No se pudo descargar el sitemap de ${cfg.domain}`);
    return [];
  }

  const locMatches = sitemapRes.html.match(/<loc>(.*?)<\/loc>/g) || [];
  const urls = locMatches.map(m => m.replace(/<\/?loc>/g, '').trim()).filter(Boolean);
  console.log(`URLs encontradas en sitemap de ${cfg.domain}: ${urls.length}`);

  const extractedParagraphs = [];
  const seenHashes = new Set();
  let validPages = 0;

  await runConcurrent(urls, 6, async (pageUrl) => {
    try {
      const fetched = await fetchUrl(pageUrl, 8000);
      if (!fetched || !fetched.html) return;

      const pubDate = detectPublishDate(fetched.html, pageUrl);
      if (!pubDate || !pubDate.date) return;
      if (pubDate.date >= '2022-01-01') return; // estrictamente pre-2022

      const paragraphs = cleanAndExtractParagraphs(fetched.html);
      if (paragraphs.length < 2) return;

      saveScrapedPage(cfg.domain, pageUrl, pubDate.date, pubDate.method, fetched.html, paragraphs);

      let added = 0;
      paragraphs.forEach(p => {
        const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
        if (seenHashes.has(norm)) return;
        seenHashes.add(norm);

        extractedParagraphs.push({
          domain: cfg.domain,
          source_url: pageUrl,
          publish_date: pubDate.date,
          tier: cfg.tier,
          voice_category: 'WORKSHOP_CLINICAL',
          vertical: cfg.vertical,
          text: p.text,
          word_count: p.word_count
        });
        added++;
      });

      if (added > 0) {
        validPages++;
        console.log(`[${cfg.domain}] (${pubDate.date}) => ${added} párrafos.`);
      }
    } catch (e) {}
  });

  console.log(`Total párrafos válidos pre-2022 de ${cfg.domain}: ${extractedParagraphs.length} de ${validPages} páginas.`);
  return extractedParagraphs;
}

async function run() {
  console.log('=== HARVEST WORKER: HIGH-SPEED SITEMAP WORKSHOP & CLINICAL SWEEP ===');
  const allResults = [];

  for (const s of SITEMAPS) {
    const res = await harvestSitemap(s);
    allResults.push(...res);
  }

  const outPath = path.join(STAGING_DIR, 'harvested_live_sitemaps.json');
  fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2), 'utf8');

  console.log(`\n========================================`);
  console.log(`[FINALIZADO SITEMAPS] Total guardado: ${allResults.length} párrafos pre-2022 en ${outPath}`);
  console.log(`========================================`);
}

run();
