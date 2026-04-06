const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsHeader.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace('type ViewMode = "cards" | "calendar" | "table";', 'type ViewMode = "cards" | "kanban" | "calendar" | "table";');

fs.writeFileSync(filepath, content);
console.log("Fixed ViewMode in ContentsHeader.tsx");
