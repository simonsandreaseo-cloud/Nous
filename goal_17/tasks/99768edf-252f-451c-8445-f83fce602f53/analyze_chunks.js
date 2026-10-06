const fs = require('fs');

const html = fs.readFileSync('latest_base.html', 'utf8');

// Identify structural HTML chunks (headings, paragraphs, list items, blockquotes, table cells)
// Let's parse out the tag-based text units
const tagRegex = /<([a-z0-9]+)(\s+[^>]*)?>([\s\S]*?)<\/\1>/gi;

// Or let's identify chunks line by line / block by block:
const lines = html.split('\n');

const chunks = [];
let currentChunk = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Check if line is a self-contained tag or start of block
    // E.g. <h1>...</h1>, <p>...</p>, <li>...</li>, <h3>...</h3>, <td>...</td>
    // Or inside blockquote / table / div
    chunks.push({
        lineNum: i + 1,
        raw: lines[i]
    });
}

console.log(`Found ${chunks.length} non-empty lines/chunks`);
chunks.forEach((c, idx) => {
    // Strip tags to get raw text
    const text = c.raw.replace(/<[^>]*>/g, '').trim();
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const limit5Percent = (words.length * 0.05).toFixed(2);
    const maxWordsEditable = Math.floor(words.length * 0.05);
    if (words.length > 0 && !text.startsWith('[*')) {
        console.log(`[Chunk ${idx + 1} | Line ${c.lineNum}] Words: ${words.length} | 5% Limit: ${limit5Percent} (Max editable words: ${maxWordsEditable})`);
        console.log(`   Sample: "${text.substring(0, 80)}..."`);
    }
});
