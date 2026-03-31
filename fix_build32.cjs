const fs = require('fs');
const path = require('path');

const seoPath = path.join(__dirname, 'nous_2.0/src/components/studio/writer/SEOTab.tsx');
let seoCode = fs.readFileSync(seoPath, 'utf8');

const regex = /export default function SEOTab\(\{[\s\S]*?\}\) \{/;
seoCode = seoCode.replace(regex, `export default function SEOTab({ onSEO, isAnalyzing, onPlanStructure, isPlanning }: { onSEO: () => void, isAnalyzing: boolean, onPlanStructure?: () => void, isPlanning?: boolean }) {`);

fs.writeFileSync(seoPath, seoCode);
console.log("Forced props fix on SEOTab via regex on full declaration block");
