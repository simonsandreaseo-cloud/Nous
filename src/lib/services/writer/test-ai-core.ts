process.env.GEMINI_API_KEY = 'dummy_key_that_is_long_enough_to_pass_validation';
const { executeWithKeyRotation } = require('./ai-core');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });



async function testFix() {
    console.log('Starting test: FINAL_FIX_TEST');
    try {
        const result = await executeWithKeyRotation(
            async (client, currentModel) => {
                console.log(`Using model: ${currentModel}`);
                const model = client.getGenerativeModel({ model: currentModel });
                const response = await model.generateContent("Translate 'Hola' to English");
                return response.response.text();
            },
            'gemini-2.5-flash',
            undefined, // use keys from config
            (failedKey, reason, attempt, max) => {
                console.log(`Rotation: Key ${failedKey} failed due to ${reason}. Attempt ${attempt}/${max}`);
            },
            true, // isStrictModel
            'FINAL_FIX_TEST'
        );
        console.log('SUCCESS! Result:', result);
    } catch (error: any) {
        console.error('FAILED!');
        console.error('Error Message:', error.message);
        console.error('Full Error:', error);
        process.exit(1);
    }
}

testFix();
