const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleKanbanBoard.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Fix appliedTools assignment
content = content.replace("seo_data: c.seo_data", "seo_data: c.seo_data,\n        appliedTools: c.seo_data ? [\"planner\", \"writer\"] : []");

fs.writeFileSync(filepath, content);
console.log("Fixed Kanban mapping");
