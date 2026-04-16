const https = require('https');

const ACCESS_TOKEN = 'sbp_8bc26a49b92d33c5eebc41c517572cbfacad1898';
const PROJECT_ID = 'pugbtgqfxylmovcwvmbo';

async function request(path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.supabase.com',
            path: path,
            method: body ? 'POST' : 'GET',
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log(`🚀 Testing v3 on project ${PROJECT_ID}...`);
        
        const sqlQuery = `
            SELECT * FROM get_semantic_inventory_matches_v3(
              '${PROJECT_ID}', 
              'gafas|lentes|sol|contacto|vision|montura|graduacion|optico|anteojos|mica', 
              '', 
              15
            );
        `;

        const queryRes = await request(`/v1/projects/${PROJECT_ID}/database/query`, {
            query: sqlQuery
        });

        if (queryRes.status !== 200) {
            console.log(`❌ Query failed with status ${queryRes.status}:`, queryRes.data);
        } else {
            console.log("\n✨ v3 Results:");
            console.log(JSON.stringify(queryRes.data, null, 2));
        }

    } catch (error) {
        console.error("🚨 Error:", error);
    }
}

run();