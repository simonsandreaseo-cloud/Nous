const fs = require('fs');

let content = fs.readFileSync('src/lib/actions/aiActions.ts', 'utf8');

// The executeStep function in runMiniHumanizerPipeline (standard mode)
content = content.replace(
    /return await executeHumanizerWithRetry\(async \(ai\) => \{([\s\S]*?raw = raw\.replace\([\s\S]*?\}\)\s*\}\);/g,
    `return await executeHumanizerWithRetry(async (ai, currentModel) => {$1}, onStatus, stepName, modelName, providerOverride, reasoning);`
);

// The processedChunk call in runMiniHumanizerPipeline (json mode)
content = content.replace(
    /const processedChunk = await executeHumanizerWithRetry\(async \(ai\) => \{([\s\S]*?raw = response\.response\.text\(\);[\s\S]*?return parsed;[\s\S]*?\}\);/g,
    `const processedChunk = await executeHumanizerWithRetry(async (ai, currentModel) => {$1}, onStatus, 'Mini-Humanizador JSON', modelName, providerOverride, reasoning);`
);

// The processedChunk call in runHumanizerPipeline (original)
content = content.replace(
    /const processedChunk = await executeHumanizerWithRetry\(async \(ai, currentModel\) => \{([\s\S]*?raw = response\.response\.text\(\);[\s\S]*?return parsed;[\s\S]*?\}\),\s*onStatus,\s*'Humanizador Pipeline',\s*modelName\s*\);/g,
    `const processedChunk = await executeHumanizerWithRetry(async (ai, currentModel) => {$1}, onStatus, 'Humanizador Pipeline', modelName, providerOverride, reasoning);`
);

fs.writeFileSync('src/lib/actions/aiActions.ts', content, 'utf8');
console.log("Fixed executeHumanizerWithRetry calls in aiActions.ts");
