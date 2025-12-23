import React, { useState, useCallback, useRef } from 'react';
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
import { fetchSearchAnalytics } from './services/gscService';
import { SectionSelector } from './components/SectionSelector';
import { useAutoSave } from '@/lib/useAutoSave';
import HistoryModal from '@/components/shared/HistoryModal';

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
    const [analysisMode, setAnalysisMode] = useState<'csv' | 'gsc'>('csv'); // NEW

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
    const [watchedTasks, setWatchedTasks] = useState<{ id: number; title: string; description?: string; gsc_property_url?: string; secondary_url?: string; completed_at?: string }[]>([]);

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
    const { user, session } = useAuth(); // Needed session for GSC
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);

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
    React.useEffect(() => {
        if (user) {
            loadUserKeys();
            loadActiveTasks();
        }
    }, [user]);

    // ... (rest of loaders)
    const loadActiveTasks = async () => {
        try {
            const { data } = await supabase
                .from('tasks')
                .select('id, title, description, gsc_property_url, secondary_url, completed_at')
                .neq('status', 'draft');
            if (data) setWatchedTasks(data);
        } catch (e) { console.error("Error loading tasks", e); }
    };

    const loadUserKeys = async () => {
        try {
            const { data } = await supabase.from('user_api_keys').select('*').eq('provider', 'gemini');
            if (data && data.length > 0) {
                setApiKeysInput(data.map(k => k.key_value).join('\n'));
            }
        } catch (e) { console.error(e); }
    };

    // Helpers
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
        } catch (err: any) {
            addLog(`Error al leer CSV ${type}: ${err.message}`, 'error');
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { if (e.target?.result) setLogo(e.target.result as string); };
            reader.readAsDataURL(file);
        }
    };

    const getApiKeys = () => {
        return apiKeysInput
            .split('\n')
            .map(k => k.trim())
            .filter(k => k.length > 10);
    };

    // Handlers
    const handleGSCAnalyze = async (siteUrl: string, startP1: string, endP1: string, startP2: string, endP2: string) => {
        if (!session?.provider_token) return alert("Error de sesión GSC.");
        setGscLoading(true);
        try {
            addLog("📥 Descargando datos de Search Console...", "info");
            const token = session.provider_token;

            // Parallel Fetching for Speed
            // We need Pages, Queries, Countries for both periods.
            const fetchDim = (s: string, e: string, dims: string[]) => fetchSearchAnalytics(token, siteUrl, s, e, dims);

            addLog(`⏳ Obteniendo periodo ${startP1} - ${endP1}...`);
            const [p1Pages, p1Queries, p1Countries] = await Promise.all([
                fetchDim(startP1, endP1, ['date', 'page']),
                fetchDim(startP1, endP1, ['date', 'query', 'page']), // Enhance query data with page for cannibalization
                fetchDim(startP1, endP1, ['date', 'country'])
            ]);

            addLog(`⏳ Obteniendo periodo ${startP2} - ${endP2}...`);
            const [p2Pages, p2Queries, p2Countries] = await Promise.all([
                fetchDim(startP2, endP2, ['date', 'page']),
                fetchDim(startP2, endP2, ['date', 'query', 'page']),
                fetchDim(startP2, endP2, ['date', 'country'])
            ]);

            // Set Data
            setPagesData([...p1Pages, ...p2Pages]);
            setQueriesData([...p1Queries, ...p2Queries]);
            setCountriesData([...p1Countries, ...p2Countries]);

            // Set Names
            const fmt = (d: string) => {
                const date = new Date(d);
                return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            };
            setP1Name(startP1 === endP1 ? fmt(startP1) : `${fmt(startP1)} - ${fmt(endP1)}`);
            setP2Name(startP2 === endP2 ? fmt(startP2) : `${fmt(startP2)} - ${fmt(endP2)}`);

            addLog("✅ Datos descargados exitosamente.");
            setGscLoading(false);

            // Auto-advance to Config Step
            setStep(2);

        } catch (e: any) {
            console.error(e);
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
            addLog(`🔑 Se han cargado ${keys.length} API Keys para rotación automática.`);

            addLog("🏗️ Indexando datos...");
            dataManager.current.initialize(pagesData, queriesData, countriesData);


            const uniqueTimestamps = Array.from<number>(new Set(pagesData.map(r => r.date.getTime()))).sort((a, b) => a - b);
            if (uniqueTimestamps.length < 1) throw new Error("Dataset insuficiente."); // Modified for single day support

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

            addLog("🕵️ Ejecutando Agente Investigador...");
            const agent = new AgentService(dataManager.current, model, keys[0]); // Pass first key for agent, usually sufficient
            let agentFindings = "";
            if (activeContext.trim().length > 0) agentFindings = await agent.runInvestigation(activeContext, (msg) => addLog(msg));
            else addLog("ℹ️ Análisis estándar (sin contexto).");
            setProgressPercent(30);

            addLog("📊 Calculando métricas y tendencias...");
            const { reportPayload: payload, chartData: cData } = runFullLocalAnalysis(
                { pagesP1: pagesSplit.p1, pagesP2: pagesSplit.p2, queriesP1: queriesSplit.p1, queriesP2: queriesSplit.p2, countriesP1: countriesSplit.p1, countriesP2: countriesSplit.p2 },
                p1Name, p2Name, activeContext, (msg) => addLog(msg)
            );

            if (agentFindings) payload.agentInvestigation = agentFindings;

            // Hydrate Task Performance
            const taskPerf = watchedTasks.map(t => {
                // Find matching page in cData
                const matchingPage = cData.topWinners.find(p => p.name === t.gsc_property_url) || cData.topLosers.find(p => p.name === t.gsc_property_url) || cData.chartLookup[t.gsc_property_url || '']; // Simplistic
                return null; // Placeholder
            }).filter(Boolean);

            setReportPayload(payload);
            setChartData(cData);
            setProgressPercent(45);

            // --- GENERATION FLOW ---
            addLog(`🧠 Planificando estructura del informe...`);
            const sections = await getRelevantSections(payload, model, keys); // Pass KEYS
            addLog(`📋 Estructura: ${sections.length} secciones de datos.`);

            setSuggestedSections(sections);
            setIsAnalyzing(false); // Pause loading screen
            setShowSectionSelector(true); // Show selector

        } catch (err: any) {
            addLog(`Fallo crítico: ${err.message}`, 'error');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
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

            // 1. Generate Data Sections
            for (const section of selectedSections) {
                addLog(`✍️ Generando: ${section.id}...`);
                if (completed > 0) await new Promise(r => setTimeout(r, 1000));

                const sectionHTML = await generateReportSection(section.id, reportPayload, model, keys, section.caseCount);
                accumulatedBodyHTML += sectionHTML;

                completed++;
                const progress = 45 + Math.floor((completed / (selectedSections.length + (taskImpact.enabled ? 1 : 0))) * 35);
                setProgressPercent(progress);
            }

            // 1.5 Task Impact Section
            if (taskImpact.enabled) {
                addLog(`🎯 Analizando Impacto de Tareas...`);
                // Enrich payload with selected tasks data
                const tasksDetails = watchedTasks.filter(t => taskImpact.selectedTaskIds.includes(t.id));
                const taskSectionPayload = {
                    ...reportPayload,
                    taskImpactDetails: tasksDetails
                };
                const taskImpactHTML = await generateReportSection('ANALISIS_IMPACTO_TAREAS', taskSectionPayload, model, keys);
                accumulatedBodyHTML += taskImpactHTML;
                setProgressPercent(80);
            }

            // 2. Final Refinement (Abstract & Conclusion)
            addLog(`👓 Generando Resumen Ejecutivo y Conclusiones...`);
            const refinedSummary = await generateFinalRefinement(accumulatedBodyHTML, activeContext, model, keys);

            setReportHTML(refinedSummary + accumulatedBodyHTML);
            setProgressPercent(100);
            addLog("¡Informe Finalizado!");

        } catch (err: any) {
            addLog(`Fallo crítico: ${err.message}`, 'error');
            console.error(err);
            setIsAnalyzing(false);
        } finally {
            if (reportHTML) setIsAnalyzing(false);
            setIsAnalyzing(false);
        }
    };

    const handleRestore = (content: any) => {
        if (content.reportHTML) setReportHTML(content.reportHTML);
        if (content.chartData) setChartData(content.chartData);
        if (content.reportPayload) setReportPayload(content.reportPayload);
        if (content.userContext) setUserContext(content.userContext);
        if (content.model) setModel(content.model);
        if (content.p1Name) setP1Name(content.p1Name);
        if (content.p2Name) setP2Name(content.p2Name);

        setCurrentStatus("Versión del informe restaurada.");
        setTimeout(() => setCurrentStatus(""), 3000);
    };

    const handleRegenerate = (newMessage: string) => {
        const newContext = `${userContext}\n\n[USER UPDATE]: ${newMessage}`;
        setUserContext(newContext);
        handleAnalysis(newContext);
    };

    const handleSaveCloud = async (overrideHTML?: string) => {
        if (!user) return alert("Debes iniciar sesión para guardar.");
        const contentToSave = overrideHTML || reportHTML;
        if (!contentToSave) return;
        setIsSaving(true);
        try {
            const reportData = {
                user_id: user.id,
                domain: "Reporte SEO Auto", // Pending: Extract domain from CSV filename properly if possible, or leave generic
                report_data: {
                    html: reportHTML,
                    stats: reportPayload?.dashboardStats,
                    summary: "Resumen (Ver HTML)",
                    date_range: p2Name
                },
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('seo_reports').insert([reportData]);
            if (error) throw error;

            setHasSaved(true);
            alert("¡Informe guardado con éxito en tu tablero!");
        } catch (e: any) {
            console.error(e);
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="font-sans text-brand-power bg-brand-soft min-h-screen">
            {step === 1 && (
                <div className="max-w-4xl mx-auto pt-20 px-6 animate-fade-in-up">
                    <div className="text-center mb-16 relative">
                        <button
                            onClick={() => window.history.back()}
                            className="absolute left-0 top-0 text-brand-power/50 font-bold hover:text-brand-power flex items-center gap-2 transition-colors"
                        >
                            &larr; Volver
                        </button>
                        <h1 className="text-5xl font-extrabold text-brand-power tracking-tight mb-4">Analista de Métricas</h1>
                        <p className="text-xl text-brand-power/60 font-medium">Análisis Profundo + Integración Cloud</p>
                    </div>

                    <div className="bg-brand-white/80 backdrop-blur-md p-10 rounded-3xl shadow-sm border border-brand-power/5">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-full bg-brand-power text-brand-white flex items-center justify-center font-bold">1</div>
                            <h2 className="text-xl font-bold text-brand-power">Origen de Datos</h2>
                        </div>

                        <ModeSelector mode={analysisMode} onChange={setAnalysisMode} />

                        {analysisMode === 'csv' ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                    <UploadSlot label="Páginas" type="pages" isUploaded={uploadedStatus.pages} onChange={(e: any) => handleFileChange(e, 'pages')} />
                                    <UploadSlot label="Consultas" type="queries" isUploaded={uploadedStatus.queries} onChange={(e: any) => handleFileChange(e, 'queries')} />
                                    <UploadSlot label="Países" type="countries" isUploaded={uploadedStatus.countries} onChange={(e: any) => handleFileChange(e, 'countries')} />
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-brand-power/5">
                                    <div className="flex items-center gap-2">
                                        <input type="file" id="logo-u" accept="image/png" onChange={handleLogoChange} className="hidden" />
                                        <label htmlFor="logo-u" className="text-sm font-semibold text-brand-power/60 hover:text-brand-power cursor-pointer flex items-center gap-2 transition">
                                            {logo ? <span className="text-green-600">Logo Cargado</span> : <span>+ Subir Logo (Opcional)</span>}
                                        </label>
                                    </div>
                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!uploadedStatus.pages || !uploadedStatus.queries || !uploadedStatus.countries}
                                        className="bg-brand-power text-brand-white px-8 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </>
                        ) : (
                            <GSCConnectPanel onAnalyze={handleGSCAnalyze} isLoading={gscLoading} />
                        )}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="max-w-7xl mx-auto pt-10 px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-80px)]">
                    {/* Left: Configuration */}
                    <div className="bg-brand-white/80 backdrop-blur-md p-10 rounded-3xl shadow-sm border border-brand-power/5 flex flex-col">
                        <button onClick={() => setStep(1)} className="text-sm text-brand-power/40 hover:text-brand-power mb-6 font-medium self-start">&larr; Volver</button>

                        <h2 className="text-2xl font-bold text-brand-power mb-6">Configuración de Inteligencia</h2>

                        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <div>
                                <label className="block text-sm font-bold text-brand-power mb-2">API Keys (Gemini)</label>
                                <textarea
                                    rows={3}
                                    placeholder="Ingresa tus API Keys (una por línea)..."
                                    value={apiKeysInput}
                                    onChange={(e) => setApiKeysInput(e.target.value)}
                                    className="w-full p-4 bg-brand-soft/50 border border-brand-power/10 rounded-xl focus:ring-2 focus:ring-brand-power/20 outline-none text-xs font-mono text-brand-power"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-power mb-2">Modelo</label>
                                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-4 bg-brand-soft/50 border border-brand-power/10 rounded-xl focus:ring-2 focus:ring-brand-power/20 outline-none text-sm text-brand-power font-medium">
                                    {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-brand-power mb-2">Contexto de Investigación</label>
                                <textarea rows={4} value={userContext} onChange={(e) => setUserContext(e.target.value)} placeholder="Ej: Analiza caídas en móviles..." className="w-full p-4 bg-brand-soft/50 border border-brand-power/10 rounded-xl focus:ring-2 focus:ring-brand-power/20 outline-none text-sm text-brand-power" />
                            </div>
                        </div>

                        <button
                            onClick={() => handleAnalysis()}
                            className="w-full mt-8 bg-brand-power text-brand-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition shadow-lg shadow-brand-power/20"
                        >
                            Generar Informe
                        </button>
                    </div>

                    {/* Right: Live Console */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-brand-power p-6 rounded-3xl shadow-xl flex-1 flex flex-col border border-brand-power">
                            <h3 className="text-brand-white font-bold mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                Consola de Agente
                            </h3>
                            <div className="flex-1 overflow-hidden relative">
                                <LiveConsole logs={logs} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {
                isAnalyzing && step === 3 && (
                    <div className="fixed inset-0 z-50 bg-brand-power/95 backdrop-blur-md flex flex-col items-center justify-center text-white px-4">
                        <div className="w-full max-w-md text-center">
                            <div className="text-4xl mb-6 animate-bounce">⚡</div>
                            <h2 className="text-3xl font-extrabold mb-2 tracking-tight">Analizando Datos</h2>
                            <p className="text-brand-white/60 mb-8 font-medium">{currentStatus}</p>

                            <div className="w-full bg-brand-white/10 rounded-full h-1.5 overflow-hidden relative">
                                <div className="absolute inset-0 bg-brand-white/20 animate-pulse"></div>
                                <div className="bg-brand-white h-full transition-all duration-300 ease-out" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                            <div className="mt-4 text-right text-xs font-mono text-brand-white/60">{progressPercent}%</div>
                        </div>
                    </div>
                )
            }

            {
                showSectionSelector && (
                    <SectionSelector
                        suggestedSections={suggestedSections}
                        onConfirm={handleConfirmGeneration}
                        onCancel={() => { setShowSectionSelector(false); setIsAnalyzing(false); }}
                        availableTasks={watchedTasks as any}
                    />
                )
            }

            {
                reportHTML && !isAnalyzing && !showSectionSelector && (
                    <ReportView
                        htmlContent={reportHTML}
                        chartData={chartData!}
                        p1Name={p1Name} p2Name={p2Name}
                        onRegenerate={handleRegenerate}
                        isRegenerating={isAnalyzing}
                        dashboardStats={chartData?.dashboardStats}
                        logo={logo}
                        onSave={handleSaveCloud}
                        onShowHistory={() => setIsHistoryOpen(true)}
                        isSaving={isSaving}
                        hasSaved={hasSaved}
                        user={user}
                        // For MVP: Pass empty tasks if not integrated fully yet, or simple mapping
                        taskPerformance={[]} // Logic disabled for safety to prioritize Informes SEO stability
                        decayAlerts={reportPayload?.keywordDecayAlerts}
                        concentrationAnalysis={reportPayload?.concentrationAnalysis}
                    />
                )
            }

            <HistoryModal
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                resourceType="seo_report"
                resourceId={reportPayload?.projectName || 'temp-report'}
                onRestore={handleRestore}
            />
        </div>
    );
};

const UploadSlot = ({ label, type, isUploaded, onChange }: any) => (
    <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center transition-all ${isUploaded ? 'border-emerald-500 bg-emerald-50/50' : 'border-brand-power/10 hover:border-brand-power/40 hover:bg-brand-white'}`}>
        <input type="file" accept=".csv" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer" />
        {isUploaded ? (
            <div className="text-emerald-700 flex flex-col items-center">
                <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Cargado</span>
            </div>
        ) : (
            <div className="text-brand-power/40 group-hover:text-brand-power flex flex-col items-center transition-colors">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[10px] mt-1 opacity-70">Arrastra o clic</span>
            </div>
        )}
    </div>
);

export default App;
