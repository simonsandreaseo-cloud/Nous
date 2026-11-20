const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {
  STAGING_DIR,
  runDomainGrinderShard,
  loadGlobalDedupeState,
  verifyStrictPre2022Date,
  extractGrindedBlocksFromHtml,
  registerIfUnique,
  tagBrickFromRaw,
  saveEvidenceSafe,
  normalizeUrlKey,
  normalizeEsKey,
  writeJsonAtomic,
  writeTextAtomic
} = require('./blog_grinder_core.cjs');

const SHARD_NAME = 'Shard 4 Women Fashion Mags';
const SHARD_PATH = path.join(STAGING_DIR, 'shard_4_women_mags.json');
const REPORT_PATH = path.join(STAGING_DIR, 'shard_4_report.md');

const DOMAINS = [
  {
    domain: 'vogue.es',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: ['https://www.vogue.es/sitemap-2021-07.xml'],
    cdxPatterns: ['vogue.es/moda/*', 'vogue.es/accesorios/*', 'vogue.es/shopping/*']
  },
  {
    domain: 'elle.com',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['elle.com/es/moda/*']
  },
  {
    domain: 'telva.com',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['telva.com/moda/*']
  },
  {
    domain: 'harpersbazaar.com',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['harpersbazaar.com/es/moda/*']
  },
  {
    domain: 'glamour.es',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: ['https://www.glamour.es/sitemap-2021-07.xml'],
    cdxPatterns: ['glamour.es/moda/*']
  },
  {
    domain: 'cosmopolitan.com',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['cosmopolitan.com/es/moda/*']
  },
  {
    domain: 'instyle.es',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['instyle.es/moda/*']
  },
  {
    domain: 'marie-claire.es',
    mode: 'fashion_magazine',
    wpBases: ['https://www.marie-claire.es'],
    sitemaps: [],
    cdxPatterns: ['marie-claire.es/moda/*']
  },
  {
    domain: 'clara.es',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['clara.es/moda/*']
  },
  {
    domain: 'smoda.elpais.com',
    mode: 'fashion_magazine',
    wpBases: [],
    sitemaps: [],
    cdxPatterns: ['smoda.elpais.com/moda/*']
  }
];

const EYEWEAR_URL_RX = /(?:^|[\/\-_])(?:gafas?|monturas?|lentes?|visagismo|optica|carey|acetato|aviador|cat-?eye|wayfarer|de-sol|solares|eyewear)(?:$|[\/\-_.])/i;
const POST2022_URL_RX = /(202[2-9]|20[3-9]\d)/;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchText(url, timeoutMs = 12000, accept = 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept': accept
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status, text: '' };
    const buf = Buffer.from(await res.arrayBuffer());
    let text;
    if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
      text = zlib.gunzipSync(buf).toString('utf8');
    } else {
      text = buf.toString('utf8');
    }
    return { ok: true, status: res.status, text };
  } catch {
    clearTimeout(timer);
    return { ok: false, status: 0, text: '' };
  }
}

function isCleanEyewearUrl(u) {
  if (!u || POST2022_URL_RX.test(u)) return false;
  if (/\/(en|fr|de|it|pt|ru|nl|pl|ca)\//i.test(u)) return false;
  if (/\.(jpg|jpeg|png|gif|svg|webp|pdf|css|js|xml|ico|mp4|mp3)(\?.*)?$/i.test(u)) return false;
  return EYEWEAR_URL_RX.test(u.toLowerCase());
}

function extractSitemapUrlsWithOptionalLastmod(xml) {
  const results = [];
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi);
  if (urlBlocks && urlBlocks.length) {
    for (const blk of urlBlocks) {
      const locM = blk.match(/<loc>(.*?)<\/loc>/i);
      if (!locM) continue;
      const loc = locM[1].trim();
      const lmM = blk.match(/<lastmod>(.*?)<\/lastmod>/i);
      const lastmod = lmM ? lmM[1].trim().slice(0, 10) : null;
      results.push({ loc, lastmod });
    }
  } else {
    const locs = xml.match(/<loc>(.*?)<\/loc>/gi) || [];
    for (const m of locs) {
      results.push({ loc: m.replace(/<\/?loc>/gi, '').trim(), lastmod: null });
    }
  }
  return results;
}

