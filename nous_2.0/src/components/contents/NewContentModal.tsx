'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Settings, Loader2, CheckCircle2, Calendar, Tag, ChevronRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore, Task } from '@/store/useProjectStore';
import { runDeepSEOAnalysis } from '@/components/tools/writer/services';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/utils/cn';

interface NewContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialDate?: string;
}

type ModalStep = 'initial' | 'researching' | 'review' | 'manual';

export function NewContentModal({ isOpen, onClose, initialDate }: NewContentModalProps) {
    const { activeProject, addTask } = useProjectStore();
    const [step, setStep] = useState<ModalStep>('initial');
    const [idea, setIdea] = useState('');
    const [progress, setProgress] = useState(0);
    const [currentPhase, setCurrentPhase] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    
    // SEO Data results
    const [seoData, setSeoData] = useState<any>(null);
    const [editedData, setEditedData] = useState<Partial<Task>>({
        title: '',
        target_keyword: '',
        scheduled_date: initialDate || format(new Date(), 'yyyy-MM-dd'),
        status: 'idea'
    });

    useEffect(() => {
        if (!isOpen) {
            setStep('initial');
            setIdea('');
            setProgress(0);
            setCurrentPhase('');
            setShowSuccess(false);
            setSeoData(null);
        }
    }, [isOpen]);

    const handleInvestigate = async () => {
        if (!idea.trim() || !activeProject) return;
        
        setStep('researching');
        setProgress(5);
        setCurrentPhase('Iniciando Investigación Nous...');

        try {
            // Mocking progress based on phases usually reported by runDeepSEOAnalysis
            const data = await runDeepSEOAnalysis(
                idea,
                [], // csvData empty for now if not provided
                activeProject.name,
                true,
                activeProject.id,
                (phase) => {
                    setCurrentPhase(phase);
                    // Approximate progress based on phase names
                    if (phase.includes('Fase 1')) setProgress(20);
                    if (phase.includes('Fase 2')) setProgress(40);
                    if (phase.includes('Fase 3')) setProgress(60);
                    if (phase.includes('Fase 4')) setProgress(80);
                    if (phase.includes('Fase 5')) setProgress(90);
                    if (phase.includes('Fase 6')) setProgress(95);
                }
            );

            setProgress(100);
            setCurrentPhase('Investigación Completada');
            setSeoData(data);
            
            // Prepare the task data
            const newTaskData: Partial<Task> = {
                project_id: activeProject.id,
                title: data.nicheDetected ? `${idea} - ${data.nicheDetected}` : idea,
                target_keyword: data.keywordIdeas?.shortTail?.[0] || idea,
                status: 'en_investigacion',
                scheduled_date: editedData.scheduled_date,
                research_dossier: data,
                viability: data.keywordDifficulty || 'Media',
                volume: parseInt(data.searchVolume ?? '0') || 0,
            };

            setEditedData(prev => ({ ...prev, ...newTaskData }));
            
            // AUTO-SAVE logic
            await addTask(newTaskData as any);
            
            setShowSuccess(true);
            
            // Transition to review after 1 second
            setTimeout(() => {
                setShowSuccess(false);
                setStep('review');
            }, 1500);

        } catch (error) {
            console.error("Research failed:", error);
            alert("Error en la investigación. Por favor intenta de nuevo.");
            setStep('initial');
        }
    };

    const handleManual = () => {
        setEditedData({
            ...editedData,
            title: idea,
            status: 'idea'
        });
        setStep('manual');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
                />

                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Sparkles size={18} />
                            </div>
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Programar Contenido</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-8">
                        {/* 1. INITIAL STEP */}
                        {step === 'initial' && (
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">¿Qué quieres crear? (Idea / Tema)</label>
                                    <textarea
                                        autoFocus
                                        value={idea}
                                        onChange={(e) => setIdea(e.target.value)}
                                        placeholder="Ej: Las 10 mejores zapatillas para running en 2025..."
                                        className="w-full min-h-[120px] p-6 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-200 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={handleInvestigate}
                                        disabled={!idea.trim()}
                                        className="flex flex-col items-center justify-center p-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[24px] transition-all group disabled:opacity-50 disabled:grayscale"
                                    >
                                        <Sparkles className="mb-3 group-hover:scale-110 transition-transform" size={24} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Investigación Nous</span>
                                        <span className="text-[9px] opacity-60 mt-1">IA analiza SERP, Keywords y SEO</span>
                                    </button>

                                    <button
                                        onClick={handleManual}
                                        className="flex flex-col items-center justify-center p-6 bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 rounded-[24px] transition-all group"
                                    >
                                        <Settings className="mb-3 group-hover:rotate-45 transition-transform" size={24} />
                                        <span className="text-[11px] font-black uppercase tracking-widest">Configuración Manual</span>
                                        <span className="text-[9px] text-slate-400 mt-1">Tú defines todos los campos</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. RESEARCHING STEP */}
                        {step === 'researching' && (
                            <div className="flex flex-col items-center justify-center py-12 space-y-8">
                                {showSuccess ? (
                                    <motion.div 
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="flex flex-col items-center text-center"
                                    >
                                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Investigación Completada</h2>
                                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Contenido creado y datos procesados</p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <div className="relative w-24 h-24">
                                            <div className="absolute inset-0 border-4 border-indigo-50 rounded-full" />
                                            <motion.div 
                                                className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles className="text-indigo-600" size={32} />
                                            </div>
                                        </div>

                                        <div className="w-full space-y-4 px-12">
                                            <div className="flex justify-between items-end">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 block">Investigando en Tiempo Real</span>
                                                    <p className="text-xs font-bold text-slate-900">{currentPhase}</p>
                                                </div>
                                                <span className="text-xl font-black text-indigo-600">{progress}%</span>
                                            </div>
                                            
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                                <motion.div 
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 max-w-xs mx-auto">
                                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                                Estamos analizando la competencia y extrayendo enlaces internos relevantes para tu proyecto.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 3. REVIEW / MANUAL STEP */}
                        {(step === 'review' || step === 'manual') && (
                            <div className="space-y-8 max-h-[60vh] overflow-y-auto px-1 custom-scrollbar pb-4">
                                <div className="space-y-6">
                                    {/* BASIC INFO SECTION */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Título / H1</label>
                                                <input 
                                                    value={editedData.title}
                                                    onChange={e => setEditedData({...editedData, title: e.target.value})}
                                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 italic outline-none focus:border-indigo-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha Planificada</label>
                                                <div className="relative">
                                                    <input 
                                                        type="date"
                                                        value={editedData.scheduled_date}
                                                        onChange={e => setEditedData({...editedData, scheduled_date: e.target.value})}
                                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-200"
                                                    />
                                                    <Calendar size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Keyword Principal</label>
                                                <div className="relative">
                                                    <input 
                                                        value={editedData.target_keyword}
                                                        onChange={e => setEditedData({...editedData, target_keyword: e.target.value})}
                                                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-200"
                                                    />
                                                    <Tag size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* SEO INSIGHTS SECTION (Only if researched) */}
                                    {seoData && (
                                        <div className="space-y-4 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Sparkles size={14} className="text-indigo-500" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800">Resultados de Investigación</span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Dificultad</span>
                                                    <span className="text-xs font-bold text-slate-800">{seoData.keywordDifficulty || 'Media'}</span>
                                                </div>
                                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Volumen Sugerido</span>
                                                    <span className="text-xs font-bold text-slate-800">{seoData.searchVolume || 'No disponible'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Palabras Clave LSI / Semánticas</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {seoData.lsiKeywords?.slice(0, 15).map((kw: any, i: number) => (
                                                        <span key={i} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold border border-indigo-100">
                                                            {kw.keyword} {kw.count ? `(${kw.count})` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Competencia Relevante (SERP Top)</label>
                                                <div className="space-y-2">
                                                    {seoData.top10Urls?.slice(0, 3).map((comp: any, i: number) => (
                                                        <a 
                                                            key={i} 
                                                            href={comp.url} 
                                                            target="_blank" 
                                                            className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-all group"
                                                        >
                                                            <span className="text-[11px] font-bold text-slate-600 truncate max-w-[80%]">{comp.title}</span>
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={onClose}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all"
                                >
                                    Listo, Finalizar
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
