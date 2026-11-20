const path = require('path');
const { STAGING_DIR, runDomainGrinderShard } = require('./blog_grinder_core.cjs');

const DOMAINS = [
  {
    domain: 'opticauniversitaria.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.opticauniversitaria.es/blog',
      'https://opticauniversitaria.es/blog',
      'https://www.opticauniversitaria.es',
      'https://opticauniversitaria.es'
    ],
    sitemaps: [
      'https://www.opticauniversitaria.es/blog/post-sitemap.xml',
      'https://www.opticauniversitaria.es/blog/sitemap_index.xml',
      'https://www.opticauniversitaria.es/post-sitemap.xml',
      'https://www.opticauniversitaria.es/sitemap_index.xml',
      'https://opticauniversitaria.es/sitemap_index.xml'
    ],
    cdxPatterns: [
      'opticauniversitaria.es/blog/*',
      'www.opticauniversitaria.es/blog/*',
      'opticauniversitaria.es/tendencias/*',
      'opticauniversitaria.es/consejos/*',
      'opticauniversitaria.es/*'
    ]
  },
  {
    domain: 'generaloptica.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.generaloptica.es/blog',
      'https://www.generaloptica.es/es/blog',
      'https://generaloptica.es/blog',
      'https://www.generaloptica.es',
      'https://generaloptica.es'
    ],
    sitemaps: [
      'https://www.generaloptica.es/blog/post-sitemap.xml',
      'https://www.generaloptica.es/blog/sitemap_index.xml',
      'https://www.generaloptica.es/post-sitemap.xml',
      'https://www.generaloptica.es/sitemap_index.xml',
      'https://www.generaloptica.es/sitemap.xml'
    ],
    cdxPatterns: [
      'generaloptica.es/blog/*',
      'www.generaloptica.es/blog/*',
      'generaloptica.es/es/blog/*',
      'generaloptica.es/tendencias/*',
      'generaloptica.es/consejos/*',
      'generaloptica.es/*'
    ]
  },
  {
    domain: 'multiopticas.com',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.multiopticas.com/blog',
      'https://multiopticas.com/blog',
      'https://www.multiopticas.com/salud-visual',
      'https://www.multiopticas.com',
      'https://multiopticas.com'
    ],
    sitemaps: [
      'https://www.multiopticas.com/blog/post-sitemap.xml',
      'https://www.multiopticas.com/post-sitemap.xml',
      'https://www.multiopticas.com/sitemap_index.xml',
      'https://www.multiopticas.com/sitemap.xml',
      'https://multiopticas.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'multiopticas.com/salud-visual/*',
      'multiopticas.com/consejos/*',
      'multiopticas.com/blog/*',
      'www.multiopticas.com/blog/*',
      'multiopticas.com/tendencias/*',
      'multiopticas.com/*'
    ]
  },
  {
    domain: 'afflelou.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.afflelou.es/blog',
      'https://afflelou.es/blog',
      'https://www.afflelou.es/comunicacion/blog',
      'https://www.afflelou.es',
      'https://afflelou.es'
    ],
    sitemaps: [
      'https://www.afflelou.es/blog/post-sitemap.xml',
      'https://www.afflelou.es/post-sitemap.xml',
      'https://www.afflelou.es/sitemap_index.xml',
      'https://www.afflelou.es/sitemap.xml',
      'https://afflelou.es/sitemap.xml'
    ],
    cdxPatterns: [
      'afflelou.es/blog/*',
      'www.afflelou.es/blog/*',
      'afflelou.es/comunicacion/blog/*',
      'afflelou.es/tendencias/*',
      'afflelou.es/consejos/*',
      'afflelou.es/*'
    ]
  },
  {
    domain: 'alainafflelou.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.alainafflelou.es/blog',
      'https://alainafflelou.es/blog',
      'https://www.alainafflelou.es',
      'https://alainafflelou.es'
    ],
    sitemaps: [
      'https://www.alainafflelou.es/blog/post-sitemap.xml',
      'https://www.alainafflelou.es/post-sitemap.xml',
      'https://www.alainafflelou.es/sitemap_index.xml',
      'https://alainafflelou.es/sitemap_index.xml'
    ],
    cdxPatterns: [
      'alainafflelou.es/blog/*',
      'www.alainafflelou.es/blog/*',
      'alainafflelou.es/comunicacion/blog/*',
      'alainafflelou.es/tendencias/*',
      'alainafflelou.es/*'
    ]
  },
  {
    domain: 'federopticos.com',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.federopticos.com/blog',
      'https://federopticos.com/blog',
      'https://www.federopticos.com',
      'https://federopticos.com'
    ],
    sitemaps: [
      'https://www.federopticos.com/post-sitemap.xml',
      'https://federopticos.com/post-sitemap.xml',
      'https://www.federopticos.com/blog/post-sitemap.xml',
      'https://www.federopticos.com/wp-sitemap-posts-post-1.xml',
      'https://www.federopticos.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'federopticos.com/blog/*',
      'federopticos.com/2021/*',
      'federopticos.com/2020/*',
      'federopticos.com/2019/*',
      'federopticos.com/2018/*',
      'federopticos.com/tendencias/*',
      'federopticos.com/*'
    ]
  },
  {
    domain: 'cottet.com',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.cottet.com/es/blog',
      'https://www.cottet.com/blog',
      'https://cottet.com/es/blog',
      'https://www.cottet.com/es',
      'https://www.cottet.com'
    ],
    sitemaps: [
      'https://www.cottet.com/es/blog/post-sitemap.xml',
      'https://www.cottet.com/post-sitemap.xml',
      'https://www.cottet.com/sitemap_index.xml',
      'https://www.cottet.com/sitemap.xml'
    ],
    cdxPatterns: [
      'cottet.com/es/blog/*',
      'www.cottet.com/es/blog/*',
      'cottet.com/blog/*',
      'cottet.com/tendencias/*',
      'cottet.com/*'
    ]
  },
  {
    domain: 'cottet.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.cottet.es/blog',
      'https://cottet.es/blog',
      'https://www.cottet.es',
      'https://cottet.es'
    ],
    sitemaps: [
      'https://www.cottet.es/post-sitemap.xml',
      'https://www.cottet.es/blog/post-sitemap.xml',
      'https://www.cottet.es/sitemap_index.xml',
      'https://cottet.es/sitemap_index.xml'
    ],
    cdxPatterns: [
      'cottet.es/blog/*',
      'www.cottet.es/blog/*',
      'cottet.es/es/blog/*',
      'cottet.es/tendencias/*',
      'cottet.es/*'
    ]
  },
  {
    domain: 'optica2000.com',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.optica2000.com/blog',
      'https://optica2000.com/blog',
      'https://www.optica2000.com/comunicacion/blog',
      'https://www.optica2000.com',
      'https://optica2000.com'
    ],
    sitemaps: [
      'https://www.optica2000.com/blog/post-sitemap.xml',
      'https://www.optica2000.com/post-sitemap.xml',
      'https://www.optica2000.com/wp-sitemap-posts-post-1.xml',
      'https://www.optica2000.com/sitemap_index.xml',
      'https://www.optica2000.com/sitemap.xml'
    ],
    cdxPatterns: [
      'optica2000.com/blog/*',
      'www.optica2000.com/blog/*',
      'optica2000.com/comunicacion/blog/*',
      'optica2000.com/tendencias/*',
      'optica2000.com/noticias/*',
      'optica2000.com/*'
    ]
  },
  {
    domain: 'masvision.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.masvision.es/blog',
      'https://masvision.es/blog',
      'https://www.masvision.es',
      'https://masvision.es'
    ],
    sitemaps: [
      'https://www.masvision.es/blog/post-sitemap.xml',
      'https://www.masvision.es/post-sitemap.xml',
      'https://www.masvision.es/sitemap_index.xml',
      'https://www.masvision.es/sitemap.xml'
    ],
    cdxPatterns: [
      'masvision.es/blog/*',
      'www.masvision.es/blog/*',
      'masvision.es/tendencias/*',
      'masvision.es/consejos/*',
      'masvision.es/*'
    ]
  },
  {
    domain: 'soloptical.net',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.soloptical.net/blog',
      'https://soloptical.net/blog',
      'https://www.soloptical.net',
      'https://soloptical.net'
    ],
    sitemaps: [
      'https://www.soloptical.net/blog/post-sitemap.xml',
      'https://www.soloptical.net/post-sitemap.xml',
      'https://www.soloptical.net/wp-sitemap-posts-post-1.xml',
      'https://www.soloptical.net/sitemap_index.xml',
      'https://soloptical.net/sitemap_index.xml'
    ],
    cdxPatterns: [
      'soloptical.net/blog/*',
      'www.soloptical.net/blog/*',
      'soloptical.net/tendencias/*',
      'soloptical.net/noticias/*',
      'soloptical.net/*'
    ]
  },
  {
    domain: 'visionlab.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.visionlab.es/blog',
      'https://visionlab.es/blog',
      'https://www.visionlab.es',
      'https://visionlab.es'
    ],
    sitemaps: [
      'https://www.visionlab.es/blog/post-sitemap.xml',
      'https://www.visionlab.es/post-sitemap.xml',
      'https://www.visionlab.es/sitemap_index.xml',
      'https://www.visionlab.es/sitemap.xml'
    ],
    cdxPatterns: [
      'visionlab.es/blog/*',
      'www.visionlab.es/blog/*',
      'visionlab.es/tendencias/*',
      'visionlab.es/salud-visual/*',
      'visionlab.es/*'
    ]
  }
];

async function main() {
  const result = await runDomainGrinderShard({
    shardName: 'Shard 1 Optical Chains',
    shardPath: path.join(STAGING_DIR, 'shard_1_optical_chains.json'),
    reportPath: path.join(STAGING_DIR, 'shard_1_report.md'),
    domains: DOMAINS,
    timeBudgetMs: 6 * 60 * 1000,
    maxBlocksPerDomain: 380,
    maxTotalBlocks: 2800,
    maxWpPages: 8,
    maxSitemapUrls: 100,
    maxWaybackSnaps: 55
  });

  console.log('\n=== RESUMEN FINAL SHARD 1 ===');
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error('Error fatal en Shard 1:', err);
  process.exit(1);
});
