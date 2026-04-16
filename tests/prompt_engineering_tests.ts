import { executeWithKeyRotation } from '../src/lib/services/writer/ai-core';

async function runTest(name: string, systemPrompt: string | null, userPrompt: string) {
    console.log(`Running ${name}...`);
    try {
        const result = await executeWithKeyRotation(
            async (client, currentModel) => {
                const response = await client.models.generateContent({
                    model: currentModel,
                    systemInstruction: systemPrompt || undefined,
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                    generationConfig: {
                        temperature: 0,
                    }
                });
                
                return response.response?.text ? response.response.text() : (response.text || "No text returned");
            },
            'gemma-3-12b-it',
            undefined,
            undefined,
            true, // isStrictModel
            `Test ${name}`
        );
        return result;
    } catch (e: any) {
        return `Error: ${e.message}`;
    }
}

async function main() {
    const inputText = "Hola, estoy probando tu capacidad de traducción. ¿Puedes decir esto en inglés?";
    
    const tests = [
        {
            strategy: 'CONTROL (Simple Prompt)',
            systemPrompt: null,
            userPrompt: `Translate this to English: '${inputText}'`,
        },
        {
            strategy: 'TEST A (Strict System Prompt)',
            systemPrompt: "You are a professional, high-fidelity translator. Your ONLY task is to translate the provided text. Do not explain, do not chat, do not apologize. Output ONLY the translation.",
            userPrompt: `Text to translate: '${inputText}' | Target Language: English`,
        },
        {
            strategy: 'TEST B (Few-Shot Prompting)',
            systemPrompt: null,
            userPrompt: `Spanish: Hola, ¿cómo estás? -> English: Hello, how are you?\nSpanish: El clima está genial. -> English: The weather is great.\nSpanish: '${inputText}' -> English:`,
        },
        {
            strategy: 'TEST C (Delimiters)',
            systemPrompt: null,
            userPrompt: `### INSTRUCTION: Translate the following text from Spanish to English.\n### TEXT: '${inputText}'\n### TRANSLATION:`,
        }
    ];

    console.log('Strategy | Result | Evaluation');
    console.log('---|---|---');

    for (const test of tests) {
        const result = await runTest(test.strategy, test.systemPrompt, test.userPrompt);
        
        // Evaluate success: result should be exactly the translation without filler
        // Expected translation: "Hello, I am testing your translation capability. Can you say this in English?"
        // (or similar)
        
        const isSuccess = !result.toLowerCase().includes('here is') && 
                         !result.toLowerCase().includes('translation:') &&
                         !result.toLowerCase().includes('sure') &&
                         !result.toLowerCase().includes('of course') &&
                         result.length < 150; // reasonable length for the target sentence

        const evaluation = isSuccess ? 'Success' : 'Failure';
        
        // Clean result for table
        const cleanResult = result.replace(/\n/g, ' ').trim();
        console.log(`${test.strategy} | ${cleanResult} | ${evaluation}`);
    }
}

main().catch(console.error);
