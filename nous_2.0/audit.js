const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnntoicdocixeajhoyai.supabase.co';
// Get key from .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
if (!keyMatch) {
  console.error("No service role key found");
  process.exit(1);
}
const KEY = keyMatch[1].trim();

const options = {
  hostname: SUPABASE_URL.replace('https://', ''),
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Accept': 'application/json'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const openapi = JSON.parse(data);
      const tables = Object.keys(openapi.definitions || {})
          .filter(k => openapi.definitions[k].type === 'object');
      
      console.log('--- SUPABASE DATABASE AUDIT ---');
      console.log(`Found ${tables.length} tables/views in public schema:\n`);
      for (const table of tables) {
        const props = Object.keys(openapi.definitions[table].properties || {});
        console.log(`- ${table} (${props.length} columns):`);
        console.log(`  Columns: ${props.join(', ')}`);
      }
      console.log('-------------------------------');
    } catch(e) {
      console.error(e.message);
      console.log("Raw output head:", data.substring(0, 500));
    }
  });
});

req.on('error', e => console.error(e));
req.end();
