'use client';

import { useWriterStore } from '@/store/useWriterStore';
import { cn } from '@/utils/cn';
import { Bot, Search, Image as ImageIcon, FileOutput, X, Settings, Sparkles, Check, Globe } from 'lucide-react';
import { Button } from '@/components/dom/Button';
import { useState, useEffect } from 'react';
import { runHumanizerPipeline, runSEOAnalysis } from '@/components/tools/writer/services';
import BriefingModal from '@/components/studio/writer/BriefingModal';

export default function WriterSidebar() {
    const {
        isSidebarOpen, toggleSidebar, activeSidebarTab, setSidebarTab,
        content, setContent, apiKeys, setApiKeys, humanizerConfig, updateHumanizerConfig,
        setGenerating, isGenerating, keyword, setKeyword, seoResults, setSeoResults
    } = useWriterStore();



    const [statusMessage, setStatusMessage] = useState("");
    const [isBriefingModalOpen, setIsBriefingModalOpen] = useState(false);

    const handleHumanize = async () => {
        if (!content) return;
        if (apiKeys.length === 0) {
            alert("Por favor configura tus API Keys de Google Gemini primero.");
            setSidebarTab('assistant'); // Ensure we are on the assistant tab to show the input
            return;
        }

        setGenerating(true);
        setStatusMessage("Iniciando humanización...");
        try {
            const result = await runHumanizerPipeline(
                apiKeys,
                content,
                { ...humanizerConfig, isStrictMode: false, keywords: '' },
                humanizerConfig.intensity,
                (msg) => setStatusMessage(msg)
            );
            setContent(result.html);
            setStatusMessage("¡Humanización completada!");
            setTimeout(() => setStatusMessage(""), 3000);
        } catch (e: any) {
            console.error(e);
            setStatusMessage("Error: " + e.message);
        } finally {
            setGenerating(false);
        }
    };

    const handleSEOAnalysisTrigger = async () => {
        if (!keyword) return;
        if (apiKeys.length === 0) {
            alert("Configura API Keys para el análisis SEO");
            return;
        }

        setGenerating(true);
        setStatusMessage(`Analizando "${keyword}"...`);
        try {
            const results = await runSEOAnalysis(
                apiKeys,
                keyword,
                [], // No external CSV data for now
            );
            setSeoResults(results);
            setStatusMessage("Análisis SEO completado.");
        } catch (e: any) {
            console.error(e);
            setStatusMessage("Error en análisis SEO: " + e.message);
        } finally {
            setGenerating(false);
        }
    };

    // Auto-analyze if keyword is present and no results yet (One-Click / Zero-Click)
    useEffect(() => {
        if (activeSidebarTab === 'seo' && keyword && !seoResults && !isGenerating && apiKeys.length > 0) {
            handleSEOAnalysisTrigger();
        }
    }, [activeSidebarTab, keyword, apiKeys]);

    if (!isSidebarOpen) return null;

    const tabs = [
        { id: 'assistant', label: 'Asistente', icon: Bot },
        { id: 'seo', label: 'SEO', icon: Search },
        { id: 'media', label: 'Media', icon: ImageIcon },
        { id: 'export', label: 'Exportar', icon: FileOutput },
    ] as const;

    return (
        <aside className="w-80 border-l border-slate-200 bg-white h-full flex flex-col shadow-xl z-20">
            {/* Header / Tabs */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <span className="font-semibold text-slate-800 text-sm">Herramientas</span>
                <button
                    onClick={toggleSidebar}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>

            <div className="flex border-b border-slate-200 bg-slate-50/50">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setSidebarTab(tab.id)}
                        className={cn(
                            "flex-1 py-3 flex justify-center items-center text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all border-b-2 border-transparent",
                            activeSidebarTab === tab.id && "bg-white text-blue-600 border-blue-600 font-medium"
                        )}
                        title={tab.label}
                    >
                        <tab.icon size={18} />
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                {/* ASSISTANT TAB */}
                {activeSidebarTab === 'assistant' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <h3 className="font-semibold text-blue-900 text-sm mb-2 flex items-center gap-2">
                                <Bot size={14} /> AI Copilot
                            </h3>
                            <p className="text-xs text-blue-700 leading-relaxed">
                                {statusMessage || "Estoy leyendo tu contenido en tiempo real. Puedo sugerirte mejoras, continuar escribiendo o corregir el tono."}
                            </p>
                            {isGenerating && <div className="mt-2 h-1 bg-blue-200 rounded overflow-hidden"><div className="h-full bg-blue-500 animate-progress"></div></div>}
                        </div>

                        {/* API KEY CONFIG (Mini) */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex justify-between">
                                API Keys (Gemini)
                                <span className="text-[10px] text-slate-400">{apiKeys.length} activas</span>
                            </label>
                            <textarea
                                value={apiKeys.join('\n')}
                                onChange={(e) => setApiKeys(e.target.value.split('\n').filter(k => k.trim().length > 0))}
                                placeholder="Pegar Keys aquí (una por línea)..."
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] h-16 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones Rápidas</label>
                            <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-xs">
                                ✨ Mejorar redacción
                            </Button>
                            <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-xs">
                                📝 Continuar escribiendo
                            </Button>
                            <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-xs">
                                🎯 Ajustar tono
                            </Button>
                            <Button
                                variant="secondary"
                                className="w-full justify-start gap-2 h-9 text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-100"
                                onClick={() => setIsBriefingModalOpen(true)}
                            >
                                <Globe size={14} className="text-cyan-500" /> Generar Brief (SERP)
                            </Button>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-pink-500">Humanizador</label>
                                <span className="text-[10px] font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">{humanizerConfig.intensity}%</span>
                            </div>

                            <div className="bg-pink-50/50 p-3 rounded-lg border border-pink-100 space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-slate-500">Intensidad</label>
                                    <input
                                        type="range"
                                        min="0" max="100"
                                        value={humanizerConfig.intensity}
                                        onChange={(e) => updateHumanizerConfig({ intensity: parseInt(e.target.value) })}
                                        className="w-full h-1.5 bg-pink-200 rounded-lg appearance-none cursor-pointer accent-pink-600"
                                    />
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full justify-center gap-2 h-9 text-xs bg-pink-600 hover:bg-pink-700 text-white border-none shadow-sm shadow-pink-200"
                                    onClick={handleHumanize}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? <Sparkles size={14} className="animate-spin" /> : <Bot size={14} />}
                                    {isGenerating ? "Humanizando..." : "Humanizar Texto"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SEO TAB */}
                {activeSidebarTab === 'seo' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Palabra Clave</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ej: Marketing Digital"
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700"
                                />
                                <Button
                                    variant="secondary"
                                    className="w-9 h-9 p-0 flex items-center justify-center shrink-0"
                                    onClick={handleSEOAnalysisTrigger}
                                    title="Analizar (Auto si hay keyword)"
                                    disabled={isGenerating}
                                >
                                    <Sparkles size={14} className={keyword ? "text-blue-500" : "text-slate-400"} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Checklist SEO</label>

                            {seoResults ? (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
                                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1">Estrategia Generada</p>
                                        <div className="flex justify-between">
                                            <p className="text-xs text-emerald-700">Dificultad: <span className="font-bold">{seoResults.keywordDifficulty || "N/A"}</span></p>
                                            <p className="text-xs text-emerald-700">Vol: <span className="font-bold">{seoResults.searchVolume || "N/A"}</span></p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LSI Keywords</p>
                                        <div className="flex flex-wrap gap-1">
                                            {seoResults.lsiKeywords?.slice(0, 8).map((k: any, i: number) => (
                                                <span
                                                    key={i}
                                                    className={cn(
                                                        "px-2 py-1 rounded text-[10px] border",
                                                        content.toLowerCase().includes(k.keyword.toLowerCase())
                                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                            : "bg-slate-50 text-slate-600 border-slate-100"
                                                    )}
                                                >
                                                    {k.keyword}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : keyword ? (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-center">
                                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mb-2">Listo para analizar</p>
                                    {!isGenerating && (
                                        <Button onClick={handleSEOAnalysisTrigger} size="sm" className="w-full text-xs bg-blue-600 text-white">
                                            <Sparkles size={12} className="mr-2" /> Analizar Ahora
                                        </Button>
                                    )}
                                    {isGenerating && <p className="text-xs text-blue-600 animate-pulse">Analizando...</p>}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 italic">Ingresa una keyword para ver sugerencias.</p>
                            )}

                            <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Básicos</p>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${content.toLowerCase().includes(keyword.toLowerCase()) && keyword ? "bg-emerald-100 border-emerald-500 text-emerald-600" : "border-slate-300"}`}>
                                        {content.toLowerCase().includes(keyword.toLowerCase()) && keyword && <Check size={10} />}
                                    </div>
                                    <span className="text-xs">Palabra clave en Texto</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MEDIA TAB */}
                {activeSidebarTab === 'media' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center py-8 text-slate-400">
                            <ImageIcon size={32} className="mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Generación de imágenes con IA próximamente.</p>
                        </div>
                    </div>
                )}

                {/* EXPORT TAB */}
                {activeSidebarTab === 'export' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formatos</label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-blue-500 hover:bg-blue-50/50">
                                <span className="font-semibold text-slate-700">HTML</span>
                                <span className="text-[10px] text-slate-400">Copiar código</span>
                            </Button>
                            <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-blue-500 hover:bg-blue-50/50">
                                <span className="font-semibold text-slate-700">Markdown</span>
                                <span className="text-[10px] text-slate-400">Descargar .md</span>
                            </Button>
                            <Button variant="outline" className="w-full h-20 flex-col gap-2 hover:border-blue-500 hover:bg-blue-50/50 col-span-2">
                                <span className="font-semibold text-slate-700">Google Docs</span>
                                <span className="text-[10px] text-slate-400">Enviar al Drive</span>
                            </Button>
                        </div>
                    </div>
                )}

            </div>

            <BriefingModal
                isOpen={isBriefingModalOpen}
                onClose={() => setIsBriefingModalOpen(false)}
                keyword={keyword}
                country="ES" // TODO: Connect to activeProject
                onBriefSave={(briefContent, refs) => {
                    setContent(briefContent + "\n\n" + content);
                    alert("Briefing añadido.");
                }}
            />
        </aside>
    );
}
