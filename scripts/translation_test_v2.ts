
import * as fs from 'fs';
import * as path from 'path';
import { executeWithKeyRotation } from '../src/lib/services/writer/ai-core';

async function runTranslationTest() {
    const datasetPath = path.join(process.cwd(), 'translation_test_dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    
    const targetModels = [
        { id: 'gemini', name: 'gemini-3.1-flash-lite-preview' },
        { id: 'qwen', name: 'qwen/qwen3-32b' },
        { id: 'llama', name: 'llama-3.3-70b-versatile' },
    ];
    
    const languages = ['Spanish', 'French', 'German'];
    const results = [];

    for (const testCase of dataset.test_cases) {
        for (const lang of languages) {
            for (const model of targetModels) {
                process.stdout.write(`Testing ${model.id} for ${lang} - Case ${testCase.id}... `);
                
                try {
                    const translation = await executeWithKeyRotation(
                        async (client, currentModel) => {
                            const modelInstance = (client as any).getGenerativeModel ? 
                                client.getGenerativeModel({ model: currentModel }) : 
                                null;
                            
                            if (!modelInstance) {
                                throw new Error(`Client is missing getGenerativeModel. Available methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(client)).join(', ')}`);
                            }
                            
                            const prompt = `Translate the following text to ${lang}. 
                            Return ONLY the translated text. 
                            Do not include any explanations, quotes, or preamble.
                            
                            Text: ${testCase.text}`;
                            
                            const result = await modelInstance.generateContent(prompt);
                            return result.response.text();
                        },
                        model.name,
                        undefined,
                        undefined,
                        true, // isStrictModel = true to avoid rotation to other models
                        'Translation Test'
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
                // Save intermediate results to file
                fs.writeFileSync('translation_results.json', JSON.stringify(results, null, 2));
            }
        }
    }
    
    console.log('\n--- FINAL RESULTS ---\n');
    console.log(JSON.stringify(results, null, 2));
}

runTranslationTest().catch(console.error);
