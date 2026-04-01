const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let code = fs.readFileSync(writerStudioPath, 'utf8');

code = code.replace(
    /const containerRef = require\("react"\)\.useRef<HTMLDivElement>\(null\);/,
    `import { useRef, useState } from 'react';\n    const containerRef = useRef<HTMLDivElement>(null);`
);

code = code.replace(
    /const \[splitWidth, setSplitWidth\] = require\("react"\)\.useState\(50\);/,
    `const [splitWidth, setSplitWidth] = useState(50);`
);

code = code.replace(
    /setSplitWidth\(\(prev\) => \{/,
    `setSplitWidth((prev: number) => {`
);

fs.writeFileSync(writerStudioPath, code);
console.log("Fixed split types");
