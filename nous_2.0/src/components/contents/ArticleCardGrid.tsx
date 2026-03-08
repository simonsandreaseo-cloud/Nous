"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { Key, ChevronRight, AlertCircle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────
export type ArticleStatus = "planned" | "in-progress" | "ready" | "published";
export type ArticleTool =
    | "planner" | "refinery" | "briefings" | "writer"
    | "humanizer" | "images" | "interlinking" | "publisher";

export interface Article {
    id: string;
    title: string;
    keyword: string;
    status: ArticleStatus;
    scheduledDate: string; // ISO date string
    appliedTools: ArticleTool[];
    cluster?: string;
    author?: string;
}

// ── Mock data ──────────────────────────────────────────────────────────────
export const MOCK_ARTICLES: Article[] = [
    { id: "1", title: "Guía completa de SEO técnico para e-commerce en 2026", keyword: "seo tecnico ecommerce", status: "in-progress", scheduledDate: "2026-03-12", appliedTools: ["planner", "briefings", "writer"], cluster: "SEO Técnico" },
    { id: "2", title: "Cómo reducir el tiempo de carga de tu tienda online", keyword: "velocidad web ecommerce", status: "planned", scheduledDate: "2026-03-15", appliedTools: ["planner"], cluster: "Performance" },
    { id: "3", title: "Interlinking estratégico: crea silos de contenido perfectos", keyword: "interlinking estrategia", status: "ready", scheduledDate: "2026-03-10", appliedTools: ["planner", "briefings", "writer", "humanizer", "interlinking"], cluster: "SEO On Page" },
    { id: "4", title: "Google Search Console avanzado", keyword: "google search console", status: "published", scheduledDate: "2026-03-01", appliedTools: ["planner", "briefings", "writer", "humanizer", "images", "interlinking", "publisher"], cluster: "Herramientas SEO" },
    { id: "5", title: "Core Web Vitals: guía práctica 2026", keyword: "core web vitals", status: "planned", scheduledDate: "2026-03-18", appliedTools: [], cluster: "Performance" },
    { id: "6", title: "Estrategia de contenidos para SaaS B2B", keyword: "contenidos saas b2b", status: "in-progress", scheduledDate: "2026-03-20", appliedTools: ["planner", "refinery"], cluster: "Estrategia" },
    { id: "7", title: "Linkbuilding sin riesgos: técnicas white hat", keyword: "linkbuilding white hat", status: "planned", scheduledDate: "2026-03-25", appliedTools: [], cluster: "Link Building" },
    { id: "8", title: "Cómo hacer un keyword research profesional", keyword: "keyword research guia", status: "ready", scheduledDate: "2026-03-08", appliedTools: ["planner", "briefings", "writer", "humanizer"], cluster: "Investigación" },
];

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ArticleStatus, { label: string; color: string; dot: string }> = {
    planned: { label: "Planificado", color: "bg-[var(--color-nous-mist)]/10 text-[var(--color-nous-mist)] border-[var(--color-nous-mist)]/20", dot: "bg-[var(--color-nous-mist)]" },
    "in-progress": { label: "En proceso", color: "bg-[var(--color-nous-lavender)]/10 text-[var(--color-nous-lavender)] border-[var(--color-nous-lavender)]/20", dot: "bg-[var(--color-nous-lavender)]" },
    ready: { label: "Listo", color: "bg-[var(--color-nous-mint)]/10 text-emerald-600 border-[var(--color-nous-mint)]/20", dot: "bg-[var(--color-nous-mint)]" },
    published: { label: "Publicado", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

// ── Tool badge initials ────────────────────────────────────────────────────
const TOOL_INITIALS: Record<ArticleTool, string> = {
    planner: "P", refinery: "R", briefings: "B", writer: "W",
    humanizer: "H", images: "I", interlinking: "L", publisher: "M",
};

// ── Completeness score (0–100) ─────────────────────────────────────────────
function getCompletionScore(article: Article): number {
    let score = 0;
    if (article.keyword) score += 25;
    if (article.scheduledDate) score += 25;
    if (article.cluster) score += 15;
    score += Math.min(35, article.appliedTools.length * 5);
    return score;
}

// ── Article Card ──────────────────────────────────────────────────────────
function ArticleCard({ article, onOpen }: { article: Article; onOpen: (a: Article) => void }) {
    const status = STATUS_CONFIG[article.status];
    const score = getCompletionScore(article);
    const isIncomplete = score < 50;
    const isVeryIncomplete = score < 25;

    const date = new Date(article.scheduledDate);
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
            className={cn(
                "relative bg-white/60 backdrop-blur-sm border rounded-[20px] p-4 cursor-pointer transition-shadow flex flex-col gap-3 group",
                isVeryIncomplete
                    ? "border-[var(--color-nous-lavender)]/40 shadow-md"
                    : isIncomplete
                        ? "border-amber-200/60 shadow-sm"
                        : "border-slate-100 shadow-sm"
            )}
        >
            {/* Top row: status badge + date */}
            <div className="flex items-center justify-between">
                <span className={cn(
                    "inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full border",
                    status.color
                )}>
                    <span className={cn("w-1 h-1 rounded-full", status.dot)} />
                    {status.label}
                </span>
                <span className="text-[10px] text-slate-400 font-medium flex items-baseline gap-0.5">
                    <span className="text-sm font-black text-slate-600">{day}</span>
                    {" "}{month}
                </span>
            </div>

            {/* Title */}
            <p className="text-[13px] font-medium text-slate-800 leading-snug line-clamp-2 flex-1">
                {article.title}
            </p>

            {/* Keyword */}
            {article.keyword && (
                <div className="flex items-center gap-1.5">
                    <Key size={10} className="text-slate-300 shrink-0" />
                    <span className="text-[10px] text-slate-400 font-medium truncate">{article.keyword}</span>
                </div>
            )}

            {/* Bottom row: tool badges + open arrow */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 flex-wrap">
                    {article.appliedTools.slice(0, 5).map((tool) => (
                        <span
                            key={tool}
                            className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 flex items-center justify-center"
                            title={tool}
                        >
                            {TOOL_INITIALS[tool]}
                        </span>
                    ))}
                    {article.appliedTools.length === 0 && (
                        <span className="text-[9px] text-slate-300 uppercase tracking-widest font-bold">Sin procesar</span>
                    )}
                </div>
                <button className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-100 transition-all">
                    <ChevronRight size={12} />
                </button>
            </div>

            {/* Warning indicator for very incomplete articles */}
            {isVeryIncomplete && (
                <div className="absolute top-3 right-3">
                    <AlertCircle size={12} className="text-[var(--color-nous-lavender)] opacity-60" />
                </div>
            )}
        </motion.div>
    );
}

// ── Article Detail Drawer ─────────────────────────────────────────────────
function ArticleDetailDrawer({ article, onClose, onOpenTool }: {
    article: Article | null;
    onClose: () => void;
    onOpenTool: (toolId: string) => void;
}) {
    if (!article) return null;
    const status = STATUS_CONFIG[article.status];
    const score = getCompletionScore(article);
    const unappliedTools = (["planner", "refinery", "briefings", "writer", "humanizer", "images", "interlinking", "publisher"] as ArticleTool[])
        .filter(t => !article.appliedTools.includes(t));
    const nextSuggested = unappliedTools[0];

    return (
        <AnimatePresence>
            {article && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
                    />
                    {/* Drawer */}
                    <motion.div
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        className="fixed right-0 top-0 h-full w-[380px] z-50 bg-white/90 backdrop-blur-xl border-l border-slate-100 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-start justify-between mb-3">
                                <span className={cn(
                                    "inline-flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full border",
                                    status.color
                                )}>
                                    <span className={cn("w-1 h-1 rounded-full", status.dot)} />
                                    {status.label}
                                </span>
                                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-light leading-none">✕</button>
                            </div>
                            <h2 className="text-base font-semibold text-slate-900 leading-snug">{article.title}</h2>
                            {article.keyword && (
                                <p className="flex items-center gap-1.5 mt-2">
                                    <Key size={10} className="text-slate-300" />
                                    <span className="text-[11px] text-slate-400">{article.keyword}</span>
                                </p>
                            )}
                        </div>

                        {/* Completion score */}
                        <div className="px-6 py-4 border-b border-slate-100">
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completitud</span>
                                <span className="text-[10px] font-black text-slate-600">{score}%</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${score}%` }}
                                    className={cn(
                                        "h-full rounded-full",
                                        score >= 75 ? "bg-[var(--color-nous-mint)]" :
                                            score >= 50 ? "bg-[var(--color-nous-mist)]" :
                                                "bg-[var(--color-nous-lavender)]"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Applied tools timeline */}
                        <div className="px-6 py-4 flex-1 overflow-y-auto custom-scrollbar">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Historial de herramientas</p>
                            {article.appliedTools.length > 0 ? (
                                <div className="space-y-2">
                                    {article.appliedTools.map((tool, i) => (
                                        <div key={tool} className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[8px] font-black flex items-center justify-center shrink-0">
                                                {TOOL_INITIALS[tool]}
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-600 capitalize">{tool}</span>
                                            {i < article.appliedTools.length - 1 && (
                                                <div className="absolute left-[28px] w-px h-4 bg-slate-100" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-300 italic">Ninguna herramienta aplicada aún</p>
                            )}
                        </div>

                        {/* Next action */}
                        {nextSuggested && (
                            <div className="px-6 py-4 border-t border-slate-100">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Próxima acción sugerida</p>
                                <button
                                    onClick={() => onOpenTool(nextSuggested)}
                                    className="w-full py-3 px-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black tracking-widest uppercase hover:bg-slate-800 transition-colors"
                                >
                                    Abrir en {nextSuggested}
                                </button>
                            </div>
                        )}

                        {/* Quick actions */}
                        <div className="px-6 pb-6 flex gap-2">
                            <button className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors">
                                Marcar publicado
                            </button>
                            <button className="py-2 px-3 rounded-xl border border-red-100 text-[9px] font-black text-red-400 uppercase tracking-widest hover:bg-red-50 transition-colors">
                                Eliminar
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Main ArticleCardGrid ──────────────────────────────────────────────────
export function ArticleCardGrid({ onToolSelect }: { onToolSelect: (toolId: string) => void }) {
    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

    return (
        <div className="relative">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {MOCK_ARTICLES.map((article, i) => (
                    <ArticleCard
                        key={article.id}
                        article={article}
                        onOpen={setSelectedArticle}
                    />
                ))}
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {selectedArticle && (
                    <ArticleDetailDrawer
                        article={selectedArticle}
                        onClose={() => setSelectedArticle(null)}
                        onOpenTool={(toolId) => {
                            setSelectedArticle(null);
                            onToolSelect(toolId);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
