const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsLayout.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Update ViewMode
content = content.replace('type ViewMode = "cards" | "calendar" | "table";', 'type ViewMode = "cards" | "kanban" | "calendar" | "table";');

// Update Header usage (assuming we'll need to modify the header too)
// Add Kanban import
content = content.replace('import { ArticleCardGrid } from "./ArticleCardGrid";', 'import { ArticleCardGrid } from "./ArticleCardGrid";\nimport { ArticleKanbanBoard } from "./ArticleKanbanBoard";');

// Render Kanban
const renderKanban = `                {viewMode === "cards" && <ArticleCardGrid onToolSelect={onToolSelect} />}\n                {viewMode === "kanban" && <ArticleKanbanBoard onToolSelect={onToolSelect} />}`;
content = content.replace('{viewMode === "cards" && <ArticleCardGrid onToolSelect={onToolSelect} />}', renderKanban);

fs.writeFileSync(filepath, content);
console.log("Updated ContentsLayout.tsx for Kanban support");
