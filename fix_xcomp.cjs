const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// Apparently there is another XComp somewhere. Let's just remove all of them and use standard lucide-react icons if available, or just leave ONE.
content = content.replace(/const XComp = \(\{ size \}: \{ size: number \}\) => \([\s\S]*?<\/svg>\n\);/g, "");
content = content.replace(/const RefreshCw = \(\{ className, size \}: \{ className\?: string, size: number \}\) => \([\s\S]*?<\/svg>\n\);/g, "");

content = content.replace("<XComp", "<X");
content = content.replace("XComp size={16}", "X size={16}");

if(!content.includes("X,")) {
    content = content.replace("import { Key, ChevronRight, AlertCircle, Trash2, ExternalLink", "import { Key, X, ChevronRight, AlertCircle, Trash2, ExternalLink, RefreshCw");
}

fs.writeFileSync(filepath, content);
console.log("Replaced XComp and custom RefreshCw with Lucide icons");
