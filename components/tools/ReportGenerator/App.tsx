import React, { useState, useCallback, useRef } from 'react';
import { CSVRow, ReportPayload, ChartData, LogEntry, FileType } from './types';
import { parseCSV } from './services/csvService';
import { runFullLocalAnalysis } from './services/analysisService';
import { getRelevantSections, generateReportSection, performHolisticReview } from './services/geminiService';
import { DataManager } from './services/dataManager'; // Phase 1.1
import { AgentService } from './services/agentService'; // Phase 2 Integration
import { ReportView } from './components/ReportView';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../lib/supabase';

const AVAILABLE_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado - Rápido)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro Preview (Máximo Razonamiento)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Estable)' },
    { value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Experimental' }
];

const App: React.FC = () => {
    // State
    const [step, setStep] = useState<number>(1);

    // File State
    const [pagesData, setPagesData] = useState<CSVRow[]>([]);
    const [queriesData, setQueriesData] = useState<CSVRow[]>([]);
    const [countriesData, setCountriesData] = useState<CSVRow[]>([]);
    const [uploadedStatus, setUploadedStatus] = useState({ pages: false, queries: false, countries: false });
    const [logo, setLogo] = useState<string | null>(null);

    // Config State
    const [userContext, setUserContext] = useState<string>("");
    const [model, setModel] = useState<string>(AVAILABLE_MODELS[0].value);
    const [apiKeysInput, setApiKeysInput] = useState<string>("");

    // Phase 5: Task Intelligence State
    const [watchedTasks, setWatchedTasks] = useState<{ id: number; title: string; gsc_property_url?: string }[]>([]);

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

    // Auth & Persistence
    const { user } = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);

    // Engine References
    const dataManager = useRef<DataManager>(new DataManager());

    // LOAD USER KEYS & TASKS
    React.useEffect(() => {
        if (user) {
            loadUserKeys();
            loadActiveTasks();
        }
    }, [user]);

    const loadActiveTasks = async () => {
        try {
            const { data } = await supabase.from('tasks').select('id, title, gsc_property_url').neq('status', 'done');
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

    const checkIfKeySaved = async (val: string) => {
        if (!user || !val) return;
        const keys = val.split('\n').map(k => k.trim()).filter(k => k.length > 10);
        for (const k of keys) {
            const { data } = await supabase.from('user_api_keys').select('id').eq('key_value', k).eq('provider', 'gemini');
            if (!data || data.length === 0) {
                if (confirm(`¿Deseas guardar la API Key (${k.substring(0, 8)}...) en tu perfil para uso automático?`)) {
                    await supabase.from('user_api_keys').insert([{ user_id: user.id, provider: 'gemini', key_value: k, label: 'Auto-guardada' }]);
                }
            }
        }
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
            if (uniqueTimestamps.length < 2) throw new Error("Dataset insuficiente.");

            const midPointIndex = Math.floor(uniqueTimestamps.length / 2);
            const cutoffTime = uniqueTimestamps[midPointIndex];
            const splitData = (data: CSVRow[]) => ({ p1: data.filter(r => r.date.getTime() < cutoffTime), p2: data.filter(r => r.date.getTime() >= cutoffTime) });

            const pagesSplit = splitData(pagesData);
            const queriesSplit = splitData(queriesData);
            const countriesSplit = splitData(countriesData);
            const fmt = (ts: number) => new Date(ts).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            setP1Name(`${fmt(uniqueTimestamps[0])} - ${fmt(uniqueTimestamps[midPointIndex - 1])}`);
            setP2Name(`${fmt(uniqueTimestamps[midPointIndex])} - ${fmt(uniqueTimestamps[uniqueTimestamps.length - 1])}`);
            setProgressPercent(15);

            addLog("🕵️ Ejecutando Agente Investigador...");
            // Pass the ARRAY of keys to the Agent
            const agent = new AgentService(dataManager.current, model, keys);
            let agentFindings = "";
            if (activeContext.trim().length > 0) agentFindings = await agent.runInvestigation(activeContext, (msg) => addLog(msg));
            else addLog("ℹ️ Análisis estándar (sin contexto).");
            setProgressPercent(30);

            addLog("📊 Calculando métricas y tendencias...");
            const { reportPayload: payload, chartData: cData } = runFullLocalAnalysis(
                { pagesP1: pagesSplit.p1, pagesP2: pagesSplit.p2, queriesP1: queriesSplit.p1, queriesP2: queriesSplit.p2, countriesP1: countriesSplit.p1, countriesP2: countriesSplit.p2 },
                p1Name, p2Name, activeContext, (msg) => addLog(msg),
                watchedTasks // Phase 5
            );

            if (agentFindings) payload.agentInvestigation = agentFindings;
            setReportPayload(payload);
            setChartData(cData);
            setProgressPercent(45);

            // --- GENERATION FLOW ---
            addLog(`🧠 Planificando estructura del informe...`);
            // Pass the ARRAY of keys to the Gemini Service
            const sections = await getRelevantSections(payload, model, keys);
            addLog(`📋 Estructura: ${sections.length} secciones de datos.`);

            let accumulatedBodyHTML = "";
            let completed = 0;

            // 1. Generate Data Sections (Draft Mode)
            for (const section of sections) {
                addLog(`✍️ Generando borrador: ${section}...`);
                // Simple throttling to help rate limits even with rotation
                if (completed > 0) await new Promise(r => setTimeout(r, 1000));

                const sectionHTML = await generateReportSection(section, payload, model, keys);
                accumulatedBodyHTML += sectionHTML;

                completed++;
                const progress = 45 + Math.floor((completed / sections.length) * 35);
                setProgressPercent(progress);
            }

            // 2. Holistic Review Phase
            addLog(`👓 Revisión Holística (IA Editor)...`);
            const reviewResult = await performHolisticReview(accumulatedBodyHTML, activeContext, model, keys);
            setProgressPercent(90);

            // 3. Patching the HTML with improvements
            addLog(`✨ Aplicando mejoras y correcciones...`);
            let finalBodyHTML = accumulatedBodyHTML;

            if (reviewResult.section_enhancements) {
                Object.entries(reviewResult.section_enhancements).forEach(([id, newHTML]) => {
                    const regex = new RegExp(`<div id="${id}"[^>]*>.*?<\/div>`, 's');
                    if (finalBodyHTML.match(regex)) {
                        finalBodyHTML = finalBodyHTML.replace(regex, newHTML);
                    }
                });
            }

            // 4. Assemble Final Report
            setReportHTML(reviewResult.resumen_ejecutivo + finalBodyHTML + reviewResult.conclusiones);
            setProgressPercent(100);
            addLog("¡Informe Finalizado!");
        } catch (err: any) {
            addLog(`Fallo crítico: ${err.message}`, 'error');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerate = (newMessage: string) => {
        const newContext = `${userContext}\n\n[USER UPDATE]: ${newMessage}`;
        setUserContext(newContext);
        handleAnalysis(newContext);
    };

    const handleSaveCloud = async () => {
        if (!user) return alert("Debes iniciar sesión para guardar.");
        if (!reportHTML) return;
        setIsSaving(true);
        try {
            const reportData = {
                user_id: user.id,
                domain: "Reporte SEO Auto", // Pending: Extract domain from CSV filename properly if possible, or leave generic
                report_data: {
                    html: reportHTML,
                    stats: reportPayload?.dashboardStats,
                    summary: reportPayload?.executiveSummary,
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
        <div className="font-sans text-slate-800 bg-slate-50 min-h-screen">
            {/* Steps Rendering Unchanged */}
            {step === 1 && (
                <div className="max-w-4xl mx-auto pt-20 px-6">
                    <div className="text-center mb-16 relative">
                        <button
                            onClick={() => window.history.back()}
                            className="absolute left-0 top-0 text-indigo-600 font-bold hover:underline flex items-center gap-2"
                        >
                            &larr; Volver
                        </button>
                        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">SEO Intelligence</h1>
                        <p className="text-xl text-slate-500 font-light">Análisis de Search Console con Agentes de IA</p>
                    </div>

                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200/60">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">1</div>
                            <h2 className="text-xl font-bold text-slate-900">Carga de Datos (CSV)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <UploadSlot label="Páginas" type="pages" isUploaded={uploadedStatus.pages} onChange={(e) => handleFileChange(e, 'pages')} />
                            <UploadSlot label="Consultas" type="queries" isUploaded={uploadedStatus.queries} onChange={(e) => handleFileChange(e, 'queries')} />
                            <UploadSlot label="Países" type="countries" isUploaded={uploadedStatus.countries} onChange={(e) => handleFileChange(e, 'countries')} />
                        </div>

                        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <input type="file" id="logo-u" accept="image/png" onChange={handleLogoChange} className="hidden" />
                                <label htmlFor="logo-u" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 cursor-pointer flex items-center gap-2">
                                    {logo ? <span className="text-green-600">Logo Cargado</span> : <span>+ Subir Logo (Opcional)</span>}
                                </label>
                            </div>
                            <button
                                onClick={() => setStep(2)}
                                disabled={!uploadedStatus.pages || !uploadedStatus.queries || !uploadedStatus.countries}
                                className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {step === 2 && (
                <div className="max-w-2xl mx-auto pt-20 px-6">
                    <div className="bg-white p-10 rounded-3xl shadow-xl border border-slate-200/60">
                        <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-slate-700 mb-8 font-medium">&larr; Volver</button>

                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">2</div>
                            <h2 className="text-xl font-bold text-slate-900">Configuración de Inteligencia</h2>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">API Keys (Google Gemini)</label>
                                <p className="text-[10px] text-slate-500 mb-2">Ingresa una clave por línea. Si una falla por límite de cuota, se usará la siguiente automáticamente.</p>
                                <textarea
                                    rows={4}
                                    value={apiKeysInput}
                                    onChange={(e) => setApiKeysInput(e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1 italic">Tus claves guardadas se cargarán automáticamente.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Modelo</label>
                                <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                                    {AVAILABLE_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Contexto de Investigación (Opcional)</label>
                                <textarea rows={3} value={userContext} onChange={(e) => setUserContext(e.target.value)} placeholder="Ej: Analiza por qué bajó el tráfico en móviles..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                            </div>
                        </div>

                        <button
                            onClick={() => handleAnalysis()}
                            className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                        >
                            Generar Informe
                        </button>
                    </div >
                </div >
            )}

            {
                isAnalyzing && (
                    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white px-4">
                        <div className="w-full max-w-md">
                            <div className="flex justify-between items-end mb-4">
                                <h2 className="text-2xl font-bold">Analizando Datos</h2>
                                <span className="text-indigo-400 font-mono font-bold">{progressPercent}%</span>
                            </div>

                            <div className="w-full bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                ></div>
                            </div>

                            <div className="bg-black/40 rounded-xl p-6 border border-white/10 backdrop-blur-sm min-h-[120px] flex flex-col justify-center items-center text-center">
                                <div className="w-8 h-8 mb-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-slate-200 font-medium text-lg animate-pulse">{currentStatus}</p>
                                <p className="text-slate-500 text-xs mt-2">Esto puede tomar unos momentos...</p>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                reportHTML && !isAnalyzing && (
                    <ReportView
                        htmlContent={reportHTML}
                        chartData={chartData}
                        p1Name={p1Name} p2Name={p2Name}
                        onRegenerate={handleRegenerate}
                        isRegenerating={isAnalyzing}
                        dashboardStats={chartData?.dashboardStats}
                        logo={logo}
                        onSave={handleSaveCloud}
                        isSaving={isSaving}
                        hasSaved={hasSaved}
                        user={user}
                        taskPerformance={reportPayload?.taskPerformanceAnalysis} // Phase 5
                        decayAlerts={reportPayload?.keywordDecayAlerts}
                    />
                )
            }
        </div >
    );
};

const UploadSlot = ({ label, type, isUploaded, onChange }: any) => (
    <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl h-32 flex flex-col items-center justify-center transition-all ${isUploaded ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
        <input type="file" accept=".csv" onChange={onChange} className="absolute inset-0 opacity-0 cursor-pointer" />
        {isUploaded ? (
            <div className="text-emerald-600 flex flex-col items-center">
                <svg className="w-8 h-8 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span className="text-xs font-bold uppercase tracking-wider">Cargado</span>
            </div>
        ) : (
            <div className="text-slate-400 group-hover:text-indigo-500 flex flex-col items-center">
                <span className="text-sm font-medium">{label}</span>
                <span className="text-[10px] mt-1 opacity-70">Arrastra o clic</span>
            </div>
        )}
    </div>
);

export default App;