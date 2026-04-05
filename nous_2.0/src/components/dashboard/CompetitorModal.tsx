"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Globe, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { NotificationService } from "@/lib/services/notifications";

interface CompetitorModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskId: string;
}

export default function CompetitorModal({ isOpen, onClose, taskId }: CompetitorModalProps) {
    const { tasks, updateTask } = useProjectStore();
    const task = tasks.find(t => t.id === taskId);
    
    const [newUrl, setNewUrl] = useState("");
    const [isExtracting, setIsExtracting] = useState(false);

    if (!task) return null;

    const competitors = task.research_dossier?.top10Urls || [];

    const handleAddCompetitor = async () => {
        if (!newUrl.trim()) return;
        
        try {
            const domain = newUrl.replace('https://', '').replace('http://', '').split('/')[0];
            const newComp = { url: newUrl, title: domain };
            const dossier = task.research_dossier || {};
            const updatedCompetitors = [...competitors, newComp];
            
            await updateTask(taskId, { 
                research_dossier: { ...dossier, top10Urls: updatedCompetitors } 
            });
            
            setNewUrl("");
            NotificationService.success("Competidor añadido", "Se ha guardado la URL manualmente.");
        } catch (error) {
            NotificationService.error("Error", "No se pudo añadir el competidor.");
        }
    };

    const handleRemoveCompetitor = async (url: string) => {
        const dossier = task.research_dossier || {};
        const updatedCompetitors = competitors.filter((c: any) => c.url !== url);
        await updateTask(taskId, { 
            research_dossier: { ...dossier, top10Urls: updatedCompetitors } 
        });
    };

    const handleExtractContent = async () => {
        if (competitors.length === 0) {
            NotificationService.notify("Sin competidores", "Debes añadir al menos una URL para extraer contenido.");
            return;
        }

        setIsExtracting(true);
        try {
            const results = [];
            for (const comp of competitors) {
                try {
                    const apiKey = process.env.NEXT_PUBLIC_JINA_API_KEY || '';
                    const response = await fetch(`https://r.jina.ai/${comp.url}`, {
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'X-Retain-Images': 'none'
                        }
                    });
                    
                    if (!response.ok) throw new Error(`Error fetching ${comp.url}`);
                    
                    const text = await response.text(); 
                    if (text) {
                        results.push({ url: comp.url, content: text });
                    }
                } catch (e) {
                    console.error(`Error scraping ${comp.url}:`, e);
                }
            }
            
            if (results.length > 0) {
                const dossier = task.research_dossier || {};
                const existingExtractions = dossier.extractions || [];
                await updateTask(taskId, { 
                    research_dossier: { ...dossier, extractions: [...existingExtractions, ...results] } 
                });
                NotificationService.success("Extracción completada", `Se ha extraído contenido de ${results.length} competidores vía Jina AI.`);
            } else {
                throw new Error("No se pudo extraer contenido de ninguna URL.");
            }
            
            onClose();
        } catch (error) {
            NotificationService.error("Fallo de extracción", "Hubo un error procesando las URLs con Jina AI.");
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
                    >
                        <div className="p-10 pb-6 border-none flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">
                                    Gestionar Competidores
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Añade URLs para análisis profundo
                                </p>
                            </div>
                            <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-all text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-10 py-4 space-y-6">
                            <div className="relative group">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-1">Nueva URL Competidor</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-4 pl-12 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                                            placeholder="https://dominio.com/articulo..."
                                            value={newUrl}
                                            onChange={(e) => setNewUrl(e.target.value)}
                                        />
                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                    </div>
                                    <button 
                                        onClick={handleAddCompetitor}
                                        disabled={!newUrl.trim()}
                                        className="p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all disabled:opacity-50"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Lista de Competidores ({competitors.length})</label>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                    {competitors.length === 0 ? (
                                        <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Sin competidores añadidos</span>
                                        </div>
                                    ) : (
                                        competitors.map((comp: any, i: number) => (
                                            <div key={i} className="group flex items-center justify-between p-3 bg-slate-50 hover:bg-white border border-slate-100 rounded-lg transition-all">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                    <span className="text-[11px] font-bold text-slate-600 truncate">{comp.title || comp.url}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveCompetitor(comp.url)}
                                                    className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-10 pt-6">
                            <button
                                disabled={isExtracting || competitors.length === 0}
                                onClick={handleExtractContent}
                                className="w-full relative group bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[24px] py-5 font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative flex items-center justify-center gap-3">
                                    {isExtracting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Analizando contenidos...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={18} />
                                            Extraer Contenido Profundo
                                        </>
                                    )}
                                </div>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
