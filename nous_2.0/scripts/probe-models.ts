import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        console.error("No API key found");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // There is no direct "listModels" in the standard web-oriented SDK easily accessible 
        // without the admin/rest client, but we can try to "probe" a few.
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-exp'];

        for (const modelId of models) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId });
                await model.generateContent("hello");
                console.log(`✅ ${modelId}: Accessible`);
            } catch (e: any) {
                console.log(`❌ ${modelId}: ${e.message.substring(0, 100)}...`);
            }
        }
    } catch (err) {
        console.error("Fatal error:", err);
    }
}

listModels();
