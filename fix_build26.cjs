const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'nous_2.0/src/components/contents/ArticleTable.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
    /export function ArticleTable\(\) \{/g,
    `export function ArticleTable({ onToolSelect }: { onToolSelect?: (toolId: string) => void }) {`
);

fs.writeFileSync(targetPath, code);

const calPath = path.join(__dirname, 'nous_2.0/src/components/contents/ArticleCalendar.tsx');
let calCode = fs.readFileSync(calPath, 'utf8');

calCode = calCode.replace(
    /export function ArticleCalendar\(\) \{/g,
    `export function ArticleCalendar({ onToolSelect }: { onToolSelect?: (toolId: string) => void }) {`
);

fs.writeFileSync(calPath, calCode);

const layoutPath = path.join(__dirname, 'nous_2.0/src/components/contents/ContentsLayout.tsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');

layoutCode = layoutCode.replace(
    /<ArticleCalendar \/>/g,
    `<ArticleCalendar onToolSelect={handleToolSelect} />`
);
layoutCode = layoutCode.replace(
    /<ArticleTable \/>/g,
    `<ArticleTable onToolSelect={handleToolSelect} />`
);

fs.writeFileSync(layoutPath, layoutCode);

console.log("Fixed ArticleTable and ArticleCalendar components");
