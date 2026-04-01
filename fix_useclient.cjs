const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'nous_2.0/src/components/studio/writer/WriterEditor.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ motion, AnimatePresence \} from "framer-motion";\n'use client';/g, "'use client';\nimport { motion, AnimatePresence } from \"framer-motion\";");

fs.writeFileSync(file, code);
console.log("Fixed use client");
