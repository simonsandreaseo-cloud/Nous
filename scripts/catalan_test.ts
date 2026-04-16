
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testModel(model: string) {
    const { executeWithKeyRotation } = await import('../src/lib/services/writer/ai-core');
    const prompt = `### INSTRUCTION: Translate the following text from English to Catalan. Output ONLY the translation.
### TEXT: 'It's a piece of cake, but we shouldn't count our chickens before they hatch.'
### TRANSLATION:`;

    try {
        const translation = await executeWithKeyRotation(
            async (client, currentModel) => {
                const modelObj = client.getGenerativeModel({ model: currentModel });
                const response = await modelObj.generateContent(prompt);
                return response.response.text();
            },
            model,
            undefined,
            undefined,
            true, // isStrictModel
            'Catalan Stress Test'
        );
        return translation.trim();
    } catch (e: any) {
        return `Error: ${e.message}`;
    }
}

async function main() {
    const models = [
        'gemini-2.5-flash',
        'llama-3.3-70b',
        'google/gemma-4-31b-it:free',
        'meta-llama/llama-3.3-70b-instruct:free'
    ];

    console.log('Running Catalan Stress Test...\n');
    const results = [];

    for (const model of models) {
        process.stdout.write(`Testing ${model}... `);
        const translation = await testModel(model);
        console.log('Done.');
        results.push({ model, translation });
    }

    console.log('\n--- Report ---\n');
    console.log('Model | Translation | Quality Score (1-10) | Notes');
    console.log('---|---|---|---');
    
    results.forEach(r => {
        console.log(`${r.model} | ${r.translation} | TBD | TBD`);
    });
}

main().catch(console.error);
