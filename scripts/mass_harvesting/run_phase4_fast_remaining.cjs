/**
 * Phase 4 Fast Per-Domain Live-Channel Sweep (WP REST API + Shopify JSON + Live Sitemaps)
 * Ensures every domain from Shards 1-5 that was skipped when domain #1 consumed the Wayback timer
 * gets a strict 9-second per-domain live-channel pass (< 2022-01-01).
 */
const path = require('path');
const { runDomainGrinderShard, STAGING_DIR } = require('./blog_grinder_core.cjs');

const REMAINING_DOMAINS = [
  { domain: 'federopticos.com', mode: 'optical', wpEndpoints: ['https://www.federopticos.com/wp-json/wp/v2/posts'] },
  { domain: 'soloptical.net', mode: 'optical', wpEndpoints: ['https://www.soloptical.net/blog/wp-json/wp/v2/posts', 'https://www.soloptical.net/wp-json/wp/v2/posts'] },
  { domain: 'cuidatuvista.com', mode: 'optical', wpEndpoints: ['https://cuidatuvista.com/wp-json/wp/v2/posts'] },
  { domain: 'opticasflorida.com', mode: 'optical', wpEndpoints: ['https://www.opticasflorida.com/wp-json/wp/v2/posts'] },
  { domain: 'opticafernandezbaca.com', mode: 'optical', wpEndpoints: ['https://opticafernandezbaca.com/wp-json/wp/v2/posts'] },
  { domain: 'ricardovillalba.es', mode: 'optical', wpEndpoints: ['https://www.ricardovillalba.es/wp-json/wp/v2/posts'] },
  { domain: 'theindianface.com', mode: 'optical', shopifyHandles: ['news', 'blog', 'noticias'] },
  { domain: 'tiwi.es', mode: 'optical', shopifyHandles: ['news', 'blog', 'journal'] },
  { domain: 'pjlobster.com', mode: 'optical', shopifyHandles: ['journal', 'news', 'blog'] },
  { domain: 'gafasvintage.com', mode: 'optical', wpEndpoints: ['https://gafasvintage.com/wp-json/wp/v2/posts'] },
  { domain: 'afflelou.es', mode: 'optical', wpEndpoints: ['https://www.afflelou.es/blog/wp-json/wp/v2/posts'] },
  { domain: 'multiopticas.com', mode: 'optical', wpEndpoints: ['https://www.multiopticas.com/blog/wp-json/wp/v2/posts'] },
  { domain: 'generaloptica.es', mode: 'optical', sitemaps: ['https://www.generaloptica.es/sitemap.xml'] },
  { domain: 'cottet.com', mode: 'optical', shopifyHandles: ['news', 'blog', 'noticias'] },
  { domain: 'masvision.es', mode: 'optical', sitemaps: ['https://www.masvision.es/sitemap.xml'] }
];

(async () => {
  await runDomainGrinderShard({
    shardName: 'Phase 4 Fast Live-Channel Sweep',
    shardPath: path.join(STAGING_DIR, 'shard_4_womens_fashion_mags.json'),
    reportPath: path.join(STAGING_DIR, 'report_shard_4.md'),
    domains: REMAINING_DOMAINS,
    timeBudgetMs: 110 * 1000,
    perDomainBudgetMs: 8500,
    maxBlocksPerDomain: 250,
    maxTotalBlocks: 1500,
    maxWpPages: 6,
    maxSitemapUrls: 30,
    maxWaybackSnaps: 0
  });
})();
