const fs = require('fs');

function fixHumanizer() {
    let content = fs.readFileSync('src/lib/actions/aiActions.ts', 'utf8');
    content = content.replace(
        /export const runHumanizerPipeline = async \([\s\S]*?onProgress\?: \(percent: number\) => void\s*\): Promise<{ html: string; metadata\?: any }> => \{/,
        `export const runHumanizerPipeline = async (
    html: string,
    config: HumanizerConfig,
    intensity: number,
    onStatus?: (msg: string) => void,
    modelName: string = 'gemma-4-31b-it', 
    onChunk?: (chunkHtml: string) => void,
    onProgress?: (percent: number) => void,
    providerOverride?: 'google-ai-studio' | 'vertex-ai' | 'auto',
    reasoning?: string
): Promise<{ html: string; metadata?: any }> => {`
    );
    
    // Pass it to executeWithKeyRotation or executeHumanizerWithRetry
    content = content.replace(/executeHumanizerWithRetry\(\s*async \(\s*ai,\s*currentModel\s*\)\s*=>/g, "executeHumanizerWithRetry(async (ai, currentModel) =>");
    // wait, runHumanizerPipeline calls executeHumanizerWithRetry inside.
    content = content.replace(/executeHumanizerWithRetry\(\s*async \(\s*ai\s*\)\s*=>\s*\{[\s\S]*?\},[\s\S]*?'Humanizador Pipeline',\s*modelName\s*\)/, match => match + ', providerOverride, reasoning)');
    
    fs.writeFileSync('src/lib/actions/aiActions.ts', content, 'utf8');
}

function fixGenerateRoute() {
    let content = fs.readFileSync('src/app/api/writer/generate/route.ts', 'utf8');
    // generateArticleStream(prompt, hierarchy, onStatus, onChunk, model, provider, reasoning)
    content = content.replace(/generateArticleStream\([\s\S]*?body\.model,[\s\S]*?onStatus,[\s\S]*?hierarchy,[\s\S]*?provider,[\s\S]*?reasoning\n\s*\);/, `generateArticleStream(
                            prompt,
                            hierarchy || [],
                            onStatus,
                            onChunk,
                            model || 'gemini-3.5-flash',
                            provider,
                            reasoning
                        );`);
    fs.writeFileSync('src/app/api/writer/generate/route.ts', content, 'utf8');
}

function fixGenerateStream() {
    let content = fs.readFileSync('src/lib/actions/aiActions.ts', 'utf8');
    content = content.replace(
        /export const generateArticleStream = async \([\s\S]*?modelName: string = 'gemini-3\.5-flash'\s*\): Promise<{ html: string; metadata\?: any }> => \{/,
        `export const generateArticleStream = async (
    prompt: string,
    hierarchy: string[] = [],
    onStatus?: (msg: string) => void,
    onChunk?: (chunkHtml: string) => void,
    modelName: string = 'gemini-3.5-flash',
    providerOverride?: 'google-ai-studio' | 'vertex-ai' | 'auto',
    reasoning?: string
): Promise<{ html: string; metadata?: any }> => {`
    );
    content = content.replace(
        /executeWithKeyRotation\(\s*async \(\s*ai,\s*currentModel\s*\)\s*=>\s*\{[\s\S]*?\},[\s\S]*?'Generador Streaming',\s*45000\s*\)/,
        match => match + ', providerOverride, reasoning)'
    );
    fs.writeFileSync('src/lib/actions/aiActions.ts', content, 'utf8');
}

fixHumanizer();
fixGenerateRoute();
fixGenerateStream();
console.log("Fixed deep pipeline parameters");
