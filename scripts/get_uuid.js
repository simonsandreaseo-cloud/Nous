const https = require('https');

const ACCESS_TOKEN = 'sbp_8bc26a49b92d33c5eebc41c517572cbfacad1898';

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
        const projects = await request('/v1/projects');
        const project = projects.data.find(p => p.name === 'Nous');
        console.log(`Project: ${project.name}, Ref: ${project.ref}, ID: ${project.id}`);
    } catch (error) {
        console.error("Error:", error);
    }
}

run();