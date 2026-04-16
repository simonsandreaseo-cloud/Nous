import * as fs from 'fs';

function loadEnv() {
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) return;
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
                process.env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            }
        });
        console.log('[BENCHMARK] .env.local loaded successfully');
    } catch (e) {
        console.warn('[BENCHMARK] Could not load .env.local');
    }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runBenchmark() {
    loadEnv();
    
    const { executeWithKeyRotation } = await import('../src/lib/services/writer/ai-core');

    const dataset = JSON.parse(fs.readFileSync('translation_test_dataset.json', 'utf8'));
    const languages = ['Chinese Simplified', 'Japanese', 'Korean'];
    const models = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemma-4-31b-it',
        'qwen-3-32b',
        'llama-3.3-70b'
    ];

    let results = [];
    if (fs.existsSync('translation_results_asian.json')) {
        results = JSON.parse(fs.readFileSync('translation_results_asian.json', 'utf8'));
    }

    for (const model of models) {
        for (const language of languages) {
            for (const testCase of dataset.test_cases) {
                // Check if result already exists
                if (results.some(r => r.model === model && r.language === language && r.id === testCase.id)) {
                    continue;
                }

                const prompt = `### INSTRUCTION: Translate the following text from English to ${language}. Output ONLY the translation.
### TEXT: '${testCase.text}'
### TRANSLATION:`;

                try {
                    const translation = await executeWithKeyRotation(
                        async (client, currentModel) => {
                            if ((client as any).models && typeof (client as any).models.generateContent === 'function') {
                                const response = await (client as any).models.generateContent({
                                    model: currentModel,
                                    contents: [{ role: 'user', parts: [{ text: prompt }] }]
                                });
                                return response.text ?? '';
                            } else if (typeof (client as any).getGenerativeModel === 'function') {
                                const genModel = (client as any).getGenerativeModel({ model: currentModel });
                                const result = await genModel.generateContent(prompt);
                                return result.response.text();
                            } else {
                                throw new Error(`Client does not support expected generation methods.`);
                            }
                        },
                        model,
                        undefined,
                        undefined,
                        true, // isStrictModel
                        'Final Translation Benchmark - Asian'
                    );

                    results.push({
                        id: testCase.id,
                        language,
                        model,
                        translation: translation.trim(),
                        status: 'success'
                    });
                } catch (error: any) {
                    results.push({
                        id: testCase.id,
                        language,
                        model,
                        translation: '',
                        status: `error: ${error.message}`
                    });
                }
                fs.writeFileSync('translation_results_asian.json', JSON.stringify(results, null, 2));
                await sleep(1500); // Slightly longer sleep to be safer
            }
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);


