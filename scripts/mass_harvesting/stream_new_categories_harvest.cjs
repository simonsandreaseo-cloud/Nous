const fs = require('fs');
const path = require('path');
const { fetchUrl, detectPublishDate, cleanAndExtractParagraphs, saveScrapedPage, runConcurrent, STAGING_DIR } = require('./harvest_core.cjs');

// Specialized keyword filters for new categories
const PRECISION_REGEX = {
  fashion_aesthetics: /\b(gafas?|monturas?|estilo|tendencia|minimalis|brutalis|retro|vintage|retrofuturis|cyberpunk|y2k|setenter|ochenter|noventer|sesenter|vanguardia|avant-?garde|cat-?eye|ojo de gato|aviador|aviator|pantos|mariposa|al aire|rimless|cuadradas|redondas|ovaladas|hexagonales|oversize|streetwear|sastrer[ií]a|traje|carey|acetato|titanio)\b/i,
  clinical_diagnostics: /\b(oct|tomograf[ií]a de coherencia|l[aá]mpara de hendidura|ton[oó]metro|presi[oó]n intraocular|retinograf[ií]a|retin[oó]grafo|topograf[ií]a|autorrefract[oó]metro|campimetr[ií]a|paquimetr[ií]a|biometr[ií]a|fondo de ojo|colirio|l[aá]grimas? artificiales|[aá]cido hialur[oó]nico|gotas|visi[oó]n borrosa|diplop[ií]a|fotofobia|halos|deslumbramiento|fatiga visual|sequedad|ojo seco|cicloplej[ií]a|progresiv[oa]s?|monofocal(?:es)?|bifocal(?:es)?|asf[eé]ric[oa]|antirreflejante|antirreflejo|fotocrom[aá]tic[oa]|polarizad[oa])\b/i
};

async function getCondenastUrls() {
  const urls = [];
  const years = ['2017', '2018', '2019', '2020', '2021'];
  const months = ['03', '04', '05', '06', '07', '08', '09', '10'];

  console.log('--- Buscando artículos de gafas en revistas de moda pre-2022 (GQ y Vogue España) ---');

  for (const y of years) {
    for (const m of months) {
      // GQ
      const gqUrl = `https://www.revistagq.com/sitemap-${y}-${m}.xml`;
      const resGQ = await fetchUrl(gqUrl, 4000);
      if (resGQ && resGQ.html) {
        const matches = (resGQ.html.match(/<loc>(.*?)<\/loc>/g) || [])
          .map(x => x.replace(/<\/?loc>/g, '').trim())
          .filter(u => /gafas|lentes-de-sol|eyewear|sunglasses|persol|ray-ban/i.test(u));
        for (const u of matches) {
          urls.push({ url: u, domain: 'revistagq.com', tier: 'TIER_2_EDITORIAL', vertical: 'fashion_aesthetics' });
        }
      }

      // Vogue
      const vogueUrl = `https://www.vogue.es/sitemap-${y}-${m}.xml`;
      const resVogue = await fetchUrl(vogueUrl, 4000);
      if (resVogue && resVogue.html) {
        const matches = (resVogue.html.match(/<loc>(.*?)<\/loc>/g) || [])
          .map(x => x.replace(/<\/?loc>/g, '').trim())
          .filter(u => /gafas|lentes-de-sol|eyewear|sunglasses|persol|ray-ban/i.test(u));
        for (const u of matches) {
          urls.push({ url: u, domain: 'vogue.es', tier: 'TIER_2_EDITORIAL', vertical: 'fashion_aesthetics' });
        }
      }
    }
  }

  console.log(`Total URLs de moda/gafas localizadas en GQ y Vogue: ${urls.length}`);
  return urls;
}

