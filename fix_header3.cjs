const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ContentsHeader.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// I assumed the imports were on one line but they are multiline.
content = content.replace("    LayoutGrid,\n    CalendarDays,\n    Table2,", "    LayoutGrid,\n    Columns,\n    CalendarDays,\n    Table2,");

fs.writeFileSync(filepath, content);
console.log("Fixed multiline import for Columns in ContentsHeader.");
