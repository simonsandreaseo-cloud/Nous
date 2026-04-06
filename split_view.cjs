const fs = require('fs');
const path = require('path');

const writerStudioPath = path.join(__dirname, 'nous_2.0/src/app/studio/writer/WriterStudio.tsx');
let code = fs.readFileSync(writerStudioPath, 'utf8');

// Update WriterStudio to include resizable split panel
// We'll replace the static "w-1/2" with a state-driven width and a drag handle

const resizableLogic = `
    const [splitWidth, setSplitWidth] = require("react").useState(50);
    const containerRef = require("react").useRef<HTMLDivElement>(null);

    const handleDrag = (event: any, info: any) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.getBoundingClientRect().width;
        // Calculate new percentage based on mouse movement
        const deltaPercentage = (info.delta.x / containerWidth) * 100;
        setSplitWidth((prev) => {
            const newVal = prev + deltaPercentage;
            // Clamp between 30% and 70%
            return Math.min(Math.max(newVal, 30), 70);
        });
    };
`;

code = code.replace(
    /if \(viewMode === 'dashboard'\) \{/g,
    `${resizableLogic}\n    if (viewMode === 'dashboard') {`
);

code = code.replace(
    /<div className="flex-1 overflow-hidden flex relative bg-white\/20">/g,
    `<div className="flex-1 overflow-hidden flex relative bg-white/20" ref={containerRef}>`
);

// Modify Left Panel
code = code.replace(
    /className=\{cn\(\n\s*"h-full overflow-y-auto custom-scrollbar transition-all duration-500 ease-\[0\.23,1,0\.32,1\]",\n\s*isSidebarOpen \? "w-1\/2" : "w-full"\n\s*\)\}/g,
    `className={cn("h-full overflow-y-auto custom-scrollbar", isSidebarOpen ? "transition-none" : "transition-all duration-500 ease-[0.23,1,0.32,1]")}
                        style={{ width: isSidebarOpen ? \`\${splitWidth}%\` : '100%' }}`
);

// Add Drag Handle inside the Left Panel (or between them)
const dragHandle = `
                    {/* Drag Handle */}
                    {isSidebarOpen && (
                        <motion.div
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0}
                            dragMomentum={false}
                            onDrag={handleDrag}
                            className="absolute top-0 bottom-0 z-50 w-2 hover:bg-indigo-500/20 cursor-col-resize flex items-center justify-center group"
                            style={{ left: \`calc(\${splitWidth}% - 4px)\` }}
                        >
                            <div className="h-8 w-1 bg-slate-300 rounded-full group-hover:bg-indigo-400 transition-colors" />
                        </motion.div>
                    )}
`;

code = code.replace(
    /\{\/\* Right Side: Competitors \/ Research \(50\/50 Mode\) \*\/\}/g,
    `${dragHandle}\n\n                    {/* Right Side: Competitors / Research (50/50 Mode) */}`
);

// Modify Right Panel
code = code.replace(
    /initial=\{\{ width: 0, opacity: 0 \}\}\n\s*animate=\{\{ width: "50%", opacity: 1 \}\}\n\s*exit=\{\{ width: 0, opacity: 0 \}\}/g,
    `initial={{ width: 0, opacity: 0 }}
                                animate={{ width: \`\${100 - splitWidth}%\`, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}`
);

fs.writeFileSync(writerStudioPath, code);
console.log("Added resizable split view");
