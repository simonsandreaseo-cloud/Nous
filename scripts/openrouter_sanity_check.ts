import 'dotenv/config';
import { executeWithKeyRotation } from '../src/lib/services/writer/ai-core';

async function runSanityCheck() {
    const models = [
        'meta-llama/llama-3.3-70b-instruct:free',
        'google/gemma-4-31b-it:free',
        'qwen/qwen3-next-80b-a3b-instruct:free'
    ];

    const testInput = "Hello, this is a test for OpenRouter. Please translate this to Spanish.";
    const results = [];

    console.log('Starting OpenRouter Sanity Check...\n');

    for (const model of models) {
        try {
            console.log(`Testing model: ${model}...`);
            const translation = await executeWithKeyRotation(
                async (client) => {
                    const result = await client.generateContent(testInput);
                    return result.response.text();
                },
                model,
                undefined,
                undefined,
                true, // isStrictModel
                'OpenRouter Sanity Check'
            );
            
            results.push({
                model,
                status: 'SUCCESS',
                translation,
                notes: ''
            });
        } catch (e: any) {
            console.error(`Error testing ${model}: ${e.message}`);
            results.push({
                model,
                status: 'FAIL',
                translation: 'N/A',
                notes: e.message
            });
        }
    }

    console.log('\n--- FINAL REPORT ---');
    console.log('Model | Status | Translation | Notes');
    console.log('---|---|---|---');
    results.forEach(r => {
        console.log(`${r.model} | ${r.status} | ${r.translation.replace(/\n/g, ' ')} | ${r.notes}`);
    });
}

runSanityCheck().catch(console.error);
