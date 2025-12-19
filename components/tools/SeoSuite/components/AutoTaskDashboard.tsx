
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CannibalizationGroup, ComparisonRow, Language, AiBatchOptions, GlobalSiteStats, AutoTaskResult, ModuleId, ExternalApiKeys, ProviderConfig, AutoTaskSession, AutoTaskStep } from '../types';
import { analyzeCannibalizationMaster, analyzeSeoCase, getOpportunityPriority } from '../services/aiService';
import { analyzeModule } from '../services/analyzer';
import { Play, Loader2, CheckCircle, AlertCircle, FileText, Code, CheckSquare, Download, Sparkles, Brain, Key, Printer, ArrowRight, Settings, ScanSearch, X, Edit3, Save } from 'lucide-react';
import TaskView from './TaskView';
import ErrorModal, { ErrorDetails } from './ErrorModal';
import { MODULES } from './ModuleSelector';

interface AutoTaskDashboardProps {
    cannibalizationGroups: CannibalizationGroup[];
    comparisonRows: ComparisonRow[];
    stats: GlobalSiteStats;
    lang: Language;
    apiKeys: string[];
    externalKeys: ExternalApiKeys;
    providerConfig: ProviderConfig; 
    onBack: () => void;
    initialModel: string;
    onUpdateGroups: (updatedGroups: CannibalizationGroup[]) => void;
    onUpdateRows: (updatedRows: ComparisonRow[]) => void;
    session: AutoTaskSession | null;
    onSaveSession: (session: AutoTaskSession) => void;
}

