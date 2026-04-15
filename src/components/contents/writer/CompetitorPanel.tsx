'use client';
import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { useWriterStore } from '@/store/useWriterStore';
import { 
    Globe, ExternalLink, AlignLeft, 
    Layers, Search, Loader2, ArrowLeft, BookOpen
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';

export function CompetitorPanel() {
    const { competitorDetails, rawSeoData, researchDossier, draftId } = useWriterStore();
    const [readingMode, setReadingMode] = useState<any | null>(null);
    const [readingContent, setReadingContent] = useState<string | null>(null);
    const [isLoadingContent, setIsLoadingContent] = useState(false);

    // Prioritize deep analysis from Jina/Dossier
    const dossier = researchDossier || rawSeoData || {};
    const competitors = competitorDetails.length > 0 
        ? competitorDetails 
        : (dossier.fullCompetitorAnalysis || dossier.competitors || []);

    const handleReadArticle = async (comp: any) => {
        setReadingMode(comp);
        setReadingContent(null);
        setIsLoadingContent(true);

        try {
            if (draftId) {
                const { data } = await supabase
                    .from('task_competitors')
                    .select('content')
                    .eq('task_id', draftId)
                    .eq('url', comp.url)
                    .single();

                if (data?.content) {
                    setReadingContent(data.content);
                    return;
                }
            }
            
            if (comp.content) {
                setReadingContent(comp.content);
            } else {
                setReadingContent('Contenido no disponible para este competidor.');
            }
        } catch (err) {
            console.error(err);
            if (comp.content) {
                setReadingContent(comp.content);
            } else {
                setReadingContent('Error al cargar el contenido.');
            }
        } finally {
            setIsLoadingContent(false);
        }
    };

    if (competitors.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 bg-slate-50">
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest text-slate-300">Esperando Competidores</p>
                <p className="text-[11px] font-bold mt-2 text-center opacity-60">
                    Ejecuta una investigación SEO para poblar esta sección con la data de los top competidores.
                </p>
            </div>
        );
    }

    if (readingMode) {
        return (
            <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
                <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 flex items-center justify-between shadow-sm">
                    <button 
                        onClick={() => setReadingMode(null)}
                        className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">Volver</span>
                    </button>
                    <a 
                        href={readingMode.url}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 transition-colors"
                        title="Abrir original"
                    >
                        <ExternalLink size={16} />
                    </a>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-black text-slate-800 mb-6 leading-tight">
                            {readingMode.title || 'Contenido del Competidor'}
                        </h2>
                        
                        {isLoadingContent ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                <Loader2 size={32} className="animate-spin mb-4 opacity-50" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Cargando artículo...</span>
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none pb-20 prose-headings:font-black prose-headings:text-slate-800 prose-p:text-slate-600 prose-a:text-indigo-500">
                                {readingContent ? (
                                    readingContent.includes('<') && readingContent.includes('>') ? (
                                        <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(readingContent || '') }} />
                                    ) : (
                                        <div className="whitespace-pre-wrap">{readingContent}</div>
                                    )
                                ) : (
                                    <p className="text-slate-400 italic">No hay contenido disponible.</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-20 shadow-sm">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                        Top Competidores
                    </h3>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                {competitors.map((comp: any, idx: number) => {
                    // Extract headers logic
                    let displayHeaders = comp.headers || [];
                    if (displayHeaders.length === 0 && comp.content) {
                        const htmlTags = comp.content.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi);
                        if (htmlTags) {
                            displayHeaders = htmlTags.map((tag: string) => {
                                const level = tag.substring(2, 3);
                                return {
                                    tag: `h${level}`,
                                    text: tag.replace(/<[^>]+>/g, '').trim()
                                };
                            });
                        } else {
                            const mdHeaders = comp.content.match(/#{1,4}\s+[^|#\n]+/g);
                            if (mdHeaders) {
                                displayHeaders = mdHeaders.map((h: string) => ({
                                    tag: h.startsWith('###') ? 'h3' : h.startsWith('##') ? 'h2' : 'h1',
                                    text: h.replace(/^#+\s+/, '').trim()
                                }));
                            }
                        }
                    }

                    return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-all">
                            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 font-black flex items-center justify-center text-sm shrink-0">
                                            {comp.rank_position || (idx + 1)}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-800 line-clamp-2">
                                                {comp.title || `Competidor ${idx + 1}`}
                                            </h4>
                                            <div className="flex items-center gap-1.5 mt-1 opacity-60">
                                                <Globe size={10} className="text-slate-500" />
                                                <a 
                                                    href={comp.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] font-medium text-slate-500 truncate max-w-[200px] hover:text-indigo-600 transition-colors"
                                                >
                                                    {comp.url}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Palabras</span>
                                        <span className="text-xs font-black text-slate-700">
                                            {comp.word_count ?? comp.wordCount ?? (comp.summary ? comp.summary.split(/\s+/).length : '—')}
                                        </span>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">H2s</span>
                                        <span className="text-xs font-black text-slate-700">
                                            {comp.h2_count ?? comp.h2Count ?? (displayHeaders.filter((h: any) => typeof h === 'string' || (h.tag && h.tag.toLowerCase() === 'h2')).length || '—')}
                                        </span>
                                    </div>
                                    <div className="bg-white rounded-xl p-3 border border-slate-100 flex flex-col items-center">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Dominio</span>
                                        <span className="text-xs font-black text-slate-700 truncate w-full text-center">
                                            {comp.domain_authority ? `DA${comp.domain_authority}` : (comp.url ? new URL(comp.url).hostname.replace('www.', '') : '—')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlignLeft size={14} className="text-slate-400" />
                                    <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estructura</h5>
                                </div>
                                
                                {displayHeaders.length > 0 ? (
                                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-2 mb-5">
                                        {displayHeaders.slice(0, 10).map((h: any, hIdx: number) => {
                                            const tag = typeof h === 'string' ? 'H2' : (h.tag || 'H2');
                                            const text = typeof h === 'string' ? h : h.text;
                                            const indent = tag.toLowerCase() === 'h1' ? 'ml-0' : 
                                                          tag.toLowerCase() === 'h2' ? 'ml-2' : 'ml-6';
                                            
                                            return (
                                                <div key={hIdx} className={cn("flex items-start gap-2", indent)}>
                                                    <span className={cn(
                                                        "text-[8px] font-black uppercase w-5 shrink-0 mt-0.5",
                                                        tag.toLowerCase() === 'h1' ? "text-indigo-400" : "text-slate-300"
                                                    )}>
                                                        {tag}
                                                    </span>
                                                    <span className="text-[11px] font-medium text-slate-600 line-clamp-1">
                                                        {text}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {displayHeaders.length > 10 && (
                                            <p className="text-[10px] text-slate-400 font-medium pl-7 italic mt-2">
                                                + {displayHeaders.length - 10} encabezados más...
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-6 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 mb-5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin estructura</span>
                                    </div>
                                )}

                                <button
                                    onClick={() => handleReadArticle(comp)}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl font-bold text-xs transition-colors"
                                >
                                    <BookOpen size={14} />
                                    <span>Leer Artículo Completo</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}