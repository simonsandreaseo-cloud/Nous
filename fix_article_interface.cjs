const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Update Article interface to include seo_data
content = content.replace(
`export interface Article {
    id: string;
    title: string;
    keyword: string;
    status: ArticleStatus;
    scheduledDate: string;
    appliedTools: string[];
    author_id?: string;
}`,
`export interface Article {
    id: string;
    title: string;
    keyword: string;
    status: ArticleStatus;
    scheduledDate: string;
    appliedTools: string[];
    author_id?: string;
    seo_data?: any;
}`);

// Add onUpdateStatus prop to ArticleDetailDrawer
content = content.replace(
"function ArticleDetailDrawer({ article, onClose, onOpenTool, onDelete }: {",
"export function ArticleDetailDrawer({ article, onClose, onOpenTool, onDelete, onUpdateStatus }: {"
);

content = content.replace(
"onDelete: (articleId: string) => Promise<void>;",
"onDelete: (articleId: string) => Promise<void>;\n    onUpdateStatus?: (articleId: string, newStatus: string) => Promise<void>;"
);


fs.writeFileSync(filepath, content);
console.log("Fixed Article interface and Drawer props in ArticleCardGrid.tsx");
