const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

const trafficLightCode = `
function TrafficLightItem({ active, icon, label }: { active: boolean, icon: React.ReactNode, label: string }) {
    return (
        <div className={cn(
            "flex flex-col items-center gap-1.5 transition-all duration-300",
            active ? "text-emerald-500" : "text-slate-300 opacity-50"
        )}>
            <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2",
                active ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white"
            )}>
                {active ? <CheckCircle size={14} /> : icon}
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
        </div>
    );
}

// Internal icons helper
const XComp = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const RefreshCw = ({ className, size }: { className?: string, size: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);
`;

if (!content.includes("TrafficLightItem")) {
    content = content.replace("export function ArticleCardGrid", trafficLightCode + "\nexport function ArticleCardGrid");
}

if (!content.includes("CheckCircle")) {
    content = content.replace("FileText, PenLine, Image, Sparkles, Link as LinkIcon } from \"lucide-react\";", "FileText, PenLine, Image, Sparkles, Link as LinkIcon, CheckCircle } from \"lucide-react\";");
}

fs.writeFileSync(filepath, content);
console.log("Added TrafficLightItem helper");
