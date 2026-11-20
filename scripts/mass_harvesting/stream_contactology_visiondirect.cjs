const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  { pattern: 'visiondirect.es/blog/*', limit: 200, domain: 'visiondirect.es' },
  { pattern: 'alainafflelou.es/blog/*', limit: 120, domain: 'alainafflelou.es' }
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

// Filter paragraphs relevant to contact lenses, eye drops, hygiene, tear film
function isContactLensOrHealthRelevant(text) {
  return /\b(lentillas?|lentes? de contacto|hidrogel|silicona|solución única|líquido|lágrimas? artificiales|ojo seco|córnea|parpadeo|higiene|infección|conjuntivitis|permeabilidad|porte|estuche|salina|graduación|dioptrías|visión borrosa)\b/i.test(text);
}

async function run() {
  console.log('=== HARVEST STREAM B: CONTACTOLOGY & CONTACT LENS CARE PRE-2022 ===');
  const allParagraphs = [];
  const seenUrls = new Set();
  const seenHashes = new Set();
  let totalPages = 0;

  for (const t of TARGETS) {
    console.log(`\nConsultando Wayback CDX para: ${t.pattern} (límite: ${t.limit})...`);
    const snapshots = await queryWaybackCDX(t.pattern, t.limit);
    console.log(`Instantáneas pre-2022 encontradas para ${t.domain}: ${snapshots.length}`);

    const filtered = snapshots.filter(snap => {
      const cleanUrl = snap.originalUrl.split('#')[0].replace(/\/+$/, '');
      if (isJunkUrl(cleanUrl)) return false;
      if (seenUrls.has(cleanUrl)) return false;
      seenUrls.add(cleanUrl);
      return true;
    });

    console.log(`Instantáneas únicas tras deduplicar URLs: ${filtered.length}`);

    await runConcurrent(filtered, 5, async (snap) => {
      try {
        let fetched = await fetchUrl(snap.waybackUrl, 8000);
        let dateMethod = 'wayback_timestamp';
        let detectedDate = `${snap.timestamp.slice(0,4)}-${snap.timestamp.slice(4,6)}-${snap.timestamp.slice(6,8)}`;

        if (!fetched || !fetched.html) {
          fetched = await fetchUrl(snap.originalUrl, 6000);
          if (fetched && fetched.html) {
            const detected = detectPublishDate(fetched.html, snap.originalUrl);
            if (!detected || detected.date >= '2022-01-01') return;
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

        saveScrapedPage(t.domain, snap.originalUrl, detectedDate, dateMethod, fetched.html, paragraphs);

        let added = 0;
        paragraphs.forEach(p => {
          if (!isContactLensOrHealthRelevant(p.text)) return;
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenHashes.has(norm)) return;
          seenHashes.add(norm);

          allParagraphs.push({
            domain: t.domain,
            source_url: snap.originalUrl,
            publish_date: detectedDate,
            tier: 'TIER_1_WORKSHOP',
            voice_category: 'WORKSHOP_CLINICAL',
            vertical: 'contact_lens_care',
            text: p.text,
            word_count: p.word_count
          });
          added++;
        });

        if (added > 0) {
          totalPages++;
          console.log(`[CONTACTOLOGÍA ${totalPages}] ${t.domain} (${detectedDate}) => ${added} párrafos especializados.`);
        }
      } catch (e) {}
    });
  }

  const outPath = path.join(STAGING_DIR, 'harvested_contactology_care.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n========================================`);
  console.log(`[FINALIZADO CONTACTOLOGÍA] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
  console.log(`========================================`);
}

run();
