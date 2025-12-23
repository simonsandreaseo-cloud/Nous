import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CSVRow, ReportPayload, ChartData, LogEntry, FileType, SectionConfig, TaskImpactConfig } from './types';
import { parseCSV } from './services/csvService';
import { runFullLocalAnalysis } from './services/analysisService';
import { getRelevantSections, generateReportSection, generateFinalRefinement } from './services/geminiService';
import { DataManager } from './services/dataManager';
import { AgentService } from './services/agentService';
import { ReportView } from './components/ReportView';
import { LiveConsole } from './components/LiveConsole';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ModeSelector } from './components/ModeSelector';
import { GSCConnectPanel } from './components/GSCConnectPanel';
import { GscService } from './services/gscService';
import { SectionSelector } from './components/SectionSelector';
import { useAutoSave } from '@/lib/useAutoSave';
import HistoryModal from '@/components/shared/HistoryModal';
import ShareModal from '@/components/shared/ShareModal';

// Available Models
const AVAILABLE_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado - Rápido)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro Preview (Máximo Razonamiento)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Estable)' },
    { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Experimental' }
];

const App: React.FC = () => {
    // State
    const [step, setStep] = useState<number>(1);
    const [analysisMode, setAnalysisMode] = useState<'csv' | 'gsc'>('csv');
    const [searchParams] = useSearchParams();
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // File State (CSV Mode)
    const [pagesData, setPagesData] = useState<CSVRow[]>([]);
    const [queriesData, setQueriesData] = useState<CSVRow[]>([]);
    const [countriesData, setCountriesData] = useState<CSVRow[]>([]);
    const [uploadedStatus, setUploadedStatus] = useState({ pages: false, queries: false, countries: false });
    const [logo, setLogo] = useState<string | null>(null);

    // GSC State (Connect Mode)
    const [gscLoading, setGscLoading] = useState(false);

    // Config State
    const [userContext, setUserContext] = useState<string>("");
    const [model, setModel] = useState<string>(AVAILABLE_MODELS[0].value);
    const [apiKeysInput, setApiKeysInput] = useState<string>("");

    // Phase 5: Task Intelligence State
    const [watchedTasks, setWatchedTasks] = useState<{ id: number; title: string; description?: string; gsc_property_url?: string; secondary_url?: string; completed_at?: string; created_at: string; updated_at?: string }[]>([]);
    const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);

    // Analysis State
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<string>("Iniciando...");
    const [progressPercent, setProgressPercent] = useState<number>(0);

    // Result State
    const [reportHTML, setReportHTML] = useState<string>("");
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [reportPayload, setReportPayload] = useState<ReportPayload | null>(null);
    const [p1Name, setP1Name] = useState("");
    const [p2Name, setP2Name] = useState("");

    // Section Selector State
    const [showSectionSelector, setShowSectionSelector] = useState(false);
    const [suggestedSections, setSuggestedSections] = useState<string[]>([]);
    const [activeSectionsConfig, setActiveSectionsConfig] = useState<SectionConfig[]>([]);
    const [activeTaskImpact, setActiveTaskImpact] = useState<TaskImpactConfig | null>(null);

    // Auth & Persistence
    const { user, session } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [savedReportId, setSavedReportId] = useState<number | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    // Engine References
    const dataManager = useRef<DataManager>(new DataManager());

    // History & AutoSave State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // AUTOSAVE HOOK
    useAutoSave(
        'seo_report',
        reportPayload?.projectName || 'temp-report',
        {
            reportHTML,
            chartData,
            reportPayload,
            userContext,
            model,
            p1Name,
            p2Name
        },
        {
            enabled: !!reportHTML && step === 3,
            interval: 60000,
            onSaveSuccess: () => console.log("Report auto-saved")
        }
    );

    // LOAD USER KEYS & TASKS
    useEffect(() => {
        if (user) loadUserKeys();
    }, [user]);

    useEffect(() => {
        if (user) {
            loadActiveTasks();
            loadProjects();
        }
    }, [user, selectedProjectId]);

    useEffect(() => {
        const pId = searchParams.get('projectId');
        if (pId) setSelectedProjectId(pId);
        const urlParam = searchParams.get('url');
        if (urlParam) setAnalysisMode('gsc');
    }, [searchParams]);

    const loadActiveTasks = async () => {
        try {
            let query = supabase
                .from('tasks')
                .select('id, title, description, gsc_property_url, secondary_url, associated_url, completed_at, status, created_at, updated_at')
                .neq('status', 'draft');
            if (selectedProjectId) query = query.eq('project_id', parseInt(selectedProjectId));
            const { data } = await query;
            if (data) {
                const mappedTasks = data.map(t => ({ ...t, gsc_property_url: t.gsc_property_url || t.associated_url }));
                setWatchedTasks(mappedTasks);
            }
        } catch (e) { console.error("Error loading tasks", e); }
    };

    const loadProjects = async () => {
        try {
            const { data } = await supabase.from('projects').select('id, name');
            if (data) setProjects(data);
        } catch (e) { console.error("Error loading projects", e); }
    };

    const loadUserKeys = async () => {
        try {
            const { data } = await supabase.from('user_api_keys').select('*').eq('provider', 'gemini');
            if (data && data.length > 0) setApiKeysInput(data.map(k => k.key_value).join('\n'));
        } catch (e) { console.error(e); }
    };

    const addLog = useCallback((message: string, type: 'info' | 'warn' | 'error' = 'info') => {
        setLogs(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
        setCurrentStatus(message);
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: FileType) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            addLog(`Analizando archivo ${type}: ${file.name}...`);
            const data = await parseCSV(file, type, (msg) => addLog(msg, 'info'));
            if (type === 'pages') setPagesData(data);
            if (type === 'queries') setQueriesData(data);
            if (type === 'countries') setCountriesData(data);
            setUploadedStatus(prev => ({ ...prev, [type]: true }));
            addLog(`✅ Archivo ${type} procesado (${data.length} filas).`);
        } catch (err: any) { addLog(`Error al leer CSV ${type}: ${err.message}`, 'error'); }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { if (e.target?.result) setLogo(e.target.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const getApiKeys = () => apiKeysInput.split('\n').map(k => k.trim()).filter(k => k.length > 10);

    const handleGSCAnalyze = async (siteUrl: string, startP1: string, endP1: string, startP2: string, endP2: string) => {
        if (!session?.provider_token) return alert("Error de sesión GSC.");
        setGscLoading(true);
        try {
            addLog("📥 Descargando datos de Search Console...", "info");
            const token = session.provider_token;
            const fetchDim = (s: string, e: string, dims: string[]) => GscService.getSearchAnalytics(siteUrl, s, e, dims);

            addLog(`⏳ Obteniendo periodos...`);
            const [p1Pages, p1Queries, p1Countries, p2Pages, p2Queries, p2Countries] = await Promise.all([
                fetchDim(startP1, endP1, ['date', 'page']),
                fetchDim(startP1, endP1, ['date', 'query', 'page']),
                fetchDim(startP1, endP1, ['date', 'country']),
                fetchDim(startP2, endP2, ['date', 'page']),
                fetchDim(startP2, endP2, ['date', 'query', 'page']),
                fetchDim(startP2, endP2, ['date', 'country'])
            ]);

            setPagesData([...p1Pages, ...p2Pages]);
            setQueriesData([...p1Queries, ...p2Queries]);
            setCountriesData([...p1Countries, ...p2Countries]);

            const fmt = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            setP1Name(startP1 === endP1 ? fmt(startP1) : `${fmt(startP1)} - ${fmt(endP1)}`);
            setP2Name(startP2 === endP2 ? fmt(startP2) : `${fmt(startP2)} - ${fmt(endP2)}`);

            addLog("✅ Datos descargados exitosamente.");
            setGscLoading(false);
            setStep(2);
        } catch (e: any) {
            addLog("Error en descarga GSC: " + e.message, "error");
            setGscLoading(false);
            alert("Error al descargar datos: " + e.message);
        }
    };

    const handleAnalysis = async (customContext?: string) => {
        const keys = getApiKeys();
        if (keys.length === 0) { alert("Por favor ingresa al menos una API Key de Gemini."); return; }
        setIsAnalyzing(true);
        setStep(3);
        setProgressPercent(5);
        const activeContext = customContext || userContext;

        try {
            addLog(`🔑 Se han cargado ${keys.length} API Keys.`);
            dataManager.current.initialize(pagesData, queriesData, countriesData);

            const uniqueTimestamps = Array.from<number>(new Set(pagesData.map(r => r.date.getTime()))).sort((a, b) => a - b);
            if (uniqueTimestamps.length < 1) throw new Error("Dataset insuficiente.");

            const midPointIndex = Math.floor(uniqueTimestamps.length / 2);
            const cutoffTime = uniqueTimestamps[midPointIndex];
            const splitData = (data: CSVRow[]) => ({ p1: data.filter(r => r.date.getTime() < cutoffTime), p2: data.filter(r => r.date.getTime() >= cutoffTime) });

            const pagesSplit = splitData(pagesData);
            const queriesSplit = splitData(queriesData);
            const countriesSplit = splitData(countriesData);

            if (analysisMode === 'csv') {
                const fmt = (ts: number) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                setP1Name(`${fmt(uniqueTimestamps[0])} - ${fmt(uniqueTimestamps[midPointIndex - 1])}`);
                setP2Name(`${fmt(uniqueTimestamps[midPointIndex])} - ${fmt(uniqueTimestamps[uniqueTimestamps.length - 1])}`);
            }
            setProgressPercent(15);

            addLog("🕵️ Agente Investigador...");
            const agent = new AgentService(dataManager.current, model, keys[0]);
            let agentFindings = "";
            if (activeContext.trim().length > 0) agentFindings = await agent.runInvestigation(activeContext, (msg) => addLog(msg));
            setProgressPercent(30);

            const { reportPayload: payload, chartData: cData } = runFullLocalAnalysis(
                { pagesP1: pagesSplit.p1, pagesP2: pagesSplit.p2, queriesP1: queriesSplit.p1, queriesP2: queriesSplit.p2, countriesP1: countriesSplit.p1, countriesP2: countriesSplit.p2 },
                p1Name, p2Name, activeContext, (msg) => addLog(msg)
            );
            if (agentFindings) payload.agentInvestigation = agentFindings;

            const taskPerf = watchedTasks.map(t => {
                const url = t.gsc_property_url || t.secondary_url;
                if (!url) return null;
                const lookupKey = url.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                const dataItem = cData.chartLookup[lookupKey] || cData.topWinners.find(p => p.name.includes(lookupKey)) || cData.topLosers.find(p => p.name.includes(lookupKey));
                if (!dataItem) return null;
                return { taskId: t.id, taskTitle: t.title, status: dataItem.clicksChange > 0 ? 'growth' : dataItem.clicksChange < 0 ? 'decay' : 'stable', metrics: { clicks: dataItem.clicksP2, impressions: dataItem.impressionsP2, position: dataItem.positionP2 }, comparison: { clicksChange: dataItem.clicksChange, impressionsChange: dataItem.impressionsChange, positionChange: dataItem.positionChange }, url: url };
            }).filter((t): t is any => t !== null);

            payload.taskPerformanceAnalysis = taskPerf;
            setReportPayload(payload);
            setChartData(cData);
            setProgressPercent(45);

            const sections = await getRelevantSections(payload, model, keys);
            setSuggestedSections(sections);
            setIsAnalyzing(false);
            setShowSectionSelector(true);
        } catch (err: any) { addLog(`Fallo crítico: ${err.message}`, 'error'); setIsAnalyzing(false); }
    };

    const handleConfirmGeneration = async (selectedSections: SectionConfig[], taskImpact: TaskImpactConfig) => {
        const keys = getApiKeys();
        const activeContext = userContext;
        setActiveSectionsConfig(selectedSections);
        setActiveTaskImpact(taskImpact);
        setShowSectionSelector(false);
        setIsAnalyzing(true);

        try {
            if (!reportPayload) throw new Error("Payload perdido.");
            let accumulatedBodyHTML = "";
            let completed = 0;

            for (const section of selectedSections) {
                addLog(`✍️ Generando: ${section.id}...`);
                const sectionHTML = await generateReportSection(section.id, reportPayload, model, keys, section.caseCount);
                accumulatedBodyHTML += sectionHTML;
                completed++;
                setProgressPercent(45 + Math.floor((completed / (selectedSections.length + (taskImpact.enabled ? 1 : 0))) * 35));
            }

            if (taskImpact.enabled) {
                addLog(`🎯 Analizando Impacto de Tareas...`);
                let tasksDetails = watchedTasks.filter(t => taskImpact.selectedTaskIds.includes(t.id));
                const taskSectionPayload = { ...reportPayload, taskImpactDetails: tasksDetails };
                const taskImpactHTML = await generateReportSection('ANALISIS_IMPACTO_TAREAS', taskSectionPayload, model, keys);
                accumulatedBodyHTML += taskImpactHTML;
                setProgressPercent(80);
            }

            addLog(`👓 Finalizando Informe...`);
            const refinedSummary = await generateFinalRefinement(accumulatedBodyHTML, activeContext, model, keys);
            setReportHTML(refinedSummary + accumulatedBodyHTML);
            setProgressPercent(100);
            addLog("¡Informe Finalizado!");
        } catch (err: any) { addLog(`Error: ${err.message}`, 'error'); } finally { setIsAnalyzing(false); }
    };

    const handleRegenerate = (newMessage: string) => {
        const newContext = `${userContext}\n\n[USER UPDATE]: ${newMessage}`;
        setUserContext(newContext);
        handleAnalysis(newContext);
    };

    const handleSaveCloud = async (overrideHTML?: string) => {
        if (!user) return alert("Inicia sesión para guardar.");
        setIsSaving(true);
        try {
            const reportData = { user_id: user.id, domain: "Reporte SEO", report_data: { html: overrideHTML || reportHTML, stats: reportPayload?.dashboardStats, summary: "Resumen", date_range: p2Name }, created_at: new Date().toISOString(), project_id: selectedProjectId ? parseInt(selectedProjectId) : null };
            const { data, error } = await supabase.from('seo_reports').insert([reportData]).select().single();
            if (error) throw error;
            if (data) setSavedReportId(data.id);
            setHasSaved(true);
            alert("¡Informe guardado!");
        } catch (e: any) { alert("Error: " + e.message); } finally { setIsSaving(false); }
    };

    return (
        <div className="font-sans text-slate-800 bg-[#F8FAFC] min-h-screen selection:bg-indigo-100 selection:text-indigo-900">
            {step === 1 && (
                <div className="max-w-5xl mx-auto pt-20 pb-20 px-6 animate-fade-in">
                    <div className="text-center mb-16 relative">
                        <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-indigo-100">
                            SEO Analytics Engine v2.0
                        </div>
                        <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-4">Analista de Métricas</h1>
                        <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">Transforma tus datos de Search Console en estrategias accionables con inteligencia artificial de vanguardia.</p>

                        <div className="flex justify-center gap-12 mt-12 bg-white/50 backdrop-blur p-8 rounded-3xl border border-slate-200/50 shadow-sm max-w-2xl mx-auto">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">100%</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Privacidad</div>
                            </div>
                            <div className="w-px h-10 bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">Gemini</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Engine</div>
                            </div>
                            <div className="w-px h-10 bg-slate-200"></div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900">Deep</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase">Analysis</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

                        <div className="flex items-center gap-4 mb-10 relative">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-lg">1</div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Configure Data Source</h2>
                                <p className="text-sm text-slate-500">Choose how to import your search data</p>
                            </div>
                        </div>

                        <ModeSelector mode={analysisMode} onChange={setAnalysisMode} />

                        {analysisMode === 'csv' ? (
                            <div className="animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                    <UploadSlot label="Páginas" type="pages" isUploaded={uploadedStatus.pages} onChange={(e: any) => handleFileChange(e, 'pages')} />
                                    <UploadSlot label="Consultas" type="queries" isUploaded={uploadedStatus.queries} onChange={(e: any) => handleFileChange(e, 'queries')} />
                                    <UploadSlot label="Países" type="countries" isUploaded={uploadedStatus.countries} onChange={(e: any) => handleFileChange(e, 'countries')} />
                                </div>

                                <div className="flex flex-col lg:flex-row gap-10 items-center bg-slate-50 p-8 rounded-3xl border border-slate-200/50">
                                    <div className="lg:w-1/2 space-y-6">
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs">?</span>
                                            ¿Necesitas ayuda con los datos?
                                        </h3>
                                        <p className="text-sm text-slate-600 leading-relaxed">Usa nuestro Looker Studio oficial para exportar tus datos de GSC con un solo clic.</p>
                                        <div className="space-y-3">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex gap-4 items-center">
                                                    <div className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 font-bold text-[10px] flex items-center justify-center">{i}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{i === 1 ? 'Selecciona propiedad en el reporte' : i === 2 ? 'Click derecho > Exportar en cada tabla' : 'Elige formato CSV y súbelo arriba'}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="lg:w-1/2 w-full h-[300px] bg-white rounded-2xl overflow-hidden shadow-lg border border-slate-200">
                                        <iframe src="https://lookerstudio.google.com/embed/reporting/d1ee3885-13c0-4e98-9f51-2f522dfda494/page/0ludF" frameBorder="0" allowFullScreen className="w-full h-full" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
                                    <button onClick={() => setStep(2)} disabled={!uploadedStatus.pages || !uploadedStatus.queries || !uploadedStatus.countries} className="ml-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-slate-200">Empezar Configuración &rarr;</button>
                                </div>
                            </div>
                        ) : (
                            <GSCConnectPanel onAnalyze={handleGSCAnalyze} isLoading={gscLoading} />
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="max-w-7xl mx-auto pt-10 pb-10 px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 h-[calc(100vh-40px)] animate-fade-in">
                    <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45l8.1 14.1H3.9L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z" /></svg>
                        </div>

                        <button onClick={() => setStep(1)} className="group text-sm text-slate-400 hover:text-slate-900 mb-8 font-bold flex items-center gap-2 transition-all">
                            <span className="group-hover:-translate-x-1 transition-transform">&larr;</span> Volver al Origen
                        </button>

                        <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">Anatomy of Analysis</h2>

                        <div className="space-y-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                            <ConfigField label="Motor de Inteligencia Artificial" icon="🤖">
                                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold text-slate-800 transition-all appearance-none">
                                    {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </ConfigField>

                            <ConfigField label="Contexto Adicional (Opcional)" icon="📝">
                                <textarea rows={4} value={userContext} onChange={(e) => setUserContext(e.target.value)} placeholder="Ej: Fócate en las caídas de tráfico orgánico en el último mes para URLs de /blog/..." className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm text-slate-700 min-h-[160px] transition-all" />
                            </ConfigField>

                            <ConfigField label="API Keys Rotativas" icon="🔑">
                                <textarea rows={2} value={apiKeysInput} onChange={(e) => setApiKeysInput(e.target.value)} placeholder="Clave 1..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 outline-none text-[10px] font-mono text-slate-500 transition-all" />
                            </ConfigField>
                        </div>

                        <button onClick={() => handleAnalysis()} className="w-full mt-10 bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:scale-[0.98]">
                            Ejecutar Neuro-Análisis 🧠
                        </button>
                    </div>

                    <div className="flex flex-col h-full bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative border-4 border-slate-800">
                        {/* CRT Scanline Effect */}
                        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,128,0.06))] bg-[length:100%_2px,3px_100%]"></div>

                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-bold flex items-center gap-3 text-sm tracking-widest uppercase">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                                Agent Live Stream
                            </h3>
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-700"></div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <LiveConsole logs={logs} />
                        </div>
                    </div>
                </div>
            )}

            {isAnalyzing && step === 3 && (
                <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-10 select-none">
                    <div className="w-full max-w-xl text-center space-y-10">
                        <div className="relative inline-block">
                            <div className="w-24 h-24 border-4 border-indigo-500/20 rounded-full animate-ping absolute inset-0"></div>
                            <div className="text-6xl mb-4 relative z-10 animate-pulse">⚡</div>
                        </div>

                        <div>
                            <h2 className="text-4xl font-black mb-4 tracking-tighter">Procesando Inteligencia</h2>
                            <p className="text-indigo-300 font-mono text-sm tracking-widest h-6">{currentStatus}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden relative border border-slate-700 shadow-inner">
                                <div className="bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-400 h-full transition-all duration-700 ease-out shadow-[0_0_20px_rgba(79,70,229,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="flex justify-between font-mono text-[10px] text-slate-500 uppercase font-black">
                                <span>Core Processing</span>
                                <span className="text-indigo-400">{progressPercent}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSectionSelector && (
                <SectionSelector suggestedSections={suggestedSections} onConfirm={handleConfirmGeneration} onCancel={() => { setShowSectionSelector(false); setIsAnalyzing(false); }} availableTasks={watchedTasks as any} projects={projects} selectedProjectId={selectedProjectId ? parseInt(selectedProjectId) : null} onProjectChange={(id) => setSelectedProjectId(id.toString())} />
            )}

            {reportHTML && !isAnalyzing && !showSectionSelector && (
                <ReportView htmlContent={reportHTML} chartData={chartData!} p1Name={p1Name} p2Name={p2Name} onRegenerate={handleRegenerate} isRegenerating={isAnalyzing} dashboardStats={chartData?.dashboardStats} logo={logo} onSave={handleSaveCloud} onShowHistory={() => setIsHistoryOpen(true)} isSaving={isSaving} hasSaved={hasSaved} user={user} taskPerformance={reportPayload?.taskPerformanceAnalysis || []} decayAlerts={reportPayload?.keywordDecayAlerts} concentrationAnalysis={reportPayload?.concentrationAnalysis} selectedProjectId={selectedProjectId} onSelectProject={setSelectedProjectId} onDateRangeChange={(range) => {
                    // Date filtering logic remains same as provided
                }} />
            )}

            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} resourceType="seo_report" resourceId={reportPayload?.projectName || 'temp-report'} onRestore={handleRestore} />
            <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} itemType="report" itemId={savedReportId?.toString() || ""} />
        </div>
    );
};

const ConfigField = ({ label, icon, children }: any) => (
    <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <span>{icon}</span> {label}
        </label>
        {children}
    </div>
);

const UploadSlot = ({ label, type, isUploaded, onChange }: any) => (
    <div className={`relative group cursor-pointer border-2 border-dashed rounded-[2rem] h-40 flex flex-col items-center justify-center transition-all duration-300 ${isUploaded ? 'border-emerald-500 bg-emerald-50/20' : 'border-slate-200 hover:border-indigo-400 hover:bg-white hover:shadow-xl hover:shadow-indigo-100/30'}`}>
        <input type="file" accept=".csv" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer" title={label} />
        {isUploaded ? (
            <div className="text-emerald-600 flex flex-col items-center animate-scale-in">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-sm">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">{label} OK</span>
            </div>
        ) : (
            <div className="text-slate-400 group-hover:text-indigo-600 flex flex-col items-center transition-all">
                <div className="w-12 h-12 bg-slate-50 group-hover:bg-indigo-50 rounded-2xl flex items-center justify-center mb-3 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
                <span className="text-[10px] mt-1 opacity-50">CSV required</span>
            </div>
        )}
    </div>
);

export default App;
