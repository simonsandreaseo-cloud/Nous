
'use client';
import { useState, useMemo } from 'react';
import { 
    CheckCircle2, 
    ChevronRight,
    ChevronDown,
    Hash, 
    Link2, 
    MessageSquare, 
    Search, 
    ExternalLink, 
    Sparkles, 
    Database, 
    Target, 
    Globe, 
    Circle,
    BarChart,
    AlertCircle,
    Info,
    CheckCircle,
    Trash2,
    RefreshCw,
    Eraser
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';
import { motion, AnimatePresence } from 'framer-motion';
import * as SEOScoringService from '@/lib/services/writer/seo-scoring';
import { applyBatchOptimization } from '@/lib/services/writer/seo-optimization';
import { toast } from 'sonner';


interface SEODataTabProps {
    seoData: any;
    currentContent: string;
}

const SEO_FIELDS = [
    { key: 'keyword', label: 'Keyword Principal', weight: 20 },
    { key: 'strategyVolume', label: 'Volumen', weight: 10 },
    { key: 'strategyH1', label: 'H1 / Título SEO', weight: 20 },
    { key: 'strategyExcerpt', label: 'Extracto / Resumen', weight: 15 },
    { key: 'strategyLSI', label: 'LSI Keywords', weight: 10 },
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
        strategyKeywords,
        isRefreshingLinks,
        editor,
        // Setters
        setStrategyH1,
        setStrategyTitle,
        setStrategySlug,
        setStrategyDesc,
        setStrategyExcerpt
    } = useWriterStore();

    const [activeTab, setActiveTab] = useState<'nous' | 'rankmath' | 'yoast'>('nous');

    // Accordion states for Modo Nous
    const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
        metadata: false,
        keywords: false,
        lsi: false,
        links: false,
        questions: false,
    });

    const toggleAccordion = (key: string) => {
        setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const rawLsiKeywords = strategyLSI.length > 0 ? strategyLSI : (researchDossier?.lsiKeywords || researchDossier?.keywordIdeas || seoData?.lsiKeywords || seoData?.keywordIdeas || []);
    
    // Safety deduplication for UI
    const lsiKeywords = useMemo(() => {
        const seen = new Set<string>();
        return (rawLsiKeywords as any[]).filter(k => {
            const word = (typeof k === 'string' ? k : k.keyword || '').trim().toLowerCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            if (!word || seen.has(word)) return false;
            seen.add(word);
            return true;
        });
    }, [rawLsiKeywords]);

    const frequentQuestions = strategyQuestions.length > 0 ? strategyQuestions : (researchDossier?.frequentQuestions || seoData?.frequentQuestions || []);
    
    const allLinksSource = [
        ...(strategyLinks || []),
        ...(researchDossier?.suggestedInternalLinks || []),
        ...(researchDossier?.suggested_links || []),
        ...(seoData?.suggestedInternalLinks || [])
    ];

    // Eliminar duplicados por URL de forma limpia
    const linkEntries: [string, any][] = allLinksSource
        .filter(l => !!l)
        .map((item): [string, any] => {
            const url = typeof item === 'object' ? (item.url || item.link) : item;
            const title = typeof item === 'object' ? item.title : url;
            return [url, { title: title || url, url }];
        })
        .filter(([url]) => !!url);

    const uniqueLinks = Array.from(new Map(linkEntries).values());

    const completeness = SEO_FIELDS.reduce((acc, field) => {
        let has = false;
        if (field.key === 'keyword') has = !!keyword;
        if (field.key === 'strategyVolume') has = !!(strategyVolume || researchDossier?.searchVolume);
        if (field.key === 'strategyH1') has = !!(strategyH1 || strategyTitle);
        if (field.key === 'strategyLSI') has = lsiKeywords.length > 0;
        if (field.key === 'uniqueLinks') has = uniqueLinks.length > 0;
        if (field.key === 'strategySlug') has = !!strategySlug;
        if (field.key === 'strategyExcerpt') has = !!strategyExcerpt;
        return acc + (has ? field.weight : 0);
    }, 0);

    const toggleItem = (id: string) => {
        setCheckedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isUsed = (k: any) => {
        const text = typeof k === 'string' ? k : k.keyword;
        if (!text) return false;
        return currentContent.toLowerCase().includes(text.toLowerCase());
    };

    const context: SEOScoringService.SEOScoringContext = {
        keyword: keyword || '',
        content: currentContent,
        metrics: {
            title: strategyTitle || '',
            description: strategyDesc || '',
            slug: strategySlug || '',
            h1: strategyH1 || ''
        },
        links: uniqueLinks.map(l => ({ url: l.url, title: l.title }))
    };

    const currentWordCount = SEOScoringService.getWordCount(currentContent);
    const primaryDensity = SEOScoringService.calculateKeywordDensity(currentContent, keyword || '');


    const usedLSI = lsiKeywords.filter((k: any) => isUsed(k));
    const usedLinks = uniqueLinks.filter((l: any) => {
        const slug = l.url.replace(/^https?:\/\/[^\/]+/, '');
        return currentContent.includes(l.url) || (slug.length > 1 && currentContent.includes(slug));
    });

    const rankMath = SEOScoringService.calculateRankMath(context);
    const yoastRules = SEOScoringService.calculateYoast(context);

    // Missing definitions that caused ReferenceErrors
    const filledMetaFields = [strategyH1, strategyTitle, strategySlug, strategyDesc, strategyExcerpt].filter(Boolean).length;
    
    const totalLSICount = useMemo(() => {
        return lsiKeywords.reduce((acc, k) => {
            const kw = typeof k === 'string' ? k : k.keyword;
            return acc + SEOScoringService.countOccurrences(currentContent, kw);
        }, 0);
    }, [lsiKeywords, currentContent]);

    const [isOptimizing, setIsOptimizing] = useState(false);

    const handleBatchOptimization = async () => {
        if (!editor) {
            toast.error("El editor no está inicializado.");
            return;
        }
        
        setIsOptimizing(true);
        toast.loading("Analizando y generando inyecciones SEO...", { id: "batch-opt" });
        
        try {
            const missingLSI = lsiKeywords.filter((k: any) => !isUsed(k)).map((k: any) => typeof k === 'string' ? k : k.keyword);
            const req = {
                currentContent: editor.getHTML(),
                h1: strategyH1 || strategyTitle || keyword || 'Sin Título',
                missingLSI,
                missingASK: [] // Add your missing ASK logic here if any
            };
            
            const result = await applyBatchOptimization(req);
            
            // 1. Nectar Injection
            if (result.nectarParagraph) {
                // Find the first H1 and insert after it.
                let inserted = false;
                editor.state.doc.descendants((node: any, pos: number) => {
                    if (!inserted && node.type.name === 'heading' && node.attrs.level === 1) {
                        editor.commands.insertContentAt(pos + node.nodeSize, '<p data-ai-nectar="true"><strong>Nota del Editor:</strong> ' + result.nectarParagraph + '</p>');
                        inserted = true;
                        return false;
                    }
                });
                
                // Fallback: If no H1, insert at the beginning
                if (!inserted) {
                    editor.commands.insertContentAt(0, '<p data-ai-nectar="true"><strong>Nota del Editor:</strong> ' + result.nectarParagraph + '</p>');
                }
            }
            
            // 2. Paragraph Edits (LSI/ASK injection)
            if (result.paragraphEdits && result.paragraphEdits.length > 0) {
                // We'll iterate through the edits and replace the text.
                // To avoid breaking Tiptap's structure drastically, a simple find-and-replace on text nodes is risky if we replace HTML.
                // A safer approach for HTML replacement is to let Tiptap handle it if we can find the exact text block.
                
                result.paragraphEdits.forEach((edit) => {
                    const originalHTML = edit.originalTextExtract.trim();
                    const newHTML = edit.newOptimizedText.trim();
                    
                    // Simple global find-and-replace is hard in tiptap. We'll get the current HTML, do a replace, and set the content.
                    // This is slightly destructive if not careful, but given we are replacing entire blocks:
                    if (originalHTML && newHTML) {
                        let contentHTML = editor.getHTML();
                        // Escape regex
                        const safeOriginal = originalHTML.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(safeOriginal, 'g');
                        
                        if (regex.test(contentHTML)) {
                            contentHTML = contentHTML.replace(regex, newHTML);
                            editor.commands.setContent(contentHTML);
                        } else {
                            // Fallback: try replacing without HTML tags
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = originalHTML;
                            const plainText = tempDiv.textContent || tempDiv.innerText || "";
                            
                            const safeText = plainText.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                            const textRegex = new RegExp(safeText, 'g');
                            
                            if (textRegex.test(contentHTML)) {
                                contentHTML = contentHTML.replace(textRegex, newHTML);
                                editor.commands.setContent(contentHTML);
                            } else {
                                console.warn("No se encontró el bloque original para reemplazar:", edit.originalTextExtract);
                            }
                        }
                    }
                });
            }
            
            // 3. External Links
            if (result.externalLinks && result.externalLinks.length > 0) {
                let contentHTML = editor.getHTML();
                result.externalLinks.forEach((link: any) => {
                    if (link.anchorText && link.url) {
                        const safeAnchor = link.anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        // Reemplazar la primera ocurrencia de la palabra/frase exacta
                        const textRegex = new RegExp(`\\b${safeAnchor}\\b`, 'i');
                        
                        // Prevención básica: No reemplazar si ya hay un href que contenga esa url o texto
                        if (!contentHTML.includes(link.url)) {
                            contentHTML = contentHTML.replace(textRegex, `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.anchorText}</a>`);
                        }
                    }
                });
                editor.commands.setContent(contentHTML);
            }
            
            toast.success("Optimización en lote aplicada correctamente.", { id: "batch-opt" });
        } catch (error: any) {
            console.error("Batch Optimization Error:", error);
            toast.error(error.message || "Error al aplicar optimización.", { id: "batch-opt" });
        } finally {
            setIsOptimizing(false);
        }
    };

    const checkedQuestions = frequentQuestions.filter((q: string, idx: number) => checkedItems.includes(`q-${idx}`));



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
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 animate-in fade-in duration-500 pb-20">

            {/* TABS */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button
                    onClick={() => setActiveTab('nous')}
                    className={cn("flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'nous' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:bg-slate-200/50")}
                >
                    Modo Nous
                </button>
                <button
                    onClick={() => setActiveTab('rankmath')}
                    className={cn("flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'rankmath' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:bg-slate-200/50")}
                >
                    RankMath
                </button>
                <button
                    onClick={() => setActiveTab('yoast')}
                    className={cn("flex-1 py-2 px-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'yoast' ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:bg-slate-200/50")}
                >
                    Yoast
                </button>
            </div>

            {/* MODO NOUS */}
            {activeTab === 'nous' && (
                <div className="space-y-6">
                    {/* Metrics Header */}
                    <div className="grid grid-cols-4 gap-3">
                        <div className="p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Volumen</p>
                            <p className="text-sm font-black text-slate-800 tabular-nums">
                                {(strategyVolume || researchDossier?.searchVolume || '0').toLocaleString()}
                            </p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Densidad KW</p>
                            <p className={cn(
                                "text-sm font-black transition-colors", 
                                primaryDensity >= 1 ? "text-emerald-500" : 
                                primaryDensity >= 0.5 ? "text-amber-500" : 
                                primaryDensity > 0 ? "text-red-400" : "text-slate-300"
                            )}>
                                {primaryDensity.toFixed(2)}%
                            </p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Densidad LSI</p>
                            <p className="text-sm font-black text-indigo-500">
                                {totalLSICount} usos
                            </p>
                        </div>
                        <div className="p-4 bg-white border border-slate-100 rounded-[20px] shadow-sm text-center">
                            <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-widest">Salud SEO</p>
                            <p className={cn("text-sm font-black", completeness >= 80 ? "text-emerald-500" : completeness >= 50 ? "text-amber-500" : "text-red-500")}>
                                {completeness}%
                            </p>
                        </div>
                    </div>

                    {/* METADATA ACCORDION */}
                    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleAccordion('metadata')}
                        >
                            <div className="flex items-center gap-3">
                                <Target size={16} className="text-indigo-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Metadatos</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", filledMetaFields === 5 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                    {filledMetaFields}/5 Completos
                                </span>
                                <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-300", openAccordions.metadata && "rotate-180")} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {openAccordions.metadata && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-5">

                                        {/* Google Snippet Preview */}
                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Google Preview</p>
                                            <div className="font-sans">
                                                <div className="text-[12px] text-slate-600 truncate mb-1">
                                                    https://tusitio.com{strategySlug ? `/${strategySlug}` : '/...'}
                                                </div>
                                                <div className="text-[18px] text-[#1a0dab] hover:underline cursor-pointer mb-1 truncate">
                                                    {strategyTitle || 'Título SEO no definido'}
                                                </div>
                                                <div className="text-[13px] text-[#4d5156] line-clamp-2 leading-snug">
                                                    {strategyDesc || 'La meta descripción no se ha definido aún. Añade una descripción persuasiva que invite al clic.'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 relative">
                                                <div className="absolute right-4 top-4">
                                                    {strategyH1 ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-200" />}
                                                </div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">H1 (Título del Artículo)</label>
                                                <input
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                                                    value={strategyH1 || ''}
                                                    onChange={(e) => setStrategyH1(e.target.value)}
                                                    placeholder="Ej: Guía Suprema de SEO..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 relative">
                                                    <div className="absolute right-4 top-4">
                                                        {strategyTitle ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-200" />}
                                                    </div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">SEO Title</label>
                                                    <input
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                                                        value={strategyTitle || ''}
                                                        onChange={(e) => setStrategyTitle(e.target.value)}
                                                        placeholder="Título para Google..."
                                                    />
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border border-slate-200 relative">
                                                    <div className="absolute right-4 top-4">
                                                        {strategySlug ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-200" />}
                                                    </div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Slug URL</label>
                                                    <input
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-700 focus:outline-none focus:border-indigo-500 transition-all"
                                                        value={strategySlug || ''}
                                                        onChange={(e) => setStrategySlug(e.target.value)}
                                                        placeholder="mi-articulo"
                                                    />
                                                </div>
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border border-slate-200 relative">
                                                <div className="absolute right-4 top-4">
                                                    {strategyDesc ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-200" />}
                                                </div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Meta Descripción</label>
                                                <textarea
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                                    rows={3}
                                                    value={strategyDesc || ''}
                                                    onChange={(e) => setStrategyDesc(e.target.value)}
                                                    placeholder="Descripción persuasiva para Google..."
                                                />
                                            </div>

                                            <div className="bg-white p-4 rounded-xl border border-slate-200 relative">
                                                <div className="absolute right-4 top-4">
                                                    {strategyExcerpt ? <CheckCircle size={14} className="text-emerald-500" /> : <Circle size={14} className="text-slate-200" />}
                                                </div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Extracto / Resumen</label>
                                                <textarea
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                                    rows={3}
                                                    value={strategyExcerpt || ''}
                                                    onChange={(e) => setStrategyExcerpt(e.target.value)}
                                                    placeholder="Resumen del artículo para listados o redes..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* LSI ACCORDION */}
                    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleAccordion('lsi')}
                        >
                            <div className="flex items-center gap-3">
                                <Hash size={16} className="text-emerald-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">LSI Keywords</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", usedLSI.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                    {usedLSI.length}/{lsiKeywords.length} Usadas
                                </span>
                                <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-300", openAccordions.lsi && "rotate-180")} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {openAccordions.lsi && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 border-t border-slate-100 bg-slate-50/50">
                                        <div className="flex flex-wrap gap-2">
                                            {lsiKeywords.map((k: any, idx: number) => {
                                                const kw = typeof k === 'string' ? k : k.keyword;
                                                const used = isUsed(kw);
                                                const id = `k-${idx}`;
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
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* LINKS ACCORDION */}
                    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleAccordion('links')}
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles size={16} className="text-indigo-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Enlaces Sugeridos</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", usedLinks.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                    {usedLinks.length}/{uniqueLinks.length} Insertados
                                </span>
                                <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-300", openAccordions.links && "rotate-180")} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {openAccordions.links && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                        {uniqueLinks.length === 0 ? (
                                            <p className="text-[11px] text-slate-500">No hay enlaces sugeridos.</p>
                                        ) : (
                                            uniqueLinks.map((link: any, i: number) => {
                                                const slug = link.url.replace(/^https?:\/\/[^\/]+/, '');
                                                const isDone = currentContent.includes(link.url) || (slug.length > 1 && currentContent.includes(slug));
                                                return (
                                                    <div key={i} className={cn(
                                                        "flex items-center justify-between px-4 py-3 border rounded-2xl transition-all shadow-sm",
                                                        isDone ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-200"
                                                    )}>
                                                        <div className="flex flex-col min-w-0 pr-4">
                                                            <span className={cn(
                                                                "text-[10px] font-black uppercase tracking-wide truncate mb-0.5",
                                                                isDone ? "text-emerald-700" : "text-slate-700"
                                                            )}>
                                                                {link.title}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {link.anchor_text && (
                                                                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase">{link.anchor_text}</span>
                                                                )}
                                                                <span className="text-[8px] font-mono text-slate-400 truncate">{link.url}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {isDone && (
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                                                    <CheckCircle2 size={10} /> Ok
                                                                </div>
                                                            )}
                                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                                                                <ExternalLink size={12} />
                                                            </a>
                                                            <button 
                                                                onClick={() => useWriterStore.getState().removeStrategyLink(link.url)}
                                                                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-400"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        
                                        {/* BOTONES DE ACCIÓN INFERIORES */}
                                        <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200/60 mt-4">
                                            <button 
                                                onClick={() => useWriterStore.getState().refreshInterlinking('append')}
                                                disabled={isRefreshingLinks}
                                                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50"
                                            >
                                                <Search size={12} className={cn(isRefreshingLinks && "animate-spin")} /> Buscar más
                                            </button>
                                            <button 
                                                onClick={() => useWriterStore.getState().refreshInterlinking('overwrite')}
                                                disabled={isRefreshingLinks}
                                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                                            >
                                                <RefreshCw size={12} className={cn(isRefreshingLinks && "animate-spin")} /> Regenerar
                                            </button>
                                            <button 
                                                onClick={() => useWriterStore.getState().clearStrategyLinks()}
                                                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors ml-auto"
                                            >
                                                <Eraser size={12} /> Limpiar
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>


                    {/* KEYWORDS HYPOTHETICAL ACCORDION */}
                    <div className="bg-white border border-indigo-100 rounded-[24px] overflow-hidden shadow-sm">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleAccordion('keywords')}
                        >
                            <div className="flex items-center gap-3">
                                <Database size={16} className="text-indigo-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Keywords Sugeridas (Hipotético)</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                    {strategyKeywords.length} Ideas
                                </span>
                                <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-300", openAccordions.keywords && "rotate-180")} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {openAccordions.keywords && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 border-t border-indigo-50 bg-indigo-50/10 space-y-3">
                                        {strategyKeywords.length === 0 ? (
                                             <p className="text-[11px] text-slate-500 italic">Analiza el SEO para ver sugerencias detalladas.</p>
                                        ) : (
                                            strategyKeywords.map((k: any, idx: number) => {
                                                const kw = k.keyword;
                                                const density = SEOScoringService.calculateKeywordDensity(currentContent, kw);
                                                const count = SEOScoringService.countOccurrences(currentContent, kw);
                                                const used = count > 0;
                                                
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={cn(
                                                            "p-3 rounded-xl border flex items-center justify-between gap-4 shadow-sm transition-all",
                                                            used ? "bg-emerald-50/50 border-emerald-200" : "bg-white border-indigo-100"
                                                        )}
                                                    >
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "w-1.5 h-1.5 rounded-full",
                                                                    used ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                                                                )} />
                                                                <span className="text-[12px] font-bold text-slate-800 truncate">{kw}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-black uppercase tracking-tighter text-indigo-400 bg-indigo-50 px-1.5 rounded">Vol: {k.volume}</span>
                                                                <span className={cn(
                                                                    "text-[9px] font-black uppercase tracking-tighter px-1.5 rounded",
                                                                    k.difficulty?.toLowerCase().includes('alta') ? "bg-red-50 text-red-500" :
                                                                    k.difficulty?.toLowerCase().includes('media') ? "bg-amber-50 text-amber-500" :
                                                                    "bg-emerald-50 text-emerald-500"
                                                                )}>Diff: {k.difficulty}</span>
                                                                {used && (
                                                                    <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600 bg-emerald-50 px-1.5 rounded">
                                                                        {count} usos ({density.toFixed(2)}%)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                const exists = strategyLSI.some((l: any) => (typeof l === 'string' ? l : l.keyword).toLowerCase() === kw.toLowerCase());
                                                                if (!exists) useWriterStore.getState().setStrategyLSI([...strategyLSI, kw]);
                                                            }}
                                                            className="h-8 px-3 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm shrink-0"
                                                        >
                                                            Añadir a LSI
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* QUESTIONS ACCORDION */}
                    <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
                        <div
                            className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleAccordion('questions')}
                        >
                            <div className="flex items-center gap-3">
                                <MessageSquare size={16} className="text-amber-500" />
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Preguntas PAA</h4>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", checkedQuestions.length > 0 ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>
                                    {checkedQuestions.length}/{frequentQuestions.length} Respondidas
                                </span>
                                <ChevronDown size={16} className={cn("text-slate-400 transition-transform duration-300", openAccordions.questions && "rotate-180")} />
                            </div>
                        </div>
                        <AnimatePresence>
                            {openAccordions.questions && (
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-2">
                                        {frequentQuestions.length === 0 ? (
                                             <p className="text-[11px] text-slate-500">No hay preguntas PAA.</p>
                                        ) : (
                                            frequentQuestions.map((q: string, idx: number) => {
                                                const id = `q-${idx}`;
                                                const isDone = checkedItems.includes(id);
                                                return (
                                                    <div
                                                        key={id}
                                                        className={cn(
                                                            "p-3 border rounded-xl flex items-start gap-3 transition-all cursor-pointer shadow-sm",
                                                            isDone ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200 hover:border-emerald-200"
                                                        )}
                                                        onClick={() => toggleItem(id)}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                                                            isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300"
                                                        )}>
                                                            {isDone && <CheckCircle2 size={10} />}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[11px] font-bold leading-snug",
                                                            isDone ? "text-emerald-800" : "text-slate-600"
                                                        )}>
                                                            {q}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* STICKY FOOTER FOR BATCH OPTIMIZATION */}
            <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-4 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-10">
                <button
                    onClick={handleBatchOptimization}
                    disabled={isOptimizing || !editor}
                    className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    {isOptimizing ? (
                        <>
                            <RefreshCw size={14} className="animate-spin" />
                            Aplicando Magia...
                        </>
                    ) : (
                        <>
                            <Sparkles size={14} className="text-amber-400 group-hover:animate-pulse" />
                            Aplicar Optimización en Lote
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
