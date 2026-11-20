const path = require('path');
const {
  STAGING_DIR,
  runDomainGrinderShard
} = require('./blog_grinder_core.cjs');

const DOMAIN_NAMES = [
  'opticabassol.com',
  'opticagasset.com',
  'opticasflorida.com',
  'opticafernandezbaca.com',
  'ricardovillalba.es',
  'cuidatuvista.com',
  'costasoloptica.com',
  'opticaalpedrete.es',
  'visual-click.com',
  'gafasworld.es',
  'misterspex.es',
  'zeiss.es',
  'optiveropticos.com'
];

const domains = DOMAIN_NAMES.map(domain => ({
  domain,
  mode: 'optical_blog',
  excludeClinical: true,
  shopifyHandles: ['news', 'blog', 'tendencias', 'journal']
}));

async function main() {
  const result = await runDomainGrinderShard({
    shardName: 'Shard 2 Boutique Opticians',
    shardPath: path.join(STAGING_DIR, 'shard_2_boutique_opticians.json'),
    reportPath: path.join(STAGING_DIR, 'shard_2_report.md'),
    domains,
    timeBudgetMs: 6 * 60 * 1000,
    maxBlocksPerDomain: 380,
    maxTotalBlocks: 2800,
    maxWpPages: 8,
    maxSitemapUrls: 100,
    maxWaybackSnaps: 55
  });

  console.log(JSON.stringify({
    total: result.total,
    summaryRows: result.summaryRows,
    byFrame: result.byFrame
  }, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
