const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'latest_base.html');
const content = fs.readFileSync(filePath, 'utf-8');

// Let's identify the chunks.
// In HTML, each block element is a chunk.
// Let's see: h1, p, h2, h3, li, td, th, caption.
// Notice that in latest_base.html, each block is on its own line or clearly defined!
const lines = content.split('\n');

console.log('--- CHUNK ANALYSIS ---');
const chunks = [];

lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    // check if it's a tag-only line like <table>, <thead>, <tr>, <tbody>, </table>, <ul>, </ul>
    if (/^<\/?(table|thead|tbody|tr|ul)>$/i.test(trimmed)) {
        return;
    }
    
    // Extract text content without HTML tags
    const textOnly = trimmed.replace(/<[^>]*>/g, '').trim();
    const words = textOnly.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    // Strict < 5%: Math.floor((wordCount - 1) * 0.05) or Math.floor(wordCount * 0.0499)
    const maxEdits = Math.floor(wordCount * 0.049);
    
    chunks.push({
        lineNum: index + 1,
        raw: trimmed,
        textOnly,
        wordCount,
        maxEdits
    });
});

console.log(`Total chunks identified: ${chunks.length}`);
chunks.forEach((c, idx) => {
    console.log(`Chunk ${idx + 1} (Line ${c.lineNum}) [${c.wordCount} words | max < 5% edits: ${c.maxEdits} words]: ${c.textOnly.substring(0, 60)}...`);
});
