import fs from 'fs';
import path from 'path';

// 1. LOAD ENVIRONMENT VARIABLES FIRST
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            process.env[key.trim()] = value;
        }
    });
}

async function runBenchmark() {
    // 2. DYNAMIC IMPORT TO ENSURE ENV VARS ARE LOADED FIRST
    const { executeWithKeyRotation } = await import('../src/lib/services/writer/ai-core');

    const datasetPath = path.resolve(process.cwd(), 'translation_test_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const testCases = dataset.test_cases;

    const languages = ['Arabic', 'Russian'];
    const models = [
        'gemini-3.1-flash-preview',
        'gemini-2.5-flash-lite',
        'gemma-4-31b-it',
        'qwen/qwen3-32b',
        'llama-3.3-70b-versatile'
    ];

    const results = [];

    for (const lang of languages) {
        for (const model of models) {
            for (const testCase of testCases) {
                const prompt = `### INSTRUCTION: Translate the following text from English to ${lang}. Output ONLY the translation.
### TEXT: '${testCase.text}'
### TRANSLATION:`;

                try {
                    const translation = await executeWithKeyRotation(
                        async (client, currentModel) => {
                            if (!client || typeof client.getGenerativeModel !== 'function') {
                                throw new Error(`Client is missing getGenerativeModel. Type: ${typeof client}, Available: ${client ? Object.getOwnPropertyNames(Object.getPrototypeOf(client)).join(', ') : 'null'}`);
                            }
                            const generativeModel = client.getGenerativeModel({ model: currentModel });
                            const result = await generativeModel.generateContent(prompt);
                            return result.response.text();
                        },
                        model,
                        undefined,
                        undefined,
                        true, // isStrictModel
                        'Final Translation Benchmark - Complex'
                    );

                    results.push({
                        id: testCase.id,
                        language: lang,
                        model: model,
                        translation: translation.trim(),
                        status: 'success'
                    });
                } catch (e: any) {
                    results.push({
                        id: testCase.id,
                        language: lang,
                        model: model,
                        translation: '',
                        status: `error: ${e.message}`
                    });
                }
            }
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);
