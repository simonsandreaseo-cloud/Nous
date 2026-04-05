"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Key, X, ChevronRight, AlertCircle, Trash2, ExternalLink, RefreshCw, FileText, PenLine, Image, Sparkles, Link as LinkIcon, CheckCircle } from "lucide-react";
import { useWriterStore } from "@/store/useWriterStore";
import { useProjectStore } from "@/store/useProjectStore";

// ── Types ──────────────────────────────────────────────────────────────────
// Mapping Supabase 'contents' status to visual display

// Internal icons helper



export type ArticleStatus = 
    | 'idea' 
    | 'en_investigacion' 
    | 'por_redactar' 
    | 'en_redaccion' 
    | 'por_corregir' 
    | 'por_maquetar' 
    | 'investigacion_proceso' 
    | 'publicado' 
    | 'done';

export interface Article {
    id: string;
    title: string;
    keyword: string;
    status: ArticleStatus;
    scheduledDate: string; 
    appliedTools: string[];
    author_id?: string;
    seo_data?: any;
}

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
    idea: { label: "Idea", color: "bg-slate-50 text-slate-400 border-slate-100", dot: "bg-slate-300" },
    en_investigacion: { label: "En Investigación", color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-400" },
    por_redactar: { label: "Por Redactar", color: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-400" },
    en_redaccion: { label: "En Redacción", color: "bg-purple-50 text-purple-600 border-purple-100", dot: "bg-purple-400" },
    por_corregir: { label: "Por Corregir", color: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-400" },
    por_maquetar: { label: "Por Maquetar", color: "bg-cyan-50 text-cyan-600 border-cyan-100", dot: "bg-cyan-400" },
    publicado: { label: "Publicado", color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },

    // Legacy mapping
    investigacion_proceso: { label: "En Investigación", color: "bg-indigo-50 text-indigo-600 border-indigo-100", dot: "bg-indigo-400" },
    ready: { label: "Por Corregir", color: "bg-blue-50 text-blue-600 border-blue-100", dot: "bg-blue-400" },
    done: { label: "Publicado", color: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
    drafting: { label: "En Redacción", color: "bg-purple-50 text-purple-600 border-purple-100", dot: "bg-purple-400" },
    todo: { label: "Idea", color: "bg-slate-50 text-slate-400 border-slate-100", dot: "bg-slate-300" },
};

// ── Tool badge initials ────────────────────────────────────────────────────
const TOOL_INITIALS: Record<string, string> = {
    planner: "P", refinery: "R", briefings: "B", writer: "W",
    humanizer: "H", images: "I", interlinking: "L", publisher: "M",
};

// ── Article Card ──────────────────────────────────────────────────────────
function ArticleCard({ article, onOpen }: { article: Article; onOpen: (a: Article) => void }) {
    const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.idea;

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
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all border border-transparent group-hover:border-indigo-100">
                    <ChevronRight size={16} />
                </div>
            </div>
        </motion.div>
    );
}

// ── Article Detail Drawer ─────────────────────────────────────────────────

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

export function ArticleDetailDrawer({ article, onClose, onOpenTool, onDelete, onUpdateStatus }: {
    article: Article | null;
    onClose: () => void;
    onOpenTool: (articleId: string, toolId: string) => void;
    onDelete: (articleId: string) => Promise<void>;
    onUpdateStatus?: (articleId: string, newStatus: string) => Promise<void>;
}) {
    if (!article) return null;
    const status = STATUS_CONFIG[article.status] || STATUS_CONFIG.idea;
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que quieres eliminar este contenido permanentemente?")) return;
        setIsDeleting(true);
        await onDelete(article.id);
        setIsDeleting(false);
    };


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
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                    <div className="mb-8">
                        <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200 mb-4">
                            {article.keyword || "Sin Keyword"}
                        </span>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight leading-snug">{article.title || "Contenido sin título"}</h3>
                    </div>

                    {/* Semáforo de Completitud */}
                    <div className="bg-slate-50 rounded-lg p-6 border border-slate-100 mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Semáforo de Completitud</h4>
                        <div className="flex justify-between items-center">
                            <TrafficLightItem active={hasBriefing} icon={<FileText size={14} />} label="Briefing" />
                            <div className={`flex-1 h-[2px] mx-2 rounded-full ${hasBriefing ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                            <TrafficLightItem active={article.status === 'por_corregir' || article.status === 'publicado'} icon={<PenLine size={14} />} label="Texto" />
                            <div className={`flex-1 h-[2px] mx-2 rounded-full ${article.status === 'por_corregir' || article.status === 'publicado' ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                            <TrafficLightItem active={false} icon={<Image size={14} />} label="Imágenes" />
                        </div>
                    </div>

                    {/* Acciones */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Centro de Acción</h4>

                        {!hasBriefing ? (
                            <button
                                onClick={() => onUpdateStatus?.(article.id, 'en_investigacion')} // Simulate briefing gen
                                className="w-full bg-indigo-600 text-white rounded-md py-4 font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <Sparkles size={16} />
                                Generar Briefing con Nous
                            </button>
                        ) : (
                            <button
                                onClick={() => onOpenTool(article.id, 'writer')}
                                className="w-full bg-slate-900 text-white rounded-md py-4 font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition flex items-center justify-center gap-2"
                            >
                                <PenLine size={16} />
                                Entrar al Redactor Zen
                            </button>
                        )}

                        {hasBriefing && (
                            <div className="flex gap-3 mt-4">
                                <button
                                    onClick={() => onOpenTool(article.id, 'refinery')}
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-md py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                >
                                    <Image size={14} /> Refinar Arte
                                </button>
                                <button
                                    onClick={() => onOpenTool(article.id, 'writer')} // Interlinking is part of Redactor now
                                    className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-md py-3 font-bold text-[11px] uppercase tracking-wider hover:bg-slate-50 transition flex items-center justify-center gap-2"
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
                        className="w-full h-12 rounded-md border border-rose-100 bg-rose-50/30 text-rose-500 flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                        {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        <span className="text-[11px] font-black uppercase tracking-widest">Eliminar permanentemente</span>
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Internal icons helper



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
        appliedTools: c.applied_tools || (c.seo_data ? ["planner", "writer"] : ["planner"]),
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
