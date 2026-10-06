const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : 'https://www.opticabassol.com' + res.headers.location;
        return resolve(fetchJson(nextUrl));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: e.message, raw: data.slice(0, 300) });
        }
      });
    }).on('error', reject);
  });
}

async function searchBassol(queries) {
  for (const q of queries) {
    console.log(`\n=== SEARCH: ${q} ===`);
    const url = `https://www.opticabassol.com/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=10`;
    const res = await fetchJson(url);
    const products = res?.resources?.results?.products || [];
    for (const p of products) {
      const cleanUrl = 'https://www.opticabassol.com' + p.url.split('?')[0].replace(/^\/[a-z]{2}(-[a-z]{2})?\//i, '/');
      console.log(`- ID: ${p.id} | Title: ${p.title} | URL: ${cleanUrl} | Available: ${p.available} | Price: ${p.price}`);
    }
  }
}

const args = process.argv.slice(2);
searchBassol(args);
