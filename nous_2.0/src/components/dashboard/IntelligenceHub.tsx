'use client';

import { useState } from 'react';
import {
    Sparkles,
    Search,
    BarChart3,
    ChevronRight,
    Zap,
    Globe,
    FileText,
    Loader2,
    CheckCircle2,
    Plus,
    Target
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import { invoke } from '@tauri-apps/api/core';

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

interface IntelligenceHubProps {
    taskId: string;
    targetKeyword?: string;
    url?: string;
    onComplete?: () => void;
}

export default function IntelligenceHub({ taskId, targetKeyword, url, onComplete }: IntelligenceHubProps) {
    const [loading, setLoading] = useState(false);
    const [generatingOutline, setGeneratingOutline] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [outline, setOutline] = useState<any>(null);

    const handleRunAnalysis = async () => {
        setLoading(true);
        try {
            let manualSerp: any = null;

            // 1. Desktop optimization disabled to focus on web version
            /*
            if (isTauri && !url && targetKeyword) {
                console.log(`[IntelligenceHub] Desktop Mode: Scraping Google SERP for "${targetKeyword}"...`);
                try {
                    manualSerp = await invoke('scrape_google_serp', { keyword: targetKeyword });
                } catch (err) {
                    console.error('[IntelligenceHub] Desktop Scrape Failed, falling back to API:', err);
                }
            }
            */


            // 2. Prepare API call
            const endpoint = url ? '/api/content/analyze-url' : '/api/content/analyze-keyword';
            const body = url
                ? { url, topic: targetKeyword, targetType: 'page' }
                : { keyword: targetKeyword, topic: targetKeyword, manualSerp };

            const res = await fetch(endpoint, {
                method: 'POST',
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Normalize results format (analyze-keyword returns suggested_keywords)
            const normalizedData = {
                ...data,
                keywords: data.keywords || data.suggested_keywords || []
            };

            setResults(normalizedData);

            // Update Task Research Dossier
            const { error: updateError } = await supabase
                .from('tasks')
                .update({
                    research_dossier: normalizedData,
                    status: "por_redactar" // After deep research it's ready for writing
                })
                .eq('id', taskId);

            if (updateError) throw updateError;

            if (onComplete) onComplete();

        } catch (err) {
            console.error('Analysis error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateOutline = async () => {
        if (!results || !results.competitors) return;
        setGeneratingOutline(true);

        try {
            const competitorStructures = [];

            // 1. Local scraping disabled for now
            /*
            if (isTauri) {
                console.log("[IntelligenceHub] Scraping competitor structures locally...");
                for (const comp of results.competitors.slice(0, 3)) {
                    try {
                        const crawlResult: any = await invoke('start_crawl_command', { url: comp.url });
                        competitorStructures.push({
                            url: comp.url,
                            headers: crawlResult.headers
                        });
                    } catch (err) {
                        console.error(`Failed to scrape ${comp.url}:`, err);
                    }
                }
            }
            */


            // 2. Generate the Master Outline via AI
            const res = await fetch('/api/content/generate-outline', {
                method: 'POST',
                body: JSON.stringify({
                    competitorStructures,
                    targetKeywords: results.keywords,
                    topic: targetKeyword
                })
            });

            const outlineData = await res.json();
            if (outlineData.error) throw new Error(outlineData.error);

            setOutline(outlineData);

            // 3. Save to task
            await supabase
                .from('tasks')
                .update({
                    outline_structure: outlineData,
                    quality_checklist: outlineData.quality_check
                })
                .eq('id', taskId);

        } catch (err) {
            console.error('Outline generation error:', err);
        } finally {
            setGeneratingOutline(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {!results ? (
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-lg p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-lg shadow-sm flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="text-indigo-600" size={32} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic mb-2">Neural Investigation Hub</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-6">
                        Analiza la competencia y extrae keywords semánticas <br />
                        reales de DataForSEO Labs + Inteligencia Artificial.
                    </p>

                    <button
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="bg-slate-900 text-white px-8 py-4 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 mx-auto"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                        {loading ? "Procesando..." : "Iniciar Investigación"}
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
                                <CheckCircle2 size={18} />
                            </span>
                            <div>
                                <h4 className="text-sm font-black text-slate-900 uppercase italic">Investigación Completada</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    {results.cleaned_count} keywords estratégicas encontradas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setResults(null)}
                            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            Reiniciar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {results.keywords.map((kw: any, i: number) => (
                            <div key={i} className="p-4 bg-white border border-slate-100 rounded-lg flex items-center justify-between group hover:border-indigo-200 transition-all">
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm font-bold text-slate-700">{kw.keyword}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md">
                                            {kw.intent || 'Info'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                                            Vol: {kw.search_volume?.toLocaleString() || '--'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-[9px] font-black text-slate-300 uppercase">Score</span>
                                        <span className={cn(
                                            "text-xs font-black",
                                            kw.relevance_score > 80 ? "text-cyan-500" : "text-slate-400"
                                        )}>
                                            {kw.relevance_score}%
                                        </span>
                                    </div>
                                    <button className="p-2 bg-slate-50 text-slate-400 rounded-md group-hover:bg-slate-900 group-hover:text-white transition-all">
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!outline ? (
                        <button
                            onClick={handleGenerateOutline}
                            disabled={generatingOutline}
                            className="w-full bg-indigo-600 text-white py-4 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                        >
                            {generatingOutline ? <Loader2 className="animate-spin" size={16} /> : <BarChart3 size={16} />}
                            {generatingOutline ? "Analizando Estructuras..." : "Generar Neural Outline"}
                        </button>
                    ) : (
                        <div className="p-6 bg-slate-900 text-white rounded-[32px] border border-slate-800 shadow-2xl">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-500 rounded-md">
                                    <FileText size={18} />
                                </div>
                                <h4 className="text-sm font-black uppercase italic">Neural Outline Generado</h4>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Título H1 Sugerido</span>
                                    <p className="text-sm font-bold">{outline.title_h1}</p>
                                </div>

                                <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2 px-2">Estructura de Secciones</span>
                                    {outline.sections.map((s: any, i: number) => (
                                        <div key={i} className="p-3 bg-white/5 rounded-md border border-white/10 ml-2">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[8px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-md">{s.tag}</span>
                                                <span className="text-xs font-bold text-slate-200">{s.text}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 italic leading-relaxed">{s.writing_intent}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