const AutoTaskDashboard: React.FC<AutoTaskDashboardProps> = ({
    cannibalizationGroups,
    comparisonRows,
    stats,
    lang,
    apiKeys,
    externalKeys,
    providerConfig,
    onBack,
    initialModel,
    onUpdateGroups,
    onUpdateRows,
    session,
    onSaveSession
}) => {
    // Flow State - Initialize from session if available
    const [step, setStep] = useState<AutoTaskStep>(session?.step || 'CONTEXT');
    
    // Config State - Initialize from session if available
    const [siteContext, setSiteContext] = useState(session?.siteContext || '');
    const [candidateTasks, setCandidateTasks] = useState<Map<string, any[]>>(session?.candidateTasks || new Map());
    const [selectedModules, setSelectedModules] = useState<Set<string>>(session?.selectedModules || new Set(['CANNIBALIZATION'])); 
    const [moduleLimits, setModuleLimits] = useState<Map<string, number>>(session?.moduleLimits || new Map());
    
    // Processing State
    const [progress, setProgress] = useState({ processed: 0, total: 0, phase: '' });
    const [model, setModel] = useState(initialModel);
    const [activeApiKeys, setActiveApiKeys] = useState<string[]>(apiKeys);
    const [errorPopup, setErrorPopup] = useState<ErrorDetails | null>(null);
    const stopRef = useRef(false);
    const [editorMode, setEditorMode] = useState(false);

    // Auto-Save Session Effect
    useEffect(() => {
        // Debounce slightly to avoid frequent updates, though simple state update is cheap
        const timer = setTimeout(() => {
            onSaveSession({
                step,
                siteContext,
                candidateTasks,
                selectedModules,
                moduleLimits
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [step, siteContext, candidateTasks, selectedModules, moduleLimits, onSaveSession]);

    const t = {
        title: lang === 'es' ? 'Generador de Tareas Automático' : 'Automated Task Generator',
        subtitle: lang === 'es' ? 'Diagnóstico priorizado y generación de entregables.' : 'Prioritized diagnosis and deliverable generation.',
        stepContext: lang === 'es' ? '1. Contexto del Sitio' : '1. Site Context',
        stepConfig: lang === 'es' ? '2. Configuración' : '2. Configuration',
        contextDesc: lang === 'es' 
            ? 'Describe brevemente tu sitio web (e.g., Ecommerce de Zapatos en México). Esto ayuda a la IA a entender la intención.' 
            : 'Briefly describe your website (e.g., Shoe Ecommerce in US). This helps AI understand intent.',
        next: lang === 'es' ? 'Siguiente' : 'Next',
        back: lang === 'es' ? 'Atrás' : 'Back',
        analyzingPre: lang === 'es' ? 'Pre-analizando oportunidades...' : 'Pre-analyzing opportunities...',
        configTitle: lang === 'es' ? 'Selecciona Módulos a Procesar' : 'Select Modules to Process',
        limitLabel: lang === 'es' ? 'Límite' : 'Limit',
        priorityIssues: lang === 'es' ? 'Problemas Prioritarios' : 'Priority Issues',
        startAnalysis: lang === 'es' ? 'Iniciar Análisis IA' : 'Start AI Analysis',
        processingTitle: lang === 'es' ? 'Generando Plan de Acción' : 'Generating Action Plan',
        stop: lang === 'es' ? 'Detener' : 'Stop',
        results: lang === 'es' ? 'Resultados' : 'Results',
        empty: lang === 'es' ? 'No se encontraron tareas prioritarias.' : 'No high priority tasks found.',
        download: lang === 'es' ? 'Descargar CSV' : 'Download CSV',
        analyzeMore: lang === 'es' ? 'Configurar / Analizar Más' : 'Configure / Analyze More',
    };

    const handleContextSubmit = () => {
        // If we already have candidates and context hasn't changed much, we could reuse them.
        // But re-calculating candidates is fast and ensures fresh data.
        
        const map = new Map<string, any[]>();
        const defaultLimits = new Map<string, number>();

        const criticalCannibalization = cannibalizationGroups.filter(g => {
            if (g.uniqueUrlCount < 2) return false;
            const hasVolume = g.totalImpressions > 100;
            const isRelevantPos = g.weightedAvgPosition < 15;
            return hasVolume && isRelevantPos && !g.urls.some(u => u.aiTag);
        });
        if (criticalCannibalization.length > 0) {
            map.set('CANNIBALIZATION', criticalCannibalization);
            defaultLimits.set('CANNIBALIZATION', criticalCannibalization.length);
        }

        MODULES.forEach(mod => {
            if (mod.id === 'CANNIBALIZATION' || mod.id === 'KEYWORD_CLUSTERS') return;
            
            const rows = analyzeModule(mod.id, comparisonRows, stats);
            const highPriority = rows.filter(r => {
                if (r.aiDiagnosis) return false;
                const prio = getOpportunityPriority(
                    mod.id,
                    r.periodB.position,
                    r.periodB.impressions,
                    r.diffPos,
                    r.periodA.impressions
                );
                return prio === 'HIGH';
            });

            if (highPriority.length > 0) {
                map.set(mod.id, highPriority);
                defaultLimits.set(mod.id, highPriority.length);
                setSelectedModules(prev => new Set(prev).add(mod.id));
            }
        });

        setCandidateTasks(map);
        setModuleLimits(defaultLimits);
        setStep('CONFIG');
    };

    const handleStartProcessing = () => {
        setStep('PROCESSING');
        processTasks();
    };

    const processTasks = async () => {
        stopRef.current = false;
        
        const queue: { type: 'CANNIBALIZATION' | 'GENERIC', data: any, modId: string }[] = [];
        let totalItems = 0;

        selectedModules.forEach(modId => {
            const candidates = candidateTasks.get(modId) || [];
            const limit = moduleLimits.get(modId) || 5;
            const toProcess = candidates.slice(0, limit);
            
            toProcess.forEach(item => {
                queue.push({
                    type: modId === 'CANNIBALIZATION' ? 'CANNIBALIZATION' : 'GENERIC',
                    data: item,
                    modId: modId
                });
            });
            totalItems += toProcess.length;
        });

        setProgress({ processed: 0, total: totalItems, phase: t.processingTitle });

        let currentGroups = [...cannibalizationGroups];
        let currentRows = [...comparisonRows];
        const queryWinnerMap = new Map<string, string>();
        currentGroups.forEach(g => { if (g.winnerUrl) queryWinnerMap.set(g.query, g.winnerUrl); });

        const aiOptions: AiBatchOptions = {
            apiKeys: activeApiKeys, 
            externalKeys,
            providerConfig, 
            lang,
            model,
            siteContext
        };

        try {
            for (let i = 0; i < queue.length; i++) {
                if (stopRef.current) break;
                
                const task = queue[i];

                if (task.type === 'CANNIBALIZATION') {
                    const group = task.data as CannibalizationGroup;
                    const res = await analyzeCannibalizationMaster(group, aiOptions);
                    
                    if (res) {
                        const urlMap = new Map(res.classifications.map(c => [c.url, c.tag]));
                        let winner = group.winnerUrl;

                        let updatedUrls = group.urls.map(u => {
                            const tag = urlMap.get(u.url);
                            if (tag && ((tag as string).toUpperCase().includes('WINNER') || (tag as string).toUpperCase().includes('GANADORA'))) {
                                winner = u.url;
                            }
                            return { ...u, aiTag: tag || u.aiTag };
                        });
                        
                        const hasNegativeAction = updatedUrls.some(u => {
                            const t = (u.aiTag || '').toUpperCase();
                            return t.includes('REDIRECT') || t.includes('MERGE') || t.includes('DE-OPTIMIZE');
                        });
                        const hasExplicitWinner = updatedUrls.some(u => {
                             const t = (u.aiTag || '').toUpperCase();
                             return t.includes('WINNER') || t.includes('GANADORA');
                        });

                        if (hasNegativeAction && !hasExplicitWinner) {
                             const survivors = updatedUrls.filter(u => {
                                 const t = (u.aiTag || '').toUpperCase();
                                 return !t.includes('REDIRECT') && !t.includes('MERGE') && !t.includes('DE-OPTIMIZE');
                             });
                             if (survivors.length > 0) {
                                 const bestSurvivor = survivors.sort((a,b) => b.impressions - a.impressions)[0];
                                 winner = bestSurvivor.url;
                                 updatedUrls = updatedUrls.map(u => {
                                     if (u.url === bestSurvivor.url) {
                                         return { ...u, aiTag: lang === 'es' ? 'GANADORA' : 'WINNER' };
                                     }
                                     return u;
                                 });
                             }
                        }

                        const gIdx = currentGroups.findIndex(g => g.query === group.query);
                        if (gIdx !== -1) {
                            currentGroups[gIdx] = { ...group, urls: updatedUrls, winnerUrl: winner, aiReasoning: "Auto AI Analysis" };
                        }
                        if (winner) queryWinnerMap.set(group.query, winner);
                        onUpdateGroups([...currentGroups]); 
                    }

                } else {
                    const row = task.data as ComparisonRow;
                    const preferredUrl = queryWinnerMap.get(row.query);
                    
                    const res = await analyzeSeoCase(row, task.modId as ModuleId, aiOptions, preferredUrl);
                    
                    if (res) {
                        const rIdx = currentRows.findIndex(r => r.query === row.query);
                        if (rIdx !== -1) {
                            currentRows[rIdx] = {
                                ...currentRows[rIdx],
                                aiDiagnosis: res.diagnosis,
                                aiActions: res.actions,
                                aiAnalyzed: true
                            };
                        }
                        onUpdateRows([...currentRows]);
                    }
                }

                setProgress(prev => ({ ...prev, processed: i + 1 }));
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (e: any) {
            handleAiError(e);
        } finally {
            setStep('RESULTS');
        }
    };

    const handleAiError = (error: any) => {
        console.error("AutoTask AI Error:", error);
        let msg = error.message || "Unknown error";
        if (error.error && error.error.message) msg = error.error.message;
        const isQuota = JSON.stringify(error).includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
        setErrorPopup({
            title: isQuota ? 'API Quota Exceeded' : 'AI Analysis Error',
            cause: isQuota 
                ? (lang === 'es' ? 'Se ha alcanzado el límite de solicitudes de la API de Gemini.' : 'Gemini API request limit reached.')
                : (lang === 'es' ? 'Ocurrió un error inesperado al comunicarse con Gemini.' : 'An unexpected error occurred communicating with Gemini.'),
            solution: isQuota
                ? (lang === 'es' ? 'Agrega nuevas API Keys para continuar el análisis.' : 'Add new API Keys to resume analysis.')
                : (lang === 'es' ? 'Intenta de nuevo o verifica tu conexión.' : 'Try again or check connection.'),
            rawMessage: msg,
            isRecoverable: isQuota || true
        });
    };

    const handleRetryFromModal = (newKeys: string[], newModel: string) => {
        setErrorPopup(null);
        setActiveApiKeys([...newKeys]);
        setModel(newModel);
        processTasks();
    };

    const processedCannibalization = useMemo(() => {
        return cannibalizationGroups.filter(g => g.urls.some(u => u.aiTag));
    }, [cannibalizationGroups]);

    const processedGeneric = useMemo(() => {
        return comparisonRows.filter(r => r.aiDiagnosis && r.aiDiagnosis.status !== 'OPTIMAL');
    }, [comparisonRows]);

    const handleDismissGeneric = (query: string) => {
        const updated = comparisonRows.map(r => {
            if (r.query === query) {
                const { aiDiagnosis, aiActions, aiAnalyzed, ...rest } = r;
                return rest;
            }
            return r;
        });
        onUpdateRows(updated);
    };

    const handleRowUpdate = (updatedRow: ComparisonRow) => {
        const newRows = comparisonRows.map(r => r.query === updatedRow.query ? updatedRow : r);
        onUpdateRows(newRows);
    };

    const handleDownloadCsv = () => {
         const csvRows = ["Module,Query,URL,Status,RootCause,Explanation,ActionTitle,ActionContent"];
         
         processedCannibalization.forEach(g => {
             g.urls.forEach(u => {
                 if (u.aiTag && !u.aiTag.includes('KEEP') && !u.aiTag.includes('WINNER')) {
                     csvRows.push(`"CANNIBALIZATION","${g.query}","${u.url}","CRITICAL","DUPLICATE","${u.aiTag}","${u.aiTag}","Resolve Conflict"`);
                 }
             });
         });
         
         processedGeneric.forEach(r => {
             const diagnosis = r.aiDiagnosis;
             const actions = r.aiActions;
             if (diagnosis && actions) {
                 actions.forEach(action => {
                    const contentClean = action.content.replace(/"/g, '""').replace(/\n/g, ' ');
                    csvRows.push(`"OPTIMIZATION","${r.query}","${r.urlBreakdown[0]?.url}","${diagnosis.status}","${diagnosis.rootCause}","${diagnosis.explanation}","${action.title}","${contentClean}"`);
                 });
             }
         });
         
         const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'simon_seo_tasks.csv';
         a.click();
    };

    const handlePrint = () => { 
        setTimeout(() => { window.print(); }, 500);
    };

    if (step === 'PROCESSING') {
        return (
            <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                <button 
                    onClick={() => { stopRef.current = true; setStep('CONFIG'); }}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-8 h-8" />
                </button>

                <div className="w-full max-w-md space-y-12 text-center">
                    <div className="mx-auto w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-indigo-100/50">
                        <Brain className="w-10 h-10 text-indigo-600" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-light text-slate-800 tracking-tight">{t.processingTitle}</h2>
                        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest border border-slate-100">
                            {progress.processed} / {progress.total}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden w-full">
                             <div 
                                className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                                style={{ width: `${(progress.processed / Math.max(progress.total, 1)) * 100}%` }}
                             />
                        </div>
                    </div>
                    <button onClick={() => stopRef.current = true} className="text-xs text-slate-300 hover:text-rose-500 transition-colors mt-8">{t.stop}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in">
             <ErrorModal error={errorPopup} onClose={() => setErrorPopup(null)} lang={lang} currentKeys={activeApiKeys} currentModel={model} onRetry={handleRetryFromModal} />

             <div className="flex items-center justify-between mb-8 print:hidden">
                 <div>
                     <h2 className="text-2xl font-bold text-slate-800">{t.title}</h2>
                     <p className="text-slate-500 text-sm">{t.subtitle}</p>
                 </div>
                 <button onClick={onBack} className="text-sm text-slate-500 hover:text-indigo-600">{t.back}</button>
             </div>

             {step === 'CONTEXT' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
                     <h3 className="text-lg font-bold text-slate-800 mb-4">{t.stepContext}</h3>
                     <textarea 
                        className="w-full h-32 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-700 bg-slate-50"
                        placeholder={t.contextDesc}
                        value={siteContext}
                        onChange={(e) => setSiteContext(e.target.value)}
                     />
                     <div className="mt-6 flex justify-end">
                         <button 
                            onClick={handleContextSubmit}
                            className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
                         >
                             {t.next} <ArrowRight className="w-4 h-4" />
                         </button>
                     </div>
                 </div>
             )}

             {step === 'CONFIG' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="p-6 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                         <h3 className="font-bold text-slate-800 flex items-center gap-2">
                             <Settings className="w-5 h-5 text-indigo-500" />
                             {t.configTitle}
                         </h3>
                         <div className="text-xs font-mono text-slate-400">Total Available: {Array.from(candidateTasks.values()).reduce((a: number, b: any[]) => a + b.length, 0)}</div>
                     </div>
                     <div className="p-2">
                        {Array.from(candidateTasks.entries()).map(([modId, items]: [string, any[]]) => {
                             const modInfo = MODULES.find(m => m.id === modId);
                             const limit = moduleLimits.get(modId) || items.length;
                             const isSelected = selectedModules.has(modId);
                             
                             return (
                                 <div key={modId} className={`flex items-center justify-between p-4 rounded-xl transition-colors ${isSelected ? 'bg-white' : 'opacity-50 grayscale bg-slate-50'}`}>
                                     <div className="flex items-center gap-4">
                                         <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={(e) => {
                                                const s = new Set(selectedModules);
                                                if (e.target.checked) s.add(modId); else s.delete(modId);
                                                setSelectedModules(s);
                                            }}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                                         />
                                         <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                             {modInfo?.icon ? <modInfo.icon className="w-5 h-5" /> : <ScanSearch className="w-5 h-5" />}
                                         </div>
                                         <div>
                                             <div className="font-bold text-slate-700 text-sm">{modInfo?.title[lang]}</div>
                                             <div className="text-xs text-slate-500 font-medium">{items.length} {t.priorityIssues}</div>
                                         </div>
                                     </div>
                                     
                                     {isSelected && (
                                         <div className="flex items-center gap-2">
                                             <label className="text-[10px] font-bold text-slate-400 uppercase">{t.limitLabel}</label>
                                             <input 
                                                type="number" 
                                                min="1" 
                                                max={items.length}
                                                value={limit}
                                                onChange={(e) => {
                                                    const m = new Map(moduleLimits);
                                                    m.set(modId, Math.max(1, Math.min(items.length, Number(e.target.value))));
                                                    setModuleLimits(m);
                                                }}
                                                className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm font-bold text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                                             />
                                         </div>
                                     )}
                                 </div>
                             )
                        })}
                     </div>
                     <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end">
                         <button 
                            onClick={handleStartProcessing}
                            disabled={selectedModules.size === 0}
                            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                             <Sparkles className="w-4 h-4" />
                             {t.startAnalysis}
                         </button>
                     </div>
                 </div>
             )}

             {step === 'RESULTS' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                     <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
                         <div className="flex items-center gap-4">
                             <h2 className="font-bold text-slate-800 text-xl">{t.results}</h2>
                             <button 
                                onClick={() => setStep('CONFIG')}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                {t.analyzeMore}
                            </button>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => setEditorMode(!editorMode)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${editorMode ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                                {editorMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{editorMode ? 'Exit Editor' : 'Editor'}
                            </button>
                             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium shadow-sm">
                                <Printer className="w-4 h-4" /> Print
                            </button>
                            <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm">
                                <Download className="w-4 h-4" /> CSV
                            </button>
                         </div>
                     </div>

                    {processedCannibalization.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 border-l-4 border-rose-500 pl-3">Critical Cannibalizations</h3>
                            <TaskView mode="CANNIBALIZATION" groups={processedCannibalization} lang={lang} isEditorMode={false} />
                        </section>
                    )}

                    {processedGeneric.length > 0 && (
                        <section>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 px-1 border-l-4 border-indigo-500 pl-3">Optimization Tasks</h3>
                            <TaskView 
                                mode="GENERIC" 
                                rows={processedGeneric} 
                                lang={lang} 
                                isEditorMode={editorMode} 
                                onDismiss={handleDismissGeneric} 
                                onUpdateRow={handleRowUpdate}
                            />
                        </section>
                    )}
                 </div>
             )}
        </div>
    );
};

export default AutoTaskDashboard;
