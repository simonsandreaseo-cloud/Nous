
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
    CheckCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useWriterStore } from '@/store/useWriterStore';
import { motion, AnimatePresence } from 'framer-motion';

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
        lsi: false,
        links: false,
        questions: false,
    });

    const toggleAccordion = (key: string) => {
        setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const [checkedItems, setCheckedItems] = useState<string[]>([]);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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

    const getWordCount = (text: string) => {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    };

    const currentWordCount = getWordCount(currentContent);

    // Helpers
    const countOccurrences = (text: string, searchStr: string) => {
        if (!searchStr) return 0;
        const regex = new RegExp(searchStr.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return (text.match(regex) || []).length;
    };

    const calculateDensity = (text: string, searchStr: string) => {
        if (!searchStr || !text) return 0;
        const occurrences = countOccurrences(text, searchStr);
        const searchWords = getWordCount(searchStr);
        const totalWords = getWordCount(text);
        if (totalWords === 0) return 0;
        return ((occurrences * searchWords) / totalWords) * 100;
    };

    // Calculate Densities
    const primaryDensity = calculateDensity(currentContent, keyword || '');

    const lsiDensities = lsiKeywords.map((k: any) => {
        const kw = typeof k === 'string' ? k : k.keyword;
        return {
            keyword: kw,
            density: calculateDensity(currentContent, kw),
            count: countOccurrences(currentContent, kw)
        };
    });

    const totalLSICount = lsiDensities.reduce((acc: number, curr: any) => acc + curr.count, 0);

    const usedLSI = lsiKeywords.filter((k: any) => isUsed(k));
    const usedLinks = uniqueLinks.filter((l: any) => {
        const slug = l.url.replace(/^https?:\/\/[^\/]+/, '');
        return currentContent.includes(l.url) || (slug.length > 1 && currentContent.includes(slug));
    });
    const checkedQuestions = frequentQuestions.filter((q: string, idx: number) => checkedItems.includes(`q-${idx}`));

    // Meta metadata completion
    const metaFields = [strategyH1, strategyTitle, strategySlug, strategyDesc, strategyExcerpt];
    const filledMetaFields = metaFields.filter(f => !!f).length;


    // --- RANK MATH ---
    const calculateRankMath = () => {
        let score = 0;
        const checks = [];

        // Basic SEO
        const hasKeyword = !!keyword;

        // Focus Keyword in SEO Title
        const keywordInTitle = hasKeyword && (strategyTitle || '').toLowerCase().includes(keyword.toLowerCase());
        checks.push({ label: "Focus Keyword en el SEO Title", passed: keywordInTitle, score: 10 });
        if(keywordInTitle) score += 10;

        // Focus Keyword in Meta Description
        const keywordInDesc = hasKeyword && (strategyDesc || '').toLowerCase().includes(keyword.toLowerCase());
        checks.push({ label: "Focus Keyword en la Meta Descripción", passed: keywordInDesc, score: 10 });
        if(keywordInDesc) score += 10;

        // Focus Keyword in URL
        const keywordInUrl = hasKeyword && (strategySlug || '').toLowerCase().includes(keyword.toLowerCase().replace(/\s+/g, '-'));
        checks.push({ label: "Focus Keyword en la URL", passed: keywordInUrl, score: 10 });
        if(keywordInUrl) score += 10;

        // Focus Keyword appears in the first 10% of the content
        const first10Percent = currentContent.substring(0, Math.max(100, currentContent.length * 0.1));
        const keywordInFirst10Percent = hasKeyword && first10Percent.toLowerCase().includes(keyword.toLowerCase());
        checks.push({ label: "Focus Keyword en el inicio del contenido", passed: keywordInFirst10Percent, score: 10 });
        if(keywordInFirst10Percent) score += 10;

        // Content Length (Rank Math ideal is 600+)
        const isContentLongEnough = currentWordCount >= 600;
        checks.push({ label: `Longitud del contenido (${currentWordCount} palabras)`, passed: isContentLongEnough, score: 10 });
        if(isContentLongEnough) score += 10;

        // Additional
        // Keyword density (ideal 1-2%)
        const densityOk = primaryDensity > 0.5 && primaryDensity < 2.5;
        checks.push({ label: `Densidad de Focus Keyword (${primaryDensity.toFixed(2)}%)`, passed: densityOk, score: 10 });
        if(densityOk) score += 10;

        // Internal Links
        const hasInternalLinks = usedLinks.length > 0;
        checks.push({ label: `Enlaces internos (${usedLinks.length})`, passed: hasInternalLinks, score: 10 });
        if(hasInternalLinks) score += 10;

        // Title Length
        const titleLength = (strategyTitle || '').length;
        const titleLengthOk = titleLength > 40 && titleLength < 60;
        checks.push({ label: `Longitud del SEO Title (${titleLength} chars)`, passed: titleLengthOk, score: 10 });
        if(titleLengthOk) score += 10;

        // Desc Length
        const descLength = (strategyDesc || '').length;
        const descLengthOk = descLength > 120 && descLength < 160;
        checks.push({ label: `Longitud Meta Descripción (${descLength} chars)`, passed: descLengthOk, score: 10 });
        if(descLengthOk) score += 10;

        // Subheadings
        const hasSubheadings = countOccurrences(currentContent, '<h2') > 0 || countOccurrences(currentContent, '##') > 0;
        checks.push({ label: "Uso de subtítulos (H2, H3)", passed: hasSubheadings, score: 10 });
        if(hasSubheadings) score += 10;

        return { score, checks };
    };

    // --- YOAST ---
    const calculateYoast = () => {
        const rules = [];

        const hasKeyword = !!keyword;

        // Internal links
        if (usedLinks.length > 0) {
            rules.push({ text: "Enlaces internos: Hay suficientes enlaces internos.", status: "good" });
        } else {
            rules.push({ text: "Enlaces internos: No hay enlaces internos. Añade algunos.", status: "bad" });
        }

        // Keyphrase in introduction
        const firstParagrah = currentContent.substring(0, 300);
        if (hasKeyword && firstParagrah.toLowerCase().includes(keyword.toLowerCase())) {
            rules.push({ text: "Frase clave en la introducción: ¡Bien hecho!", status: "good" });
        } else {
            rules.push({ text: "Frase clave en la introducción: La frase clave no aparece en el primer párrafo.", status: "bad" });
        }

        // Keyphrase length
        if (hasKeyword) {
            rules.push({ text: "Longitud de frase clave: ¡Buen trabajo!", status: "good" });
        } else {
            rules.push({ text: "Frase clave: No has establecido una frase clave.", status: "bad" });
        }

        // Keyphrase density
        if (primaryDensity === 0) {
            rules.push({ text: "Densidad de frase clave: La frase clave no se encontró.", status: "bad" });
        } else if (primaryDensity > 2.5) {
            rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) es muy alta.`, status: "bad" });
        } else if (primaryDensity < 0.5) {
            rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) es muy baja.`, status: "ok" });
        } else {
            rules.push({ text: `Densidad de frase clave: (${primaryDensity.toFixed(2)}%) Excelente.`, status: "good" });
        }

        // Meta description length
        const descLength = (strategyDesc || '').length;
        if (descLength === 0) {
            rules.push({ text: "Longitud meta descripción: No se ha especificado meta descripción.", status: "bad" });
        } else if (descLength < 120) {
            rules.push({ text: "Longitud meta descripción: Es muy corta.", status: "ok" });
        } else if (descLength > 156) {
            rules.push({ text: "Longitud meta descripción: Es muy larga.", status: "ok" });
        } else {
            rules.push({ text: "Longitud meta descripción: ¡Bien hecho!", status: "good" });
        }

        // SEO Title width
        const titleLength = (strategyTitle || '').length;
        if (titleLength === 0) {
             rules.push({ text: "Ancho del título SEO: Por favor crea un título SEO.", status: "bad" });
        } else if (titleLength < 40) {
            rules.push({ text: "Ancho del título SEO: Es muy corto.", status: "ok" });
        } else if (titleLength > 60) {
            rules.push({ text: "Ancho del título SEO: Es muy largo.", status: "ok" });
        } else {
            rules.push({ text: "Ancho del título SEO: ¡Buen trabajo!", status: "good" });
        }

        // Text length
        if (currentWordCount < 300) {
            rules.push({ text: `Longitud del texto: El texto contiene ${currentWordCount} palabras. Es muy poco.`, status: "bad" });
        } else {
            rules.push({ text: `Longitud del texto: El texto contiene ${currentWordCount} palabras. ¡Buen trabajo!`, status: "good" });
        }

        return rules;
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
        <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">

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
                            <p className={cn("text-sm font-black", primaryDensity > 0 && primaryDensity <= 2.5 ? "text-emerald-500" : "text-amber-500")}>
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
                                                                "text-[10px] font-black uppercase tracking-wide truncate",
                                                                isDone ? "text-emerald-700" : "text-slate-700"
                                                            )}>
                                                                {link.title}
                                                            </span>
                                                            <span className="text-[8px] font-mono text-slate-400 truncate">{link.url}</span>
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
                                                        </div>
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

            {/* MODO RANK MATH */}
            {activeTab === 'rankmath' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full border-8 border-slate-100 relative flex items-center justify-center">
                            {/* Simple circular progress visualization */}
                            <svg className="absolute inset-0 w-full h-full -rotate-90">
                                <circle
                                    cx="50%" cy="50%" r="42"
                                    fill="transparent"
                                    stroke={calculateRankMath().score >= 80 ? '#10b981' : calculateRankMath().score >= 50 ? '#f59e0b' : '#ef4444'}
                                    strokeWidth="8"
                                    strokeDasharray="264"
                                    strokeDashoffset={264 - (264 * calculateRankMath().score) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="text-2xl font-black text-slate-800">{calculateRankMath().score}</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Rank Math Score</h3>
                            <p className="text-xs font-medium text-slate-500">Métricas simuladas basadas en las reglas de Rank Math.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-600">SEO Básico & Adicional</h4>
                        </div>
                        <div className="p-2">
                            {calculateRankMath().checks.map((check, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 border-b border-slate-50 last:border-0">
                                    {check.passed ? (
                                        <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                                    ) : (
                                        <Circle size={16} className="text-red-400 shrink-0" />
                                    )}
                                    <span className={cn("text-[11px] font-bold", check.passed ? "text-slate-700" : "text-slate-500")}>
                                        {check.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODO YOAST */}
            {activeTab === 'yoast' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Target size={24} className="text-slate-700" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Análisis Yoast SEO</h3>
                            <p className="text-xs font-medium text-slate-500">Indicadores de semáforo estilo Yoast.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-[24px] overflow-hidden border border-slate-200 shadow-sm p-4">
                        <div className="space-y-4">
                            {calculateYoast().map((rule, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full mt-0.5 shrink-0",
                                        rule.status === 'good' ? "bg-emerald-500" :
                                        rule.status === 'ok' ? "bg-amber-500" :
                                        "bg-red-500"
                                    )} />
                                    <span className="text-[12px] font-medium text-slate-700 leading-tight">
                                        {rule.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
