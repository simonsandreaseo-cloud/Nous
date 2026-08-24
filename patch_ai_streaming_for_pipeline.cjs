const fs = require('fs');
let content = fs.readFileSync('src/lib/services/writer/ai-streaming.ts', 'utf8');

// Fix streamHumanize signature
content = content.replace(
    /export async function streamHumanize\([\s\S]*?onProgress\?: \(percent: number\) => void\s*\): Promise<{ html: string; result\?: any }> \{/,
    `export async function streamHumanize(
    content: string,
    config: any,
    intensity: number,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void,
    model?: string,
    onProgress?: (percent: number) => void,
    provider?: string,
    reasoning?: string
): Promise<{ html: string; result?: any }> {`
);

// Fix streamGenerate signature
content = content.replace(
    /export async function streamGenerate\([\s\S]*?onStatus: \(msg: string\) => void\s*\): Promise<{ html: string; usage\?: any }> \{/,
    `export async function streamGenerate(
    prompt: string,
    model: string,
    hierarchy: string[] | undefined,
    onChunk: (html: string) => void,
    onStatus: (msg: string) => void,
    provider?: string,
    reasoning?: string
): Promise<{ html: string; usage?: any }> {`
);

// add them to body of streamGenerate
content = content.replace(
    /body: JSON\.stringify\(\{ prompt, model, hierarchy \}\)/,
    "body: JSON.stringify({ prompt, model, hierarchy, provider, reasoning })"
);

fs.writeFileSync('src/lib/services/writer/ai-streaming.ts', content, 'utf8');
console.log("Patched ai-streaming.ts");
