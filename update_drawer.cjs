const fs = require('fs');
const filepath = 'nous_2.0/src/components/contents/ArticleCardGrid.tsx';
let content = fs.readFileSync(filepath, 'utf-8');

// I might have missed exactly where the "Drawer UX Flow" buttons were implemented,
// or I was working with a mock file earlier. Let's add them to ArticleDetailDrawer.

const drawerCode = `
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
`;

if (content.includes("ArticleDetailDrawer")) {
    const detailReplacement = `
    const seoData = article.seo_data || {};
    const hasBriefing = !!seoData.structure;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-[2px]"
            />
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[400px] bg-white shadow-2xl flex flex-col border-l border-slate-100"
            >
                {/* Header */}
                <div className="h-20 px-8 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div>
                        <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Panel de Control</p>
                        <h2 className="text-sm font-bold text-slate-800 mt-0.5">Estado del Contenido</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <XComp size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="mb-8">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200 mb-4">
                            {article.keyword || "Sin Keyword"}
                        </span>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug">{article.title || "Artículo sin título"}</h3>
                    </div>

                    {/* Semáforo de Completitud */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Semáforo de Completitud</h4>
                        <div className="flex justify-between items-center">
                            <TrafficLightItem active={hasBriefing} icon={<FileText size={14} />} label="Briefing" />
                            <div className={\`flex-1 h-[2px] mx-2 rounded-full \${hasBriefing ? 'bg-emerald-200' : 'bg-slate-200'}\`} />
                            <TrafficLightItem active={article.status === 'ready' || article.status === 'published'} icon={<PenLine size={14} />} label="Texto" />
                            <div className={\`flex-1 h-[2px] mx-2 rounded-full \${article.status === 'ready' || article.status === 'published' ? 'bg-emerald-200' : 'bg-slate-200'}\`} />
                            <TrafficLightItem active={false} icon={<Image size={14} />} label="Imágenes" />
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Centro de Acción</h4>

                        {!hasBriefing ? (
                            <button
                                onClick={() => onUpdateStatus?.(article.id, 'drafting')} // Simulate briefing gen
                                className="w-full bg-indigo-600 text-white rounded-xl py-4 font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <Sparkles size={16} />
                                Generar Briefing con Nous
                            </button>
                        ) : (
                            <button
                                onClick={() => onOpenTool(article.id, 'writer')}
                                className="w-full bg-slate-900 text-white rounded-xl py-4 font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition flex items-center justify-center gap-2"
                            >
                                <PenLine size={16} />
                                Entrar al Redactor Zen
                            </button>
                        )}

                        {hasBriefing && (
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => onOpenTool(article.id, 'refinery')}
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                >
                                    <Image size={14} /> Refinar Arte
                                </button>
                                <button
                                    onClick={() => onOpenTool(article.id, 'writer')} // Interlinking is part of Redactor now
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                >
                                    <LinkIcon size={14} /> Interlinking
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 bg-white shrink-0">
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="w-full h-12 rounded-xl border border-rose-100 bg-rose-50/30 text-rose-500 flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        <span className="text-[11px] font-black uppercase tracking-widest">Eliminar permanentemente</span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );`;

    const regex = /return \(\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>\s*\);/m;
    content = content.replace(regex, detailReplacement);

    // Ensure icon imports
    if(!content.includes("FileText")) {
       content = content.replace("import { Key, ChevronRight, AlertCircle, Trash2, ExternalLink } from \"lucide-react\";", "import { Key, ChevronRight, AlertCircle, Trash2, ExternalLink, FileText, PenLine, Image, Sparkles, Link as LinkIcon } from \"lucide-react\";");
    } else {
       // Just append if needed
       content = content.replace("ExternalLink } from \"lucide-react\";", "ExternalLink, FileText, PenLine, Image, Sparkles, Link as LinkIcon } from \"lucide-react\";");
    }

    fs.writeFileSync(filepath, content);
    console.log("Wired Refinery Actions in Drawer");
}
