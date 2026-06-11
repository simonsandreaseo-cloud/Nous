"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    allowedStatuses: string[];
}

export default function SmartSlugGeneratorModal({ isOpen, onClose, allowedStatuses }: Props) {
    const { activeProject, tasks, updateTask } = useProjectStore();
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [completed, setCompleted] = useState(false);
    
    const candidateTasks = tasks.filter(t => 
        t.project_id === activeProject?.id && 
        allowedStatuses.includes(t.status) &&
        !t.target_url_slug
    );

    // Reset state when opened
    useEffect(() => {
        if (isOpen) {
            setIsGenerating(false);
            setProgress(0);
            setCompleted(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (candidateTasks.length === 0) return;
        setIsGenerating(true);
        setProgress(0);

        try {
            // Process in batches of 50
            const batchSize = 50;
            const batches = [];
            for (let i = 0; i < candidateTasks.length; i += batchSize) {
                batches.push(candidateTasks.slice(i, i + batchSize));
            }

            let processedCount = 0;

            for (const batch of batches) {
                const titles = batch.map(t => t.title).filter(Boolean);
                
                const prompt = `
                Actúa como un experto en SEO. Tienes una lista de títulos de artículos de blog.
                Para cada título, debes generar un slug SEO-optimizado.
                Reglas para los slugs:
                1. Solo letras minúsculas y números.
                2. Espacios y caracteres especiales reemplazados por guiones (-).
                3. Sin stop words (el, la, los, de, para, etc.).
                4. Máximo 60 caracteres.
                5. Que incluya la keyword principal deducida del título.
                
                Títulos:
                ${titles.map((t, i) => `${i + 1}. ${t}`).join("\\n")}
                
                DEVUELVE ÚNICAMENTE un JSON array válido con los slugs en el mismo orden exacto.
                Ejemplo de salida:
                ["guia-seo-2026", "mejores-practicas-enlazado-interno", ...]
                `;

                const response = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        model: 'gemini-3.5-flash',
                        jsonMode: true
                    })
                });

                if (!response.ok) {
                    throw new Error("Error al generar slugs con Gemini 3.5 Flash");
                }

                const data = await response.json();
                let slugs: string[] = [];
                try {
                    // Limpiar markdown residual si el modelo no respetó el jsonMode estricto
                    const cleanText = data.text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                    slugs = JSON.parse(cleanText);
                } catch (e) {
                    console.error("Error parseando respuesta de Gemini", e);
                    continue; // Skip this batch on error
                }

                // Update tasks
                const updatePromises = batch.map((task, index) => {
                    const slug = slugs[index];
                    if (slug) {
                        return updateTask(task.id, { target_url_slug: slug });
                    }
                    return Promise.resolve();
                });

                await Promise.all(updatePromises);
                
                processedCount += batch.length;
                setProgress(Math.round((processedCount / candidateTasks.length) * 100));
            }

            setCompleted(true);
        } catch (error) {
            console.error("Error en la generación de slugs:", error);
            // Handle error UI if needed
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => !isGenerating && onClose()}
            />
            
            <div className="relative bg-white rounded-[32px] w-full max-w-lg shadow-2xl border border-slate-100 p-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Sparkles size={20} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic">
                                Generador de Slugs SEO
                            </h2>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                            Potenciado por Gemini 3.5 Flash
                        </p>
                    </div>
                    {!isGenerating && (
                        <button 
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {completed ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase">¡Slugs Generados!</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                Se han actualizado {candidateTasks.length} contenidos con URLs SEO-optimizadas.
                            </p>
                            <button 
                                onClick={onClose}
                                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    ) : candidateTasks.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 uppercase">Todo al día</h3>
                            <p className="text-sm text-slate-500 font-medium mt-2">
                                Todos los contenidos planificados en los estados seleccionados ya tienen un slug generado.
                            </p>
                            <button 
                                onClick={onClose}
                                className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                                <span className="text-4xl font-black text-indigo-600 tracking-tighter">
                                    {candidateTasks.length}
                                </span>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-2">
                                    Contenidos sin URL
                                </p>
                            </div>

                            <p className="text-sm text-slate-600 font-medium text-center">
                                Nous usará <strong>Gemini 3.5 Flash</strong> para analizar los títulos y generar automáticamente URLs amigables (slugs) optimizadas para SEO.
                            </p>

                            {isGenerating ? (
                                <div className="space-y-3 pt-4">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <span>Generando...</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-4">
                                    <button 
                                        onClick={handleGenerate}
                                        className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20"
                                    >
                                        <Sparkles size={16} />
                                        Generar Slugs con IA ({Math.ceil(candidateTasks.length / 50)} lote{Math.ceil(candidateTasks.length / 50) !== 1 ? 's' : ''})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
