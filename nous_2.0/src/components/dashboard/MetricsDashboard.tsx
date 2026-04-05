'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { MetricsService } from '@/lib/services/metrics';
import { GscDailyMetric, MetricSummary } from '@/types/metrics';
import { MetricCard } from './MetricCard';
import { MetricsChart } from './MetricsChart';
import { LineChart, BarChart3, TrendingUp, Search, Sparkles, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { aiRouter } from '@/lib/ai/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/useAppStore';
import { AdvancedMetricsChart } from './AdvancedMetricsChart';

export default function MetricsDashboard() {
    const { activeProject } = useProjectStore();
    const { neuralLinkStatus, setNeuralTrend } = useAppStore();
    const [metrics, setMetrics] = useState<GscDailyMetric[]>([]);
    const [summary, setSummary] = useState<MetricSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [insight, setInsight] = useState<string>('');
    const [isThinking, setIsThinking] = useState(false);
    const [potentialData, setPotentialData] = useState<any[]>([]);
    const [isCalculatingPotential, setIsCalculatingPotential] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Buenos días";
        if (hour < 19) return "Buenas tardes";
        return "Buenas noches";
    };

    useEffect(() => {
        if (activeProject) {
            loadMetrics(activeProject.id);
        }
    }, [activeProject]);

    const loadMetrics = async (projectId: string) => {
        setLoading(true);
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const data = await MetricsService.getDailyMetrics(projectId, startDate, endDate);
            setMetrics(data);
            const sum = MetricsService.calculateSummary(data);
            setSummary(sum);

            if (data.length > 7) {
                const current = data[data.length - 1].clicks;
                const previous = data[data.length - 7].clicks;
                setNeuralTrend(current > previous ? 'up' : current < previous ? 'down' : 'neutral');
            }

            generateInsight(sum, data);
            calculateNeuralPotential(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const calculateNeuralPotential = async (gscData: GscDailyMetric[]) => {
        if (!activeProject || gscData.length === 0) return;
        setIsCalculatingPotential(true);
        try {
            const topKeywords = gscData[gscData.length - 1]?.top_queries?.slice(0, 3).map(q => q.term) || [];
            if (topKeywords.length === 0) {
                setPotentialData([]);
                return;
            }

            const res = await fetch('/api/dataforseo/keywords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: topKeywords })
            });
            const result = await res.json();

            const totalVol = result.data?.reduce((acc: number, cur: any) => acc + (cur.search_volume || 0), 0) || 0;

            const scaledPotential = gscData.map(d => ({
                ...d,
                potential: totalVol / 30,
                reality: d.clicks
            }));

            setPotentialData(scaledPotential);
        } catch (e) {
            console.error("Neural Potential Error:", e);
        } finally {
            setIsCalculatingPotential(false);
        }
    };

    const generateInsight = async (sum: MetricSummary, daily: GscDailyMetric[]) => {
        if (insight) return;
        setIsThinking(true);
        try {
            const prompt = `Analiza brevemente (1 frase impacto) estos datos SEO de los últimos 30 días:
            Clicks: ${sum.totalClicks}, Impr: ${sum.totalImpressions}, CTR: ${sum.avgCtr}%, Pos: ${sum.avgPosition}.
            Tendencia: ${daily.length > 7 ? (daily[daily.length - 1].clicks > daily[daily.length - 7].clicks ? 'Creciente' : 'Decreciente') : 'Estable'}.
            Resumen directo y estratégico.`;

            const res = await aiRouter.generate({
                model: 'llama-3.3-70b-specdec',
                prompt,
                systemPrompt: "Eres Nous, una IA de lujo experta en estrategia SEO de alto rendimiento. Habla como un estratega senior, directo y sofisticado.",
                temperature: 0.5
            });
            setInsight(res.text);
        } catch (e) {
            setInsight("Patrones neuronales estables. Monitoreo activado.");
        } finally {
            setIsThinking(false);
        }
    };

    if (!activeProject) return (
        <div className="flex items-center justify-center p-20 text-slate-400">
            <p className="text-xl font-bold uppercase tracking-widest animate-pulse">Select a Project to Initialize Neural Link</p>
        </div>
    );

    return (
        <div className="w-full h-full p-8 overflow-y-auto">
            <div className="flex justify-between items-start mb-8 relative">
                <div className="relative z-10">
                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.4em] mb-2">
                        {getGreeting()}, Simon
                    </h4>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 mb-2">
                        Metrics <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Overview</span>
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                        Search Console • {activeProject.domain} • {metrics.length} Días
                    </p>
                </div>

                <AnimatePresence>
                    {insight && (
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="max-w-md p-4 bg-white/40 backdrop-blur-xl border border-cyan-100 rounded-lg shadow-xl shadow-cyan-500/5 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500" />
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles size={12} className="text-cyan-500" />
                                <span className="text-[9px] font-black text-cyan-500 uppercase tracking-widest">Neural Insight</span>
                                {isThinking && <Loader2 size={10} className="animate-spin text-cyan-400" />}
                            </div>
                            <p className="text-[12px] font-bold text-slate-700 leading-tight italic">
                                "{insight}"
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-300/20 blur-[100px] rounded-full pointer-events-none" />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-40 bg-slate-100 rounded-lg" />)}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <MetricCard
                            title="Total Clicks"
                            value={summary?.totalClicks?.toLocaleString() || '0'}
                            icon={TrendingUp}
                            color="cyan"
                            trend={12.5}
                        />
                        <MetricCard
                            title="Total Impressions"
                            value={summary?.totalImpressions?.toLocaleString() || '0'}
                            icon={BarChart3}
                            color="purple"
                            trend={-2.3}
                        />
                        <MetricCard
                            title="Avg CTR"
                            value={`${summary?.avgCtr || 0}%`}
                            icon={LineChart}
                            color="emerald"
                        />
                        <MetricCard
                            title="Avg Position"
                            value={summary?.avgPosition || '0'}
                            icon={Search}
                            color="orange"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 p-8 bg-white rounded-[40px] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Traffic Trend</h3>
                                <div className="flex gap-2">
                                    <span className="w-3 h-3 rounded-full bg-cyan-400" />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Clicks</span>
                                </div>
                            </div>
                            <div className="h-[300px]">
                                <MetricsChart data={metrics} dataKey="clicks" color="#22d3ee" height={300} />
                            </div>
                        </div>

                        <div className="p-8 bg-slate-900 text-white rounded-[40px] shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">Impressions</h3>
                            <div className="h-[200px] relative z-10">
                                <MetricsChart data={metrics} dataKey="impressions" color="#a78bfa" height={200} />
                            </div>
                            <div className="mt-6 relative z-10">
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Top Query</p>
                                <p className="text-lg font-bold text-white truncate">
                                    {metrics[metrics.length - 1]?.top_queries?.[0]?.term || 'No data'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-10 bg-white rounded-[40px] shadow-2xl shadow-cyan-900/5 border border-cyan-50/50 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500" />

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Neural <span className="text-cyan-500">Efficiency</span> Score</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Realidad (GSC) vs Potencial de Mercado (DataForSEO)</p>
                            </div>

                            <div className="flex gap-4">
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Gap de Captura</p>
                                    <p className="text-xl font-black text-slate-900">
                                        {potentialData.length > 0 ? (
                                            Math.round((summary?.totalClicks || 0) / (potentialData[0].potential * 30) * 100)
                                        ) : '0'}%
                                    </p>
                                </div>
                                <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-lg">
                                    <p className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-1">Estado Neural</p>
                                    <p className="text-xl font-black text-cyan-600 uppercase italic">
                                        {neuralLinkStatus === 'connected' ? 'Optimizado' : 'Analizando'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="h-[400px]">
                            {isCalculatingPotential ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-cyan-500">
                                    <Loader2 size={40} className="animate-spin" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Calculando Vectores de Potencial...</span>
                                </div>
                            ) : (
                                <AdvancedMetricsChart
                                    data={potentialData.length > 0 ? potentialData : metrics.map(m => ({ ...m, reality: m.clicks, potential: (m.clicks * 1.5) }))}
                                    series={[
                                        { key: 'reality', color: '#06b6d4', label: 'Tráfico Real' },
                                        { key: 'potential', color: '#94a3b8', label: 'Potencial de Mercado', dashed: true }
                                    ]}
                                    height={400}
                                />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
