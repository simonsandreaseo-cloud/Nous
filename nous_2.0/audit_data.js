const fs = require('fs');
const https = require('https');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pnntoicdocixeajhoyai.supabase.co';
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const KEY = keyMatch[1].trim();

function fetchTable(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: SUPABASE_URL.replace('https://', ''),
      path: '/rest/v1/' + endpoint,
      method: 'GET',
      headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Accept': 'application/json' }
    };
    https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject).end();
  });
}

async function run() {
  console.log('--- DIAGNOSTICS DATA ---');
  try {
    const projects = await fetchTable('projects?select=id,name,user_id,gsc_connected');
    console.log(`\nProjects (${projects.length}):`);
    console.table(projects);

    const tokens = await fetchTable('user_gsc_tokens?select=*');
    console.log(`\nUser GSC Tokens (${tokens.length}):`);
    console.table(tokens);
  } catch (e) {
    console.error(e);
  }
}

run();
