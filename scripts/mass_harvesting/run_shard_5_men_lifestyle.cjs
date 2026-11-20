const path = require('path');
const {
  STAGING_DIR,
  runDomainGrinderShard
} = require('./blog_grinder_core.cjs');

const DOMAINS = [
  {
    domain: 'revistagq.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.revistagq.com/moda', 'https://www.revistagq.com', 'https://revistagq.com/moda'],
    cdxPatterns: ['revistagq.com/moda/*', 'www.revistagq.com/moda/*']
  },
  {
    domain: 'esquire.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.esquire.com/es/moda-hombre', 'https://www.esquire.com/es'],
    cdxPatterns: ['esquire.com/es/moda-hombre/*', 'www.esquire.com/es/moda-hombre/*']
  },
  {
    domain: 'trendencias.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.trendencias.com/complementos', 'https://www.trendencias.com/moda', 'https://www.trendencias.com'],
    cdxPatterns: [
      'trendencias.com/complementos/*',
      'trendencias.com/moda/*',
      'trendencias.com/tendencias/*',
      'trendencias.com/*'
    ]
  },
  {
    domain: 'trendenciashombre.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.trendenciashombre.com/complementos', 'https://www.trendenciashombre.com/estilo', 'https://www.trendenciashombre.com'],
    cdxPatterns: [
      'trendenciashombre.com/complementos/*',
      'trendenciashombre.com/estilo/*',
      'trendenciashombre.com/moda-hombre/*',
      'trendenciashombre.com/*'
    ]
  },
  {
    domain: 'lookiero.es',
    mode: 'fashion_magazine',
    wpBases: ['https://lookiero.es/blog', 'https://www.lookiero.es/blog'],
    cdxPatterns: ['lookiero.es/blog/*', 'www.lookiero.es/blog/*']
  },
  {
    domain: 'mujerhoy.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.mujerhoy.com/moda', 'https://www.mujerhoy.com'],
    cdxPatterns: ['mujerhoy.com/moda/*', 'www.mujerhoy.com/moda/*']
  },
  {
    domain: 'hola.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.hola.com/moda', 'https://www.hola.com'],
    cdxPatterns: ['hola.com/moda/*', 'www.hola.com/moda/*']
  },
  {
    domain: 'okchicas.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.okchicas.com/moda', 'https://okchicas.com/moda', 'https://www.okchicas.com'],
    cdxPatterns: ['okchicas.com/moda/*', 'www.okchicas.com/moda/*']
  },
  {
    domain: 'diariofemenino.com',
    mode: 'fashion_magazine',
    wpBases: ['https://www.diariofemenino.com/moda', 'https://diariofemenino.com/moda', 'https://www.diariofemenino.com'],
    cdxPatterns: ['diariofemenino.com/moda/*', 'www.diariofemenino.com/moda/*']
  }
];

async function main() {
  const result = await runDomainGrinderShard({
    shardName: 'Shard 5 Men & Lifestyle Mags',
    shardPath: path.join(STAGING_DIR, 'shard_5_men_lifestyle.json'),
    reportPath: path.join(STAGING_DIR, 'shard_5_report.md'),
    domains: DOMAINS,
    timeBudgetMs: 6 * 60 * 1000,
    maxBlocksPerDomain: 300,
    maxTotalBlocks: 2400,
    maxWpPages: 6,
    maxSitemapUrls: 80,
    maxWaybackSnaps: 60
  });

  console.log('\n=== RESUMEN FINAL SHARD 5 ===');
  console.log(JSON.stringify({
    total: result.total,
    summaryRows: result.summaryRows,
    byFrame: result.byFrame
  }, null, 2));
}

main().catch(err => {
  console.error('Error fatal en Shard 5:', err);
  process.exit(1);
});
