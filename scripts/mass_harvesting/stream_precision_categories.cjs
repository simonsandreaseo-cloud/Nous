const fs = require('fs');
const path = require('path');
const { queryWaybackCDX, fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

const TARGETS = [
  { pattern: 'zeiss.es/vision-care/mejor-vision/*', limit: 120, domain: 'zeiss.es', tier: 'TIER_1_WORKSHOP', vertical: 'lens_technology' },
  { pattern: 'oftalvist.es/blog/*', limit: 120, domain: 'oftalvist.es', tier: 'TIER_1_WORKSHOP', vertical: 'clinical_diagnostics' },
  { pattern: 'trendencias.com/tendencias/*', limit: 100, domain: 'trendencias.com', tier: 'TIER_2_EDITORIAL', vertical: 'fashion_aesthetics' }
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

// Filter to keep paragraphs that touch on our new precision categories
function isPrecisionTarget(text, vertical) {
  if (vertical === 'lens_technology') {
    return /\b(progresiv[oa]s?|monofocal(?:es)?|bifocal(?:es)?|ocupacional(?:es)?|asf[eé]ric[oa]|freeform|antirreflejante|antirreflejo|luz azul|blue|fotocrom[aá]tic[oa]|transitions|duravision|drivesafe|curvatura|graduaci[oó]n|campo visual|dioptr[ií]as?)\b/i.test(text);
  }
  if (vertical === 'clinical_diagnostics') {
    return /\b(oct|l[aá]mpara de hendidura|ton[oó]metro|presi[oó]n intraocular|topograf[ií]a|fondo de ojo|colirio|l[aá]grimas? artificiales|visi[oó]n borrosa|fotofobia|halos|sequedad|ojo seco|cicloplej[ií]a|facoemulsificaci[oó]n|retina|c[oó]rnea|cristalino)\b/i.test(text);
  }
  if (vertical === 'fashion_aesthetics') {
    return /\b(gafas?|monturas?|minimalis|brutalis|retro|vintage|futuris|cyberpunk|y2k|setenter|ochenter|noventer|cat-?eye|ojo de gato|aviador|pantos|mariposa|al aire|streetwear|sastrer[ií]a|rostro|estilo|vanguardia)\b/i.test(text);
  }
  return true;
}

async function run() {
  console.log('=== HARVEST STREAM PRECISION CATEGORIES PRE-2022 ===');
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
        let fetched = await fetchUrl(snap.waybackUrl, 9000);
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
          if (!isPrecisionTarget(p.text, t.vertical)) return;
          const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
          if (seenHashes.has(norm)) return;
          seenHashes.add(norm);

          allParagraphs.push({
            domain: t.domain,
            source_url: snap.originalUrl,
            publish_date: detectedDate,
            tier: t.tier,
            voice_category: t.tier === 'TIER_1_WORKSHOP' ? 'WORKSHOP_CLINICAL' : 'EDITORIAL_LIFESTYLE',
            vertical: t.vertical,
            text: p.text,
            word_count: p.word_count
          });
          added++;
        });

        if (added > 0) {
          totalPages++;
          console.log(`[PRECISIÓN ${totalPages}] ${t.domain} (${detectedDate}) => ${added} párrafos especializados.`);
        }
      } catch (e) {}
    });
  }

  const outPath = path.join(STAGING_DIR, 'harvested_precision_categories.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`\n========================================`);
  console.log(`[FINALIZADO PRECISIÓN] Guardados ${allParagraphs.length} párrafos de ${totalPages} páginas en ${outPath}`);
  console.log(`========================================`);
}

run();
