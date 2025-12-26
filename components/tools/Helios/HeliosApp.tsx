import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { GscService } from '../MetricsAnalyst/services/gscService';
import { Ga4Service } from '../MetricsAnalyst/services/ga4Service';
import { DataManager } from '../MetricsAnalyst/services/dataManager';
import { runFullLocalAnalysis } from '../MetricsAnalyst/services/analysisService';
import { analyzeWithHelios } from '../MetricsAnalyst/services/geminiService';
import { HeliosReport } from './types/heliosSchema';
import { ChartRenderer } from './components/ChartRenderer';
import { HeliosPitchDeck } from './components/HeliosPitchDeck';
import { Sparkles, BarChart2, Zap, AlertTriangle, Presentation, FileText, Loader2, ArrowRight } from 'lucide-react';
import ShareModal from '@/components/shared/ShareModal';

const HeliosApp: React.FC = () => {
    const { user, session } = useAuth();
    const [searchParams] = useSearchParams();

    // State
    const [status, setStatus] = useState<'idle' | 'loading' | 'analyzing' | 'ready' | 'pitch'>('idle');
    const [loadingMessage, setLoadingMessage] = useState("");
    const [report, setReport] = useState<HeliosReport | null>(null);
    const [selectedProject, setSelectedProject] = useState<{ id: string, name: string, url: string, ga4_id?: string } | null>(null);
    const [availableProjects, setAvailableProjects] = useState<any[]>([]);

    // Persistence State
    const [savedReportId, setSavedReportId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [sharingItem, setSharingItem] = useState<{ id: number, initialAccess: any, initialToken: any } | null>(null);

    // Load Projects & Existing Report on Mount
    useEffect(() => {
        const init = async () => {
            // 1. Fetch simplified project list
            const { data, error } = await supabase
                .from('projects')
                .select('id, name, gsc_property_url');

            if (error) console.error("Error fetching projects:", error);

            if (data) {
                const mapped = data.map(p => ({
                    id: p.id.toString(),
                    name: p.name,
                    url: p.gsc_property_url
                }));
                // @ts-ignore
                setAvailableProjects(mapped);

                // Auto-select if URL param exists
                const pId = searchParams.get('projectId');
                if (pId) {
                    const found = mapped.find(p => p.id === pId);
                    if (found) setSelectedProject(found);
                }
            }

            // 2. Check for Report ID to Load
            const rId = searchParams.get('reportId');
            if (rId) {
                setStatus('loading');
                setLoadingMessage("Cargando informe guardado...");
                try {
                    const { data: reportData, error } = await supabase
                        .from('seo_reports')
                        .select('*')
                        .eq('id', rId)
                        .single();

                    if (error) throw error;
                    if (reportData && reportData.report_data?.helios_data) {
                        setReport(reportData.report_data.helios_data);
                        setSavedReportId(reportData.id);

                        // Try to match project
                        if (reportData.project_id) {
                            // finding in the just fetched data might be async tricky if we rely on state
                            // so we use the fetched data logic
                        }
                        setSelectedProject({ id: String(reportData.project_id), name: reportData.domain, url: reportData.domain });
                        setStatus('ready');
                    } else {
                        // Fallback? Or Alert?
                        // If it's a legacy report, maybe warn?
                        console.warn("Informe no compatible con Helios o estructura antigua.");
                        alert("Este informe parece ser de una versión antigua o incompatible.");
                        setStatus('idle');
                    }
                } catch (e) {
                    console.error("Error loading report", e);
                    alert("Error cargando informe.");
                    setStatus('idle');
                }
            }
        };

        if (user) init();
    }, [user, searchParams]);

    const runAnalysis = async () => {
        if (!selectedProject || !session?.provider_token) return;

        setStatus('loading');
        setLoadingMessage("Conectando con Google Search Console...");

        try {
            // 1. Define Periods (Last 28 Days vs Previous Period)
            const endDate = new Date();
            endDate.setDate(endDate.getDate() - 3); // GSC latency
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - 28);

            const startP2 = startDate.toISOString().split('T')[0];
            const endP2 = endDate.toISOString().split('T')[0];

            // P1
            const endP1Date = new Date(startDate);
            endP1Date.setDate(endP1Date.getDate() - 1);
            const startP1Date = new Date(endP1Date);
            startP1Date.setDate(startP1Date.getDate() - 28);

            const startP1 = startP1Date.toISOString().split('T')[0];
            const endP1 = endP1Date.toISOString().split('T')[0];

            // 2. Fetch GSC Data
            const fetchDim = (s: string, e: string, dims: string[]) => GscService.getSearchAnalytics(selectedProject.url, s, e, dims);

            const [p1Pages, p1Queries, p1Countries, p2Pages, p2Queries, p2Countries] = await Promise.all([
                fetchDim(startP1, endP1, ['date', 'page']),
                fetchDim(startP1, endP1, ['date', 'query', 'page']),
                fetchDim(startP1, endP1, ['date', 'country']),
                fetchDim(startP2, endP2, ['date', 'page']),
                fetchDim(startP2, endP2, ['date', 'query', 'page']),
                fetchDim(startP2, endP2, ['date', 'country'])
            ]);

            setLoadingMessage("Analizando Patrones de IA y GA4...");

            // 3. Fetch GA4 (Optional)
            let ga4DataP1: any[] = [];
            let ga4DataP2: any[] = [];
            if (selectedProject.ga4_id) {
                try {
                    ga4DataP2 = await Ga4Service.getAiSessionDataByDate(selectedProject.ga4_id, startP2, endP2);
                    ga4DataP1 = await Ga4Service.getAiSessionDataByDate(selectedProject.ga4_id, startP1, endP1);
                } catch (e) {
                    console.warn("GA4 Fetch Failed", e);
                }
            }

            // 4. Run Local Math Analysis (DataProcessor via AnalysisService reuse)
            setLoadingMessage("Ejecutando Algoritmos de Helios...");

            // 4. Run Local Math Analysis (DataProcessor via AnalysisService reuse)
            setLoadingMessage("Ejecutando Algoritmos de Helios...");

            const { reportPayload } = runFullLocalAnalysis(
                {
                    pagesP1: p1Pages,
                    pagesP2: p2Pages,
                    queriesP1: p1Queries,
                    queriesP2: p2Queries,
                    countriesP1: p1Countries,
                    countriesP2: p2Countries,
                    ga4DataP1, ga4DataP2
                },
                `${startP1} - ${endP1}`,
                `${startP2} - ${endP2}`,
                "", // No user context yet
                (msg) => console.log(msg)
            );

            // 5. Fetch Tasks & Content Impact (Crucial for Helios Full)
            const { data: tasks } = await supabase.from('tasks')
                .select('*')
                .eq('project_id', selectedProject.id)
                .neq('status', 'draft')
                .order('completed_at', { ascending: false })
                .limit(10);

            if (tasks) {
                // Determine impact (simplified logic for now)
                reportPayload.taskImpactDetails = tasks;
            }

            // 6. Helios AI Analysis
            setStatus('analyzing');
            setLoadingMessage("Helios AI Generando Insights Estratégicos...");

            // Get API Key
            const { data: keys } = await supabase.from('user_api_keys').select('key_value').eq('provider', 'gemini').single();
            const apiKey = keys?.key_value;

            if (!apiKey) throw new Error("No Gemini API Key found.");

            const heliosReport = await analyzeWithHelios(
                reportPayload,
                'gemini-2.5-flash', // Use Flash for speed, or Gemma 3 if available
                [apiKey]
            );

            setReport(heliosReport);
            setStatus('ready');

        } catch (e: any) {
            alert("Error: " + e.message);
            setStatus('idle');
        }
    };

    const handleSave = async () => {
        if (!report || !selectedProject || !user) return;
        setIsSaving(true);
        try {
            const payload = {
                user_id: user.id,
                project_id: parseInt(selectedProject.id),
                domain: selectedProject.url,
                report_type: 'helios',
                report_data: {
                    helios_data: report,
                    summary: report.executiveSummary,
                    mode: 'helios',
                    date: new Date().toISOString()
                },
                // Add description for list views
                description: "Helios Analysis: " + report.executiveSummary.substring(0, 100) + "..."
            };

            let rId = savedReportId;
            if (savedReportId) {
                const { error } = await supabase.from('seo_reports').update(payload).eq('id', savedReportId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('seo_reports').insert([payload]).select().single();
                if (error) throw error;
                if (data) {
                    setSavedReportId(data.id);
                    rId = data.id;
                }
            }
            alert("Informe guardado correctamente.");
        } catch (e: any) {
            alert("Error al guardar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleShare = async () => {
        if (!savedReportId) {
            alert("Debes guardar el informe primero.");
            await handleSave();
            if (!savedReportId) return;
        }

        const { data } = await supabase.from('seo_reports').select('share_token, public_access_level').eq('id', savedReportId).single();

        setSharingItem({
            id: savedReportId!,
            initialAccess: data?.public_access_level,
            initialToken: data?.share_token
        });
        setShowShareModal(true);
    };

    // --- RENDER HELPERS ---

    if (status === 'pitch' && report) {
        return <HeliosPitchDeck report={report} onClose={() => setStatus('ready')} />;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white pb-20">
            {/* Share Modal */}
            {showShareModal && sharingItem && (
                // @ts-ignore
                <ShareModal
                    isOpen={true}
                    itemId={sharingItem.id}
                    itemType="report"
                    initialPublicAccess={sharingItem.initialAccess}
                    initialShareToken={sharingItem.initialToken}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {/* HERITAGE HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">Helios <span className="text-slate-400 font-normal">Intelligence</span></h1>
                    </div>
                    {status === 'ready' && (
                        <div className="flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                {savedReportId ? 'Guardado' : 'Guardar'}
                            </button>
                            <button
                                onClick={handleShare}
                                className="px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                            >
                                <Zap className="w-4 h-4" />
                                Compartir
                            </button>
                            <div className="h-6 w-px bg-slate-200 mx-2"></div>
                            <button onClick={() => setStatus('pitch')} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                                <Presentation className="w-4 h-4" />
                                Modo Pitch
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 pt-12">

                {/* IDLE STATE: PROJECT SELECTOR */}
                {status === 'idle' && (
                    <div className="max-w-2xl mx-auto text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="w-24 h-24 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-indigo-200 mb-8">
                            <Zap className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">
                            Desbloquea tu <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">ADN SEO</span>
                        </h2>
                        <p className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto">
                            Helios analiza patrones algorítmicos invisibles para detectar oportunidades de ingresos y riesgos críticos antes que nadie.
                        </p>

                        <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 flex items-center gap-2 max-w-sm mx-auto">
                            <select
                                className="flex-1 bg-transparent border-none outline-none p-3 text-sm font-bold text-slate-700"
                                onChange={(e) => {
                                    const p = availableProjects.find(pr => pr.id === e.target.value);
                                    setSelectedProject(p || null);
                                }}
                                value={selectedProject?.id || ''}
                            >
                                <option value="">Selecciona un Proyecto...</option>
                                {availableProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={runAnalysis}
                                disabled={!selectedProject}
                                className="bg-black text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                            >
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* LOADING STATE */}
                {(status === 'loading' || status === 'analyzing') && (
                    <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-in fade-in duration-500">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-xl font-medium text-slate-600 animate-pulse">{loadingMessage}</p>
                    </div>
                )}

                {/* READY STATE: DASHBOARD */}
                {status === 'ready' && report && (
                    <div className="space-y-12 animate-in fade-in duration-700">

                        {/* Executive Summary */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-4">Resumen Ejecutivo</h3>
                            <p className="text-2xl font-light text-slate-800 leading-relaxed max-w-4xl relative z-10">
                                {report.executiveSummary || "Análisis completado. Revise los módulos a continuación."}
                            </p>
                        </div>

                        {/* Module Grid */}
                        <div className="grid grid-cols-1 gap-12">
                            {report.sections?.map((section: any, idx: number) => (
                                <div key={idx} className="group">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center text-sm font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                {idx + 1}
                                            </span>
                                            {section.title}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Text Content */}
                                        <div className="space-y-6">
                                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm leading-relaxed text-slate-600">
                                                {section.summary}
                                                {section.bullets && (
                                                    <ul className="mt-4 space-y-2">
                                                        {section.bullets.map((b: string, i: number) => (
                                                            <li key={i} className="flex gap-2">
                                                                <span className="text-indigo-500">•</span> {b}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>

                                        {/* Charts */}
                                        <div className="space-y-6">
                                            {section.charts?.map((chart: any, cIdx: number) => (
                                                <div key={cIdx} className="bg-white p-2 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                                    <ChartRenderer config={chart} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default HeliosApp;