function processPageHtml(html, { domain, url, fallbackTs, dedupe, domBlocks, maxBlocksPerDomain, stats, channel }) {
  const dateInfo = verifyStrictPre2022Date(html, url, fallbackTs);
  if (!dateInfo || dateInfo.date >= '2022-01-01' || dateInfo.date < '2004-01-01') return 0;

  const extracted = extractGrindedBlocksFromHtml(html, {
    domain,
    source_url: url,
    publish_date: dateInfo.date,
    date_verification_method: dateInfo.method,
    mode: 'fashion_magazine',
    excludeClinical: true
  });

  let accepted = 0;
  for (const blk of extracted) {
    if (domBlocks.length >= maxBlocksPerDomain) break;
    if (registerIfUnique(blk, dedupe)) {
      const tagged = tagBrickFromRaw(blk);
      if (tagged) {
        domBlocks.push(tagged);
        accepted++;
      }
    }
  }
  if (accepted > 0) {
    dedupe.seenUrls.add(normalizeUrlKey(url));
    saveEvidenceSafe(domain, url, dateInfo.date, dateInfo.method, html, {
      channel,
      blocks_extracted: accepted
    });
    stats.pagesSaved++;
    stats[channel] = (stats[channel] || 0) + accepted;
  }
  return accepted;
}

async function harvestMonthlySitemaps(domain, baseUrl, dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs) {
  const months = [];
  for (let y = 2021; y >= 2014; y--) {
    for (let m = 12; m >= 1; m--) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  }

  const candidateUrls = [];
  const localSeen = new Set();

  // Fetch monthly sitemaps in batches of 4
  for (let i = 0; i < months.length; i += 4) {
    if (Date.now() > deadlineMs || candidateUrls.length >= 260) break;
    const batch = months.slice(i, i + 4);
    const resList = await Promise.all(
      batch.map(ym => fetchText(`${baseUrl}/sitemap-${ym}.xml`, 8000, 'application/xml,text/xml'))
    );
    for (const r of resList) {
      if (!r.ok || !r.text.includes('<loc>')) continue;
      const entries = extractSitemapUrlsWithOptionalLastmod(r.text);
      for (const e of entries) {
        if (!isCleanEyewearUrl(e.loc)) continue;
        const nk = normalizeUrlKey(e.loc);
        if (!nk || dedupe.seenUrls.has(nk) || localSeen.has(nk)) continue;
        localSeen.add(nk);
        candidateUrls.push(e.loc);
      }
    }
    await sleep(60);
  }

  for (const url of candidateUrls) {
    if (Date.now() > deadlineMs || domBlocks.length >= maxBlocksPerDomain) break;
    const r = await fetchText(url, 8500);
    if (!r.ok || !r.text) continue;
    processPageHtml(r.text, {
      domain,
      url,
      fallbackTs: null,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      channel: 'sitemap'
    });
    await sleep(70);
  }
}

async function harvestHearstGzipSitemaps(domain, sitemapUrls, pathFilterRx, dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs) {
  const candidateUrls = [];
  const localSeen = new Set();

  for (const smUrl of sitemapUrls) {
    if (Date.now() > deadlineMs) break;
    const r = await fetchText(smUrl, 14000, '*/*');
    if (!r.ok || !r.text || r.text.includes('_fs-ch-')) continue;
    if (!r.text.includes('<loc>')) continue;
    const entries = extractSitemapUrlsWithOptionalLastmod(r.text);
    const isArchivePre2019 = /201[78]/.test(smUrl);
    for (const e of entries) {
      if (!pathFilterRx.test(e.loc)) continue;
      if (!isCleanEyewearUrl(e.loc)) continue;
      if (!isArchivePre2019 && e.lastmod && e.lastmod >= '2022-01-01') continue;
      const nk = normalizeUrlKey(e.loc);
      if (!nk || dedupe.seenUrls.has(nk) || localSeen.has(nk)) continue;
      localSeen.add(nk);
      candidateUrls.push(e.loc);
    }
  }

  for (const url of candidateUrls.slice(0, 120)) {
    if (Date.now() > deadlineMs || domBlocks.length >= maxBlocksPerDomain) break;
    const r = await fetchText(url, 9000);
    if (!r.ok || !r.text || r.text.includes('_fs-ch-')) {
      if (r.text && r.text.includes('_fs-ch-')) break; // Stop immediately if bot challenge appears
      continue;
    }
    processPageHtml(r.text, {
      domain,
      url,
      fallbackTs: null,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      channel: 'sitemap'
    });
    await sleep(800);
  }
}

