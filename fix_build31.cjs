const fs = require('fs');
const path = require('path');

const seoPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/SEOTab.tsx');
let seoCode = fs.readFileSync(seoPath, 'utf8');

// The error says SEOTab still doesn't accept onPlanStructure. Let's see how the component is defined in SEOTab.tsx
console.log(seoCode.substring(0, 200));

seoCode = seoCode.replace(
    /export default function SEOTab\(\{ onSEO, isAnalyzing \}: \{ onSEO: \(\) => void, isAnalyzing: boolean \}\) \{/g,
    `export default function SEOTab({ onSEO, isAnalyzing, onPlanStructure, isPlanning }: { onSEO: () => void, isAnalyzing: boolean, onPlanStructure?: () => void, isPlanning?: boolean }) {`
);

// If the regex above fails, let's use a simpler one.
const newDef = `export default function SEOTab({ onSEO, isAnalyzing, onPlanStructure, isPlanning }: { onSEO: () => void, isAnalyzing: boolean, onPlanStructure?: () => void, isPlanning?: boolean }) {`;

const lines = seoCode.split('\n');
const index = lines.findIndex(l => l.includes('export default function SEOTab'));
if (index !== -1) {
    lines[index] = newDef;
    fs.writeFileSync(seoPath, lines.join('\n'));
    console.log("Fixed SEOTab directly");
}
