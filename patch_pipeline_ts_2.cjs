const fs = require('fs');
let content = fs.readFileSync('src/lib/services/writer/pipeline.ts', 'utf8');

content = content.replace(/chunkSize\?: number\n\) \{/g, 'chunkSize?: number,\n    reasoning?: string\n) {');

// For streamGenerate
content = content.replace(
    /streamGenerate\([\s\S]*?\(msg\) => onLog\(`\[Parte \$\{i\+1\}\] \$\{msg\}`\)\n\s*\);/g,
    match => match.replace(/\n\s*\);$/, ',\n                reasoning\n            );')
);

// For streamSurgicalEdit
content = content.replace(
    /streamSurgicalEdit\([\s\S]*?\(msg\) => onLog\(`\[Fragmento \$\{i\+1\}\] \$\{msg\}`\)\n\s*\);/g,
    match => match.replace(/\n\s*\);$/, ',\n                    undefined, // onProgress\n                    undefined, // model override if any? let ai-streaming handle it\n                    reasoning\n                );')
);

// For streamHumanize
content = content.replace(
    /streamHumanize\([\s\S]*?\(msg\) => onLog\(`\[Chunk \$\{i\+1\}\] \$\{msg\}`\)\n\s*\);/g,
    match => match.replace(/\n\s*\);$/, ',\n                    undefined,\n                    undefined,\n                    reasoning\n                );')
);

fs.writeFileSync('src/lib/services/writer/pipeline.ts', content, 'utf8');
console.log("Patched pipeline.ts correctly");
