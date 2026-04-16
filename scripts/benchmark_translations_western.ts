
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { executeWithKeyRotation } = require('../src/lib/services/writer/ai-core');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTranslationBenchmark() {
    const datasetPath = path.join(process.cwd(), 'translation_test_dataset.json');
    if (!fs.existsSync(datasetPath)) {
        console.error(`Dataset not found at ${datasetPath}`);
        process.exit(1);
    }
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    
    const targetModels = [
        { id: 'gemini-3-flash-preview', name: 'gemini-1.5-flash-8b' },
        { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
        { id: 'gemma-4-31b-it', name: 'gemma-4-31b-it' },
        { id: 'qwen-3-32b', name: 'qwen/qwen3-32b' },
        { id: 'llama-3.3-70b', name: 'llama-3.3-70b-versatile' },
    ];
    
    const languages = ['Spanish', 'French', 'German'];
    const resultsPath = 'translation_benchmark_western_results.json';
    let results = [];
    if (fs.existsSync(resultsPath)) {
        results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }
    
    for (const testCase of dataset.test_cases) {
        for (const lang of languages) {
            for (const model of targetModels) {
                if (results.find((r: any) => r.id === testCase.id && r.language === lang && r.model === model.id && r.status === 'success')) {
                    process.stdout.write(`Skipping ${model.id} for ${lang} - Case ${testCase.id} (already success)...\n`);
                    continue;
                }
                await sleep(2000);
                process.stdout.write(`Testing ${model.id} for ${lang} - Case ${testCase.id}... `);
                
                try {
                    const translation = await executeWithKeyRotation(
                        async (client: any, currentModel: any) => {
                            let resultText = '';
                            if (client.models && typeof client.models.generateContent === 'function') {
                                const prompt = `### INSTRUCTION: Translate the following text from English to ${lang}. Output ONLY the translation.
### TEXT: '${testCase.text}'
### TRANSLATION:`;
                                const result = await client.models.generateContent({
                                    model: currentModel,
                                    contents: prompt
                                });
                                resultText = result.text || '';
                            } else if ((client as any).getGenerativeModel) {
                                const modelInstance = (client as any).getGenerativeModel({ model: currentModel });
                                const prompt = `### INSTRUCTION: Translate the following text from English to ${lang}. Output ONLY the translation.
### TEXT: '${testCase.text}'
### TRANSLATION:`;
                                const result = await modelInstance.generateContent(prompt);
                                resultText = result.response.text();
                            } else {
                                throw new Error(`Client is missing both models.generateContent and getGenerativeModel.`);
                            }
                            return resultText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                        },
                        model.name,
                        undefined,
                        undefined,
                        true, // isStrictModel = true
                        'Final Translation Benchmark - Western'
                    );
                    
                    results.push({
                        id: testCase.id,
                        language: lang,
                        model: model.id,
                        translation: translation.trim(),
                        status: 'success'
                    });
                    process.stdout.write('✅\n');
                } catch (e: any) {
                    results.push({
                        id: testCase.id,
                        language: lang,
                        model: model.id,
                        translation: e.message,
                        status: 'error'
                    });
                    process.stdout.write('❌\n');
                }
                fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
            }
        }
    }

    
    console.log('\n--- FINAL RESULTS ---\n');
    console.log(JSON.stringify(results, null, 2));
    fs.writeFileSync('translation_benchmark_western_results.json', JSON.stringify(results, null, 2));
}

runTranslationBenchmark().catch(console.error);

