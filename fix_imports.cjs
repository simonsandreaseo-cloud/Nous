const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let code = fs.readFileSync(writerStudioPath, 'utf8');

code = code.replace(
    /import \{ useRef, useState \} from 'react';\n/g,
    ``
);

code = code.replace(
    /'use client';/g,
    `'use client';\nimport { useRef, useState } from 'react';`
);

fs.writeFileSync(writerStudioPath, code);
console.log("Moved imports");
