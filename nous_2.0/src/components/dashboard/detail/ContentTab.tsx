'use client';

import { useMemo } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
    FileText,
    CheckCircle2,
    AlertCircle,
    Zap,
    History,
    MessageSquare,
    Sparkles,
    Link2,
    Check
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';

interface ContentTabProps {
    task: Task;
}

export default function ContentTab({ task }: ContentTabProps) {
    const router = useRouter();
    const { activeProject } = useProjectStore();
    const { initializeFromTask } = useWriterStore();

    const wordCount = useMemo(() => {
        if (!task.content_body) return 0;
        return task.content_body.replace(/<[^>]*>?/gm, '').trim().split(/\s+/).filter(Boolean).length;
    }, [task.content_body]);

    const targetWords = task.target_word_count || 1000;
    const progress = Math.min((wordCount / targetWords) * 100, 100);

    const lsiKeywords = useMemo(() => {
        return task.lsi_keywords ||
            task.research_dossier?.keywords?.slice(0, 8).map((k: any) => k.keyword) ||
            [];
    }, [task.lsi_keywords, task.research_dossier]);

    const foundLsi = lsiKeywords.filter((kw: string) =>
        task.content_body?.toLowerCase().includes(kw.toLowerCase())
    );

    const suggestedInternalLinks = useMemo(() => {
        return task.seo_data?.suggestedInternalLinks || 
               task.research_dossier?.suggestedInternalLinks || [];
    }, [task.seo_data, task.research_dossier]);

    const foundInternalLinks = suggestedInternalLinks.filter((link: any) =>
        task.content_body?.includes(link.url)
    );

    const mainKwCount = task.target_keyword
        ? (task.content_body?.toLowerCase().split(task.target_keyword.toLowerCase()).length || 1) - 1
        : 0;
    const density = wordCount > 0 ? ((mainKwCount / wordCount) * 100).toFixed(2) : '0.00';

    return (
        <div className="grid grid-cols-12 gap-8">
            {/* Left: Content Preview */}
            <div className="col-span-8 flex flex-col gap-6">
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 min-h-[520px] flex flex-col">
                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                        <div className="flex items-center gap-3 text-slate-400">
                            <FileText size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cuerpo del Contenido</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{wordCount} palabras</span>
                    </div>

                    {task.content_body ? (
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            <div
                                className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-base"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(task.content_body) }}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 rounded-lg bg-indigo-50 flex items-center justify-center mb-6">
                                <Zap size={36} className="text-indigo-400" />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Sin contenido redactado</p>
                            <p className="text-[10px] mt-2 font-bold uppercase tracking-widest text-slate-300 max-w-[200px] leading-relaxed">
                                Usa una herramienta de Nous para generar la pieza
                            </p>
                        </div>
                    )}
                </div>

                {/* Open With Dock */}
                <div className="bg-slate-900 rounded-[32px] p-2 flex items-center justify-between shadow-2xl border border-white/10">
                    <div className="flex items-center gap-3 px-6">
                        <Sparkles className="text-indigo-400" size={18} />
                        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Studio Nous</span>
                    </div>
                    <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg">
                        {[
                            { label: 'Redactor Pro', icon: Zap, onClick: () => { initializeFromTask(task, activeProject); router.push('/contents/writer'); } },
                            { label: 'Humanizador', icon: Sparkles, onClick: () => router.push(`/writer?mode=humanize&activeTaskId=${task.id}`) },
                            { label: 'Corrector IA', icon: Check, onClick: () => router.push(`/contents/corrector?taskId=${task.id}`) },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                onClick={btn.onClick}
                                className="px-5 py-3 hover:bg-white/10 text-white rounded-md text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <btn.icon size={12} className="text-white/40" />
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Analysis Panel */}
            <div className="col-span-4 space-y-5">
                {/* Word Count */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Métrica de Extensión</span>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter">
                                {wordCount}
                                <span className="text-sm font-bold text-slate-300 ml-2">/ {targetWords}</span>
                            </h3>
                        </div>
                        <div className={cn(
                            'text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md border transition-colors',
                            progress >= 100 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-indigo-600 text-white border-indigo-500'
                        )}>
                            {progress >= 100 ? 'Meta ✓' : `${Math.round(progress)}%`}
                        </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={cn(
                                'h-full rounded-full',
                                progress >= 100 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-indigo-500 shadow-lg shadow-indigo-500/20'
                            )}
                        />
                    </div>
                </div>

                {/* Internal Links Checker */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Link2 size={16} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Interlinking Checker</span>
                        </div>
                        <span className={cn(
                            'text-[10px] font-black px-3 py-1.5 rounded-md border',
                            foundInternalLinks.length > 0 ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'
                        )}>
                            {foundInternalLinks.length}/{suggestedInternalLinks.length}
                        </span>
                    </div>

                    <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                        {suggestedInternalLinks.length > 0 ? suggestedInternalLinks.map((link: any, i: number) => {
                            const isPresent = task.content_body?.includes(link.url);
                            return (
                                <a 
                                    key={i} 
                                    href={link.url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className={cn(
                                        'flex items-center justify-between px-4 py-3 rounded-lg border text-[10px] font-bold transition-all group',
                                        isPresent
                                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-300'
                                    )}
                                >
                                    <span className="truncate max-w-[180px] uppercase tracking-wide group-hover:underline">
                                        {link.title || link.url.replace(activeProject?.domain || '', '').replace(/https?:\/\//, '')}
                                    </span>
                                    {isPresent ? (
                                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm">
                                            <CheckCircle2 size={12} />
                                        </div>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-slate-200/50 flex items-center justify-center text-slate-300">
                                            <AlertCircle size={12} />
                                        </div>
                                    )}
                                </a>
                            );
                        }) : (
                            <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-relaxed px-6">
                                    No hay sugerencias de interlinking para esta pieza
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* LSI Checker */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-emerald-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Semántica LSI</span>
                        </div>
                        <span className={cn(
                            'text-[10px] font-black px-3 py-1.5 rounded-md border',
                            foundLsi.length === lsiKeywords.length && lsiKeywords.length > 0
                                ? 'bg-emerald-500 text-white border-emerald-400'
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                        )}>
                            {foundLsi.length}/{lsiKeywords.length}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto custom-scrollbar p-1">
                        {lsiKeywords.length > 0 ? lsiKeywords.map((kw: string, i: number) => {
                            const isPresent = task.content_body?.toLowerCase().includes(kw.toLowerCase());
                            return (
                                <div key={i} className={cn(
                                    'px-4 py-2 rounded-md border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm',
                                    isPresent
                                        ? 'bg-emerald-500 text-white border-emerald-400'
                                        : 'bg-white border-slate-100 text-slate-300'
                                )}>
                                    {kw}
                                </div>
                            );
                        }) : (
                            <div className="w-full text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sin data semántica</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Keyword Density */}
                <div className="bg-slate-900 rounded-[32px] p-7 text-white shadow-2xl relative overflow-hidden border border-white/5">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-4">Densidad de Keyword</span>
                    <div className="flex items-end justify-between mb-4">
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black italic text-white tracking-tighter">{density}%</h4>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-[0.2em]">
                                {task.target_keyword || 'SEO Target'}
                            </p>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg text-[9px] font-black uppercase text-white/50 border border-white/5">
                            Ideal: 1%
                        </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(parseFloat(density) * 100, 100)}%` }} />
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="flex items-center justify-center gap-3 p-5 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-all group shadow-sm">
                        <History size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Historial</span>
                    </button>
                    <button className="flex items-center justify-center gap-3 p-5 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-all group shadow-sm">
                        <MessageSquare size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Feedback</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
