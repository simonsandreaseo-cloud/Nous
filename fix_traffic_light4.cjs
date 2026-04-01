const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// The original file probably already had these definitions but with different spacing or comments.
// Let's strip all XComp and RefreshCw definitions and just add one at the very top.
content = content.replace(/const XComp[\s\S]*?<\/svg>\n\);\n/g, "");
content = content.replace(/const RefreshCw[\s\S]*?<\/svg>\n\);\n/g, "");

const iconsCode = `
// Internal icons helper
const XComp = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const RefreshCw = ({ className, size }: { className?: string, size: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);
`;

content = content.replace("export type ArticleStatus", iconsCode + "\nexport type ArticleStatus");

fs.writeFileSync(filepath, content);
console.log("Fixed XComp and RefreshCw declarations");