async function harvestMarieClaireWpSearch(dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs) {
  const domain = 'marie-claire.es';
  const terms = [
    { q: 'gafas', maxPages: 2 },
    { q: 'lentes', maxPages: 2 },
    { q: 'montura', maxPages: 2 },
    { q: 'visagismo', maxPages: 1 },
    { q: 'carey', maxPages: 2 },
    { q: 'acetato', maxPages: 2 },
    { q: 'aviador', maxPages: 2 },
    { q: 'solares', maxPages: 2 },
    { q: 'complementos', maxPages: 3 },
    { q: 'accesorios', maxPages: 3 },
    { q: 'sol', maxPages: 3 }
  ];
  const seenPosts = new Set();

  for (const { q, maxPages } of terms) {
    for (let pg = 1; pg <= maxPages; pg++) {
      if (Date.now() > deadlineMs || domBlocks.length >= maxBlocksPerDomain) break;
      const apiUrl = `https://www.marie-claire.es/wp-json/wp/v2/posts?before=2022-01-01T00:00:00&per_page=100&page=${pg}&search=${encodeURIComponent(q)}&_fields=link,date,date_gmt,title,content`;
      const r = await fetchText(apiUrl, 12000, 'application/json');
      if (!r.ok || !r.text.trim().startsWith('[')) break;
      let posts;
      try { posts = JSON.parse(r.text); } catch { break; }
      if (!Array.isArray(posts) || !posts.length) break;

      for (const p of posts) {
        if (domBlocks.length >= maxBlocksPerDomain) break;
        if (!p || !p.content?.rendered || !p.link) continue;
        const rawDate = String(p.date_gmt || p.date || '').slice(0, 10);
        if (!rawDate || rawDate >= '2022-01-01' || rawDate < '2004-01-01') continue;
        const nk = normalizeUrlKey(p.link);
        if (!nk || dedupe.seenUrls.has(nk) || seenPosts.has(nk)) continue;
        seenPosts.add(nk);

        const syntheticHtml = `<!doctype html><html><head><meta property="article:published_time" content="${rawDate}T12:00:00Z"><title>${p.title?.rendered || ''}</title></head><body><article><h1>${p.title?.rendered || ''}</h1>${p.content.rendered}</article></body></html>`;
        const extracted = extractGrindedBlocksFromHtml(syntheticHtml, {
          domain,
          source_url: p.link,
          publish_date: rawDate,
          date_verification_method: 'wordpress_rest_api_date_gmt',
          mode: 'fashion_magazine',
          excludeClinical: true
        });
        let accepted = 0;
        for (const blk of extracted) {
          if (domBlocks.length >= maxBlocksPerDomain) break;
          if (registerIfUnique(blk, dedupe)) {
            const tagged = tagBrickFromRaw(blk);
            if (tagged) {
              domBlocks.push(tagged);
              accepted++;
            }
          }
        }
        if (accepted > 0) {
          dedupe.seenUrls.add(nk);
          saveEvidenceSafe(domain, p.link, rawDate, 'wordpress_rest_api_date_gmt', syntheticHtml, {
            channel: 'wp_search',
            blocks_extracted: accepted
          });
          stats.pagesSaved++;
          stats.wp += accepted;
        }
      }
      await sleep(150);
    }
  }
}

async function harvestWaybackNoCollapse(domain, patterns, dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs) {
  const snaps = [];
  const seenUrlKeys = new Set();
  const filterRx = '.*gafas.*';

  for (const pat of patterns) {
    if (Date.now() > deadlineMs) break;
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(pat)}&output=json&fl=timestamp,original&filter=statuscode:200&filter=mimetype:text/html&to=20211231235959&limit=120&filter=${encodeURIComponent('original:' + filterRx)}`;
    let r = await fetchText(cdxUrl, 22000, 'application/json');
    if (r.status === 503 || r.status === 429) {
      await sleep(3000);
      r = await fetchText(cdxUrl, 22000, 'application/json');
    }
    if (!r.ok || !r.text || r.text.trim().startsWith('<')) continue;
    try {
      const rows = JSON.parse(r.text);
      for (let i = 1; i < rows.length; i++) {
        const [ts, orig] = rows[i];
        if (!ts || !orig || ts > '20211231235959') continue;
        if (POST2022_URL_RX.test(orig)) continue;
        const nk = normalizeUrlKey(orig);
        if (!nk || dedupe.seenUrls.has(nk) || seenUrlKeys.has(nk)) continue;
        seenUrlKeys.add(nk);
        snaps.push({
          timestamp: ts,
          originalUrl: orig,
          waybackUrl: `https://web.archive.org/web/${ts}id_/${orig}`
        });
      }
    } catch {}
    await sleep(400);
  }

  for (const s of snaps.slice(0, 60)) {
    if (Date.now() > deadlineMs || domBlocks.length >= maxBlocksPerDomain) break;
    let r = await fetchText(s.waybackUrl, 12000);
    if (!r.ok || !r.text || /Internet Archive:\s*Temporarily Offline/i.test(r.text)) {
      await sleep(350);
      continue;
    }
    processPageHtml(r.text, {
      domain,
      url: s.originalUrl,
      fallbackTs: s.timestamp,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      channel: 'wayback'
    });
    await sleep(350);
  }
}

