import { generateImageAction } from '../src/app/node-tasks/image-actions';
import { getGeminiKey, AI_CONFIG } from '../src/lib/ai/config';

async function testRotation() {
    console.log("--- Testing API Key Rotation ---");
    const keysCount = AI_CONFIG.gemini.apiKeys.length;
    console.log(`Total keys configured: ${keysCount}`);

    for (let i = 0; i < keysCount * 2; i++) {
        const key = getGeminiKey();
        console.log(`Key ${i + 1}: ${key.substring(0, 5)}...`);
    }

    console.log("\n--- Testing Image Generation (Mock/Dry Run logic check) ---");
    try {
        // This will attempt a real call if keys are valid, 
        // or fail with a specific error we can catch.
        console.log("Attempting image generation...");
        // Use a simple prompt and small model
        const result = await generateImageAction(
            "A futuristic antigravity sphere",
            "gemini-2.5-flash-image",
            "1:1"
        );
        console.log("Success! Image data length:", result.length);
    } catch (e: any) {
        console.log("Generation check (Expected if keys invalid):", e.message);
    }
}

testRotation();
