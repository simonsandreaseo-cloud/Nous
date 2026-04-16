import fs from 'fs';

function loadEnv() {
    try {
        const envFile = fs.readFileSync('.env.local', 'utf8');
        envFile.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) return;
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
                process.env[key.trim()] = value;
            }
        });
    } catch (e) {
        console.warn('Could not load .env.local');
    }
}

loadEnv();

const { executeWithKeyRotation } = require('../src/lib/services/writer/ai-core');
const { AI_CONFIG } = require('../src/lib/ai/config');

async function run() {
    const dataset = JSON.parse(fs.readFileSync('translation_test_dataset.json', 'utf8'));
    const languages = ['Arabic', 'Russian'];
    const models = [
        { id: 'gemini', name: 'gemini-3.1-flash-lite-preview' },
        { id: 'qwen', name: 'qwen/qwen3-32b' },
        { id: 'llama', name: 'llama-3.3-70b-versatile' }
    ];

    const results = [];

    for (const testCase of dataset.test_cases) {
        for (const lang of languages) {
            for (const model of models) {
                process.stdout.write(`Translating ${testCase.id} to ${lang} using ${model.id}... `);
                try {
                    const translation = await executeWithKeyRotation(
                        async (client, currentModel) => {
                            // Use a more robust way to get the model
                            let modelInstance;
                            if (typeof client.getGenerativeModel === 'function') {
                                modelInstance = client.getGenerativeModel({ model: currentModel });
                            } else {
                                throw new Error(`Client does not have getGenerativeModel method. Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(client)).join(', ')}`);
                            }

                            const prompt = `Translate the following text into ${lang}.\n\nText: ${testCase.text}\nNuance: ${testCase.expected_nuance}\n\nReturn only the translation, no explanations or quotes.`;
                            const result = await modelInstance.generateContent(prompt);
                            return result.response.text();
                        },
                        model.name,
                        undefined,
                        undefined,
                        true,
                        'translation_test'
                    );
                    results.push({ id: testCase.id, language: lang, model: model.id, translation, status: 'success' });
                    process.stdout.write('✅\n');
                } catch (e: any) {
                    process.stdout.write('❌\n');
                    results.push({ id: testCase.id, language: lang, model: model.id, translation: e.message, status: 'error' });
                }
            }
        }
    }
    console.log('\n--- FINAL RESULTS ---\n');
    console.log(JSON.stringify(results, null, 2));
}

run().catch(console.error);