async function getClinicalUrls() {
  const urls = [];
  console.log('--- Buscando artículos clínicos y diagnósticos en sitemaps (Fernández-Vega e ICR) ---');

  // Fernandez-Vega
  const fvRes = await fetchUrl('https://fernandez-vega.com/post-sitemap.xml', 8000);
  if (fvRes && fvRes.html) {
    const fvMatches = (fvRes.html.match(/<loc>(.*?)<\/loc>/g) || [])
      .map(x => x.replace(/<\/?loc>/g, '').trim())
      .filter(u => !u.endsWith('/post-sitemap.xml'));
    console.log(`Fernández-Vega URLs en sitemap: ${fvMatches.length}`);
    for (const u of fvMatches) {
      urls.push({ url: u, domain: 'fernandez-vega.com', tier: 'TIER_1_WORKSHOP', vertical: 'clinical_diagnostics' });
    }
  }

  // ICR
  const icrRes = await fetchUrl('https://www.icrcat.com/post-sitemap.xml', 8000);
  if (icrRes && icrRes.html) {
    const icrMatches = (icrRes.html.match(/<loc>(.*?)<\/loc>/g) || [])
      .map(x => x.replace(/<\/?loc>/g, '').trim())
      .filter(u => !u.includes('/de/') && !u.includes('/en/') && !u.includes('/ru/'));
    console.log(`ICR URLs en español: ${icrMatches.length}`);
    for (const u of icrMatches) {
      urls.push({ url: u, domain: 'icrcat.com', tier: 'TIER_1_WORKSHOP', vertical: 'clinical_diagnostics' });
    }
  }

  return urls;
}

async function run() {
  console.log('=== HARVEST WORKER: TARGETED PRECISION EXPANSION PRE-2022 ===');
  const fashionUrls = await getCondenastUrls();
  const clinicalUrls = await getClinicalUrls();
  const allTargets = [...fashionUrls, ...clinicalUrls];

  console.log(`\nTotal URLs combinadas para auditar y extraer: ${allTargets.length}`);

  const allParagraphs = [];
  const seenHashes = new Set();
  let validPages = 0;
  let skippedPost2021 = 0;

  await runConcurrent(allTargets, 8, async (target) => {
    try {
      const fetched = await fetchUrl(target.url, 7000);
      if (!fetched || !fetched.html) return;

      const pubDate = detectPublishDate(fetched.html, target.url);
      if (!pubDate || !pubDate.date) return;
      if (pubDate.date >= '2022-01-01') {
        skippedPost2021++;
        return; // Invariante pre-2022 estricto
      }

      const paragraphs = cleanAndExtractParagraphs(fetched.html);
      if (paragraphs.length < 1) return;

      saveScrapedPage(target.domain, target.url, pubDate.date, pubDate.method, fetched.html, paragraphs);

      const regex = PRECISION_REGEX[target.vertical] || /./;
      let addedThisPage = 0;

      paragraphs.forEach(p => {
        if (!regex.test(p.text)) return;
        const norm = p.text.toLowerCase().replace(/\s+/g, ' ');
        if (seenHashes.has(norm)) return;
        seenHashes.add(norm);

        allParagraphs.push({
          domain: target.domain,
          source_url: target.url,
          publish_date: pubDate.date,
          tier: target.tier,
          voice_category: target.tier === 'TIER_1_WORKSHOP' ? 'WORKSHOP_CLINICAL' : 'EDITORIAL_LIFESTYLE',
          vertical: target.vertical,
          text: p.text,
          word_count: p.word_count
        });
        addedThisPage++;
      });

      if (addedThisPage > 0) {
        validPages++;
        if (validPages % 20 === 0 || addedThisPage >= 5) {
          console.log(`[PÁGINA ${validPages}] ${target.domain} (${pubDate.date}) => +${addedThisPage} párrafos de precisión.`);
        }
      }
    } catch (e) {}
  });

  console.log(`\n=== RESULTADOS HARVEST PRECISIÓN ===`);
  console.log(`Páginas pre-2022 procesadas con éxito: ${validPages}`);
  console.log(`Páginas descartadas por ser posteriores a 2021: ${skippedPost2021}`);
  console.log(`Total párrafos de precisión cosechados: ${allParagraphs.length}`);

  const outPath = path.join(STAGING_DIR, 'harvested_new_categories_expansion.json');
  fs.writeFileSync(outPath, JSON.stringify(allParagraphs, null, 2), 'utf8');
  console.log(`Guardado en: ${outPath}`);
}

run();
