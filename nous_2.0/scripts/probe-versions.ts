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

    const models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash', 'gemini-1.0-pro'];
    const versions = ['v1', 'v1beta'];

    for (const ver of versions) {
        console.log(`\n--- Testing API Version: ${ver} ---`);
        for (const modelId of models) {
            try {
                // @ts-ignore
                const model = genAI.getGenerativeModel({ model: modelId }, { apiVersion: ver });
                const result = await model.generateContent("hi");
                console.log(`✅ ${modelId} (${ver}): Accessible`);
            } catch (e: any) {
                console.log(`❌ ${modelId} (${ver}): ${e.message.substring(0, 100)}...`);
            }
        }
    }
}

listModels();
