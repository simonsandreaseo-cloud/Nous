"use client";

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Sparkles, X, Globe, FileText, Check, ChevronRight } from 'lucide-react';
import { BriefingService, SERPResult } from './BriefingServiceLocal';
import { motion } from 'framer-motion';

interface BriefingModalProps {
    isOpen: boolean;
    onClose: () => void;
    keyword: string;
    country: string;
    onBriefSave: (content: string, refs: string[]) => void;
}

export default function BriefingModal({ isOpen, onClose, keyword, country = 'ES', onBriefSave }: BriefingModalProps) {
    const [step, setStep] = useState<'serp' | 'analyze' | 'generate'>('serp');
    const [isLoading, setIsLoading] = useState(false);
    const [serpResults, setSerpResults] = useState<SERPResult[]>([]);
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
    const [generatedBrief, setGeneratedBrief] = useState("");

    // Step 1: Analyze SERP
    const handleAnalyzeSERP = async () => {
        if (!keyword || keyword.trim().length < 2) {
            alert("Por favor, introduce una palabra clave válida en el Topic o selecciona un proyecto.");
            return;
        }

        setIsLoading(true);
        try {
            console.log(`[BriefingModal] Starting SERP analysis for: ${keyword}`);
            const results = await BriefingService.fetchSERP(keyword, country);
            setSerpResults(results.slice(0, 10)); // Top 10
            setSelectedUrls(results.slice(0, 3).map(r => r.url)); // Default select top 3
            setStep('analyze');
        } catch (error: any) {
            console.error("[BriefingModal] SERP Error:", error);
            alert(`Error al analizar SERP: ${error.message || "Error desconocido"}. \n\n¿Está encendida la App de Escritorio (python server.py)?`);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Scrape & Generate Brief
    const handleGenerateBrief = async () => {
        setIsLoading(true);
        try {
            // 1. Scrape Content of selected competitors locally
            console.log("[BriefingModal] Scraping selected references...");
            const scrapedData = await BriefingService.scrapeContent(selectedUrls);

            // 2. Map to the format expected by generate-outline
            const competitorStructures = scrapedData.map(d => ({
                url: d.url,
                headers: d.headers
            }));

            // 3. Generate the Neural Outline/Brief via AI
            const res = await fetch('/api/content/generate-outline', {
                method: 'POST',
                body: JSON.stringify({
                    competitorStructures,
                    targetKeywords: [], // Or pass real keywords if available in context
                    topic: keyword
                })
            });

            const outlineData = await res.json();
            if (outlineData.error) throw new Error(outlineData.error);

            // 4. Format the final briefing text
            const finalBrief = `
# Briefing Neural: ${outlineData.title_h1 || keyword}

## Estructura Sugerida
${outlineData.sections.map((s: any) => `
### ${s.tag}: ${s.text}
> ${s.writing_intent}
${s.subsections?.map((sub: any) => `
#### ${sub.tag}: ${sub.text}
- ${sub.writing_intent}
`).join('') || ''}`).join('\n')}

## Checklist de Calidad
${outlineData.quality_check?.map((c: string) => `- [ ] ${c}`).join('\n')}

---
*Generado mediante ingeniería inversa de competidores.*
            `.trim();

            setGeneratedBrief(finalBrief);
            setStep('generate');
        } catch (error: any) {
            console.error(error);
            alert("Error generando el briefing: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = () => {
        onBriefSave(generatedBrief, selectedUrls);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[100]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-slate-100">
                                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                                    <Dialog.Title as="h3" className="text-lg font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-2">
                                        <Sparkles className="text-cyan-500" size={20} />
                                        Generador de Briefings Neural
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                                </div>

                                {step === 'serp' && (
                                    <div className="text-center py-8 space-y-4">
                                        <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                            <Globe size={32} />
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-800">Analizando SERP en {country}</h4>
                                        <p className="text-slate-500 text-sm max-w-md mx-auto">
                                            Vamos a buscar "<strong>{keyword}</strong>" en Google ({country}) para entender qué está posicionando y extraer la estructura ganadora.
                                        </p>
                                        <button
                                            onClick={handleAnalyzeSERP}
                                            disabled={isLoading}
                                            className="mt-6 px-8 py-3 bg-cyan-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-cyan-700 transition-all disabled:opacity-50"
                                        >
                                            {isLoading ? "Analizando..." : "Iniciar Análisis"}
                                        </button>
                                    </div>
                                )}

                                {step === 'analyze' && (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecciona Referencias (Top 10)</h4>
                                        <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                            {serpResults.map((result) => (
                                                <div
                                                    key={result.url}
                                                    onClick={() => {
                                                        if (selectedUrls.includes(result.url)) {
                                                            setSelectedUrls(selectedUrls.filter(u => u !== result.url));
                                                        } else {
                                                            setSelectedUrls([...selectedUrls, result.url]);
                                                        }
                                                    }}
                                                    className={`p-3 rounded-lg border cursor-pointer transition-all flex gap-3 ${selectedUrls.includes(result.url) ? 'border-cyan-500 bg-cyan-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                                                >
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${selectedUrls.includes(result.url) ? 'bg-cyan-500 border-cyan-500 text-white' : 'border-slate-300'}`}>
                                                        {selectedUrls.includes(result.url) && <Check size={12} />}
                                                    </div>
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1">{result.title}</h5>
                                                        <p className="text-[10px] text-slate-500 line-clamp-2">{result.description}</p>
                                                        <span className="text-[9px] text-green-600 font-mono">{result.url}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                            <span className="text-xs text-slate-500">{selectedUrls.length} seleccionados</span>
                                            <button
                                                onClick={handleGenerateBrief}
                                                disabled={isLoading || selectedUrls.length === 0}
                                                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-cyan-600 transition-all flex items-center gap-2"
                                            >
                                                {isLoading ? "Generando..." : "Generar Briefing IA"} <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 'generate' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Briefing Generado</h4>
                                            <div className="flex gap-2">
                                                <button onClick={() => setStep('analyze')} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-1 bg-slate-100 rounded">Atrás</button>
                                            </div>
                                        </div>

                                        <textarea
                                            value={generatedBrief}
                                            onChange={(e) => setGeneratedBrief(e.target.value)}
                                            className="w-full h-64 p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                                        />

                                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                            <button
                                                onClick={handleSave}
                                                className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                                            >
                                                <Check size={16} /> Aceptar y Usar
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