async function main() {
  const tStart = Date.now();
  const totalBudgetMs = 6 * 60 * 1000;
  const deadlineMs = tStart + totalBudgetMs;
  const maxBlocksPerDomain = 300;
  const maxTotalBlocks = 2400;

  // Preserve any blocks already harvested in SHARD_PATH prior to this run
  let preservedBlocks = [];
  if (fs.existsSync(SHARD_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(SHARD_PATH, 'utf8'));
      if (Array.isArray(parsed)) preservedBlocks = parsed;
    } catch {}
  }

  // Step 1: Invoke runDomainGrinderShard as required
  const shard1Res = await runDomainGrinderShard({
    shardName: SHARD_NAME,
    shardPath: SHARD_PATH,
    reportPath: REPORT_PATH,
    domains: DOMAINS,
    timeBudgetMs: 18 * 1000,
    maxBlocksPerDomain,
    maxTotalBlocks,
    maxWpPages: 5,
    maxSitemapUrls: 80,
    maxWaybackSnaps: 60
  });

  let run1Blocks = [];
  if (fs.existsSync(SHARD_PATH)) {
    try {
      run1Blocks = JSON.parse(fs.readFileSync(SHARD_PATH, 'utf8'));
    } catch {}
  }

  // Step 2: Merge preserved + run1Blocks with global dedupe
  const dedupe = loadGlobalDedupeState();
  const byDomainMap = new Map();
  const shard1ByDom = new Map((shard1Res.summaryRows || []).map(r => [r.domain, r]));

  for (const cfg of DOMAINS) {
    const prev = shard1ByDom.get(cfg.domain);
    byDomainMap.set(cfg.domain, {
      blocks: [],
      stats: {
        domain: cfg.domain,
        wp: prev ? prev.wp : 0,
        shopify: prev ? prev.shopify : 0,
        sitemap: prev ? prev.sitemap : 0,
        wayback: prev ? prev.wayback : 0,
        total: 0,
        pagesSaved: prev ? prev.pagesSaved : 0,
        elapsedSec: '0.0'
      }
    });
  }

  const seenShardEs = new Set();
  for (const b of [...preservedBlocks, ...run1Blocks]) {
    if (!b || !b.raw_text || !b.source_domain) continue;
    const k = normalizeEsKey(b.raw_text);
    if (!k || seenShardEs.has(k)) continue;
    seenShardEs.add(k);
    dedupe.seenEs.add(k);
    if (b.original_id) dedupe.seenUrls.add(normalizeUrlKey(b.original_id));
    const entry = byDomainMap.get(b.source_domain);
    if (entry && entry.blocks.length < maxBlocksPerDomain) {
      entry.blocks.push(b);
    }
  }

  // Account for preserved blocks in channel stats if not already in shard1
  for (const cfg of DOMAINS) {
    const entry = byDomainMap.get(cfg.domain);
    const accounted = entry.stats.wp + entry.stats.shopify + entry.stats.sitemap + entry.stats.wayback;
    if (entry.blocks.length > accounted) {
      const diff = entry.blocks.length - accounted;
      if (cfg.domain === 'marie-claire.es') entry.stats.wp += diff;
      else entry.stats.sitemap += diff;
    }
  }

  const runCustomDomain = async (domain, fn) => {
    const currentTotal = [...byDomainMap.values()].reduce((acc, x) => acc + x.blocks.length, 0);
    if (Date.now() > deadlineMs || currentTotal >= maxTotalBlocks) return;
    const entry = byDomainMap.get(domain);
    if (entry.blocks.length >= maxBlocksPerDomain) return;
    const dStart = Date.now();
    await fn(entry.blocks, entry.stats);
    entry.stats.total = entry.blocks.length;
    entry.stats.elapsedSec = ((Date.now() - dStart) / 1000).toFixed(1);
    const combined = [];
    for (const cfg of DOMAINS) {
      combined.push(...byDomainMap.get(cfg.domain).blocks);
    }
    writeJsonAtomic(SHARD_PATH, combined.slice(0, maxTotalBlocks));
    console.log(`[${SHARD_NAME}][DEEP] ${domain}: total=${entry.blocks.length} (+${entry.stats.pagesSaved} págs) [WP=${entry.stats.wp}, SM=${entry.stats.sitemap}, WB=${entry.stats.wayback}] (${entry.stats.elapsedSec}s)`);
  };

  await runCustomDomain('glamour.es', async (domBlocks, stats) => {
    await harvestMonthlySitemaps('glamour.es', 'https://www.glamour.es', dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('vogue.es', async (domBlocks, stats) => {
    await harvestMonthlySitemaps('vogue.es', 'https://www.vogue.es', dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('marie-claire.es', async (domBlocks, stats) => {
    await harvestMarieClaireWpSearch(dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('instyle.es', async (domBlocks, stats) => {
    await harvestWaybackNoCollapse('instyle.es', ['instyle.es/moda/*'], dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('telva.com', async (domBlocks, stats) => {
    await harvestWaybackNoCollapse('telva.com', ['telva.com/moda/*'], dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('elle.com', async (domBlocks, stats) => {
    await harvestHearstGzipSitemaps(
      'elle.com',
      [
        'https://www.elle.com/es/sitemaps/content.2018-01-19T12:57:18.xml.gz',
        'https://www.elle.com/es/sitemaps/content.2022-03-04T11:48:36.xml.gz'
      ],
      /\/es\/moda\//i,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      deadlineMs
    );
  });

  await runCustomDomain('harpersbazaar.com', async (domBlocks, stats) => {
    await harvestHearstGzipSitemaps(
      'harpersbazaar.com',
      [
        'https://www.harpersbazaar.com/es/sitemaps/content.2017-12-04T18:10:35.xml.gz',
        'https://www.harpersbazaar.com/es/sitemaps/content.2026-07-29T06:29:51.xml.gz'
      ],
      /\/es\/moda\//i,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      deadlineMs
    );
  });

  await runCustomDomain('cosmopolitan.com', async (domBlocks, stats) => {
    await harvestHearstGzipSitemaps(
      'cosmopolitan.com',
      [
        'https://www.cosmopolitan.com/es/sitemaps/content.2017-08-30T00:36:55.xml.gz',
        'https://www.cosmopolitan.com/es/sitemaps/content.2026-08-10T13:00:06.xml.gz'
      ],
      /\/es\/moda\//i,
      dedupe,
      domBlocks,
      maxBlocksPerDomain,
      stats,
      deadlineMs
    );
  });

  await runCustomDomain('clara.es', async (domBlocks, stats) => {
    await harvestWaybackNoCollapse('clara.es', ['clara.es/moda/*'], dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  await runCustomDomain('smoda.elpais.com', async (domBlocks, stats) => {
    await harvestWaybackNoCollapse('smoda.elpais.com', ['smoda.elpais.com/moda/*'], dedupe, domBlocks, maxBlocksPerDomain, stats, deadlineMs);
  });

  const finalBlocks = [];
  const summaryRows = [];
  for (const cfg of DOMAINS) {
    const entry = byDomainMap.get(cfg.domain);
    for (const b of entry.blocks) {
      if (finalBlocks.length >= maxTotalBlocks) break;
      finalBlocks.push(b);
    }
    entry.stats.total = entry.blocks.length;
    summaryRows.push(entry.stats);
  }

  writeJsonAtomic(SHARD_PATH, finalBlocks);

  const byFrame = {};
  const byTag = {};
  for (const b of finalBlocks) {
    byFrame[b.frame] = (byFrame[b.frame] || 0) + 1;
    for (const tg of b.topic_tags || []) byTag[tg] = (byTag[tg] || 0) + 1;
  }

  const md = [
    `# Reporte ${SHARD_NAME}`,
    `**Fecha:** ${new Date().toISOString()} | **Duración:** ${((Date.now() - tStart) / 1000).toFixed(1)}s`,
    `**Total bloques extraídos y etiquetados:** ${finalBlocks.length}`,
    '',
    '## Desglose por Dominio',
    '| Dominio | Total Bloques | Págs Evidencia | WP API | Shopify | Sitemaps | Wayback | Tiempo |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |',
    ...summaryRows.map(r => `| ${r.domain} | ${r.total} | ${r.pagesSaved} | ${r.wp} | ${r.shopify} | ${r.sitemap} | ${r.wayback} | ${r.elapsedSec}s |`),
    '',
    '## Distribución por Marco FrameNet',
    ...Object.entries(byFrame).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- **${k}:** ${v}`),
    '',
    '## Top Etiquetas Temáticas (`topic_tags`)',
    ...Object.entries(byTag).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `- \`${k}\`: ${v}`)
  ].join('\n');

  writeTextAtomic(REPORT_PATH, md);
  console.log(`SHARD_4_FINAL_DONE`, JSON.stringify({ total: finalBlocks.length, byFrame, summaryRows }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
