const fs = require('fs');
const path = require('path');

const editorPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let code = fs.readFileSync(editorPath, 'utf8');

// I duplicated the state.
code = code.replace(
    /const \[isOrbOpen, setIsOrbOpen\] = useState\(false\);\n    const \[isOrbOpen, setIsOrbOpen\] = useState\(false\);/g,
    `const [isOrbOpen, setIsOrbOpen] = useState(false);`
);

fs.writeFileSync(editorPath, code);
console.log("Removed duplicated state");
