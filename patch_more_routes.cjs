const fs = require('fs');

function patchHumanize() {
    let content = fs.readFileSync('src/app/api/humanize/route.ts', 'utf8');
    content = content.replace(/const \{ content, config, intensity \} = body;/, 'const { content, config, intensity, provider, reasoning } = body;');
    
    // runHumanizerPipeline signature is:
    // export const runHumanizerPipeline = async (html, config, intensity, onStatus, modelName, onChunk, onLog, mode, onProgress, providerOverride, reasoning)
    
    content = content.replace(/onProgress \/\/ pass onProgress\n\s*\);/, 'onProgress,\n                            provider,\n                            reasoning\n                        );');
    
    fs.writeFileSync('src/app/api/humanize/route.ts', content, 'utf8');
    console.log("Patched humanize route");
}

function patchGenerate() {
    let content = fs.readFileSync('src/app/api/writer/generate/route.ts', 'utf8');
    content = content.replace(/const \{ prompt, model, hierarchy \} = body;/, 'const { prompt, model, hierarchy, provider, reasoning } = body;');
    
    // runContentGenerator signature:
    // export const runContentGenerator = async (prompt, modelName, onStatus, hierarchy, providerOverride, reasoning)
    
    content = content.replace(/body\.model,\n\s*onStatus,\n\s*hierarchy\n\s*\);/, 'body.model,\n                            onStatus,\n                            hierarchy,\n                            provider,\n                            reasoning\n                        );');
    
    fs.writeFileSync('src/app/api/writer/generate/route.ts', content, 'utf8');
    console.log("Patched generate route");
}

patchHumanize();
patchGenerate();
