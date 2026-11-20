const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  'opticafernandezbaca.com/blogs/news/*',
  'opticasflorida.com/blog/*',
  'opticagasset.com/blog/*',
  'vipsual.com/blog/*',
  'costasoloptica.com/blog/*',
  'ricardovillalba.es/blog/*',
  'opticaalpedrete.es/blog/*',
  'gafasvintage.com/blog/*'
];

async function run() {
  console.log('=== HARVEST WORKER: ARTISAN WORKSHOPS & CRAFT OPTICIANS PRE-2022 ===');
  const allParagraphs = [];
  let totalPages = 0;

  for (const pattern of TARGETS) {
    console.log(`\nConsultando Wayback CDX para: ${pattern}...`);
    const snapshots = await queryWaybackCDX(pattern, 150);
    console.log(`Instantáneas pre-2022 encontradas: ${snapshots.length}`);

    await runConcurrent(snapshots, 6, async (snap) => {
      try {
        let fetched = await fetchUrl(snap.waybackUrl, 7000);
        let dateMethod = 'wayback_timestamp';
        let detectedDate = `${snap.timestamp.slice(0,4)}-${snap.timestamp.slice(4,6)}-${snap.timestamp.slice(6,8)}`;

        if (!fetched || !fetched.html) {
          // Fallback to live original URL
          fetched = await fetchUrl(snap.originalUrl, 7000);
          if (fetched && fetched.html) {
            const detected = detectPublishDate(fetched.html, snap.originalUrl);
            if (!detected || detected.date >= '2022-01-01') return; // strictly pre-2022
            detectedDate = detected.date;
            dateMethod = detected.method;
          }
        } else {
          const detected = detectPublishDate(fetched.html, snap.originalUrl);
          if (detected) {
            detectedDate = detected.date;
            dateMethod = detected.method;
          }
        }

        if (!fetched || !fetched.html) return;
        if (detectedDate >= '2022-01-01') return;

        const paragraphs = cleanAndExtractParagraphs(fetched.html);
        if (paragraphs.length < 2) return;

        const domain = pattern.split('/')[0].replace(/^www\./, '');
        saveScrapedPage(domain, snap.originalUrl, detectedDate, dateMethod, fetched.html, paragraphs);

        paragraphs.forEach(p => {
          allParagraphs.push({
            domain,
            source_url: snap.originalUrl,
            publish_date: detectedDate,
            tier: 'TIER_1_WORKSHOP',
            vertical: 'artisan_workshop',
            text: p.text,
            word_count: p.word_count
          });
        });

        totalPages++;
        console.log(`[PÁGINA ${totalPages}] ${domain} (${detectedDate}) => ${paragraphs.length} párrafos.`);
      } catch (e) {
        // error handling inside worker
      }
    });
  }

  const outPath = path.join(STAGING_DIR, 'harvested_artisan_workshops.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n[FINALIZADO ARTISAN] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
}

run();
