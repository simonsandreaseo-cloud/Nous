const fs = require('fs');
let content = fs.readFileSync('src/lib/services/writer/pipeline.ts', 'utf8');

// Update signatures
content = content.replace(/chunkSize\?: number\n\) \{/g, 'chunkSize?: number,\n    reasoning?: string\n) {');

// Update streamGenerate call in executeDraftPipeline
content = content.replace(/streamGenerate\(\s*prompt,\s*modelToUse,\s*undefined,\s*\(chunk\)/g, 'streamGenerate(\n                prompt,\n                modelToUse,\n                undefined,\n                (chunk)');
// Actually, streamGenerate signature might not have reasoning right now. We will pass it at the end.
content = content.replace(/streamGenerate\(([\s\S]*?)\(msg\) => onLog\(`\[Parte \$\{i\+1\}\] \$\{msg\}`\)\n\s*\);/g, 'streamGenerate($1(msg) => onLog(`[Parte ${i+1}] ${msg}`), reasoning\n            );');

// Update streamSurgicalEdit call in executeSurgicalEditPipeline
content = content.replace(/streamSurgicalEdit\(([\s\S]*?)\(msg\) => onLog\(`\[Fragmento \$\{i\+1\}\] \$\{msg\}`\)\n\s*\);/g, 'streamSurgicalEdit($1(msg) => onLog(`[Fragmento ${i+1}] ${msg}`), undefined, reasoning\n            );');

// Update streamHumanize call in executeHumanizePipeline
content = content.replace(/streamHumanize\(([\s\S]*?)onProgress\?: \(percent\) => \{\}\n\s*\);/g, 'streamHumanize($1onProgress?: (percent) => {}, reasoning\n                );');

fs.writeFileSync('src/lib/services/writer/pipeline.ts', content, 'utf8');
console.log("Patched pipeline.ts");
