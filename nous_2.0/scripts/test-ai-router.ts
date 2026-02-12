const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const { aiRouter } = require('../src/lib/ai/router');

async function testGroq() {
    console.log('⚡ Inspecting GROQ Speed Mode...');
    try {
        const start = Date.now();
        const response = await aiRouter.generate({
            model: 'llama-3.3-70b-versatile',
            prompt: 'Summarize SEO in 5 words.',
            systemPrompt: 'Be extremely concise.'
        });
        console.log(`✅ GROQ Success (${Date.now() - start}ms):`, response.text);
    } catch (e) {
        console.error(`❌ GROQ Failed: ${e.message}`);
    }
}

async function testGemini() {
    console.log('🧠 Inspecting GEMINI Deep Thought...');
    try {
        const start = Date.now();
        const response = await aiRouter.generate({
            model: 'gemini-2.5-pro',
            prompt: 'Explain semantic search.',
            systemPrompt: 'Be academic.'
        });
        console.log(`✅ GEMINI Success (${Date.now() - start}ms):`, response.text);
    } catch (e) {
        console.error(`❌ GEMINI Failed: ${e.message}`);
    }
}

(async () => {
    console.log("🚀 ACTIVATING NEURAL LINK TEST...");
    await testGroq();
    await testGemini();
    console.log("🏁 NEURAL LINK TEST COMPLETE.");
})();
