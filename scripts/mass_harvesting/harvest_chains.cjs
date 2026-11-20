const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  'generaloptica.es/blog/*',
  'alainafflelou.es/blog/*',
  'cottet.com/es/blog/*',
  'soloptical.net/blog/*',
  'federopticos.com/2021/*',
  'federopticos.com/2020/*',
  'federopticos.com/2019/*',
  'federopticos.com/2018/*',
  'federopticos.com/blog/*',
  'multiopticas.com/salud-visual/*',
  'multiopticas.com/consejos/*',
  'visionlab.es/blog/*'
];

function isJunkUrl(url) {
  if (/\/page\/\d+/i.test(url)) return true;
  if (/\?replytocom=/i.test(url)) return true;
  if (/\?share=/i.test(url)) return true;
  if (/\/feed\/?$/i.test(url)) return true;
  if (/\/tag\//i.test(url)) return true;
  if (/\/author\//i.test(url)) return true;
  if (/\.(jpg|jpeg|png|gif|pdf|css|js)$/i.test(url)) return true;
  return false;
}

async function run() {
  console.log('=== HARVEST WORKER: MAJOR CHAINS & RETAIL PRE-2022 ===');
  const allParagraphs = [];
  const seenUrls = new Set();
  const seenParagraphHashes = new Set();
  let totalPages = 0;

  for (const pattern of TARGETS) {
    console.log(`\nConsultando Wayback CDX para: ${pattern}...`);
    const snapshots = await queryWaybackCDX(pattern, 150);
    console.log(`Instantáneas pre-2022 encontradas: ${snapshots.length}`);

    const filteredSnapshots = snapshots.filter(snap => {
      const cleanUrl = snap.originalUrl.split('#')[0].replace(/\/+$/, '');
      if (isJunkUrl(cleanUrl)) return false;
      if (seenUrls.has(cleanUrl)) return false;
      seenUrls.add(cleanUrl);
      return true;
    });

    console.log(`Instantáneas únicas tras filtrado de URL: ${filteredSnapshots.length}`);

    await runConcurrent(filteredSnapshots, 6, async (snap) => {
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

        let addedCount = 0;
        paragraphs.forEach(p => {
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenParagraphHashes.has(norm)) return;
          seenParagraphHashes.add(norm);

          allParagraphs.push({
            domain,
            source_url: snap.originalUrl,
            publish_date: pubDate.date,
            tier: 'TIER_1_WORKSHOP',
            vertical: 'chains_retail',
            text: p.text,
            word_count: p.word_count
          });
          addedCount++;
        });

        if (addedCount > 0) {
          totalPages++;
          console.log(`[PÁGINA ${totalPages}] ${domain} (${pubDate.date}) => ${addedCount} párrafos extraídos.`);
        }
      } catch (e) {
        // error handling inside worker
      }
    });
  }

  const outPath = path.join(STAGING_DIR, 'harvested_major_chains.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n========================================`);
  console.log(`[FINALIZADO CHAINS] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
  console.log(`========================================`);
}

run();
