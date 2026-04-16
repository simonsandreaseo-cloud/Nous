import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

async function test() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    let apiKey = '';
    for (const line of lines) {
        if (line.startsWith('GEMINI_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
        if (line.startsWith('GOOGLE_GENERATIVE_AI_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            break;
        }
    }

    try {
        const client = new GoogleGenAI({ apiKey: apiKey });
        const response = await client.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
        });
        console.log('Full Response Object:', JSON.stringify(response, null, 2));
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
