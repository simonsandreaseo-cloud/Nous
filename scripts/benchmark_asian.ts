import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const { executeWithKeyRotation } = require('../src/lib/services/writer/ai-core');

async function runBenchmark() {
    const datasetPath = path.join(process.cwd(), 'translation_test_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const resultsPath = path.join(process.cwd(), 'translation_benchmark_asian_results.json');
    
    const languages = ['Chinese Simplified', 'Japanese', 'Korean'];
    const models = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemma-4-31b-it',
        'qwen-3-32b',
        'llama-3.3-70b'
    ];

    let results = [];
    if (fs.existsSync(resultsPath)) {
        results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }

    const completed = new Set(results.map(r => `${r.language}|${r.model}|${r.id}`));

    for (const lang of languages) {
        for (const model of models) {
            for (const testCase of dataset.test_cases) {
                const key = `${lang}|${model}|${testCase.id}`;
                if (completed.has(key)) continue;

                const prompt = `### INSTRUCTION: Translate the following text from English to ${lang}. Output ONLY the translation.
### TEXT: '${testCase.text}'
### TRANSLATION:`;

                try {
                    const translation = await executeWithKeyRotation(
                        async (client, currentModel) => {
                            const genModel = client.getGenerativeModel({ model: currentModel });
                            const result = await genModel.generateContent(prompt);
                            return result.response.text();
                        },
                        model,
                        undefined,
                        undefined,
                        true, // isStrictModel
                        'Final Translation Benchmark - Asian'
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
                
                fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
                completed.add(key);
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

runBenchmark().catch(console.error);
