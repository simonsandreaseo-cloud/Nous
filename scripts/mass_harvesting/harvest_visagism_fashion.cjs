const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  'trendenciashombre.com/tag/gafas-de-sol/*',
  'trendencias.com/tag/gafas-de-sol/*',
  'revistagq.com/moda/relojes-y-accesorios/*',
  'esquire.com/es/moda-hombre/*',
  'telva.com/moda/accesorios/*',
  'elle.com/es/moda/tendencias/*',
  'harpersbazaar.com/es/moda/noticias-moda/*'
];

async function run() {
  console.log('=== HARVEST WORKER: VISAGISM & EYEWEAR FASHION PRE-2022 ===');
  const allParagraphs = [];
  let totalPages = 0;

  for (const pattern of TARGETS) {
    console.log(`\nConsultando Wayback CDX para: ${pattern}...`);
    const snapshots = await queryWaybackCDX(pattern, 150);
    console.log(`Instantáneas pre-2022 encontradas: ${snapshots.length}`);

    await runConcurrent(snapshots, 6, async (snap) => {
      try {
        const fetched = await fetchUrl(snap.waybackUrl, 9000);
        if (!fetched || !fetched.html) return;

        const pubDate = detectPublishDate(fetched.html, snap.originalUrl) || {
          date: `${snap.timestamp.slice(0,4)}-${snap.timestamp.slice(4,6)}-${snap.timestamp.slice(6,8)}`,
          method: 'wayback_timestamp'
        };

        if (pubDate.date >= '2022-01-01') return;

        const paragraphs = cleanAndExtractParagraphs(fetched.html);
        if (paragraphs.length < 2) return;

        const domain = pattern.split('/')[0].replace(/^www\./, '');
        saveScrapedPage(domain, snap.originalUrl, pubDate.date, pubDate.method, fetched.html, paragraphs);

        paragraphs.forEach(p => {
          allParagraphs.push({
            domain,
            source_url: snap.originalUrl,
            publish_date: pubDate.date,
            tier: 'TIER_2_EDITORIAL_STYLE',
            vertical: 'fashion_visagism',
            text: p.text,
            word_count: p.word_count
          });
        });

        totalPages++;
        console.log(`[PÁGINA ${totalPages}] ${domain} (${pubDate.date}) => ${paragraphs.length} párrafos.`);
      } catch (e) {
        // error handling inside worker
      }
    });
  }

  const outPath = path.join(STAGING_DIR, 'harvested_visagism_fashion.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n[FINALIZADO FASHION] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
}

run();
