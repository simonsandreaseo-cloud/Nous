'use client';

import { useState, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import {
    generateReportAction,
    generateReportFromCsvAction,
    analyzeStructureAction,
    saveReportAction,
    getSavedReportsAction,
    exportToGoogleAction,
    generateAiContentAction
} from '@/app/node-tasks/report-actions';
import { parseCSV } from '@/lib/services/report/csvService';
import { NavigationHeader } from '@/components/dom/NavigationHeader';
import { ReportView } from '@/components/report-generator/ReportView';
import { Loader2, Sparkles, FileText, Settings, AlertCircle, CheckCircle2, ListFilter, Trash2, Plus, History, Save, ChevronRight, LayoutGrid, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import '@/app/reports.css';

export default function ReportGeneratorPage() {
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
    const [reportResult, setReportResult] = useState<any>(null); // { html, chartData, payload }
    const [userContext, setUserContext] = useState('');
    // Default Date Range: End = Now - 3 days, Start = End - 30 days
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

    // We show all projects but we'll mark the ones not connected
    const gscProjects = projects;

    useEffect(() => {
        // Fetch projects on mount to ensure we have the latest GSC states
        fetchProjects();

        // Get User ID
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) setUserId(data.user.id);
        });

        // Check for Google Session
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

    // Restore State from Session Storage if returning from Auth
    useEffect(() => {
        const storedState = sessionStorage.getItem('report_generator_state');
        if (storedState) {
            try {
                const parsed = JSON.parse(storedState);
                if (parsed.reportResult) setReportResult(parsed.reportResult);
                if (parsed.step) setStep(parsed.step);
                if (parsed.mode) setMode(parsed.mode);
                if (parsed.userContext) setUserContext(parsed.userContext);
                if (parsed.activeProjectId) setActiveProject(parsed.activeProjectId);
                if (parsed.dateRange) setDateRange(parsed.dateRange);

                // Clear after restoring
                sessionStorage.removeItem('report_generator_state');
                // Show success toast or message?
            } catch (e) {
                console.error("Failed to restore state", e);
            }
        }
    }, []);

    const loadHistory = async () => {
        if (!userId) return;
        setLoadingState("Cargando historial...");
        const res = await getSavedReportsAction(userId);
        if (res.success) {
            setSavedReports(res.reports || []);
        }
        setLoadingState(null);
    };

    // Step 1: Analyze Structure
    const handleAnalyze = async () => {
        if (mode === 'csv') {
            handleGenerateFinal();
            return;
        }

        if (!activeProject || !activeProject.gsc_connected) return;

        setLoadingState("Analizando arquitectura web con IA...");
        setError('');

        try {
            const result = await analyzeStructureAction(activeProject.id);
            if (result.success && result.proposedRules) {
                setSegmentRules(result.proposedRules);
                setUncategorizedSample(result.uncategorizedSample || []);
                setStep('validation');
            } else {
                setError(result.error || "No se pudo analizar la estructura.");
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoadingState(null);
        }
    };

    // Step 2: Generate Final Report
    const handleGenerateFinal = async () => {
        setLoadingState("Generando informe estratégico...");
        setError('');

        try {
            let result;

            if (mode === 'api') {
                if (!activeProject) return;
                result = await generateReportAction(
                    activeProject.id,
                    userContext,
                    segmentRules, // Custom Rules
                    (dateRange.start && dateRange.end) ? dateRange : undefined
                );
            } else {
                if (!csvFileP1 || !csvFileP2) return;
                const p1Rows = await parseCSV(csvFileP1);
                const p2Rows = await parseCSV(csvFileP2);
                const labels = { p1: "Periodo Anterior (CSV)", p2: "Periodo Actual (CSV)" };
                result = await generateReportFromCsvAction(p1Rows, p2Rows, labels, userContext);
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

        setLoadingState("Guardando informe...");
        const res = await saveReportAction(
            userId,
            activeProject?.id || null, // Null if CSV
            saveTitle,
            reportResult.jsonState,
            reportResult.payload,
            reportResult.periodLabel || 'Reporte Personalizado'
        );

        if (res.success) {
            setShowSaveModal(false);
            setSaveTitle('');
            // Optional: Move to history tab or show success toast
            alert("Informe guardado correctamente en tu perfil.");
        } else {
            alert("Error al guardar: " + res.error);
        }
        setLoadingState(null);
    };

    const handleViewSavedReport = (report: any) => {
        // Mock reconstruction of result object from DB properties
        // We assume payload_json has chart data? No, chartData is separate in generateAction return.
        // Wait, ReportView needs chartData. 
        // We saved `payload_json` which is `reportPayload`.
        // `ReportView` uses `chartData` prop which is computed from payload in some parts but mostly separate logic in `analysisService`.
        // Ideally we should have saved `chartData` too or recompute it.
        // For MVP, we will use `payload_json` as `chartData` (it works for `seoStatus` but `topWinners` structure might differ).
        // Let's assume we saved everything needed or we just show HTML for now.
        // Actually, ReportView needs `chartData` to render interactive charts.
        // If we only saved HTML, charts are placeholders.
        // To fix: We should save `chartData` as well. For now, let's load HTML.

        setReportResult({
            jsonState: report.html_content ? (typeof report.html_content === 'string' ? JSON.parse(report.html_content) : report.html_content) : [],
            chartData: report.payload_json?.seoStatus ? { seoStatus: report.payload_json.seoStatus } : {}, // Partial reconstruction
            payload: report.payload_json
        });
        setStep('complete');
        setMainTab('generator');
    };

    // Helper: Rules Management
    const addRule = () => {
        if (!newRuleName || !newRuleRegex) return;
        setSegmentRules([...segmentRules, { name: newRuleName, regex: newRuleRegex }]);
        setNewRuleName('');
        setNewRuleRegex('');
    };
    const removeRule = (index: number) => {
        const newRules = [...segmentRules];
        newRules.splice(index, 1);
        setSegmentRules(newRules);
    };
    const testRegex = (str: string) => {
        try { return uncategorizedSample.filter(u => new RegExp(str).test(u)).length; } catch { return 0; }
    };

    const handleGoogleExport = async (type: 'docs' | 'slides') => {
        if (!googleToken) {
            // Save State before Redirect
            const stateToSave = {
                reportResult,
                step,
                mode,
                userContext,
                activeProjectId: activeProject?.id,
                dateRange
            };
            sessionStorage.setItem('report_generator_state', JSON.stringify(stateToSave));

            // Trigger Unified Auth Flow
            const currentPath = window.location.pathname;
            window.location.href = `/api/auth/gsc/login?redirect=${encodeURIComponent(currentPath)}`;
            return;
        }

        if (!reportResult) return;
        setLoadingState(`Exporting to Google ${type === 'docs' ? 'Docs' : 'Slides'}...`);

        let content: string | string[] = reportResult.jsonState ? JSON.stringify(reportResult.jsonState) : '';

        if (type === 'slides') {
            if (!reportViewRef.current) {
                alert("Error: El componente de renderizado no está disponible.");
                setLoadingState(null);
                return;
            }

            setLoadingState(`Generando imágenes de las diapositivas (puede tardar un momento)...`);
            try {
                // Return an array of base64 PNG images from html2canvas
                const snapshots = await reportViewRef.current.captureAllSlides();
                if (!snapshots || snapshots.length === 0) {
                    throw new Error("No se generaron imágenes.");
                }
                content = snapshots;
            } catch (e: any) {
                console.error(e);
                alert("Error capturando diapositivas: " + e.message);
                setLoadingState(null);
                return;
            }
        }

        const res = await exportToGoogleAction(type, saveTitle || "Reporte SEO", content, googleToken);

        if (res.success) {
            window.open(res.url, '_blank');
        } else {
            alert("Export failed: " + res.error);
        }
        setLoadingState(null);
    };

    return (
        <div className="min-h-screen bg-[#F5F7FA] font-sans text-slate-900 pb-20">
            <NavigationHeader />

            <main className="pt-32 px-6 max-w-7xl mx-auto">
                <header className="mb-8 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 rounded-full border border-purple-100 mb-4">
                        <Sparkles size={14} className="text-purple-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">IA Generativa v2.0</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase italic mb-6 leading-tight py-4">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 px-2 leading-relaxed inline-block">Deep</span> Report Generator
                    </h1>

                    {/* Main Tabs */}
                    <div className="flex justify-center gap-4 mb-8">
                        <button
                            onClick={() => setMainTab('generator')}
                            className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium tracking-elegant uppercase text-[10px] transition-all", mainTab === 'generator' ? "bg-[var(--color-nous-mist)]/20 text-slate-800 shadow-sm border border-[var(--color-nous-mist)]/30" : "bg-white text-slate-500 hover:bg-slate-50")}
                        >
                            <LayoutGrid size={18} /> Generador
                        </button>
                        <button
                            onClick={() => setMainTab('history')}
                            className={cn("flex items-center gap-2 px-6 py-3 rounded-xl font-medium tracking-elegant uppercase text-[10px] transition-all", mainTab === 'history' ? "bg-[var(--color-nous-mist)]/20 text-slate-800 shadow-sm border border-[var(--color-nous-mist)]/30" : "bg-white text-slate-500 hover:bg-slate-50")}
                        >
                            <History size={18} /> Mis Informes
                        </button>
                    </div>
                </header>

                {mainTab === 'generator' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* LEFT PANEL */}
                        {step !== 'complete' && (
                            <div className="md:col-span-1 space-y-6">
                                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                                    {/* Mode Toggle */}
                                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                                        <button onClick={() => { setMode('api'); setStep('settings'); }} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", mode === 'api' ? "bg-white shadow text-purple-600" : "text-slate-400")}>API GSC</button>
                                        <button onClick={() => { setMode('csv'); setStep('settings'); }} className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all", mode === 'csv' ? "bg-white shadow text-purple-600" : "text-slate-400")}>CSV</button>
                                    </div>

                                    {mode === 'api' ? (
                                        <div>
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block tracking-widest">Proyecto GSC</label>
                                            <select
                                                value={activeProject?.id || ''}
                                                onChange={(e) => setActiveProject(e.target.value)}
                                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-purple-200 transition-all"
                                                disabled={step !== 'settings'}
                                            >
                                                <option value="" disabled>Seleccionar Proyecto</option>
                                                {gscProjects.length > 0 ? (
                                                    gscProjects.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} {p.gsc_connected ? `(${p.domain})` : "(No vinculado)"}
                                                        </option>
                                                    ))
                                                ) : (
                                                    <option value="" disabled>No hay proyectos creados</option>
                                                )}
                                            </select>
                                            {!activeProject?.gsc_connected && activeProject && (
                                                <p className="text-[9px] text-amber-600 mt-2 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100 flex items-center gap-1">
                                                    <AlertCircle size={10} />
                                                    Este proyecto no tiene vinculada una propiedad de GSC. Ve a Ajustes.
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <input type="file" onChange={(e) => setCsvFileP1(e.target.files?.[0] || null)} className="w-full text-xs" />
                                            <input type="file" onChange={(e) => setCsvFileP2(e.target.files?.[0] || null)} className="w-full text-xs" />
                                        </div>
                                    )}

                                    <div className="mt-4">
                                        <label className="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Contexto</label>
                                        <textarea rows={3} value={userContext} onChange={(e) => setUserContext(e.target.value)} placeholder="Ej: Ignora marca..." className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm outline-none resize-none" />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:ring-2 ring-purple-200 transition-all">
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                                                <Calendar size={12} className="text-purple-500" /> Desde
                                            </label>
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={(e) => setDateRange((prev: any) => ({ ...prev, start: e.target.value }))}
                                                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:ring-2 ring-purple-200 transition-all">
                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 flex items-center gap-1">
                                                <Calendar size={12} className="text-purple-500" /> Hasta
                                            </label>
                                            <input
                                                type="date"
                                                value={dateRange.end}
                                                onChange={(e) => setDateRange((prev: any) => ({ ...prev, end: e.target.value }))}
                                                className="w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6">
                                        {step === 'settings' && (
                                            <button onClick={handleAnalyze} disabled={!!loadingState} className="w-full py-4 bg-[var(--color-nous-lavender)]/20 text-slate-800 border border-[var(--color-nous-lavender)]/30 rounded-xl font-medium uppercase tracking-elegant text-[10px] hover:bg-[var(--color-nous-lavender)]/30 transition-all shadow-sm flex items-center justify-center gap-2">
                                                {loadingState ? <Loader2 className="animate-spin" /> : <ListFilter size={16} />}
                                                {mode === 'api' ? "Analizar Estructura" : "Generar"}
                                            </button>
                                        )}
                                        {step === 'validation' && (
                                            <button onClick={handleGenerateFinal} disabled={!!loadingState} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg flex items-center justify-center gap-2 animate-pulse">
                                                {loadingState ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={16} />}
                                                Confirmar y Generar
                                            </button>
                                        )}
                                    </div>
                                    {error && <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-600 font-bold">{error}</div>}
                                </div>
                            </div>
                        )}

                        {/* RIGHT PANEL */}
                        <div className={cn("transition-all duration-500", step === 'complete' ? "md:col-span-4" : "md:col-span-3")}>
                            {step === 'validation' && (
                                <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                                    <h2 className="text-xl font-black text-slate-900 mb-4">Validar Segmentación IA</h2>
                                    <table className="w-full text-sm text-left mb-6">
                                        <thead className="bg-slate-100 text-slate-500 font-bold text-xs uppercase"><tr><th className="px-4 py-2">Categoría</th><th className="px-4 py-2">Regla</th><th className="px-4 py-2"></th></tr></thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {segmentRules.map((r, i) => (
                                                <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2 font-medium">
                                                        <input
                                                            value={r.name}
                                                            onChange={(e) => {
                                                                const newRules = [...segmentRules];
                                                                newRules[i].name = e.target.value;
                                                                setSegmentRules(newRules);
                                                            }}
                                                            className="bg-transparent border-b border-transparent focus:border-purple-300 outline-none w-full text-sm font-bold text-slate-700"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 font-mono text-xs">
                                                        <input
                                                            value={r.regex}
                                                            onChange={(e) => {
                                                                const newRules = [...segmentRules];
                                                                newRules[i].regex = e.target.value;
                                                                setSegmentRules(newRules);
                                                            }}
                                                            className="bg-transparent border-b border-transparent focus:border-purple-300 outline-none w-full font-mono text-xs text-slate-500"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right"><button onClick={() => removeRule(i)}><Trash2 size={14} className="text-slate-400 hover:text-red-500" /></button></td>
                                                </tr>
                                            ))}
                                            <tr className="bg-purple-50">
                                                <td className="px-4 py-2"><input value={newRuleName} onChange={e => setNewRuleName(e.target.value)} placeholder="Nueva..." className="bg-transparent outline-none w-full" /></td>
                                                <td className="px-4 py-2"><input value={newRuleRegex} onChange={e => setNewRuleRegex(e.target.value)} placeholder="RegEx..." className="bg-transparent outline-none w-full font-mono text-xs" /></td>
                                                <td className="px-4 py-2 text-right"><button onClick={addRule}><Plus size={14} className="text-purple-600" /></button></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    {/* Sample */}
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-amber-50 p-4 rounded-xl">
                                        {uncategorizedSample.map((u, i) => <span key={i} className="text-[10px] bg-white px-2 rounded border border-amber-100">{u}</span>)}
                                    </div>
                                </div>
                            )}

                            {step === 'complete' && reportResult && (
                                <div className="bg-white p-4 md:p-6 rounded-[20px] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 relative h-full flex flex-col">
                                    {/* Action Bar */}
                                    <div className="flex justify-between items-center mb-4">
                                        <button
                                            onClick={() => setStep('settings')}
                                            className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest flex items-center gap-2"
                                        >
                                            ← Volver al Generador
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setShowSaveModal(true)}
                                                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-nous-mist)]/20 text-slate-800 border border-[var(--color-nous-mist)]/30 rounded-lg text-[10px] font-medium uppercase tracking-elegant hover:bg-[var(--color-nous-mist)]/30 transition-all"
                                            >
                                                <Save size={14} /> Guardar Informe
                                            </button>
                                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                                            <button
                                                onClick={() => handleGoogleExport('docs')}
                                                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-nous-mist)]/10 text-slate-800 border border-[var(--color-nous-mist)]/20 rounded-lg text-[10px] font-medium uppercase tracking-elegant hover:bg-[var(--color-nous-mist)]/20 transition-all font-sans"
                                            >
                                                <FileText size={14} className="text-blue-500" /> Docs
                                            </button>
                                            <button
                                                onClick={() => handleGoogleExport('slides')}
                                                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-nous-mint)]/10 text-slate-800 border border-[var(--color-nous-mint)]/20 rounded-lg text-[10px] font-medium uppercase tracking-elegant hover:bg-[var(--color-nous-mint)]/20 transition-all font-sans"
                                            >
                                                <LayoutGrid size={14} className="text-orange-500" /> Slides
                                            </button>
                                        </div>
                                    </div>

                                    <ReportView
                                        ref={reportViewRef}
                                        jsonState={reportResult.jsonState}
                                        onStateChange={(newJsonState) => setReportResult((prev: any) => ({ ...prev, jsonState: newJsonState }))}
                                        theme={(activeProject as any)?.brand_color || '#4f46e5'}
                                    />
                                </div>
                            )}

                            {step === 'settings' && (
                                <div className="h-96 flex flex-col items-center justify-center bg-white/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                    <FileText size={32} className="text-slate-300 mb-4" />
                                    <p className="text-slate-400 text-sm">Configura los parámetros para iniciar.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* HISTORY TAB */}
                {mainTab === 'history' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedReports.length === 0 && (
                            <div className="col-span-full text-center py-20 text-slate-400">No tienes informes guardados.</div>
                        )}
                        {savedReports.map(report => (
                            <div key={report.id} onClick={() => handleViewSavedReport(report)} className="glass-panel bg-white/40 p-6 rounded-3xl border-hairline hover:shadow-sm transition-all cursor-pointer group">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-3 bg-[var(--color-nous-lavender)]/20 text-[var(--color-nous-lavender)] rounded-xl group-hover:bg-[var(--color-nous-lavender)] group-hover:text-white transition-colors">
                                        <FileText size={24} />
                                    </div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()}</span>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1 uppercase tracking-tight italic">{report.title}</h3>
                                <p className="text-[10px] font-light text-slate-500 mb-4">{report.period_label || 'Sin periodo'}</p>
                                <div className="flex items-center text-[var(--color-nous-mist)] text-[10px] font-medium uppercase tracking-elegant gap-1 mt-auto">
                                    Ver Informe <ChevronRight size={12} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODALS */}
                {showSaveModal && (
                    <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="glass-panel bg-white/80 p-8 rounded-[40px] w-full max-w-sm border-hairline shadow-2xl">
                            <h3 className="font-black text-lg mb-6 uppercase tracking-tighter italic text-slate-900">Guardar Informe</h3>
                            <input
                                value={saveTitle}
                                onChange={e => setSaveTitle(e.target.value)}
                                placeholder="Título del Informe (ej: SEO Enero 2025)"
                                className="w-full p-4 bg-white/50 border border-slate-100 rounded-2xl mb-6 text-sm font-light focus:outline-none focus:ring-4 ring-[var(--color-nous-mist)]/10 transition-all"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowSaveModal(false)} className="px-6 py-2 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                                <button onClick={handleSaveReport} disabled={!saveTitle} className="px-8 py-3 bg-[var(--color-nous-mist)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-all disabled:opacity-30">Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading Overlay */}
                {loadingState && (
                    <div className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[var(--color-nous-mist)]/20 blur-xl rounded-full scale-150 animate-pulse" />
                                <Loader2 size={48} className="text-[var(--color-nous-mist)] animate-spin relative z-10" />
                            </div>
                            <p className="text-slate-800 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{loadingState}</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
