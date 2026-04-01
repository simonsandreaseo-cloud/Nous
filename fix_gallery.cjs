const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'nous_2.0/src/components/contents/ArticleCardGrid.tsx');
let code = fs.readFileSync(targetPath, 'utf8');

// I will refactor ArticleCardGrid back to a standard Gallery Grid sorted by date, but keep the new UI for the cards
// "La vista de 'Galeria' los artículos deben estar organizados por fechas y su estatus ser parte de cada tarjeta"

const newGridRenderer = `
    return (
        <div className="relative h-full overflow-y-auto custom-scrollbar pb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {articles.map((article) => (
                    <ArticleCard key={article.id} article={article} onOpen={setSelectedArticle} />
                ))}
            </div>

            {articles.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200/60 rounded-[32px] bg-white/30">
                    <AlertCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">No hay contenidos en este proyecto</p>
                </div>
            )}

            {/* Drawer */}
            {selectedArticle && (
                <ArticleDetailDrawer
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                    onOpenTool={handleOpenTool}
                    onDelete={handleDelete}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
`;

code = code.replace(
    /return \([\s\S]*?<div className="relative h-full">[\s\S]*?\{COLUMNS\.map\([\s\S]*?<\/div>[\s\S]*?\{selectedArticle && \([\s\S]*?<\/div>\n    \);/m,
    newGridRenderer
);

// We need to add the status badge to the top of the card!
// Find the ArticleCard component render return
const cardTopRow = `
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpen(article)}
            className="relative bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-[20px] p-4 cursor-pointer transition-shadow flex flex-col gap-3 group shadow-sm hover:shadow-md"
        >
            {/* Top row: Status & Intent badge */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "inline-flex items-center text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-md border",
                        statusConfig.color
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", statusConfig.color.replace('text-', 'bg-').replace('500', '400').replace('600', '400').replace('bg-bg-', 'bg-').split(' ')[0])} />
                        {statusConfig.title}
                    </span>
                </div>

                {/* Progress Ring */}
                <div className="relative w-6 h-6 flex items-center justify-center shrink-0" title={\`Progreso: \${progress}%\`}>
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-indigo-500 transition-all duration-500" strokeWidth="4" strokeDasharray={\`\${progress}, 100\`} stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    </svg>
                </div>
            </div>

            {/* Intent Badge */}
             <div className="mb-1">
                <span className={cn(
                    "inline-flex items-center text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border",
                    intent.color
                )}>
                    {intent.label}
                </span>
            </div>
`;

code = code.replace(
    /<motion\.div\n\s*layout[\s\S]*?\{\/\* Top row: Intent badge \*\/\}\n\s*<div className="flex items-center justify-between">\n\s*<span className=\{cn\([\s\S]*?<\/div>\n\s*<\/div>\n\s*\{\/\* Title & Keyword \*\/\}\n\s*<div>/m,
    `${cardTopRow}\n            {/* Title & Keyword */}\n            <div>`
);

// Define statusConfig in ArticleCard
code = code.replace(
    /const intent = getIntentColor\(article.keyword\);/g,
    `const intent = getIntentColor(article.keyword);\n    const statusConfig = COLUMNS.find(c => c.id === article.status) || COLUMNS[0];`
);


fs.writeFileSync(targetPath, code);
console.log("Fixed gallery view layout");
