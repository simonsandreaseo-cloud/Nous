const fs = require('fs');

const html = fs.readFileSync('latest_base.html', 'utf8');

const lines = html.split('\n');

const chunks = [];
for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const text = raw.replace(/<[^>]*>/g, '').trim();
    if (!text || text.startsWith('[*') || text.startsWith('---')) continue;
    const words = text.split(/\s+/).filter(w => w.length > 0);
    chunks.push({
        lineNum: i + 1,
        raw,
        text,
        wordCount: words.length,
        maxEditable: Math.floor(words.length * 0.05)
    });
}

console.log(`Extracted ${chunks.length} meaningful text chunks.`);
chunks.forEach((c, idx) => {
    console.log(`[Chunk ${idx + 1} | Line ${c.lineNum}] Words: ${c.wordCount} | 5% limit: < ${(c.wordCount * 0.05).toFixed(2)} (max ${c.maxEditable} words)`);
    console.log(`   Text: "${c.text.substring(0, 70)}..."`);
});
