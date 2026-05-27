const fs = require('fs');

const content = fs.readFileSync('supabase/all_migrations.sql', 'utf8');
const chunks = [];
let currentStart = 0;
const chunkSize = 25000;

while (currentStart < content.length) {
    let end = currentStart + chunkSize;
    if (end < content.length) {
        let lastSemi = content.lastIndexOf(';', end);
        if (lastSemi > currentStart) {
            end = lastSemi + 1;
        }
    } else {
        end = content.length;
    }
    
    const chunk = content.substring(currentStart, end);
    chunks.push(chunk);
    currentStart = end;
}

chunks.forEach((c, i) => {
    fs.writeFileSync(`supabase/chunk_correct_${i}.sql`, c, 'utf8');
    console.log(`Chunk ${i}: ${c.length} bytes`);
});
