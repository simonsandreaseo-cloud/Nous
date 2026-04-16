import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually BEFORE importing AI_CONFIG/ai-core
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) return;
        
        const firstEqIndex = trimmedLine.indexOf('=');
        if (firstEqIndex === -1) return;
        
        const key = trimmedLine.slice(0, firstEqIndex).trim();
        const value = trimmedLine.slice(firstEqIndex + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
    });
}

async function runSanityCheck() {
    // Dynamically import to ensure AI_CONFIG is initialized AFTER env vars are set
    const { executeWithKeyRotation } = await import('../src/lib/services/writer/ai-core');

    const models = [
        'gemma-4-31b-it',
        'gemma-3-27b-it',
        'gemma-3-12b-it',
        'gemma-3-4b-it',
        'gemma-3-2b-it',
        'gemma-3-1b-it',
        'gemma-4-26b-it',
    ];

    const prompt = "Hola, estoy probando tu capacidad de traducción. ¿Puedes decir esto en inglés?";
    const label = 'Gemma IT Sanity Check';

    console.log('Model Name | Status | Error Message | Translation');
    console.log('---------------------------------------------------');

    for (const model of models) {
        try {
            const translation = await executeWithKeyRotation(
                async (client, currentModel) => {
                    const result = await client.models.generateContent({
                        model: currentModel,
                        contents: [{ role: 'user', parts: [{ text: prompt }] }]
                    });
                    console.log(`[DEBUG] Result for ${currentModel}:`, JSON.stringify(result, null, 2));
                    return result.response?.text() || result.text || "No text returned";
                },
                model,
                undefined, // keys from AI_CONFIG
                undefined, // onRotation
                true,      // isStrictModel
                label
            );
            console.log(`${model} | SUCCESS | - | ${translation.trim()}`);
        } catch (e: any) {
            console.log(`${model} | FAIL | ${e.message} | -`);
        }
    }
}

runSanityCheck().catch(console.error);
