"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Key, ChevronRight, AlertCircle, Trash2, ExternalLink } from "lucide-react";
import { useWriterStore } from "@/store/useWriterStore";
import { useProjectStore } from "@/store/useProjectStore";

// ── Types ──────────────────────────────────────────────────────────────────
// Mapping Supabase 'contents' status to visual display
export type ArticleStatus = "drafting" | "ready" | "published" | "archived";

export interface Article {
    id: string;
    title: string;
    keyword: string;
    status: ArticleStatus;
    scheduledDate: string; 
    appliedTools: string[];
    author_id?: string;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    drafting: { label: "En proceso", color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-400" },
    ready: { label: "Listo", color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-400" },
    published: { label: "Publicado", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
    archived: { label: "Archivado", color: "bg-rose-50 text-rose-400 border-rose-100", dot: "bg-rose-400" },
};

// ── Tool badge initials ────────────────────────────────────────────────────
const TOOL_INITIALS: Record<string, string> = {
    planner: "P", refinery: "R", briefings: "B", writer: "W",
    humanizer: "H", images: "I", interlinking: "L", publisher: "M",
};

// ── Article Card ──────────────────────────────────────────────────────────
function ArticleCard({ article, onOpen }: { article: Article; onOpen: (a: Article) => void }) {
    const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.drafting;

    const date = new Date(article.scheduledDate || Date.now());
    const day = date.getDate();
    const month = date.toLocaleString("es", { month: "short" });

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -3, boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpen(article)}
            className="relative bg-white/60 backdrop-blur-sm border border-slate-100 rounded-[24px] p-5 cursor-pointer transition-shadow flex flex-col gap-4 group shadow-sm hover:shadow-md"
        >
            {/* Top row: status badge + date */}
            <div className="flex items-center justify-between">
                <span className={cn(
                    "inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border",
                    status.color
                )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                    {status.label}
                </span>
                <span className="text-[10px] text-slate-400 font-bold flex items-baseline gap-1">
                    <span className="text-sm font-black text-slate-700">{day}</span>
                    <span className="uppercase">{month}</span>
                </span>
            </div>

            {/* Title */}
            <p className="text-[14px] font-bold text-slate-800 leading-snug line-clamp-2 flex-1">
                {article.title}
            </p>

            {/* Keyword */}
            {article.keyword && (
                <div className="flex items-center gap-1.5 bg-slate-50 self-start px-2 py-1 rounded-md">
                    <Key size={10} className="text-slate-400 shrink-0" />
                    <span className="text-[10px] text-slate-500 font-bold truncate">{article.keyword}</span>
                </div>
            )}

            {/* Bottom row: tool badges + open arrow */}
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                    {(article.appliedTools || []).slice(0, 4).map((tool) => (
                        <span
                            key={tool}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-100 text-[9px] font-black text-slate-400 flex items-center justify-center shadow-sm"
                            title={tool}
                        >
                            {TOOL_INITIALS[tool] || tool.charAt(0).toUpperCase()}
                        </span>
                    ))}
                    {(article.appliedTools?.length === 0) && (
                        <span className="text-[8px] text-slate-300 uppercase tracking-widest font-black">Sin procesar</span>
                    )}
                </div>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all border border-transparent group-hover:border-indigo-100">
                    <ChevronRight size={16} />
                </div>
            </div>
        </motion.div>
    );
}

// ── Article Detail Drawer ─────────────────────────────────────────────────
function ArticleDetailDrawer({ article, onClose, onOpenTool, onDelete }: {
    article: Article | null;
    onClose: () => void;
    onOpenTool: (articleId: string, toolId: string) => void;
    onDelete: (articleId: string) => Promise<void>;
}) {
    if (!article) return null;
    const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.drafting;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar este contenido permanentemente?")) return;
        setIsDeleting(true);
        await onDelete(article.id);
        setIsDeleting(false);
    };

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
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="fixed right-0 top-0 h-full w-[420px] z-50 bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.1)] border-l border-slate-100 flex flex-col"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <div className="flex items-start justify-between mb-4">
                        <span className={cn(
                            "inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border",
                            status.color
                        )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                            {status.label}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all">
                            <XComp size={18} />
                        </button>
                    </div>
                    <h2 className="text-lg font-black text-slate-800 leading-tight">{article.title}</h2>
                    {article.keyword && (
                        <p className="flex items-center gap-2 mt-3 bg-white self-start px-3 py-1.5 rounded-lg border border-slate-100 w-fit">
                            <Key size={12} className="text-indigo-400" />
                            <span className="text-[11px] font-bold text-slate-500">{article.keyword}</span>
                        </p>
                    )}
                </div>

                {/* Content Details */}
                <div className="p-8 flex-1 overflow-y-auto space-y-8">
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso Directo</p>
                        <button
                            onClick={() => onOpenTool(article.id, 'writer')}
                            className="w-full h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-3 transition-transform active:scale-95 group"
                        >
                            <span className="text-sm font-black uppercase tracking-widest">Abrir en Redactor</span>
                            <ExternalLink size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                        </button>
                    </div>

                    <div className="h-[1px] bg-slate-100" />

                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zona de Peligro</p>
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full h-12 rounded-xl border border-rose-100 bg-rose-50/30 text-rose-500 flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        >
                            {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            <span className="text-[11px] font-black uppercase tracking-widest">Eliminar permanentemente</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Internal icons helper
const XComp = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const RefreshCw = ({ className, size }: { className?: string, size: number }) => (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
);

// ── Main ArticleCardGrid ──────────────────────────────────────────────────
export function ArticleCardGrid({ onToolSelect }: { onToolSelect: (toolId: string) => void }) {
    const { activeProjectIds } = useProjectStore();
    const { projectContents, loadProjectContents, deleteContent, loadContentById } = useWriterStore();
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    useEffect(() => {
        if (activeProjectIds.length > 0) {
            loadProjectContents(activeProjectIds);
        } else {
            useWriterStore.getState().setProjectContents([]);
        }
    }, [activeProjectIds]);

    const handleOpenTool = async (contentId: string, toolId: string) => {
        if (toolId === 'writer') {
            await loadContentById(contentId);
            onToolSelect('writer');
        } else {
            onToolSelect(toolId);
        }
        setSelectedArticle(null);
    };

    const handleDelete = async (contentId: string) => {
        const success = await deleteContent(contentId);
        if (success) {
            setSelectedArticle(null);
        }
    };

    // Map projectContents to Article UI interface
    const articles: Article[] = projectContents.map(c => ({
        id: c.id,
        title: c.title,
        keyword: c.target_keyword || "",
        status: (c.status || "drafting") as ArticleStatus,
        scheduledDate: c.created_at,
        appliedTools: c.seo_data ? ["planner", "briefings", "writer"] : [],
    }));

    return (
        <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {articles.map((article) => (
                    <ArticleCard
                        key={article.id}
                        article={article}
                        onOpen={setSelectedArticle}
                    />
                ))}
                
                {articles.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                        <AlertCircle size={48} className="mb-4 opacity-20" />
                        <p className="text-sm font-bold uppercase tracking-widest opacity-40">No hay contenidos en este proyecto</p>
                    </div>
                )}
            </div>

            {/* Drawer */}
            {selectedArticle && (
                <ArticleDetailDrawer
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                    onOpenTool={handleOpenTool}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
