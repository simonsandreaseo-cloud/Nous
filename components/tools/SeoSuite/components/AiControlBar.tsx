
import React, { useState } from 'react';
import { Brain, ChevronRight, Cpu, Key, Sparkles, Square } from 'lucide-react';
import { Language } from '../types';
import { AVAILABLE_MODELS } from '../services/aiService';

interface AiControlBarProps {
    lang: Language;
    isAnalyzing: boolean;
    progress: { processed: number; total: number };
    onStart: () => void;
    onStop: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
    model: string;
    setModel: (model: string) => void;
    siteContext: string;
    setSiteContext: (ctx: string) => void;
    children?: React.ReactNode; 
}

const AiControlBar: React.FC<AiControlBarProps> = ({
    lang,
    isAnalyzing,
    progress,
    onStart,
    onStop,
    apiKey,
    setApiKey,
    model,
    setModel,
    siteContext,
    setSiteContext,
    children
}) => {
    const [showContextInput, setShowContextInput] = useState(false);

    const t = {
        aiTitle: lang === 'es' ? 'Análisis IA' : 'AI Analysis',
        aiDesc: lang === 'es' ? 'Detectar patrones, tendencias y sugerir acciones' : 'Detect patterns, trends and suggest actions',
        apiKeyPlaceholder: lang === 'es' ? 'Tu Gemini API Key' : 'Your Gemini API Key',
        startAi: lang === 'es' ? 'Analizar' : 'Analyze',
        stopAi: lang === 'es' ? 'Detener' : 'Stop',
        contextLabel: lang === 'es' ? 'Contexto del Sitio (Opcional)' : 'Site Context (Optional)',
        contextPlaceholder: lang === 'es' ? 'Ej: Es un ecommerce de zapatos deportivos...' : 'E.g: This is a sports shoes ecommerce...',
        toggleContext: lang === 'es' ? 'Configurar Contexto' : 'Set Context',
    };

    return (
        <div className="bg-gradient-to-br from-indigo-700 to-violet-800 rounded-xl p-6 text-white shadow-lg mb-8">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm mt-1">
                        <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg">{t.aiTitle}</h3>
                        <p className="text-indigo-100 text-sm mb-3">{t.aiDesc}</p>
                        
                        <button 
                            onClick={() => setShowContextInput(!showContextInput)}
                            className="text-xs bg-indigo-900/50 hover:bg-indigo-900/70 px-3 py-1.5 rounded-md transition-colors text-indigo-100 flex items-center gap-2"
                        >
                            {showContextInput ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3" />}
                            {t.toggleContext}
                        </button>

                        {showContextInput && (
                            <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                                <label className="text-xs font-semibold text-indigo-200 mb-1 block">{t.contextLabel}</label>
                                <textarea
                                    value={siteContext}
                                    onChange={(e) => setSiteContext(e.target.value)}
                                    placeholder={t.contextPlaceholder}
                                    className="w-full sm:w-96 h-20 px-3 py-2 rounded-lg bg-white/10 border border-indigo-400/30 text-white placeholder-indigo-300/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="flex flex-col w-full lg:w-auto gap-3">
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <div className="relative w-full sm:w-auto">
                            <select
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="w-full sm:w-48 appearance-none pl-9 pr-8 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer hover:bg-white/20 transition-colors"
                                disabled={isAnalyzing}
                            >
                                {AVAILABLE_MODELS.map(m => (
                                    <option key={m} value={m} className="text-slate-900">
                                        {m}
                                    </option>
                                ))}
                            </select>
                            <Cpu className="w-4 h-4 text-indigo-200 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <ChevronRight className="w-4 h-4 text-indigo-200 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>

                        <div className="relative w-full sm:w-auto">
                            <input 
                                type="password" 
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={t.apiKeyPlaceholder}
                                className="w-full sm:w-56 pl-9 px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm"
                                disabled={isAnalyzing}
                            />
                            <Key className="w-4 h-4 text-indigo-200 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <button 
                            onClick={isAnalyzing ? onStop : onStart}
                            disabled={!apiKey && !isAnalyzing}
                            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg font-bold text-sm shadow-lg flex items-center justify-center gap-2 whitespace-nowrap transition-all ${
                                isAnalyzing 
                                    ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                                    : 'bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-70 disabled:cursor-not-allowed'
                            }`}
                        >
                            {isAnalyzing ? (
                                <><Square className="w-4 h-4 fill-current" /> {t.stopAi}</>
                            ) : (
                                <><Sparkles className="w-4 h-4 fill-indigo-500" /> {t.startAi}</>
                            )}
                        </button>
                    </div>
                    
                    {isAnalyzing && (
                        <div className="w-full bg-indigo-900/50 rounded-full h-3 overflow-hidden mt-1 relative">
                            <div 
                                className="bg-white h-full transition-all duration-300 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-indigo-100">
                            {progress.processed} / {progress.total}
                            </div>
                        </div>
                    )}
                    
                    {children}
                </div>
            </div>
        </div>
    );
};

export default AiControlBar;
