'use client';
import { useState } from 'react';
import { 
    CheckCircle2, 
    ChevronRight, 
    Hash, 
    Link2, 
    MessageSquare, 
    Search, 
    ExternalLink, 
    Sparkles, 
    Database, 
    Target, 
    Globe, 
    Circle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';
import { motion } from 'framer-motion';

interface SEODataTabProps {
    seoData: any;
    currentContent: string;
}

// Fields to measure completeness - Sync with Dashboard SEOTab.tsx
const SEO_FIELDS = [
    { key: 'keyword', label: 'Keyword Principal', weight: 20 },
    { key: 'strategyVolume', label: 'Volumen', weight: 15 },
    { key: 'strategyH1', label: 'H1 / Título SEO', weight: 25 },
    { key: 'strategyLSI', label: 'LSI Keywords', weight: 15 },
    { key: 'uniqueLinks', label: 'Internal Links', weight: 15 },
    { key: 'strategySlug', label: 'Slug / URL', weight: 10 },
];

export default function SEODataTab({ seoData, currentContent }: SEODataTabProps) {
    const { 
        keyword,
        strategyLSI, 
        strategyQuestions, 
        strategyLinks, 
        strategyInternalLinks,
        removeStrategyLSI,
        removeStrategyQuestion,
        researchDossier,
        strategyVolume, 
        strategyDifficulty,
        csvData,
        // Metadata Strategy fields
        strategyH1,
        strategyTitle,
        strategySlug,
        strategyDesc,
        strategyExcerpt,
        strategyWordCount,
        // Setters
        setStrategyH1,
        setStrategyTitle,
        setStrategySlug,
        setStrategyDesc,
        setStrategyExcerpt
    } = useWriterStore();

    // Local state to track "Done" items (checklist)
    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    // Derived Data
    const lsiKeywords = strategyLSI.length > 0 ? strategyLSI : (researchDossier?.lsiKeywords || seoData?.lsiKeywords || []);
    const frequentQuestions = strategyQuestions.length > 0 ? strategyQuestions : (researchDossier?.frequentQuestions || seoData?.frequentQuestions || []);
    
    const allLinksSource = [
        ...(strategyLinks || []), 
        ...(strategyInternalLinks || []), 
        ...(researchDossier?.suggestedInternalLinks || []),
        ...(researchDossier?.suggested_links || []),
        ...(seoData?.suggestedInternalLinks || [])
    ];
    
    const linkEntries: [string, any][] = allLinksSource
        .filter(l => !!l)
        .map((item): [string, any] => {
            const url = typeof item === 'object' ? (item.url || item.link) : item;
            const title = typeof item === 'object' ? item.title : url;
            return [url, { title: title || url, url }];
        })
        .filter(([url]) => !!url);

    const uniqueLinks = Array.from(new Map(linkEntries).values());

    // Completeness logic
    const completeness = SEO_FIELDS.reduce((acc, field) => {
        let has = false;
        if (field.key === 'keyword') has = !!keyword;
        if (field.key === 'strategyVolume') has = !!(strategyVolume || researchDossier?.searchVolume);
        if (field.key === 'strategyH1') has = !!(strategyH1 || strategyTitle);
        if (field.key === 'strategyLSI') has = lsiKeywords.length > 0;
        if (field.key === 'uniqueLinks') has = uniqueLinks.length > 0;
        if (field.key === 'strategySlug') has = !!strategySlug;
        return acc + (has ? field.weight : 0);
    }, 0);

    const toggleItem = (id: string) => {
        setCheckedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isUsed = (k: any) => {
        const text = typeof k === 'string' ? k : k.keyword;
        return currentContent.toLowerCase().includes(text.toLowerCase());
    };

    if (!researchDossier && !seoData && lsiKeywords.length === 0) {
        return (
            <div className="h-[400px] flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-dashed border-slate-200 rounded-[32px] m-4">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">Esperando Research</p>
                <p className="text-[11px] font-bold mt-2 text-center opacity-60">
                    Ejecuta un Deep Research para obtener métricas y keywords LSI sugeridas.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-10 animate-in fade-in duration-500 pb-20">
            {/* DATA COMPLETENESS - DASHBOARD STYLE */}
            <div className="bg-white rounded-[32px] p-7 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Salud SEO del Artículo</span>
                    <span className={cn(
                        'text-[10px] font-black px-3 py-1 rounded-lg',
                        completeness >= 80 ? 'bg-emerald-100 text-emerald-600' :
                        completeness >= 50 ? 'bg-amber-100 text-amber-600' :
                        'bg-red-50 text-red-400'
                    )}>
                        {completeness}%
                    </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
            </div>

            {/* CRITICAL METRICS */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-5 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Volumen</p>
                    <p className="text-xl font-black text-slate-800 tabular-nums">
                        {(strategyVolume || researchDossier?.searchVolume || '0').toLocaleString()}
                    </p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Dificultad</p>
                    <div className="flex items-center gap-2">
                        <p className="text-xl font-black text-slate-800">{strategyDifficulty || researchDossier?.keywordDifficulty || '0'}</p>
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-[24px] shadow-sm">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1.5 tracking-widest">Intención</p>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wide truncate">
                        {(researchDossier as any)?.intent || 'Informacional'}
                    </p>
                </div>
            </div>

            {/* METADATA STRATEGY - THE "FICHA" CONTENT */}
            <section className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                    <Target size={16} className="text-indigo-500" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Estrategia de Metadatos</h4>
                </div>

                <div className="grid gap-4">
                    {/* H1 Title */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">H1 (Título del Artículo)</label>
                        <input
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                            value={strategyH1 || ''}
                            onChange={(e) => setStrategyH1(e.target.value)}
                            placeholder="Ej: Guía Suprema de SEO..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* SEO Title */}
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">SEO Title (max 60)</label>
                            <input
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-sm"
                                value={strategyTitle || ''}
                                onChange={(e) => setStrategyTitle(e.target.value)}
                                placeholder="Título para el buscador..."
                            />
                        </div>
                        {/* Slug */}
                        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Slug URL Final</label>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm group-focus-within:border-indigo-500 transition-all">
                                <span className="text-[10px] font-black text-slate-300">/</span>
                                <input
                                    className="w-full text-sm font-mono text-slate-700 focus:outline-none"
                                    value={strategySlug || ''}
                                    onChange={(e) => setStrategySlug(e.target.value)}
                                    placeholder="mi-articulo-seo"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Meta Description */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Meta Descripción</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                            rows={3}
                            value={strategyDesc || ''}
                            onChange={(e) => setStrategyDesc(e.target.value)}
                            placeholder="Descripción persuasiva para Google..."
                        />
                    </div>

                    {/* Excerpt */}
                    <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2.5">Extracto / Resumen</label>
                        <textarea
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all shadow-sm resize-none"
                            rows={3}
                            value={strategyExcerpt || ''}
                            onChange={(e) => setStrategyExcerpt(e.target.value)}
                            placeholder="Breve resumen del contenido..."
                        />
                    </div>
                </div>
            </section>

            {/* GEO COMPETITORS (AI AUTHORITY) */}
            {(researchDossier?.geoUrls || (seoData as any)?.geoUrls) && (
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <Globe size={16} className="text-emerald-500" />
                        <div className="flex flex-col">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Fuentes de Autoridad IA (GEO)</h4>
                            <span className="text-[8px] font-bold text-emerald-400/60 uppercase tracking-widest ml-0">Google Search Grounding Discovery</span>
                        </div>
                    </div>
                    <div className="grid gap-3">
                        {(researchDossier?.geoUrls || (seoData as any)?.geoUrls).map((ref: any, idx: number) => (
                            <div key={idx} className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between group shadow-sm hover:bg-white transition-all">
                                <div className="flex flex-col min-w-0 pr-4">
                                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wide truncate">{ref.title}</span>
                                    <span className="text-[8px] font-mono text-emerald-600/60 truncate">{ref.url}</span>
                                </div>
                                <a 
                                    href={ref.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="p-2 bg-white rounded-xl shadow-sm text-emerald-400 hover:text-emerald-600 transition-colors shrink-0"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* LSI KEYWORDS - PRESERVED CHIP LAYOUT */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                        <Hash size={14} />
                        Palabras Clave LSI
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {lsiKeywords.length} Sugeridas
                    </span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {lsiKeywords.map((k: any, idx: number) => {
                        const kw = typeof k === 'string' ? k : k.keyword;
                        const used = isUsed(kw);
                        const id = `k-${idx}`;
                        const isConfirming = confirmDeleteId === idx;

                        return (
                            <div 
                                key={id}
                                className={cn(
                                    "group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all shadow-sm",
                                    used || checkedItems.includes(id) 
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                                        : "bg-white border-slate-200 text-slate-600 hover:border-emerald-200"
                                )}
                            >
                                <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => toggleItem(id)}
                                >
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        used ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                    )} />
                                    <span className="text-[11px] font-bold break-all leading-tight">
                                        {kw}
                                    </span>
                                    {used && <CheckCircle2 size={12} className="text-emerald-500 ml-0.5" />}
                                </div>

                                {isConfirming ? (
                                    <div className="flex items-center gap-1 ml-1 pl-1 border-l border-emerald-200/50 animate-in slide-in-from-right-1">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeStrategyLSI(idx); setConfirmDeleteId(null); }}
                                            className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-700"
                                        >
                                            OK
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                            className="p-1 hover:bg-slate-100 rounded text-slate-400"
                                        >
                                            <Hash size={8} />
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(idx); }}
                                        className="opacity-0 group-hover:opacity-100 w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center transition-all hover:bg-rose-500 ml-1"
                                    >
                                        <div className="text-[10px] leading-none">×</div>
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* PAA QUESTIONS */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                        <MessageSquare size={14} />
                        Preguntas SERP
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {frequentQuestions.length} PAA
                    </span>
                </div>
                <div className="space-y-3">
                    {frequentQuestions.map((q: string, idx: number) => {
                        const id = `q-${idx}`;
                        const isDone = checkedItems.includes(id);
                        return (
                            <div 
                                key={id}
                                className={cn(
                                    "p-4 border rounded-2xl flex items-start gap-3 transition-all cursor-pointer group shadow-sm relative",
                                    isDone ? "bg-indigo-50/10 border-indigo-500/30" : "bg-white border-slate-200 hover:border-indigo-200"
                                )}
                                onClick={() => toggleItem(id)}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-lg border-2 mt-0.5 flex items-center justify-center transition-colors shrink-0",
                                    isDone ? "bg-indigo-500 border-indigo-500 text-white" : "border-slate-200 group-hover:border-indigo-400"
                                )}>
                                    {isDone && <CheckCircle2 size={12} />}
                                </div>
                                <span className={cn(
                                    "text-[11px] font-bold leading-relaxed pr-6",
                                    isDone ? "text-indigo-900" : "text-slate-700 group-hover:text-indigo-600"
                                )}>
                                    {q}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* INTERNAL LINKS - DASHBOARD STYLE */}
            {uniqueLinks.length > 0 && (
                <section className="bg-white/50 border border-indigo-100 rounded-[28px] p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                <Sparkles size={16} className="text-indigo-500" />
                                Enlaces Sugeridos por Nous
                            </h4>
                            <span className="text-[8px] font-bold text-indigo-400/60 uppercase tracking-widest ml-6">Basado en Relevancia Semántica</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600">
                                    {uniqueLinks.filter((l: any) => {
                                        const slug = l.url.replace(/^https?:\/\/[^\/]+/, '');
                                        return currentContent.includes(l.url) || (slug.length > 1 && currentContent.includes(slug));
                                    }).length} / {uniqueLinks.length}
                                </span>
                                <CheckCircle2 size={12} className="text-emerald-500" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {uniqueLinks.map((link: any, i: number) => {
                            const slug = link.url.replace(/^https?:\/\/[^\/]+/, '');
                            const isDone = currentContent.includes(link.url) || (slug.length > 1 && currentContent.includes(slug));
                            return (
                                <div key={i} className={cn(
                                    "flex items-center justify-between px-4 py-3 border rounded-2xl transition-all group shadow-sm",
                                    isDone ? "bg-emerald-50 border-emerald-100" : "bg-indigo-50/50 border-indigo-100"
                                )}>
                                    <div className="flex flex-col min-w-0 pr-4">
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-wide truncate",
                                            isDone ? "text-emerald-700" : "text-indigo-700"
                                        )}>
                                            {link.title}
                                        </span>
                                        <span className="text-[8px] font-mono text-indigo-400 truncate opacity-50">{link.url}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isDone ? (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                                <CheckCircle2 size={10} /> Enlazado
                                            </div>
                                        ) : (
                                            <div className="hidden sm:block px-2 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-black uppercase tracking-widest">Sugerido</div>
                                        )}
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg transition-colors text-indigo-300 hover:text-indigo-600 shadow-inner">
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* PROJECT INVENTORY - DASHBOARD STYLE */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Link2 size={16} className="text-slate-400" />
                        Inventario Completo (URLs a Enlazar)
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        {Math.min(csvData?.length || 0, 15)} Mostrados
                    </span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {csvData?.slice(0, 50).map((u, i) => { // Increased slice to show more potential matches
                        const slug = u.url.replace(/^https?:\/\/[^\/]+/, '');
                        const isDone = currentContent.includes(u.url) || (slug.length > 1 && currentContent.includes(slug));
                        const isSuggested = uniqueLinks.some((sl: any) => sl.url === u.url);
                        if (isSuggested) return null;

                        return (
                            <div key={i} className={cn(
                                "flex items-center justify-between px-4 py-3 rounded-2xl border transition-all group shadow-sm",
                                isDone ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100"
                            )}>
                                <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-wide truncate pr-4",
                                        isDone ? "text-emerald-700" : "text-slate-600"
                                    )}>
                                        {u.title || u.url.split('/').pop() || 'Internal Link'}
                                    </span>
                                    <span className="text-[8px] font-mono text-slate-400 truncate opacity-50">{u.url}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isDone && <CheckCircle2 size={12} className="text-emerald-500" />}
                                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white rounded-lg transition-colors text-slate-300 hover:text-indigo-500 shadow-inner">
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* SCHEMA JSON-LD - DASHBOARD STYLE */}
            {(researchDossier as any)?.schemas && (
                <div className="bg-slate-900 rounded-[32px] p-7 shadow-2xl relative overflow-hidden group border border-slate-800">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                        <Database size={80} className="text-indigo-500" />
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} className="text-indigo-400" />
                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block">Schema JSON-LD Definido</label>
                    </div>
                    <div className="bg-slate-950/50 rounded-2xl p-5 font-mono text-[10px] text-indigo-300 overflow-x-auto custom-scrollbar max-h-[250px] border border-slate-800/50">
                        <pre className="whitespace-pre-wrap">{JSON.stringify((researchDossier as any).schemas, null, 2)}</pre>
                    </div>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-4 flex items-center gap-2">
                        <CheckCircle2 size={10} className="text-emerald-500" /> 
                        Listo para inyectar en página
                    </p>
                </div>
            )}
        </div>
    );
}
