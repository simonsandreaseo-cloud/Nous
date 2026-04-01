"use client";

import { useState } from "react";
import { Article, ArticleStatus } from "./ArticleCardGrid";
import { cn } from "@/utils/cn";
import { ChevronUp, ChevronDown, Trash2, Send } from "lucide-react";
import { useWriterStore } from "@/store/useWriterStore";

const STATUS_LABELS: Record<string, string> = {
    planned: "Planificado",
    drafting: "En proceso",
    ready: "Listo",
    published: "Publicado",
    archived: "Archivado",
};

const STATUS_COLORS: Record<string, string> = {
    planned: "text-[var(--color-nous-mist)] bg-[var(--color-nous-mist)]/10",
    drafting: "text-[var(--color-nous-lavender)] bg-[var(--color-nous-lavender)]/10",
    ready: "text-emerald-600 bg-emerald-50",
    published: "text-slate-500 bg-slate-100",
    archived: "text-rose-500 bg-rose-50",
};

const TOOL_INITIALS: Record<string, string> = {
    planner: "P", refinery: "R", briefings: "B", writer: "W",
    humanizer: "H", images: "I", interlinking: "L", publisher: "M",
};

export function ArticleTable({ onToolSelect }: { onToolSelect: (toolId: string) => void }) {
    const { projectContents, loadContentById, deleteContent } = useWriterStore();
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortKey, setSortKey] = useState<keyof Article>("scheduledDate");
    const [sortAsc, setSortAsc] = useState(true);

    const articles: Article[] = projectContents.map(c => ({
        id: c.id,
        title: c.title,
        keyword: c.target_keyword || "",
        status: (c.status || "drafting") as ArticleStatus,
        scheduledDate: c.created_at,
        appliedTools: c.seo_data ? ["planner", "briefings", "writer"] : [],
    }));

    const toggleAll = () => {
        if (selected.size === articles.length) setSelected(new Set());
        else setSelected(new Set(articles.map(a => a.id)));
    };

    const toggleOne = (id: string) => {
        const s = new Set(selected);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelected(s);
    };

    const handleSort = (key: keyof Article) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else { setSortKey(key); setSortAsc(true); }
    };

    const sorted = [...articles].sort((a, b) => {
        const av = String(a[sortKey] ?? "");
        const bv = String(b[sortKey] ?? "");
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const handleDeleteSelected = async () => {
        if (!confirm(`¿Eliminar ${selected.size} artículos seleccionados?`)) return;
        for (const id of Array.from(selected)) {
            await deleteContent(id);
        }
        setSelected(new Set());
    };

    const handleOpenWriter = async () => {
         if (selected.size === 0) return;
         const firstId = Array.from(selected)[0];
         await loadContentById(firstId);
         onToolSelect('writer');
    };

    const SortIcon = ({ col }: { col: keyof Article }) => (
        <span className="inline-flex">
            {sortKey === col
                ? sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                : <ChevronUp size={10} className="opacity-20" />}
        </span>
    );

    return (
        <div className="flex flex-col gap-3">
            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-2xl">
                    <span className="text-[11px] font-black tracking-widest">{selected.size} seleccionado{selected.size > 1 ? "s" : ""}</span>
                    <div className="flex-1" />
                    <button 
                        onClick={handleOpenWriter}
                        className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase hover:text-slate-300 transition-colors"
                    >
                        <Send size={11} />Editar en Redactor
                    </button>
                    <button 
                        onClick={handleDeleteSelected}
                        className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Trash2 size={11} />Eliminar
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white/50 min-h-[400px]">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={articles.length > 0 && selected.size === articles.length}
                                    onChange={toggleAll}
                                    className="rounded border-slate-300"
                                />
                            </th>
                            {[
                                { key: "title" as keyof Article, label: "Título" },
                                { key: "keyword" as keyof Article, label: "Keyword" },
                                { key: "status" as keyof Article, label: "Estado" },
                                { key: "scheduledDate" as keyof Article, label: "Fecha" },
                            ].map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => handleSort(col.key)}
                                    className="px-4 py-3 text-[9px] font-black tracking-widest uppercase text-slate-400 cursor-pointer hover:text-slate-700 transition-colors select-none"
                                >
                                    <span className="flex items-center gap-1">
                                        {col.label} <SortIcon col={col.key} />
                                    </span>
                                </th>
                            ))}
                            <th className="px-4 py-3 text-[9px] font-black tracking-widest uppercase text-slate-400">Herramientas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((article) => (
                            <tr
                                key={article.id}
                                className={cn(
                                    "border-b border-slate-50 last:border-b-0 transition-colors cursor-pointer",
                                    selected.has(article.id) ? "bg-slate-50" : "hover:bg-slate-50/60"
                                )}
                            >
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(article.id)}
                                        onChange={() => toggleOne(article.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="rounded border-slate-300"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-[12px] font-medium text-slate-800 line-clamp-1 max-w-[280px]">{article.title}</p>
                                    {/* cluster omitted */}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[10px] text-slate-500 truncate max-w-[140px] block">{article.keyword}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={cn(
                                        "text-[9px] font-black tracking-widest uppercase px-2 py-1 rounded-full",
                                        STATUS_COLORS[article.status]
                                    )}>
                                        {STATUS_LABELS[article.status]}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-[11px] text-slate-500">
                                        {new Date(article.scheduledDate).toLocaleDateString("es", { day: "2-digit", month: "short" })}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1">
                                        {article.appliedTools.slice(0, 4).map(t => (
                                            <span key={t} className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-black text-slate-500 flex items-center justify-center">
                                                {TOOL_INITIALS[t]}
                                            </span>
                                        ))}
                                        {article.appliedTools.length > 4 && (
                                            <span className="text-[9px] text-slate-400">+{article.appliedTools.length - 4}</span>
                                        )}
                                        {article.appliedTools.length === 0 && (
                                            <span className="text-[9px] text-slate-300">—</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
