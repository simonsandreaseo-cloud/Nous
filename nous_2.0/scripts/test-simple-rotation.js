// Simple rotation test in JS
const geminiKeys = ["KEY_1", "KEY_2", "KEY_3"];
let currentKeyIndex = 0;

const getGeminiKey = () => {
    if (geminiKeys.length === 0) return "";
    const key = geminiKeys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
    return key;
};

console.log("--- Testing Mock API Key Rotation ---");
for (let i = 0; i < 6; i++) {
    console.log(`Call ${i + 1}: ${getGeminiKey()}`);
}
