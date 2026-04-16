import { executeWithKeyRotation } from '../src/lib/services/writer/ai-core';

async function runTests() {
    const models = [
        'gemini-3-flash-preview',
        'gemma-4-31b',
        'gemini-3.1-flash-lite-preview',
        'gemini-2.5-flash-lite',
        'gemma-3-12b',
        'gemini-2.5-flash',
        'gemma-3-1b',
        'gemma-3-4b',
        'gemma-3-27b',
        'gemma-3-2b',
        'gemma-4-26b',
    ];

    const testInput = "Hola, estoy probando tu capacidad de traducción. ¿Puedes decir esto en inglés?";
    const label = 'Sanity Check Translation';

    console.log('Starting Model Sanity Check...\n');
    console.log('Model Name | Status | Error Message | Translation');
    console.log('--------------------------------------------------------------------------------');

    for (const model of models) {
        try {
            const translation = await executeWithKeyRotation(
                async (client, currentModel) => {
                    const response = await client.models.generateContent({
                        model: currentModel,
                        contents: [{ role: 'user', parts: [{ text: testInput }] }]
                    });
                    return response.text;
                },
                model,
                undefined, // use default keys from AI_CONFIG
                undefined, 
                true, // isStrictModel
                label
            );
            console.log(`${model} | SUCCESS | - | ${translation.trim().replace(/\\n/g, ' ')}`);
        } catch (e: any) {
            console.log(`${model} | FAIL | ${e.message} | -`);
        }
    }
}

runTests().catch(console.error);
