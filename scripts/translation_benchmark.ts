import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runBenchmark() {
    const { executeWithKeyRotation } = await import('../src/lib/services/writer/ai-core');
    
    const datasetPath = path.join(process.cwd(), 'translation_test_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const resultsPath = path.join(process.cwd(), 'translation_benchmark_western_results.json');
    
    let results: any[] = [];
    if (fs.existsSync(resultsPath)) {
        results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    }
    
    const languages = ['Spanish', 'French', 'German'];
    const models = [
        'gemini-3-flash-preview',
        'gemini-2.5-flash',
        'gemma-4-31b-it',
        'qwen-3-32b',
        'llama-3.3-70b'
    ];
    
    for (const lang of languages) {
        for (const model of models) {
            for (const testCase of dataset.test_cases) {
                // Check if this combination is already processed
                if (results.some(r => r.id === testCase.id && r.language === lang && r.model === model && r.status === 'success')) {
                    continue;
                }

                const prompt = `### INSTRUCTION: Translate the following text from English to ${lang}. Output ONLY the translation.\n### TEXT: '${testCase.text}'\n### TRANSLATION:`;
                
                let success = false;
                let attempts = 0;
                const maxAttempts = 3;
                
                while (!success && attempts < maxAttempts) {
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
                            'Final Translation Benchmark - Western'
                        );
                        
                        // Remove previous failure if it exists
                        results = results.filter(r => !(r.id === testCase.id && r.language === lang && r.model === model));
                        
                        results.push({
                            id: testCase.id,
                            language: lang,
                            model: model,
                            translation: translation.trim(),
                            status: 'success'
                        });
                        success = true;
                    } catch (e: any) {
                        attempts++;
                        if (e.message?.includes('429') || e.message?.includes('quota')) {
                            console.warn(`Quota hit for ${model} in ${lang} (${testCase.id}), retrying in 10s... (Attempt ${attempts}/${maxAttempts})`);
                            await sleep(10000);
                        } else {
                            // For other errors, record it and move on
                            results = results.filter(r => !(r.id === testCase.id && r.language === lang && r.model === model));
                            results.push({
                                id: testCase.id,
                                language: lang,
                                model: model,
                                translation: '',
                                status: `error: ${e.message}`
                            });
                            success = true; 
                        }
                    }
                }
                
                if (!success) {
                    results = results.filter(r => !(r.id === testCase.id && r.language === lang && r.model === model));
                    results.push({
                        id: testCase.id,
                        language: lang,
                        model: model,
                        translation: '',
                        status: 'error: max attempts reached'
                    });
                }
                
                fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
                await sleep(1000);
            }
        }
    }
    
    console.log(`Benchmark complete. Results saved to ${resultsPath}`);
}

runBenchmark().catch(console.error);

