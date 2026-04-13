'use client';

import { useState } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { Button } from '@/components/dom/Button';
import { runDeepSEOAnalysis } from '@/components/tools/writer/services';

import { 
    Target, X, Sparkles, Hash, Link2, 
    Type, RefreshCw, Layers, Plus, Trash2, Globe, Send, ChevronRight, AlertTriangle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

export default function WriterSetupBoard({ onFinished }: { onFinished?: () => void }) {
    const store = useWriterStore();
    const { projects, activeProject, setActiveProject, addTask } = useProjectStore();
    
    const [isResearching, setIsResearching] = useState(false);
    const [activeSection, setActiveSection] = useState<'setup' | 'results'>('setup');
    const [loadingStates, setLoadingStates] = useState({
        competitors: false, keywords: false, strategy: false, links: false, specs: false
    });

    const handleInvestigacionNous = async () => {
        if (!store.keyword.trim()) return alert("Ingresa una idea de contenido");
        setIsResearching(true);
        store.setStatus("Iniciando Investigación Nous...");
        
        try {
            const seoData = await runDeepSEOAnalysis({
                keyword: store.keyword, 
                projectId: activeProject?.id, 
                projectDomain: activeProject?.domain,
                onProgress: (phase) => store.setStatus(phase),
                onLog: (phase, prompt) => store.addDebugPrompt(phase, prompt)
            });
            
            store.setStatus("Procesando resultados...");
            store.setIsConsoleOpen(true); // Pop up console to show research audit
            
            // Delegate all data mapping to the store
            store.updateStrategyFromSeo(seoData);

            store.setStatus("Investigación completada");
            setActiveSection('results');


            store.setStatus("Investigación completada");
            setActiveSection('results');
        } catch (error: any) {
            console.error(error);
            alert("Error en investigación: " + error.message);
        } finally {
            setIsResearching(false);
            setTimeout(() => store.setStatus(""), 2000);
        }
    };

    const handleFinish = async () => {
        if (!store.draftId) {
            try {
                const { supabase } = await import('@/lib/supabase');
                store.setStatus("Programando contenido...");
                const { data: userData } = await supabase.auth.getUser();
                
                if (!userData?.user?.id) {
                     alert("Sesión expirada. Por favor, inicia sesión de nuevo.");
                     return;
                }

                // Unified behavior: Always create/update a Task
                const taskData = {
                    project_id: activeProject?.id || '',
                    title: store.strategyH1 || store.keyword,
                    target_keyword: store.keyword,
                    status: (onFinished ? 'por_redactar' : 'drafting') as any,
                    scheduled_date: new Date().toISOString(),
                    volume: parseInt(store.strategyVolume) || 0,
                    brief: store.strategyQuestions.join('\n'),
                    research_dossier: store.rawSeoData,
                    seo_data: store.rawSeoData, // Store in both for compatibility
                    semantic_refs: store.strategyLSI,
                    word_count: parseInt(store.strategyWordCount) || 1500,
                    content_body: ''
                };

                if (onFinished) {
                    await addTask(taskData);
                    onFinished();
                    return;
                }

                // Default behavior (Standalone Writer mode)
                const { data: newContent, error } = await supabase
                    .from('tasks')
                    .insert(taskData)
                    .select()
                    .single();

                if (error || !newContent) throw new Error(error?.message || "Error al crear contenido.");

                store.setDraftId(newContent.id);
                // Also save to research tracking table if still used, but now it's in tasks too
                await store.saveResearchData(newContent.id, store.keyword, store.rawSeoData, store.competitorDetails);
            } catch (err: any) {
                console.error("[handleFinish] Error:", err);
                alert("Ocurrió un error al crear el borrador: " + err.message);
            }
        }
        store.setViewMode('workspace');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Minimalist Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-white/95 backdrop-blur-xl flex items-center justify-between shadow-sm z-20 shrink-0">
                <div className="flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100/50">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none mb-1">Nuevo Contenido</h2>
                        <div className="flex items-center gap-1.5 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{activeProject?.name || "Sin Proyecto"}</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => onFinished ? onFinished() : store.setViewMode('dashboard')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-800 transition-colors">
                    <X size={16} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                
                {/* 1. Setup Phase */}
                <div className={cn("space-y-4 transition-all duration-500", activeSection === 'results' && "opacity-60 scale-[0.98] pointer-events-none")}>
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Proyecto</label>
                            <select 
                                value={activeProject?.id || ''}
                                onChange={(e) => setActiveProject(e.target.value)}
                                className="w-full h-10 px-3 text-xs font-bold bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-400 focus:bg-white transition-all outline-none"
                            >
                                <option value="" disabled>Seleccionar proyecto</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Keyword / Idea Central</label>
                            <div className="relative">
                                <input 
                                    autoFocus
                                    placeholder="Ej. Mejores auriculares 2026"
                                    value={store.keyword}
                                    onChange={e => store.setKeyword(e.target.value)}
                                    className="w-full h-10 pl-9 pr-3 text-xs font-bold bg-slate-50 border border-slate-100 rounded-lg focus:border-indigo-400 focus:bg-white transition-all outline-none placeholder:text-slate-300"
                                />
                                <Target size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                            <Button 
                                onClick={handleInvestigacionNous}
                                disabled={isResearching || !store.keyword}
                                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-white disabled:opacity-50"
                            >
                                {isResearching ? (
                                    <><RefreshCw size={14} className="animate-spin text-indigo-200" /> Analizando SERP...</>
                                ) : (
                                    <><Sparkles size={14} /> Investigar con Nous</>
                                )}
                            </Button>
                            
                            <Button 
                                onClick={() => setActiveSection('results')}
                                className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center border border-slate-200 whitespace-nowrap"
                                title="Saltar investigación y configurar manualmente"
                            >
                                Manual
                            </Button>
                        </div>
                        
                        <AnimatePresence>
                            {store.statusMessage && (
                                <motion.p 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-center text-[9px] font-black text-indigo-500 uppercase tracking-widest"
                                >
                                    {store.statusMessage}
                                </motion.p>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* 2. Results Phase */}
                <AnimatePresence>
                    {activeSection === 'results' && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-1.5 h-3 bg-indigo-500 rounded-full" />
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">Resultados SEO</h3>
                            </div>

                            {/* CANNIBALIZATION ALERT */}
                            {store.strategyCannibalization && store.strategyCannibalization.length > 0 && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex items-start gap-4 shadow-sm"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Alerta de Canibalización</p>
                                        <p className="text-[11px] font-medium text-rose-800/80 leading-relaxed">
                                            Hemos detectado que tu dominio ya posiciona con estas URLs para esta búsqueda. ¡Evita competir contra ti mismo!
                                        </p>
                                        <div className="pt-2 space-y-1">
                                            {store.strategyCannibalization.map((url, idx) => (
                                                <a 
                                                    key={idx} 
                                                    href={url} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="block text-[10px] font-bold text-rose-500 hover:underline truncate bg-white/50 px-2 py-1 rounded border border-rose-100/50"
                                                >
                                                    {url}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Keywords Grid */}
                            <CompactSection title="Keywords (Volumen)" icon={Hash}>
                                <div className="space-y-2">
                                    {store.strategyKeywords.slice(0, 5).map((k, i) => (
                                        <div key={i} className="flex items-center rounded-md border border-slate-100 bg-slate-50/50 p-1.5 gap-2 group">
                                            <input 
                                                value={k.keyword}
                                                onChange={e => {
                                                    const newKeys = [...store.strategyKeywords];
                                                    newKeys[i].keyword = e.target.value;
                                                    store.setStrategyKeywords(newKeys);
                                                }}
                                                className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none px-2"
                                            />
                                            <div className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded border border-slate-100 group">
                                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mr-1">Vol</span>
                                                <input 
                                                    value={k.volume}
                                                    onChange={e => {
                                                        const newKeys = [...store.strategyKeywords];
                                                        newKeys[i].volume = e.target.value;
                                                        store.setStrategyKeywords(newKeys);
                                                    }}
                                                    className="w-12 bg-transparent text-[10px] font-mono text-indigo-500 outline-none font-bold text-right"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const keys = [...store.strategyKeywords];
                                                    keys.splice(i, 1);
                                                    store.setStrategyKeywords(keys);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 p-1"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => store.setStrategyKeywords([...store.strategyKeywords, { keyword:'', volume:'0' }])}
                                    className="w-full h-8 mt-2 border-2 border-dashed border-slate-200 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Plus size={12} /> Añadir Keyword
                                </button>
                            </CompactSection>

                            {/* Competitor Analysis & Scraped Content */}
                            <CompactSection title="Auditoría de Competencia" icon={Globe}>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                    {(store.competitorDetails || []).map((comp, i) => (
                                        <div key={i} className="group p-2 rounded-lg border border-slate-100 bg-white hover:border-indigo-200 transition-all">
                                            <div className="flex items-start justify-between gap-2 overflow-hidden mb-2">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-slate-800 truncate mb-0.5">{comp.title || 'Competidor'}</p>
                                                    <p className="text-[8px] font-medium text-slate-400 truncate font-mono">{comp.url}</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <a href={comp.url} target="_blank" rel="noreferrer" className="p-1 text-slate-300 hover:text-indigo-500 transition-colors">
                                                        <Globe size={12} />
                                                    </a>
                                                </div>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                                                {comp.content && (
                                                    <button 
                                                        onClick={() => {
                                                            // Simple prompt/modal for content audit
                                                            const win = window.open("", "_blank");
                                                            if (win) {
                                                                win.document.write(`
                                                                    <html>
                                                                        <head><title>Auditoría: ${comp.title}</title></head>
                                                                        <body style="font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; line-height: 1.6; background: #f8fafc; color: #334155;">
                                                                            <h1 style="color: #4f46e5;">Audit: ${comp.title}</h1>
                                                                            <p style="font-size: 0.8rem; color: #94a3b8;">${comp.url}</p>
                                                                            <hr style="border: 0; height: 1px; background: #e2e8f0; margin: 1.5rem 0;" />
                                                                            <div style="white-space: pre-wrap; font-size: 0.9rem;">${comp.content}</div>
                                                                        </body>
                                                                    </html>
                                                                `);
                                                                win.document.close();
                                                            }
                                                        }}
                                                        className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[8px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors flex items-center gap-1 shrink-0"
                                                    >
                                                        <Sparkles size={10} /> Ver Contenido Extraído
                                                    </button>
                                                )}
                                                {comp.rankingKeywords && comp.rankingKeywords.length > 0 && (
                                                    <div className="hidden sm:flex px-2 py-1 bg-slate-50 text-slate-500 rounded text-[8px] font-bold uppercase tracking-wider shrink-0">
                                                        {comp.rankingKeywords.length} Keywords
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!store.competitorDetails || store.competitorDetails.length === 0) && (
                                        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ejecuta Investigar con Nous</p>
                                        </div>
                                    )}
                                </div>
                            </CompactSection>

                            {/* LSI Keywords */}
                            <CompactSection title="Keywords LSI (Semánticas TF-IDF)" icon={Layers}>
                                <div className="p-2 border border-slate-100 bg-slate-50/50 rounded-lg">
                                    <div className="flex flex-wrap gap-1.5">
                                        {store.strategyLSI.length > 0 ? (
                                            store.strategyLSI.map((l, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[9px] font-bold text-slate-600 flex items-center gap-1 group">
                                                    {l.keyword}
                                                    <span className="text-[7px] text-slate-300 font-mono">{l.count}</span>
                                                    <button 
                                                        onClick={() => {
                                                            const newLsi = [...store.strategyLSI];
                                                            newLsi.splice(i, 1);
                                                            store.setStrategyLSI(newLsi);
                                                        }}
                                                        className="hover:text-rose-500 transition-colors"
                                                    >
                                                        <X size={8} />
                                                    </button>
                                                </span>
                                            ))
                                        ) : (
                                            <p className="text-[9px] text-slate-400 italic">No se han generado keywords LSI aún...</p>
                                        )}
                                    </div>
                                    <textarea 
                                        className="w-full mt-3 h-16 p-2 text-[9px] font-medium bg-transparent border-t border-slate-100 outline-none resize-none text-slate-500 no-scrollbar"
                                        placeholder="Edita o añade keywords LSI aquí..."
                                        value={store.strategyLSI.map(l => l.keyword).join(', ')}
                                        onChange={e => {
                                            const kws = e.target.value.split(',').filter(Boolean).map(s => ({ keyword: s.trim(), count: '1' }));
                                            store.setStrategyLSI(kws);
                                        }}
                                    />
                                </div>
                            </CompactSection>

                            {/* Internal Links */}
                            <CompactSection title="Enlaces Internos Sugeridos" icon={Link2}>
                                <textarea 
                                    value={store.strategyInternalLinks.map(l => l.url).join('\n')}
                                    onChange={e => {
                                        const links = e.target.value.split('\n').filter(Boolean).map((u: string) => ({ 
                                            url: u.trim(), 
                                            title: '',
                                            type: 'other' as const,
                                            search_index: "0"
                                        }));
                                        store.setStrategyInternalLinks(links);
                                    }}
                                    placeholder="Extraidos del GSC..."
                                    className="w-full h-24 p-3 text-[10px] font-mono leading-relaxed bg-slate-50 border border-slate-100 rounded-lg outline-none resize-none text-slate-600 focus:bg-white focus:border-indigo-300 transition-colors"
                                />
                            </CompactSection>

                            {/* Specs */}
                            <CompactSection title="Especificaciones" icon={Type}>
                                <div className="flex gap-4">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Min Palabras</label>
                                        <input 
                                            value={store.strategyMinWords}
                                            onChange={e => store.setStrategyMinWords(e.target.value)}
                                            className="w-full h-8 px-3 text-xs font-bold bg-slate-50 border border-slate-100 rounded-md outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tono</label>
                                        <select 
                                            value={store.strategyTone}
                                            onChange={e => store.setStrategyTone(e.target.value)}
                                            className="w-full h-8 px-2 text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-md outline-none"
                                        >
                                            <option value="Profesional y cercano">Profesional</option>
                                            <option value="Informativo y neutro">Informativo</option>
                                            <option value="Persuasivo y comercial">Comercial</option>
                                        </select>
                                    </div>
                                </div>
                            </CompactSection>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Sticky Footer */}
            <div className="p-5 bg-white/95 backdrop-blur-md border-t border-slate-100 shrink-0">
                <Button 
                    onClick={handleFinish}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg flex items-center justify-center gap-2 group transition-all"
                >
                    <span className="text-[10px] font-black uppercase tracking-widest">Programar</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Button>
            </div>
        </div>
    );
}

function CompactSection({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                <Icon size={14} className="text-slate-400" />
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{title}</h4>
            </div>
            <div>{children}</div>
        </div>
    );
}
