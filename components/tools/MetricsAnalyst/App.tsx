import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CSVRow, ReportPayload, ChartData, LogEntry, FileType, SectionConfig, TaskImpactConfig, ContentAnalysisConfig, UsageMode } from './types';
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
import { DataConnectPanel } from './components/DataConnectPanel';
import { GscService } from './services/gscService';
import { Ga4Service } from './services/ga4Service';
import { SectionSelector } from './components/SectionSelector';
import { useAutoSave } from '@/lib/useAutoSave';
import HistoryModal from '@/components/shared/HistoryModal';
import ShareModal from '@/components/shared/ShareModal';

const AVAILABLE_MODELS = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recomendado)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Rápido)' },
    { value: 'gemini-3-flash', label: 'Gemini 3 Flash (Preview)' },
    { value: 'gemma-3-27b', label: 'Gemma 3 27B' },
    { value: 'gemma-3-12b', label: 'Gemma 3 12B' },
    { value: 'gemma-3-4b', label: 'Gemma 3 4B' },
    { value: 'gemini-2.5-flash-native-audio-dialog', label: 'Gemini 2.5 Audio Dialog' }
];

const App: React.FC = () => {
    // ... State declarations remain same ...
    const [step, setStep] = useState<number>(1);
    const [usageMode, setUsageMode] = useState<UsageMode>('default');
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

    // GA4 State
    const [ga4Data, setGa4Data] = useState<any[]>([]);
    const [selectedGa4Property, setSelectedGa4Property] = useState<string | null>(null);

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

    const handleRestore = (content: any) => {
        if (content.reportHTML) setReportHTML(content.reportHTML);
        if (content.chartData) setChartData(content.chartData);
        if (content.reportPayload) setReportPayload(content.reportPayload);
        if (content.userContext) setUserContext(content.userContext);
        if (content.model) setModel(content.model);
        if (content.p1Name) setP1Name(content.p1Name);
        if (content.p2Name) setP2Name(content.p2Name);
        if (content.reportHTML) setStep(3);
    };

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
        const rId = searchParams.get('reportId');
        if (rId) loadExistingReport(parseInt(rId));
    }, [searchParams]);

    const loadExistingReport = async (id: number) => {
        try {
            const { data, error } = await supabase.from('seo_reports').select('*').eq('id', id).single();
            if (error) throw error;
            if (data) {
                setSavedReportId(data.id);
                setHasSaved(true);
                if (data.project_id) setSelectedProjectId(data.project_id.toString());
                if (data.report_data) {
                    setReportHTML(data.report_data.html || "");
                    setReportPayload({
                        projectName: data.domain,
                        dashboardStats: data.report_data.stats,
                        // Other fields might be missing depending on how it was saved
                    } as any);
                    // P2Name might be stored in report_data.date_range
                    if (data.report_data.date_range) setP2Name(data.report_data.date_range);
                    if (data.report_data.mode) setUsageMode(data.report_data.mode);
                }
                setStep(3); // Go straight to report view
            }
        } catch (e) { console.error("Error loading report", e); }
    };

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

    const handleDataAnalyze = async (siteUrl: string, ga4PropertyId: string | null, startP1: string, endP1: string, startP2: string, endP2: string) => {
        if (!session?.provider_token) return alert("Error de sesión Google.");
        setGscLoading(true);
        try {
            addLog("📥 Descargando datos de Search Console...", "info");
            const token = session.provider_token;
            const fetchDim = (s: string, e: string, dims: string[]) => GscService.getSearchAnalytics(siteUrl, s, e, dims);

            addLog(`⏳ Obteniendo periodos GSC...`);
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

            // GA4 Fetching
            if (ga4PropertyId) {
                addLog(`📊 Detectada propiedad GA4: ${ga4PropertyId}. Descargando sesiones...`);
                try {
                    // Fetch entire range (P1 + P2)
                    // P1 range: startP1 to endP1
                    // P2 range: startP2 to endP2
                    // We can just fetch two batches or one big batch. Let's fetch two for comparisons.
                    // Actually, let's just fetch P2 for "Current AI Traffic" analysis as a priority, 
                    // and P1 for comparison if needed later.

                    const ga4P2 = await Ga4Service.getAiSessionDataByDate(ga4PropertyId, startP2, endP2);
                    const ga4P1 = await Ga4Service.getAiSessionDataByDate(ga4PropertyId, startP1, endP1);

                    setGa4Data([...ga4P1, ...ga4P2]);
                    setSelectedGa4Property(ga4PropertyId);
                    addLog(`✅ Datos GA4 descargados (${ga4P2.length + ga4P1.length} filas).`);
                } catch (ga4Err: any) {
                    console.error("GA4 Error", ga4Err);
                    addLog(`⚠️ Error descargando GA4 (continuando sin ello): ${ga4Err.message}`, 'warn');
                }
            } else {
                addLog("ℹ️ No se seleccionó propiedad GA4 (análisis de tráfico AI limitado).");
                setGa4Data([]);
                setSelectedGa4Property(null);
            }

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
            dataManager.current.initialize(pagesData, queriesData, countriesData, ga4Data);

            const uniqueTimestamps = Array.from<number>(new Set(pagesData.map(r => r.date.getTime()))).sort((a, b) => a - b);
            if (uniqueTimestamps.length < 1) throw new Error("Dataset insuficiente.");

            const midPointIndex = Math.floor(uniqueTimestamps.length / 2);
            const cutoffTime = uniqueTimestamps[midPointIndex];
            const splitData = (data: CSVRow[]) => ({ p1: data.filter(r => r.date.getTime() < cutoffTime), p2: data.filter(r => r.date.getTime() >= cutoffTime) });

            const pagesSplit = splitData(pagesData);
            const queriesSplit = splitData(queriesData);
            const countriesSplit = splitData(countriesData);

            // GA4 Split Logic
            let ga4Split = { p1: [] as any[], p2: [] as any[] };
            if (ga4Data && ga4Data.length > 0) {
                ga4Split = {
                    p1: ga4Data.filter(r => {
                        const dStr = r.date; // YYYYMMDD
                        // Parse YYYYMMDD to timestamp
                        const year = parseInt(dStr.substring(0, 4));
                        const month = parseInt(dStr.substring(4, 6)) - 1;
                        const day = parseInt(dStr.substring(6, 8));
                        const ts = new Date(year, month, day).getTime();
                        return ts < cutoffTime;
                    }),
                    p2: ga4Data.filter(r => {
                        const dStr = r.date;
                        const year = parseInt(dStr.substring(0, 4));
                        const month = parseInt(dStr.substring(4, 6)) - 1;
                        const day = parseInt(dStr.substring(6, 8));
                        const ts = new Date(year, month, day).getTime();
                        return ts >= cutoffTime;
                    })
                };
                addLog(`📊 Datos GA4 distribuidos: P1 (${ga4Split.p1.length}) vs P2 (${ga4Split.p2.length})`);
            }

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
                {
                    pagesP1: pagesSplit.p1,
                    pagesP2: pagesSplit.p2,
                    queriesP1: queriesSplit.p1,
                    queriesP2: queriesSplit.p2,
                    countriesP1: countriesSplit.p1,
                    countriesP2: countriesSplit.p2,
                    ga4DataP1: ga4Split.p1,
                    ga4DataP2: ga4Split.p2
                },
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
        } catch (err: any) {
            console.error("Fallo crítico en análisis:", err);
            addLog(`Fallo crítico: ${err.message}`, 'error');
            setIsAnalyzing(false);
            // Don't stay in white screen Step 3 if we have no report and no selector
            if (!reportHTML && !showSectionSelector) {
                setStep(2);
                alert(`Error en el análisis: ${err.message}. Revisa los logs en la consola del agente.`);
            }
        }
    };

    const handleConfirmGeneration = async (selectedSections: SectionConfig[], taskImpact: TaskImpactConfig, contentAnalysis: ContentAnalysisConfig) => {
        const keys = getApiKeys();
        const activeContext = userContext;

        // 1. Validate State Requirements before starting
        if (!reportPayload) {
            alert("Error de estado: No hay datos de análisis (Payload perdido). Por favor reinicia el proceso.");
            setStep(2);
            return;
        }

        // 2. Update UI Transition
        setActiveSectionsConfig(selectedSections);
        setActiveTaskImpact(taskImpact);
        setShowSectionSelector(false); // Hide selector
        setIsAnalyzing(true); // Show progress

        try {
            let accumulatedBodyHTML = "";
            let completed = 0;
            let totalSteps = selectedSections.length + (taskImpact.enabled ? 1 : 0) + (contentAnalysis.enabled ? 1 : 0) + 1; // +1 for final refinement

            // 3. Generate Sections
            for (const section of selectedSections) {
                addLog(`✍️ Generando sección: ${section.title || section.id}...`);
                try {
                    // Rate Limit Prevention: Wait 3 seconds between sections
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    const sectionHTML = await generateReportSection(section.id, reportPayload, model, keys, section.caseCount, usageMode);
                    accumulatedBodyHTML += sectionHTML;
                } catch (secErr) {
                    console.error(`Error generando sección ${section.id}`, secErr);
                    accumulatedBodyHTML += `<div class="p-4 bg-red-50 text-red-600 border border-red-200 rounded">Error generando sección ${section.id}</div>`;
                }

                completed++;
                const p = Math.floor(45 + ((completed / totalSteps) * 55));
                setProgressPercent(Math.min(p, 99));
            }

            // 4. Task Impact Analysis (Optional)
            // 4. Task Impact Analysis (Optional)
            if (taskImpact.enabled) {
                addLog(`🎯 Analizando Impacto de Tareas...`);

                // Rate Limit Prevention for this section too
                await new Promise(resolve => setTimeout(resolve, 3000));

                try {
                    let tasksDetails = watchedTasks.filter(t => taskImpact.selectedTaskIds.includes(t.id));

                    // Fallback: If enabled but no specific tasks selected, take top 5 recent tasks
                    if (tasksDetails.length === 0 && watchedTasks.length > 0) {
                        addLog("⚠️ No seleccionaste tareas específicas, analizando las 5 más recientes.", 'warn');
                        tasksDetails = watchedTasks.slice(0, 5);
                    }

                    if (tasksDetails.length > 0) {
                        addLog(`Analizando ${tasksDetails.length} tareas completadas.`);
                        const taskSectionPayload = { ...reportPayload, taskImpactDetails: tasksDetails };
                        const taskImpactHTML = await generateReportSection('ANALISIS_IMPACTO_TAREAS', taskSectionPayload, model, keys);
                        accumulatedBodyHTML += taskImpactHTML;
                    } else {
                        addLog("No hay tareas para analizar en este proyecto/periodo.", 'warn');
                    }
                } catch (taskErr) {
                    console.error("Error en módulo de tareas", taskErr);
                    addLog(`Error generando impacto de tareas: ${(taskErr as any).message}`, 'error');
                }
                setProgressPercent(90);
            }

            // 5. Content Analysis (Optional)
            if (contentAnalysis.enabled) {
                addLog(`📑 Analizando Grupo de Contenidos...`);
                await new Promise(resolve => setTimeout(resolve, 3000));

                try {
                    let targetTasks = [];
                    if (contentAnalysis.mode === 'items') {
                        targetTasks = watchedTasks.filter(t => contentAnalysis.selectedTaskIds.includes(t.id));
                    } else if (contentAnalysis.mode === 'month' && contentAnalysis.selectedMonth) {
                        const [y, m] = contentAnalysis.selectedMonth.split('-').map(Number);
                        // Filter by roughly matching month (created_at)
                        targetTasks = watchedTasks.filter(t => {
                            const d = new Date(t.created_at);
                            return d.getFullYear() === y && d.getMonth() === (m - 1);
                        });
                    }

                    if (targetTasks.length > 0) {
                        const contentAnalysisData = targetTasks.map(t => {
                            const url = t.gsc_property_url || t.secondary_url;
                            if (!url) return null;
                            const lookupKey = url.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                            // Attempt to find metrics in our loaded chartData
                            // We use chartData?.chartLookup or search in arrays
                            let metricItem = chartData?.chartLookup?.[lookupKey];
                            if (!metricItem && chartData) {
                                // Fallback search
                                metricItem = chartData.topWinners.find(x => x.name.includes(lookupKey)) || chartData.topLosers.find(x => x.name.includes(lookupKey));
                            }

                            return {
                                title: t.title,
                                url: url,
                                metrics: metricItem ? {
                                    clicks: metricItem.clicksP2,
                                    impressions: metricItem.impressionsP2,
                                    position: metricItem.positionP2,
                                    change: metricItem.clicksChange
                                } : 'Low Visibility / No Data'
                            };
                        }).filter(Boolean);

                        // Calculate Aggregates for the Dashboard
                        const overview = contentAnalysisData.reduce((acc: any, item: any) => {
                            if (item.metrics !== 'Low Visibility / No Data') {
                                acc.clicks += item.metrics.clicks;
                                acc.impressions += item.metrics.impressions;
                                acc.posSum += item.metrics.position;
                                acc.count++;
                            }
                            return acc;
                        }, { clicks: 0, impressions: 0, posSum: 0, count: 0 });

                        const contentPayload = {
                            ...reportPayload,
                            contentAnalysisData: {
                                items: contentAnalysisData,
                                overview: {
                                    totalClicks: overview.clicks,
                                    totalImpressions: overview.impressions,
                                    avgPosition: overview.count > 0 ? overview.posSum / overview.count : 0,
                                    contentCount: overview.count
                                }
                            }
                        };
                        const contentHTML = await generateReportSection('ANALISIS_CONTENIDOS', contentPayload as any, model, keys);
                        accumulatedBodyHTML += contentHTML;
                    } else {
                        addLog("No se encontraron contenidos para el periodo/selección content analysis.", 'warn');
                    }
                } catch (cErr: any) {
                    console.error(cErr);
                    addLog("Error en Content Analysis: " + cErr.message, 'error');
                }
            }

            // 6. Final Refinement (Abstract & Conclusions)
            addLog(`👓 Redactando Resumen Ejecutivo y Conclusiones...`);
            const refinedSummary = await generateFinalRefinement(accumulatedBodyHTML, activeContext, model, keys);

            // VALIDATION: Ensure we actually have content
            const fullContent = refinedSummary + accumulatedBodyHTML;
            if (!fullContent || fullContent.length < 500 || fullContent.includes("Error Crítico")) {
                // Check if it's just a bunch of error messages
                const errorCount = (fullContent.match(/Error generando sección/g) || []).length;
                if (errorCount > 0 && fullContent.length < 2000) {
                    throw new Error("La generación falló para la mayoría de las secciones. Por favor intenta con otro modelo o claves API.");
                }
            }

            // 7. Final success state
            setReportHTML(fullContent);
            setProgressPercent(100);
            addLog("¡Informe Finalizado con Éxito!");

        } catch (err: any) {
            console.error("CRITICAL GENERATION ERROR:", err);
            addLog(`Error Crítico: ${err.message}`, 'error');
            alert(`Ocurrió un error generando el informe: ${err.message}\n\nSe restaurará la selección.`);

            // RESTORE STATE TO AVOID BLANK SCREEN
            setIsAnalyzing(false);
            setShowSectionSelector(true); // Go back to allow retry
            // Ensure we clear any partial garbage
            setReportHTML("");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerate = (newMessage: string) => {
        const newContext = `${userContext}\n\n[USER UPDATE]: ${newMessage}`;
        setUserContext(newContext);
        handleAnalysis(newContext);
    };

    const handleSaveCloud = async (overrideHTML?: string): Promise<number | null> => {
        // ALLOW SAVE IF USER IS LOGGED IN OR IF WE ARE EDITING AN EXISTING REPORT (ANONYMOUS EDIT)
        if (!user && !savedReportId) {
            alert("Inicia sesión para crear un nuevo reporte.");
            return null;
        }

        setIsSaving(true);
        try {
            const reportData: any = {
                domain: reportPayload?.projectName || "Reporte SEO",
                report_data: {
                    html: overrideHTML || reportHTML,
                    stats: reportPayload?.dashboardStats,
                    summary: "Resumen",
                    date_range: p2Name,
                    mode: usageMode
                },
                project_id: selectedProjectId ? parseInt(selectedProjectId) : null
            };

            // Only attach user_id if authenticated. 
            // If anonymous (editing shared report), we don't touch user_id.
            if (user) {
                reportData.user_id = user.id;
            }

            let currentId = savedReportId;

            if (currentId) {
                // Update existing
                const { error } = await supabase.from('seo_reports').update(reportData).eq('id', currentId);
                if (error) throw error;
            } else {
                // Insert new - Only authenticated users reach here
                reportData.created_at = new Date().toISOString();
                const { data, error } = await supabase.from('seo_reports').insert([reportData]).select().single();
                if (error) throw error;
                if (data) {
                    setSavedReportId(data.id);
                    currentId = data.id;
                }
            }

            setHasSaved(true);
            return currentId;
        } catch (e: any) {
            alert("Error: " + e.message);
            return null;
        } finally {
            setIsSaving(false);
        }
    };

    const handleShareClick = async () => {
        if (!savedReportId) {
            const id = await handleSaveCloud();
            if (id) setShowShareModal(true);
        } else {
            setShowShareModal(true);
        }
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
                            <DataConnectPanel onAnalyze={handleDataAnalyze} isLoading={gscLoading} initialSiteUrl={searchParams.get('url') || undefined} />
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

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    Modo de Operación
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {[
                                        { id: 'default', label: 'Oportunidades SEO', icon: '🚀', desc: 'Análisis IA + Gráficos' },
                                        { id: 'pitch', label: 'Pitch de Gráficos', icon: '📈', desc: 'Solo Visual. Carrusel.' },
                                        { id: 'achievements', label: 'Logros y Resultados', icon: '🏆', desc: 'Enfoque en Hazañas' }
                                    ].map((m) => (
                                        <button
                                            key={m.id}
                                            onClick={() => setUsageMode(m.id as UsageMode)}
                                            className={`p-4 rounded-xl border text-left transition-all ${usageMode === m.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            <div className="text-xl mb-1">{m.icon}</div>
                                            <div className={`font-bold text-sm ${usageMode === m.id ? 'text-indigo-900' : 'text-slate-700'}`}>{m.label}</div>
                                            <div className="text-[10px] text-slate-500 leading-tight mt-1">{m.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
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

                            {selectedGa4Property && (
                                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-lg">📊</div>
                                    <div>
                                        <div className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">GA4 Conectado</div>
                                        <div className="text-xs font-bold text-slate-700">{ga4Data.length > 0 ? `${ga4Data.length} registros de tráfico` : 'Esperando análisis...'}</div>
                                    </div>
                                </div>
                            )}
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
                <ReportView
                    htmlContent={reportHTML}
                    chartData={chartData!}
                    p1Name={p1Name}
                    p2Name={p2Name}
                    mode={usageMode}
                    onRegenerate={handleRegenerate}
                    isRegenerating={isAnalyzing}
                    dashboardStats={chartData?.dashboardStats}
                    logo={logo}
                    onSave={handleSaveCloud}
                    onShowHistory={() => setIsHistoryOpen(true)}
                    isSaving={isSaving}
                    hasSaved={hasSaved}
                    user={user}
                    taskPerformance={reportPayload?.taskPerformanceAnalysis || []}
                    decayAlerts={reportPayload?.keywordDecayAlerts}
                    concentrationAnalysis={reportPayload?.concentrationAnalysis}
                    selectedProjectId={selectedProjectId}
                    onSelectProject={setSelectedProjectId}
                    onDateRangeChange={(range) => {
                        console.log("Date range changed to:", range);
                        // In the future, this could trigger a re-fetching of GSC data for those ranges
                        // and re-running the analysis automatically.
                    }}
                    onShare={handleShareClick}
                />
            )}

            {step === 3 && !reportHTML && !isAnalyzing && !showSectionSelector && (
                <div className="flex flex-col items-center justify-center min-h-screen py-20 animate-fade-in">
                    <div className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 text-center max-w-lg">
                        <div className="text-6xl mb-6">🏜️</div>
                        <h2 className="text-2xl font-black text-slate-900 mb-4">Estado Inconsistente</h2>
                        <p className="text-slate-500 mb-8 font-medium">No se ha podido procesar el informe o los datos son insuficientes para generar una vista.</p>
                        <button onClick={() => setStep(1)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">Configurar de nuevo</button>
                    </div>
                </div>
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
