const path = require('path');
const { STAGING_DIR, runDomainGrinderShard } = require('./blog_grinder_core.cjs');

const SHOPIFY_HANDLES = ['news', 'blog', 'tendencias', 'journal', 'magazine'];

const DOMAINS = [
  {
    domain: 'vipsual.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://www.vipsual.com/blog',
      'https://vipsual.com/blog',
      'https://www.vipsual.com',
      'https://vipsual.com'
    ],
    sitemaps: [
      'https://www.vipsual.com/blog/post-sitemap.xml',
      'https://www.vipsual.com/post-sitemap.xml',
      'https://www.vipsual.com/blog/sitemap_index.xml',
      'https://www.vipsual.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'vipsual.com/blog/*',
      'www.vipsual.com/blog/*',
      'vipsual.com/*'
    ]
  },
  {
    domain: 'millerandmarc.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://www.millerandmarc.com/blog',
      'https://millerandmarc.com/blog',
      'https://www.millerandmarc.com',
      'https://millerandmarc.com'
    ],
    sitemaps: [
      'https://www.millerandmarc.com/sitemap.xml',
      'https://millerandmarc.com/sitemap.xml',
      'https://www.millerandmarc.com/post-sitemap.xml'
    ],
    cdxPatterns: [
      'millerandmarc.com/blogs/*',
      'www.millerandmarc.com/blogs/*',
      'millerandmarc.com/blog/*',
      'millerandmarc.com/*'
    ]
  },
  {
    domain: 'etniabarcelona.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://www.etniabarcelona.com/es/blog',
      'https://www.etniabarcelona.com/blog',
      'https://etniabarcelona.com/blog',
      'https://www.etniabarcelona.com/magazine'
    ],
    sitemaps: [
      'https://www.etniabarcelona.com/es/blog/post-sitemap.xml',
      'https://www.etniabarcelona.com/blog/post-sitemap.xml',
      'https://www.etniabarcelona.com/sitemap.xml',
      'https://www.etniabarcelona.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'etniabarcelona.com/es/blog/*',
      'www.etniabarcelona.com/es/blog/*',
      'etniabarcelona.com/blog/*',
      'etniabarcelona.com/es/*',
      'etniabarcelona.com/*'
    ]
  },
  {
    domain: 'theindianface.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://theindianface.com/blog',
      'https://www.theindianface.com/blog',
      'https://theindianface.com',
      'https://www.theindianface.com'
    ],
    sitemaps: [
      'https://theindianface.com/sitemap.xml',
      'https://www.theindianface.com/sitemap.xml',
      'https://theindianface.com/post-sitemap.xml'
    ],
    cdxPatterns: [
      'theindianface.com/blogs/*',
      'www.theindianface.com/blogs/*',
      'theindianface.com/blog/*',
      'theindianface.com/*'
    ]
  },
  {
    domain: 'tiwi.es',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://tiwi.es/blog',
      'https://www.tiwi.es/blog',
      'https://tiwi.es',
      'https://www.tiwi.es'
    ],
    sitemaps: [
      'https://tiwi.es/post-sitemap.xml',
      'https://www.tiwi.es/post-sitemap.xml',
      'https://tiwi.es/sitemap_index.xml',
      'https://tiwi.es/sitemap.xml'
    ],
    cdxPatterns: [
      'tiwi.es/blogs/*',
      'tiwi.es/blog/*',
      'www.tiwi.es/blog/*',
      'tiwi.es/*'
    ]
  },
  {
    domain: 'pjlobster.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://pjlobster.com/es/blog',
      'https://www.pjlobster.com/es/blog',
      'https://pjlobster.com/blog',
      'https://pjlobster.com'
    ],
    sitemaps: [
      'https://pjlobster.com/sitemap.xml',
      'https://www.pjlobster.com/sitemap.xml',
      'https://pjlobster.com/post-sitemap.xml'
    ],
    cdxPatterns: [
      'pjlobster.com/blogs/*',
      'pjlobster.com/es/blogs/*',
      'pjlobster.com/blog/*',
      'pjlobster.com/es/*',
      'pjlobster.com/*'
    ]
  },
  {
    domain: 'gafasvintage.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://gafasvintage.com/blog',
      'https://www.gafasvintage.com/blog',
      'https://gafasvintage.com',
      'https://www.gafasvintage.com'
    ],
    sitemaps: [
      'https://gafasvintage.com/post-sitemap.xml',
      'https://www.gafasvintage.com/post-sitemap.xml',
      'https://gafasvintage.com/blog/post-sitemap.xml',
      'https://gafasvintage.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'gafasvintage.com/blog/*',
      'www.gafasvintage.com/blog/*',
      'gafasvintage.com/blogs/*',
      'gafasvintage.com/*'
    ]
  },
  {
    domain: 'milyunagafas.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://milyunagafas.com/blog',
      'https://www.milyunagafas.com/blog',
      'https://milyunagafas.com',
      'https://www.milyunagafas.com'
    ],
    sitemaps: [
      'https://milyunagafas.com/post-sitemap.xml',
      'https://www.milyunagafas.com/post-sitemap.xml',
      'https://milyunagafas.com/blog/post-sitemap.xml',
      'https://milyunagafas.com/sitemap_index.xml'
    ],
    cdxPatterns: [
      'milyunagafas.com/blog/*',
      'www.milyunagafas.com/blog/*',
      'milyunagafas.com/blogs/*',
      'milyunagafas.com/*'
    ]
  },
  {
    domain: 'hanukeii.com',
    mode: 'optical_blog',
    excludeClinical: true,
    shopifyHandles: SHOPIFY_HANDLES,
    wpBases: [
      'https://hanukeii.com/blog',
      'https://www.hanukeii.com/blog',
      'https://hanukeii.com',
      'https://www.hanukeii.com'
    ],
    sitemaps: [
      'https://hanukeii.com/sitemap.xml',
      'https://www.hanukeii.com/sitemap.xml',
      'https://hanukeii.com/post-sitemap.xml'
    ],
    cdxPatterns: [
      'hanukeii.com/blogs/*',
      'www.hanukeii.com/blogs/*',
      'hanukeii.com/blog/*',
      'hanukeii.com/*'
    ]
  },
  {
    domain: 'visiondirect.es',
    mode: 'optical_blog',
    excludeClinical: true,
    wpBases: [
      'https://www.visiondirect.es/blog',
      'https://visiondirect.es/blog',
      'https://www.visiondirect.es/centro-de-vision',
      'https://www.visiondirect.es'
    ],
    sitemaps: [
      'https://www.visiondirect.es/blog/post-sitemap.xml',
      'https://www.visiondirect.es/blog/sitemap_index.xml',
      'https://www.visiondirect.es/post-sitemap.xml',
      'https://www.visiondirect.es/sitemap_index.xml'
    ],
    cdxPatterns: [
      'visiondirect.es/blog/*',
      'www.visiondirect.es/blog/*',
      'visiondirect.es/centro-de-vision/*',
      'www.visiondirect.es/centro-de-vision/*',
      'visiondirect.es/*'
    ]
  }
];

async function main() {
  await runDomainGrinderShard({
    shardName: 'Shard 3 Eyewear Brands',
    shardPath: path.join(STAGING_DIR, 'shard_3_eyewear_brands.json'),
    reportPath: path.join(STAGING_DIR, 'shard_3_report.md'),
    domains: DOMAINS,
    timeBudgetMs: 6 * 60 * 1000,
    maxBlocksPerDomain: 380,
    maxTotalBlocks: 2800,
    maxWpPages: 8,
    maxSitemapUrls: 100,
    maxWaybackSnaps: 55
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
