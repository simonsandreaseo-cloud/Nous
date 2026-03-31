const fs = require('fs');
const path = require('path');

const seoPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/SEOTab.tsx');
let seoCode = fs.readFileSync(seoPath, 'utf8');

// The error says: Type '{ onSEO: () => Promise<void>; isAnalyzing: boolean; onPlanStructure: () => Promise<void>; isPlanning: boolean; }' is not assignable to type 'IntrinsicAttributes & { onSEO: () => void; isAnalyzing: boolean; }'.

// Update SEOTab.tsx Props to include onPlanStructure and isPlanning
seoCode = seoCode.replace(
    /export default function SEOTab\(\{ onSEO, isAnalyzing \}: \{ onSEO: \(\) => void, isAnalyzing: boolean \}\) \{/g,
    `export default function SEOTab({ onSEO, isAnalyzing, onPlanStructure, isPlanning }: { onSEO: () => void, isAnalyzing: boolean, onPlanStructure?: () => void, isPlanning?: boolean }) {`
);

fs.writeFileSync(seoPath, seoCode);
console.log("Fixed SEOTab props");
