const fs = require('fs');

const updateImports = (file) => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace("import type { Article, ArticleStatus } from \"@/types/writer\";", "import type { Article, ArticleStatus } from \"./ArticleCardGrid\";");
    content = content.replace("import type { Article } from \"@/types/writer\";", "import type { Article } from \"./ArticleCardGrid\";");
    fs.writeFileSync(file, content);
    console.log("Updated imports in", file);
};

updateImports('nous_2.0/src/components/contents/ArticleKanbanBoard.tsx');
updateImports('nous_2.0/src/components/contents/KanbanColumn.tsx');
updateImports('nous_2.0/src/components/contents/KanbanCard.tsx');
