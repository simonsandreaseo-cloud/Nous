'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import {
    generateReportAction,
    generateReportFromCsvAction,
    analyzeStructureAction,
    saveReportAction,
    getSavedReportsAction,
    exportToGoogleAction
} from '@/app/node-tasks/report-actions';
import { parseCSV } from '@/lib/services/report/csvService';
import { ReportView } from '@/components/report-generator/ReportView';
import { Loader2, Sparkles, FileText, Settings, AlertCircle, CheckCircle2, ListFilter, Trash2, Plus, History, Save, ChevronRight, LayoutGrid, Calendar, FileBarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import '@/app/reports.css';

export default function ReportGeneratorView() {
    const { projects, activeProject, setActiveProject, fetchProjects } = useProjectStore();

    // Auth State
    const [userId, setUserId] = useState<string | null>(null);
    const [googleToken, setGoogleToken] = useState<string | null>(null);

    // Workflow State
    const [mainTab, setMainTab] = useState<'generator' | 'history'>('generator');
    const [step, setStep] = useState<'settings' | 'validation' | 'complete'>('settings');
    const [loadingState, setLoadingState] = useState<string | null>(null);
    const reportViewRef = useRef<any>(null);

    // Generator Data State
    const [mode, setMode] = useState<'api' | 'csv'>('api');
    const [reportResult, setReportResult] = useState<any>(null);
    const [userContext, setUserContext] = useState('');
    const [dateRange, setDateRange] = useState<{ start: string, end: string }>(() => {
        const today = new Date();
        const end = new Date(today);
        end.setDate(today.getDate() - 3);
        const start = new Date(end);
        start.setDate(end.getDate() - 30);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    });
    const [error, setError] = useState('');
    const [csvFileP1, setCsvFileP1] = useState<File | null>(null);
    const [csvFileP2, setCsvFileP2] = useState<File | null>(null);

    // Segmentation State
    const [segmentRules, setSegmentRules] = useState<{ name: string, regex: string }[]>([]);
    const [uncategorizedSample, setUncategorizedSample] = useState<string[]>([]);
    const [newRuleName, setNewRuleName] = useState('');
    const [newRuleRegex, setNewRuleRegex] = useState('');

    // History State
    const [savedReports, setSavedReports] = useState<any[]>([]);
    const [saveTitle, setSaveTitle] = useState('');
    const [showSaveModal, setShowSaveModal] = useState(false);

    useEffect(() => {
        fetchProjects();
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });
        supabase.auth.getSession().then(({ data }) => {
            if (data.session?.provider_token) {
                setGoogleToken(data.session.provider_token);
            }
        });
    }, [fetchProjects]);

    useEffect(() => {
        if (mainTab === 'history' && userId) {
            loadHistory();
        }
    }, [mainTab, userId]);

    const loadHistory = async () => {
        if (!userId) return;
        setLoadingState("Cargando historial...");
        const res = await getSavedReportsAction(userId);
        if (res.success) {
            setSavedReports(res.reports || []);
        }
        setLoadingState(null);
    };

    const handleAnalyze = async () => {
        if (mode === 'csv') {
            handleGenerateFinal();
            return;
        }
        if (!activeProject || !activeProject.gsc_connected) return;
        setLoadingState("Analizando arquitectura...");
        setError('');
        try {
            const result = await analyzeStructureAction(activeProject.id);
            if (result.success && result.proposedRules) {
                setSegmentRules(result.proposedRules);
                setUncategorizedSample(result.uncategorizedSample || []);
                setStep('validation');
            } else {
                setError(result.error || "Error al analizar estructura.");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingState(null);
        }
    };

    const handleGenerateFinal = async () => {
        setLoadingState("Generando informe...");
        setError('');
        try {
            let result;
            if (mode === 'api') {
                if (!activeProject) return;
                result = await generateReportAction(activeProject.id, userContext, segmentRules, dateRange);
            } else {
                if (!csvFileP1 || !csvFileP2) return;
                const p1Rows = await parseCSV(csvFileP1);
                const p2Rows = await parseCSV(csvFileP2);
                result = await generateReportFromCsvAction(p1Rows, p2Rows, { p1: "Antes", p2: "Ahora" }, userContext);
            }
            if (result.success) {
                setReportResult({
                    jsonState: result.jsonState,
                    chartData: result.chartData,
                    payload: result.payload,
                    periodLabel: result.payload?.period2Name
                });
                setStep('complete');
            } else {
                setError(result.error);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingState(null);
        }
    };

    const handleSaveReport = async () => {
        if (!userId || !reportResult || !saveTitle) return;
        setLoadingState("Guardando...");
        const res = await saveReportAction(userId, activeProject?.id || null, saveTitle, reportResult.jsonState, reportResult.payload, reportResult.periodLabel || 'Reporte');
        if (res.success) {
            setShowSaveModal(false);
            setSaveTitle('');
            alert("Informe guardado.");
        }
        setLoadingState(null);
    };

    const handleGoogleExport = async (type: 'docs' | 'slides') => {
        if (!googleToken) {
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = `/api/auth/gsc/login?redirect=${encodeURIComponent(currentPath)}`;
            return;
        }
        if (!reportResult) return;
        setLoadingState(`Exportando a Google ${type}...`);
        let content: string | string[] = reportResult.jsonState ? JSON.stringify(reportResult.jsonState) : '';
        if (type === 'slides' && reportViewRef.current) {
            const snapshots = await reportViewRef.current.captureAllSlides();
            content = snapshots;
        }
        const res = await exportToGoogleAction(type, saveTitle || "Reporte SEO", content, googleToken);
        if (res.success) window.open(res.url, '_blank');
        setLoadingState(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white overflow-hidden relative">
            {/* Action Bar Header */}
            <header className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 border-r border-slate-100 pr-6 mr-2">Informes</h1>
                    <div className="flex gap-1.5 p-0.5 bg-slate-50 border border-slate-100 rounded-lg">
                        <button onClick={() => setMainTab('generator')} className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", mainTab === 'generator' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Generador</button>
                        <button onClick={() => setMainTab('history')} className={cn("px-4 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all", mainTab === 'history' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Historial</button>
                    </div>
                </div>

                {step === 'complete' && reportResult && (
                    <div className="flex items-center gap-2">
                         <button onClick={() => setShowSaveModal(true)} className="h-8 px-4 flex items-center gap-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"><Save size={14} /> Guardar</button>
                         <button onClick={() => handleGoogleExport('docs')} className="h-8 px-4 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"><FileText size={14} className="text-blue-500" /> Docs</button>
                         <button onClick={() => handleGoogleExport('slides')} className="h-8 px-4 flex items-center gap-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"><LayoutGrid size={14} className="text-orange-500" /> Slides</button>
                    </div>
                )}
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {mainTab === 'generator' ? (
                    <div className="p-8 max-w-6xl mx-auto w-full">
                        {step === 'settings' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4">
                                <div className="space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic">Configuración</h2>
                                        <p className="text-slate-400 text-sm">Define el origen de los datos y el periodo.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex bg-slate-50 p-1 rounded-xl w-fit">
                                            <button onClick={() => setMode('api')} className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", mode === 'api' ? "bg-white shadow text-indigo-600" : "text-slate-400")}>GSC API</button>
                                            <button onClick={() => setMode('csv')} className={cn("px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", mode === 'csv' ? "bg-white shadow text-indigo-600" : "text-slate-400")}>Archivo CSV</button>
                                        </div>

                                        {mode === 'api' ? (
                                            <div className="space-y-4">
                                                <select value={activeProject?.id || ''} onChange={(e) => setActiveProject(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-100">
                                                    <option value="">Seleccionar Proyecto...</option>
                                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                                {!activeProject?.gsc_connected && activeProject && <p className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 italic font-bold">⚠️ GSC no vinculado.</p>}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                                    <p className="text-[10px] uppercase font-black text-slate-400 mb-3">Periodo Anterior</p>
                                                    <input type="file" onChange={(e) => setCsvFileP1(e.target.files?.[0] || null)} className="text-[10px] text-slate-500" />
                                                </div>
                                                <div className="p-4 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                                    <p className="text-[10px] uppercase font-black text-slate-400 mb-3">Periodo Actual</p>
                                                    <input type="file" onChange={(e) => setCsvFileP2(e.target.files?.[0] || null)} className="text-[10px] text-slate-500" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                                <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Desde</span>
                                                <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full" />
                                            </div>
                                            <div className="p-3 bg-white border border-slate-100 rounded-xl">
                                                <span className="text-[9px] uppercase font-black text-slate-400 block mb-1">Hasta</span>
                                                <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))} className="bg-transparent text-xs font-bold text-slate-800 outline-none w-full" />
                                            </div>
                                        </div>

                                        <textarea value={userContext} onChange={e => setUserContext(e.target.value)} placeholder="Instrucciones adicionales para la IA..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 ring-indigo-100 h-24 resize-none" />

                                        <button onClick={handleAnalyze} disabled={!!loadingState} className="w-full py-4 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/10 flex justify-center items-center gap-3 active:scale-[0.98]">
                                            {loadingState ? <Loader2 className="animate-spin" /> : <Sparkles size={16} />}
                                            {mode === 'api' ? 'Analizar con IA' : 'Generar Informe'}
                                        </button>
                                    </div>
                                </div>

                                <div className="hidden md:flex flex-col items-center justify-center bg-slate-50/50 rounded-[40px] border border-slate-100 p-12 text-center opacity-60">
                                    <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6"><FileBarChart2 className="text-indigo-600" size={32} /></div>
                                    <h3 className="text-sm font-black uppercase italic text-slate-800 mb-2">Informe Estratégico</h3>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed uppercase tracking-widest">IA Deep SEO Insight v2.0</p>
                                </div>
                            </div>
                        )}

                        {step === 'validation' && (
                           <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 mb-1 uppercase italic">Validar Segmentación</h2>
                                        <p className="text-slate-400 text-sm">Ajusta cómo la IA agrupa tus URLs.</p>
                                    </div>
                                    <button onClick={() => setStep('settings')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-800 transition-colors">← Volver</button>
                                </div>

                                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                                     <table className="w-full text-left">
                                         <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest"><tr><th className="px-6 py-4">Categoría</th><th className="px-6 py-4">Filtro RegEx</th><th className="px-6 py-4"></th></tr></thead>
                                         <tbody className="divide-y divide-slate-100">
                                             {segmentRules.map((r, i) => (
                                                 <tr key={i} className="group hover:bg-slate-50/50">
                                                     <td className="px-6 py-4"><input value={r.name} onChange={e => { const n = [...segmentRules]; n[i].name = e.target.value; setSegmentRules(n); }} className="bg-transparent font-bold text-xs text-slate-700 outline-none w-full" /></td>
                                                     <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{r.regex}</td>
                                                     <td className="px-6 py-4 text-right"><button onClick={() => { const n = [...segmentRules]; n.splice(i, 1); setSegmentRules(n); }}><Trash2 size={14} className="text-slate-300 hover:text-red-500" /></button></td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                </div>

                                <button onClick={handleGenerateFinal} disabled={!!loadingState} className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all flex justify-center items-center gap-3 shadow-2xl shadow-indigo-200">
                                     {loadingState ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={20} />}
                                     Confirmar y Generar
                                </button>
                           </div>
                        )}

                        {step === 'complete' && reportResult && (
                           <div className="h-full bg-white animate-in zoom-in-95 duration-500">
                               <ReportView
                                    ref={reportViewRef}
                                    jsonState={reportResult.jsonState}
                                    onStateChange={(js) => setReportResult((p: any) => ({ ...p, jsonState: js }))}
                                    theme="#6366f1"
                                />
                           </div>
                        )}
                    </div>
                ) : (
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                        {savedReports.length === 0 ? (
                            <div className="col-span-full py-20 flex flex-col items-center opacity-30">
                                <History size={48} className="mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Sin historial.</p>
                            </div>
                        ) : (
                            savedReports.map(report => (
                                <div key={report.id} onClick={() => {
                                    setReportResult({
                                        jsonState: typeof report.html_content === 'string' ? JSON.parse(report.html_content) : report.html_content,
                                        chartData: {},
                                        payload: report.payload_json
                                    });
                                    setStep('complete');
                                    setMainTab('generator');
                                }} className="p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group">
                                     <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors"><FileText size={24} className="text-slate-400 group-hover:text-indigo-600" /></div>
                                     <h3 className="font-bold text-slate-900 mb-1 uppercase tracking-tight">{report.title}</h3>
                                     <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{new Date(report.created_at).toLocaleDateString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {showSaveModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-[32px] w-full max-w-sm shadow-2xl border border-slate-100">
                        <h3 className="text-sm font-black uppercase tracking-widest italic mb-6">Guardar Propuesta</h3>
                        <input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="Título (ej: Enero 2025)" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl mb-6 text-xs outline-none" />
                        <div className="flex gap-4">
                             <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                             <button onClick={handleSaveReport} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {loadingState && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-[200] flex flex-col items-center justify-center">
                    <Loader2 size={32} className="text-indigo-600 animate-spin mb-4" />
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 animate-pulse">{loadingState}</p>
                </div>
            )}
        </div>
    );
}
