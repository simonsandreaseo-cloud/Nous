const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let code = fs.readFileSync(editorPath, 'utf8');

// I should have injected `isOrbOpen` into the component, not global!
code = code.replace(
    /const \[slashMenuPos, setSlashMenuPos\] = useState<\{ x: number, y: number \} \| null>\(null\);/g,
    `const [slashMenuPos, setSlashMenuPos] = useState<{ x: number, y: number } | null>(null);\n    const [isOrbOpen, setIsOrbOpen] = useState(false);`
);

// Fix TS1382 error around `>` inside jsx, probably the text `>3500`
code = code.replace(
    /<option>Pilar \(>3500 palabras\)<\/option>/g,
    `<option>Pilar ({">3500"} palabras)</option>`
);

fs.writeFileSync(editorPath, code);
console.log("Fixed orb state and TS error");
