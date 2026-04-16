import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';

// Simple check to see if GoogleGenAI works
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

    console.log('Testing GoogleGenAI with key:', apiKey ? 'Key found' : 'Key NOT found');
    
    try {
        const genAI = new GoogleGenAI(apiKey);
        console.log('GoogleGenAI instance created. Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        console.log('Model instance created');
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
