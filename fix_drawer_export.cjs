const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

content = content.replace("function ArticleDetailDrawer({", "export function ArticleDetailDrawer({");

fs.writeFileSync(filepath, content);
console.log("Exported ArticleDetailDrawer");
