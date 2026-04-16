const https = require('https');

const ACCESS_TOKEN = 'sbp_8bc26a49b92d33c5eebc41c517572cbfacad1898';
const PROJECT_REF = 'pugbtgqfxylmovcwvmbo';

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
        const query = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'project_urls' AND column_name = 'project_id';`;
        const res = await request(`/v1/projects/${PROJECT_REF}/database/query`, { query });
        console.log(JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("Error:", error);
    }
}

run();