const PROJECT_ID = 'pugbtgqfxylmovcwvmbo';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2J0Z3FmeHlsbW92Y3d2bWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTc3NTU2MiwiZXhwIjoyMDkxMzUxNTYyfQ.WsUFcV52tSuoPb4VTO2Oqjmo2ZGXaUffdqr1JsGTJbI';

const testKeywords = [
    'gafas', 'lentes', 'sol', 'contacto', 'vision', 'montura', 'graduacion',
    'optico', 'anteojos', 'mica', 'armazon', 'proteccion', 'deportivo', 'niño', 'madera'
];

async function run() {
    try {
        const projRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: "SELECT id, name FROM projects WHERE name ILIKE '%optica%' OR name ILIKE '%bassol%' LIMIT 3"
            })
        });
        const projData = await projRes.json();
        console.log("Projects:", JSON.stringify(projData, null, 2));

        if (!projData || projData.length === 0) {
            console.log("No project found");
            return;
        }

        const projectId = projData[0].id;
        console.log("\nUsing project:", projData[0].name, "ID:", projectId);

        const countRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `SELECT count(*) as total FROM project_urls WHERE project_id = '${projectId}'`
            })
        });
        const countData = await countRes.json();
        console.log("Inventory size:", countData[0]?.total || 0);

        const keywordsRegex = testKeywords.slice(0, 10).join('|');
        console.log("\nTesting with keywords:", keywordsRegex);

        const v3Res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SERVICE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `SELECT * FROM get_semantic_inventory_matches_v3('${projectId}', '${keywordsRegex}', '', 15)`
            })
        });

        if (!v3Res.ok) {
            console.log("v3 error:", v3Res.status, await v3Res.text());
        } else {
            const v3Data = await v3Res.json();
            console.log("\nv3 Results (15):", JSON.stringify(v3Data, null, 2));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

run();