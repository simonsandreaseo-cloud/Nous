'use client';

import { useState, useEffect } from 'react';
import {
    Globe,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Circle,
    Link2,
    ExternalLink,
    Target,
    BarChart3,
    Save,
    Lightbulb,
    Loader2,
    ArrowRight,
    Database,
    Sparkles
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { useProjectStore } from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

interface SEOTabProps {
    task: Task;
}

// Fields to measure completeness
const SEO_FIELDS = [
    { key: 'target_keyword', label: 'Keyword Principal', weight: 20 },
    { key: 'volume', label: 'Volumen de Búsqueda', weight: 15 },
    { key: 'brief', label: 'Brief / Intención', weight: 10 },
    { key: 'research_dossier', label: 'Dossier de Investigación', weight: 25 },
    { key: 'lsi_keywords', label: 'Keywords LSI', weight: 15 },
    { key: 'refs', label: 'URLs de Referencia', weight: 10 },
    { key: 'target_url_slug', label: 'Slug de la URL', weight: 5 },
];

export default function SEOTab({ task }: SEOTabProps) {
    const { updateTask, activeProject, fetchProjectInventory } = useProjectStore();
    const [competitorIndex, setCompetitorIndex] = useState(0);
    const [editableTask, setEditableTask] = useState<Partial<Task>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [projectUrls, setProjectUrls] = useState<{ url: string; title?: string }[]>([]);
    const [showWPModal, setShowWPModal] = useState(false);

    const dossier = (task as any).research_dossier || (task as any).seo_data || {};
    const competitors: any[] = dossier.competitors || dossier.top10Urls || [];
    const currentComp = competitors[competitorIndex];

    // Data completeness calculation
    const completeness = SEO_FIELDS.reduce((acc, field) => {
        let val = (task as any)[field.key];
        
        // Fallback to dossier for specific fields
        if (!val || (Array.isArray(val) && val.length === 0)) {
            if (field.key === 'lsi_keywords') val = dossier.lsiKeywords;
            if (field.key === 'research_dossier') val = dossier;
            if (field.key === 'refs') val = dossier.top10Urls || dossier.competitors;
        }

        const hasValue = val !== null && val !== undefined && val !== '' &&
            !(Array.isArray(val) && val.length === 0) &&
            !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0);
        return acc + (hasValue ? field.weight : 0);
    }, 0);

    useEffect(() => {
        if (activeProject) {
            fetchProjectInventory(activeProject.id).then(urls => setProjectUrls(urls));
        }
    }, [activeProject]);

    const handleSave = async () => {
        if (Object.keys(editableTask).length === 0) return;
        setIsSaving(true);
        await updateTask(task.id, editableTask);
        setIsSaving(false);
        setEditableTask({});
    };

    const handleChange = (key: keyof Task, value: any) => {
        setEditableTask(prev => ({ ...prev, [key]: value }));
    };

    const currentVal = (key: keyof Task) =>
        key in editableTask ? (editableTask as any)[key] : (task as any)[key];

    return (
        <div className="grid grid-cols-12 gap-8">
            {/* Left Col: Critical Data + Interlinking */}
            <div className="col-span-5 space-y-6">
                {/* Data Completeness */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Completitud de Datos SEO</span>
                        <span className={cn(
                            'text-[10px] font-black px-3 py-1 rounded-lg',
                            completeness >= 80 ? 'bg-emerald-100 text-emerald-600' :
                            completeness >= 50 ? 'bg-amber-100 text-amber-600' :
                            'bg-red-50 text-red-400'
                        )}>
                            {completeness}%
                        </span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completeness}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={cn(
                                'h-full rounded-full',
                                completeness >= 80 ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' :
                                completeness >= 50 ? 'bg-amber-500' : 'bg-red-400'
                            )}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {SEO_FIELDS.map(field => {
                            let val = (task as any)[field.key];
                            if (!val || (Array.isArray(val) && val.length === 0)) {
                                if (field.key === 'lsi_keywords') val = dossier.lsiKeywords;
                                if (field.key === 'research_dossier') val = dossier;
                                if (field.key === 'refs') val = dossier.top10Urls || dossier.competitors;
                            }

                            const has = val !== null && val !== undefined && val !== '' &&
                                !(Array.isArray(val) && val.length === 0) &&
                                !(typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0);
                            return (
                                <div key={field.key} className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] font-bold uppercase',
                                    has ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-slate-50 border-slate-100 text-slate-300'
                                )}>
                                    {has ? <CheckCircle2 size={10} className="shrink-0" /> : <Circle size={10} className="shrink-0" />}
                                    <span className="truncate">{field.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Keyword & Metrics Panel */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm space-y-5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Datos Críticos & SEO Técnico</span>

                    <div className="space-y-4">
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-2.5">Keyword Principal</label>
                            <input
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                defaultValue={task.target_keyword || ''}
                                onBlur={(e) => handleChange('target_keyword', e.target.value)}
                                placeholder="Ej: marketing digital..."
                            />
                        </div>

                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">H1 (Título del Artículo)</label>
                            <input
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                defaultValue={task.h1 || ''}
                                onBlur={(e) => handleChange('h1', e.target.value)}
                                placeholder="Título H1..."
                            />
                        </div>

                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">SEO Title (max 60)</label>
                            <input
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                defaultValue={task.seo_title || ''}
                                onBlur={(e) => handleChange('seo_title', e.target.value)}
                                placeholder="Título para el buscador..."
                            />
                        </div>

                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Meta Descripción</label>
                            <textarea
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                                rows={2}
                                defaultValue={task.meta_description || ''}
                                onBlur={(e) => handleChange('meta_description', e.target.value)}
                                placeholder="Descripción corta para Google..."
                            />
                        </div>

                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Extracto / Resumen</label>
                            <textarea
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                                rows={3}
                                defaultValue={task.excerpt || ''}
                                onBlur={(e) => handleChange('excerpt', e.target.value)}
                                placeholder="Resumen corto del contenido..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Slug URL Final</label>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm group-focus-within:border-indigo-500 transition-all">
                                    <span className="text-[10px] font-black text-slate-300">/</span>
                                    <input
                                        className="w-full text-sm font-mono text-slate-700 focus:outline-none"
                                        defaultValue={task.target_url_slug || ''}
                                        onBlur={(e) => handleChange('target_url_slug', e.target.value)}
                                        placeholder="mi-articulo-seo"
                                    />
                                </div>
                            </div>
                            <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Palabras Meta</label>
                                <input
                                    type="number"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                    defaultValue={task.target_word_count || ''}
                                    onBlur={(e) => handleChange('target_word_count', parseInt(e.target.value))}
                                    placeholder="1500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* LSI Keywords */}
                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Keywords LSI Sugeridas</label>
                        <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl min-h-[100px] content-start">
                            {(() => {
                                const lsi = task.lsi_keywords || dossier.lsiKeywords || [];
                                return lsi.length > 0 ? (
                                    lsi.map((kw: any, i: number) => {
                                        const label = typeof kw === 'string' ? kw : kw.keyword;
                                        return (
                                            <div 
                                                key={i} 
                                                className="group relative flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-default"
                                            >
                                                <span>{label}</span>
                                                <button 
                                                    onClick={() => {
                                                        const newList = lsi.filter((_: any, idx: number) => idx !== i);
                                                        handleChange('lsi_keywords', newList);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-50 hover:text-red-500 rounded-md"
                                                >
                                                    <Circle size={8} className="fill-current" />
                                                </button>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="w-full flex flex-col items-center justify-center py-4 text-slate-300">
                                        <Sparkles size={20} className="mb-2 opacity-20" />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Sin keywords LSI</span>
                                    </div>
                                );
                            })()}
                            
                            {/* Simple inline add input */}
                            <input 
                                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-[10px] font-bold text-slate-400 placeholder:text-slate-300 p-1"
                                placeholder="+ Añadir keyword..."
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value.trim();
                                        if (val) {
                                            const newList = [...(task.lsi_keywords || []), val];
                                            handleChange('lsi_keywords', newList);
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Save Button */}
                    {Object.keys(editableTask).length > 0 && (
                        <motion.button
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-900 transition-all shadow-lg"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </motion.button>
                    )}
                </div>

                {/* Interlinking Section */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm space-y-6">
                    {/* AI Suggested Links */}
                    {dossier.suggestedInternalLinks?.length > 0 && (
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <Sparkles size={16} className="text-indigo-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sugerencias Neural Hub</span>
                            </div>
                            <div className="space-y-2">
                                {dossier.suggestedInternalLinks.map((link: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between px-4 py-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl transition-all group shadow-sm">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[10px] font-black uppercase tracking-wide truncate pr-4 text-indigo-700">
                                                {link.title}
                                            </span>
                                            <span className="text-[8px] font-mono text-indigo-400 truncate opacity-50">{link.url}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black uppercase tracking-widest">Recomendado</div>
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg transition-colors text-indigo-300 hover:text-indigo-600 shadow-inner">
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* General Inventory */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <Link2 size={16} className="text-slate-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Inventario del Proyecto</span>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {projectUrls.length > 0 ? projectUrls.slice(0, 10).map((u, i) => {
                                const isPresent = task.content_body?.includes(u.url);
                                const isSuggested = dossier.suggestedInternalLinks?.some((sl: any) => sl.url === u.url);
                                if (isSuggested) return null; // Don't duplicate

                                return (
                                    <div key={i} className={cn(
                                        "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all group shadow-sm",
                                        isPresent ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="flex flex-col min-w-0">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-wide truncate pr-4",
                                                isPresent ? "text-emerald-700" : "text-slate-600"
                                            )}>
                                                {u.title || u.url.replace(/https?:\/\//, '').split('/')[1] || 'Internal Link'}
                                            </span>
                                            <span className="text-[8px] font-mono text-slate-400 truncate opacity-50">{u.url}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isPresent && (
                                                <div className="px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-black uppercase tracking-widest">Linked</div>
                                            )}
                                            <a href={u.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg transition-colors text-slate-300 hover:text-indigo-500 shadow-inner">
                                                <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
                                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Sin URLs del proyecto. Ejecuta la auditoría GSC.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Schema Suggestions */}
                {task.schemas && (
                    <div className="bg-slate-900 rounded-[32px] p-7 shadow-2xl relative overflow-hidden group border border-slate-800">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                            <Database size={80} className="text-indigo-500" />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={14} className="text-indigo-400" />
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block">Schema JSON-LD Definido</label>
                        </div>
                        <div className="bg-slate-950/50 rounded-2xl p-5 font-mono text-[10px] text-indigo-300 overflow-x-auto custom-scrollbar max-h-[200px] border border-slate-800/50">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(task.schemas, null, 2)}</pre>
                        </div>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-4 flex items-center gap-2">
                             <CheckCircle2 size={10} className="text-emerald-500" /> 
                             Listo para inyectar en WordPress
                        </p>
                    </div>
                )}
            </div>

            {/* Right Col: Competition Research */}
            <div className="col-span-7 space-y-6">
                {/* Snippet Preview (Mock) */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <Globe size={16} className="text-indigo-500" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Preview SERP</span>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-1.5">
                            {task.target_url_slug ? `tusitio.com${task.target_url_slug}` : 'tusitio.com/...'}
                        </p>
                        <h3 className="text-indigo-700 text-sm font-bold leading-snug mb-1 hover:underline cursor-pointer">
                            {task.title || 'Título del artículo'}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {task.brief || 'Escribe una meta descripción relevante para este contenido. Aparecerá aquí en los resultados de Google.'}
                        </p>
                    </div>
                    {/* WordPress Mockup */}
                    <button
                        onClick={() => setShowWPModal(true)}
                        className="mt-4 w-full flex items-center justify-between px-5 py-3 bg-[#21759b]/10 hover:bg-[#21759b]/15 text-[#21759b] border border-[#21759b]/20 rounded-2xl transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Globe size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Publicar en WordPress</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase bg-[#21759b]/10 px-2 py-1 rounded-lg">Próximamente</span>
                    </button>
                </div>

                {/* Competitor Research Hub */}
                <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Target size={16} className="text-indigo-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dossier de Competidores</span>
                        </div>
                        {competitors.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setCompetitorIndex(Math.max(0, competitorIndex - 1))} disabled={competitorIndex === 0}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30">
                                    <ChevronLeft size={14} />
                                </button>
                                <span className="text-[10px] font-black text-slate-500 min-w-[60px] text-center">
                                    {competitorIndex + 1} / {competitors.length}
                                </span>
                                <button onClick={() => setCompetitorIndex(Math.min(competitors.length - 1, competitorIndex + 1))} disabled={competitorIndex === competitors.length - 1}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-30">
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Competitor Tabs selector */}
                    {competitors.length > 0 && (
                        <div className="flex gap-2 mb-6 flex-wrap">
                            {competitors.map((_: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => setCompetitorIndex(i)}
                                    className={cn(
                                        'px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border',
                                        i === competitorIndex
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-indigo-200 hover:text-indigo-500'
                                    )}
                                >
                                    Comp. {i + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    {currentComp ? (
                        <motion.div
                            key={competitorIndex}
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-5"
                        >
                            {/* URL */}
                            <a href={currentComp.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-3 px-5 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all group"
                            >
                                <Globe size={14} className="text-indigo-400 shrink-0" />
                                <span className="text-[10px] font-bold truncate">{currentComp.url}</span>
                                <ExternalLink size={12} className="shrink-0 ml-auto text-slate-500 group-hover:text-white" />
                            </a>

                            {/* Metrics row */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Palabras', value: currentComp.word_count?.toLocaleString() || '—' },
                                    { label: 'H2s', value: currentComp.h2_count || '—' },
                                    { label: 'Dominio', value: currentComp.domain_authority ? `DA${currentComp.domain_authority}` : '—' },
                                ].map(m => (
                                    <div key={m.label} className="bg-slate-50 rounded-2xl p-4 text-center border border-slate-100">
                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{m.label}</span>
                                        <span className="text-sm font-black text-slate-700">{m.value}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Keywords */}
                            {currentComp.keywords && currentComp.keywords.length > 0 && (
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Keywords del Competidor</span>
                                    <div className="flex flex-wrap gap-2">
                                        {currentComp.keywords.slice(0, 12).map((kw: any, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-[9px] font-bold uppercase">
                                                {typeof kw === 'string' ? kw : kw.keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Outline if present */}
                            {currentComp.headers && currentComp.headers.length > 0 && (
                                <div>
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Estructura de Encabezados</span>
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {currentComp.headers.map((h: any, i: number) => (
                                            <div key={i} className={cn(
                                                'px-4 py-2.5 rounded-xl border text-[10px] font-bold',
                                                h.tag === 'h1' ? 'bg-slate-900 text-white border-slate-900 ml-0' :
                                                h.tag === 'h2' ? 'bg-slate-100 text-slate-700 border-slate-200 ml-4' :
                                                'bg-slate-50 text-slate-500 border-slate-100 ml-8'
                                            )}>
                                                <span className="text-[8px] opacity-50 mr-2 font-black uppercase">{h.tag}</span>
                                                {h.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Intent summary */}
                            {currentComp.summary && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb size={12} className="text-indigo-600" />
                                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Resumen IA</span>
                                    </div>
                                    <p className="text-xs text-indigo-800 leading-relaxed">{currentComp.summary}</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                            <BarChart3 size={40} className="text-slate-200 mb-4" />
                            <p className="text-sm font-black uppercase tracking-widest text-slate-300">Sin datos de investigación</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2 max-w-[200px] leading-relaxed">
                                Inicia la investigación SEO para analizar competidores
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* WordPress Modal (Mockup) */}
            {showWPModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowWPModal(false)}>
                    <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="w-16 h-16 bg-[#21759b]/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Globe size={28} className="text-[#21759b]" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 uppercase italic text-center tracking-tighter mb-2">WordPress Sync</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center mb-8">Próximamente disponible</p>
                        <div className="space-y-3 opacity-50 pointer-events-none">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">URL del Sitio WP</span>
                                <input className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="https://tusitio.com" disabled />
                            </div>
                            <button className="w-full py-4 bg-[#21759b] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2" disabled>
                                <Globe size={14} /> Publicar como Borrador
                            </button>
                            <button className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2" disabled>
                                <ArrowRight size={14} /> Publicar Directamente
                            </button>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mt-6">
                            Esta integración se habilitará en una próxima versión de Nous.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
