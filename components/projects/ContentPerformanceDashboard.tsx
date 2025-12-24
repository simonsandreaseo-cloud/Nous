
import React, { useState, useEffect, useRef } from 'react';
import { Project, Task } from '../../lib/task_manager';
import { GscService } from '../../services/gscService';
import {
    BarChart3,
    ArrowUp,
    ArrowDown,
    Search,
    MousePointer2,
    Eye,
    Hash,
    Calendar,
    X,
    Filter,
    ArrowRight
} from 'lucide-react';
import Chart from 'chart.js/auto';

interface ContentPerformanceDashboardProps {
    project: Project;
    tasks: Task[];
}

interface MonthlyMetric {
    month: Date;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    changeClicks: number;
    changeImpressions: number;
    changePosition: number;
    changeKeywords: number;
    keywordsCount: number;
}

export const ContentPerformanceDashboard: React.FC<ContentPerformanceDashboardProps> = ({ project, tasks }) => {
    // Generate valid months (e.g. last 12 months + current)
    const [months, setMonths] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);
    const [metricsByMonth, setMetricsByMonth] = useState<Record<string, MonthlyMetric>>({});

    useEffect(() => {
        // Generate last 12 months
        const result = [];
        const today = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            result.push(d);
        }
        setMonths(result);
        fetchOverviewMetrics(result);
    }, [project.id]);

    const fetchOverviewMetrics = async (monthsList: Date[]) => {
        setLoading(true);
        const metrics: Record<string, MonthlyMetric> = {};

        // In a real scenario we would batch this or use a more efficient query
        // For now we simulate or fetch simple totals if available in local DB
        // If local DB doesn't have aggregated monthly, we might fallback to generic estimates or fetch on demand
        // To be fast, let's try to fetch from local GSC daily metrics

        try {
            // We fetch a wide range from DB
            const end = new Date();
            const start = new Date(end.getFullYear() - 1, end.getMonth(), 1);

            const rows = await GscService.getLocalAnalytics(
                project.id.toString(),
                start.toISOString().split('T')[0],
                end.toISOString().split('T')[0]
            );

            // Group by month
            monthsList.forEach(m => {
                const monthKey = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
                // Filter rows for this month
                const monthRows = rows.filter(r => r.date.startsWith(monthKey));

                // Previous month for comparison
                const prevDate = new Date(m.getFullYear(), m.getMonth() - 1, 1);
                const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
                const prevRows = rows.filter(r => r.date.startsWith(prevKey));

                const agg = (rs: any[]) => ({
                    clicks: rs.reduce((sum, r) => sum + (r.clicks || 0), 0),
                    impressions: rs.reduce((sum, r) => sum + (r.impressions || 0), 0),
                    position: rs.length ? rs.reduce((sum, r) => sum + (r.position || 0), 0) / rs.length : 0,
                    // Unique keywords approximation (sum of unique per day is wrong, but stored is daily top_queries)
                    // We can't easily count unique keywords from daily aggregates without expanding the json arrays.
                    // For overview card, maybe we just sum clicks/imp.
                    keywords: 0 // Placeholder
                });

                const current = agg(monthRows);
                const previous = agg(prevRows);

                metrics[monthKey] = {
                    month: m,
                    clicks: current.clicks,
                    impressions: current.impressions,
                    ctr: current.impressions ? current.clicks / current.impressions : 0,
                    position: current.position,
                    changeClicks: current.clicks - previous.clicks,
                    changeImpressions: current.impressions - previous.impressions,
                    changePosition: current.position - previous.position,
                    changeKeywords: 0,
                    keywordsCount: 0
                };
            });
            setMetricsByMonth(metrics);
        } catch (e) {
            console.error("Error fetching overview", e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="text-brand-power" /> Dashboard de Rendimiento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {months.map(month => {
                    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                    const data = metricsByMonth[key];
                    const monthName = month.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

                    return (
                        <div
                            key={key}
                            onClick={() => setSelectedMonth(month)}
                            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-bold text-slate-700 capitalize">{monthName}</h4>
                                <div className="p-1.5 bg-brand-soft/10 text-brand-power rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ArrowRight size={14} />
                                </div>
                            </div>

                            {data ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Clics</p>
                                            <p className="text-xl font-bold text-slate-800">{data.clicks.toLocaleString()}</p>
                                        </div>
                                        <div className={`text-xs font-bold flex items-center ${data.changeClicks >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {data.changeClicks > 0 ? '+' : ''}{data.changeClicks.toLocaleString()}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Impresiones</p>
                                            <p className="text-sm font-bold text-slate-600">{data.impressions.toLocaleString()}</p>
                                        </div>
                                        <div className={`text-[10px] font-bold flex items-center ${data.changeImpressions >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {data.changeImpressions > 0 ? '+' : ''}{data.changeImpressions.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-20 animate-pulse bg-slate-50 rounded-lg"></div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedMonth && (
                <PerformanceModal
                    project={project}
                    tasks={tasks}
                    month={selectedMonth}
                    onClose={() => setSelectedMonth(null)}
                />
            )}
        </div>
    );
};

// --- Modal & Details Components ---

interface PerformanceModalProps {
    project: Project;
    tasks: Task[];
    month: Date;
    onClose: () => void;
}

const PerformanceModal: React.FC<PerformanceModalProps> = ({ project, tasks, month, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        urlMetrics: any[];
        keywordMetrics: any[];
        timeline: any[];
    } | null>(null);
    const [filteredKeywordMetrics, setFilteredKeywordMetrics] = useState<any[] | null>(null);
    const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
    const [keywordsLoading, setKeywordsLoading] = useState(false);

    const monthName = month.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

    // Identify Content Group for this month
    const contentGroupUrls = React.useMemo(() => {
        return tasks
            .filter(t => {
                if (!t.due_date) return false;
                const d = new Date(t.due_date);
                return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
            })
            .map(t => t.secondary_url)
            .filter(Boolean) as string[];
    }, [tasks, month]);

    useEffect(() => {
        fetchDetailedMetrics();
    }, [month]);

    const fetchDetailedMetrics = async () => {
        setLoading(true);
        try {
            // Dates
            const year = month.getFullYear();
            const m = month.getMonth();
            const start = new Date(year, m, 1);
            const end = new Date(year, m + 1, 0);

            const fmt = (d: Date) => d.toISOString().split('T')[0];

            // 1. Get Top Pages for the month (filtered by content group if possible, or filter post-fetch)
            // Note: GSC API allows page filter. If contentGroupUrls is not empty, use it.
            // If empty, user might have wanted "All content". But requirement says "Prefiltered for content group".
            // If there is NO content scheduled, maybe show all? Or show empty? 
            // Better to show all if group is empty, or show notice. 
            // User: "Las keywords estarán prefiltradas para el grupo de contenidos"
            // Let's assume if we have URLs, use them.

            const regexFilter = contentGroupUrls.length > 0
                ? contentGroupUrls.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
                : undefined;

            // Fetch from GSC Service (needs to support fetching rows directly or use local DB)
            // GscService.getSearchAnalytics returns row objects.

            // We need daily breakdown for sparklines, implying we need 'date' dimension always.
            // Plus 'page' and 'query'.
            // High granularity fetch might be heavy. 
            // Strategy: 
            // 1. Fetch Pages stats (aggregated) -> Dimension ['page']
            // 2. Fetch Query stats (aggregated) -> Dimension ['query']
            // 3. For sparklines, we might fetch 'date' dimension for the selected Items or simplified globally.
            // But user wants "En cada fila agrega graficos de linea temporal". That's heavy.
            // We can fetch ['date', 'page'] and ['date', 'query'].

            const filter = regexFilter ? { page: regexFilter, operator: 'includingRegex' as const } : undefined;

            const [pageRows, queryRows, prevPageRows, prevQueryRows] = await Promise.all([
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['page', 'date'], filter),
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['query', 'date'], filter),
                // Previous month for change calculation (aggregate only)
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(new Date(year, m - 1, 1)), fmt(new Date(year, m - 1, 0)), ['page'], filter),
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(new Date(year, m - 1, 1)), fmt(new Date(year, m - 1, 0)), ['query'], filter),
            ]);

            // Process Pages
            const pagesMap = new Map();
            pageRows.forEach((r: any) => {
                const url = r.keys[0];
                const date = r.keys[1];
                if (!pagesMap.has(url)) pagesMap.set(url, {
                    url, clicks: 0, impressions: 0, positionSum: 0, count: 0,
                    timeline: new Array(end.getDate()).fill(0), // Simple click timeline
                    keywordCount: 0 // Need to cross reference? Only rough estimate or separate fetch
                });
                const entry = pagesMap.get(url);
                entry.clicks += r.clicks;
                entry.impressions += r.impressions;
                entry.positionSum += r.position;
                entry.count += 1;

                const day = new Date(date).getDate() - 1;
                if (day >= 0 && day < entry.timeline.length) entry.timeline[day] = r.clicks;
            });

            // Process Queries
            const queriesMap = new Map();
            queryRows.forEach((r: any) => {
                const term = r.keys[0];
                const date = r.keys[1];
                if (!queriesMap.has(term)) queriesMap.set(term, {
                    term, clicks: 0, impressions: 0, positionSum: 0, count: 0,
                    timeline: new Array(end.getDate()).fill(0)
                });
                const entry = queriesMap.get(term);
                entry.clicks += r.clicks;
                entry.impressions += r.impressions;
                entry.positionSum += r.position;
                entry.count += 1;
                const day = new Date(date).getDate() - 1;
                if (day >= 0 && day < entry.timeline.length) entry.timeline[day] = r.clicks;
            });

            // Calculate deltas
            // Helper to find prev metrics
            const getPrev = (arr: any[], keyIndex: number, keyVal: string) => {
                const found = arr.find(x => x.keys[keyIndex] === keyVal);
                return found || { clicks: 0, impressions: 0, position: 0 };
            };

            const urlMetrics = Array.from(pagesMap.values()).map(p => {
                const prev = getPrev(prevPageRows, 0, p.url);
                return {
                    ...p,
                    position: p.positionSum / p.count,
                    changeClicks: p.clicks - prev.clicks,
                    changeImpressions: p.impressions - prev.impressions,
                    changePosition: (p.positionSum / p.count) - prev.position
                };
            }).sort((a, b) => b.clicks - a.clicks);

            const keywordMetrics = Array.from(queriesMap.values()).map(q => {
                const prev = getPrev(prevQueryRows, 0, q.term);
                return {
                    ...q,
                    position: q.positionSum / q.count,
                    changeClicks: q.clicks - prev.clicks,
                    changeImpressions: q.impressions - prev.impressions,
                    changePosition: (q.positionSum / q.count) - prev.position
                };
            }).sort((a, b) => b.clicks - a.clicks);

            setData({ urlMetrics, keywordMetrics, timeline: [] });

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Derived Keywords (filtered by selected URL)
    // To filter queries by URL properly we actually need ['query', 'page', 'date'] dimension combo in one of the fetches,
    // OR fetch on demand when URL is clicked.
    // Fetching ['query', 'page', 'date'] is VERY heavy (cardinality explosion).
    // Better: When URL is selected, fetch keywords for that URL specifically.
    // Initial "Keyword metrics" table (when no URL selected) shows top keywords for the whole content group.

    // Derived Keywords (filtered by selected URL)
    useEffect(() => {
        if (!selectedUrl) {
            setFilteredKeywordMetrics(null);
            return;
        }
        fetchKeywordsForUrl(selectedUrl);
    }, [selectedUrl]);

    const fetchKeywordsForUrl = async (url: string) => {
        setKeywordsLoading(true);
        const year = month.getFullYear();
        const m = month.getMonth();
        const start = new Date(year, m, 1);
        const end = new Date(year, m + 1, 0);
        const fmt = (d: Date) => d.toISOString().split('T')[0];

        try {
            // Fetch Current Month: Keywords for this Page
            const [qRowsDate, qRowsTotals, prevQRowsTotals] = await Promise.all([
                // Date breakdown for sparklines
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['query', 'date'], { page: url, operator: 'equals' }),
                // Totals for metrics
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['query'], { page: url, operator: 'equals' }),
                // Prev Month Totals for comparison
                GscService.getSearchAnalytics(project.gsc_property_url!, fmt(new Date(year, m - 1, 1)), fmt(new Date(year, m - 1, 0)), ['query'], { page: url, operator: 'equals' })
            ]);

            const queriesMap = new Map();
            // 1. Process Totals
            qRowsTotals.forEach((r: any) => {
                const term = r.keys[0];
                queriesMap.set(term, {
                    term,
                    clicks: r.clicks,
                    impressions: r.impressions,
                    position: r.position,
                    timeline: new Array(end.getDate()).fill(0)
                });
            });

            // 2. Fill Timeline
            qRowsDate.forEach((r: any) => {
                const term = r.keys[0];
                const date = r.keys[1];
                const day = new Date(date).getDate() - 1;
                if (queriesMap.has(term)) {
                    const entry = queriesMap.get(term);
                    if (day >= 0 && day < entry.timeline.length) entry.timeline[day] = r.clicks;
                }
            });

            // 3. Process Deltas
            const results = Array.from(queriesMap.values()).map(q => {
                const prev = prevQRowsTotals.find((x: any) => x.keys[0] === q.term) || { clicks: 0, impressions: 0, position: 0 };
                return {
                    ...q,
                    changeClicks: q.clicks - prev.clicks,
                    changeImpressions: q.impressions - prev.impressions,
                    changePosition: q.position - prev.position
                };
            }).sort((a, b) => b.clicks - a.clicks);

            setFilteredKeywordMetrics(results);

        } catch (e) {
            console.error("Error fetching filtered keywords", e);
        } finally {
            setKeywordsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-lg text-slate-800">Rendimiento: {monthName}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
                    {loading || !data ? (
                        <div className="flex justify-center items-center h-full">Cargando métricas...</div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                            {/* URLs Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between">
                                    <span>Páginas (URLs)</span>
                                    <span className="text-xs text-slate-400 font-normal">
                                        {contentGroupUrls.length > 0 ? 'Filtrado por contenido del mes' : 'Todas las páginas'}
                                    </span>
                                </div>
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-slate-50 text-slate-500 font-semibold uppercase">
                                            <tr>
                                                <th className="p-3">URL</th>
                                                <th className="p-3 text-right">Clics</th>
                                                <th className="p-3 text-right">Imp.</th>
                                                <th className="p-3 text-right">Pos.</th>
                                                <th className="p-3 w-24">Tendencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {data.urlMetrics.map((row: any) => (
                                                <tr
                                                    key={row.url}
                                                    onClick={() => setSelectedUrl(row.url === selectedUrl ? null : row.url)}
                                                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedUrl === row.url ? 'bg-indigo-50/50 ring-1 ring-indigo-500/20' : ''}`}
                                                >
                                                    <td className="p-3 max-w-[200px] truncate" title={row.url}>{row.url}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="font-bold text-slate-700">{row.clicks.toLocaleString()}</div>
                                                        <div className={`text-[10px] ${row.changeClicks >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {row.changeClicks > 0 ? '+' : ''}{row.changeClicks}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <div className="text-slate-600">{row.impressions.toLocaleString()}</div>
                                                        <span className="text-[9px] text-slate-400">
                                                            {/* Calculate % change relative to PREV value (imp - change = prev) (if (imp-change) > 0) */}
                                                            {(() => {
                                                                const prevObj = row.impressions - row.changeImpressions;
                                                                if (prevObj <= 0) return '(New)';
                                                                const pct = (row.changeImpressions / prevObj) * 100;
                                                                return `(${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`;
                                                            })()}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-right font-mono">{row.position.toFixed(1)}</td>
                                                    <td className="p-3">
                                                        <SparkLine data={row.timeline} color="#6366f1" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Keywords Table */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 flex justify-between">
                                    <span>Palabras Clave</span>
                                    {selectedUrl && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full truncate max-w-[150px]">
                                                {selectedUrl}
                                            </span>
                                            <button onClick={() => setSelectedUrl(null)} className="text-slate-400 hover:text-slate-600"><X size={12} /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 bg-slate-50 text-slate-500 font-semibold uppercase">
                                            <tr>
                                                <th className="p-3">Keyword</th>
                                                <th className="p-3 text-right">Clics</th>
                                                <th className="p-3 text-right">Imp.</th>
                                                <th className="p-3 text-right">Pos.</th>
                                                <th className="p-3 w-24">Tendencia</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Render filtered Keywords if available, else global */}
                                            {keywordsLoading ? (
                                                <tr><td colSpan={5} className="p-10 text-center text-slate-400">Cargando keywords filtradas...</td></tr>
                                            ) : (filteredKeywordMetrics || data.keywordMetrics).map((row: any) => (
                                                <tr key={row.term} className="hover:bg-slate-50">
                                                    <td className="p-3 font-medium text-slate-700">{row.term}</td>
                                                    <td className="p-3 text-right">
                                                        <div className="font-bold text-slate-700">{row.clicks.toLocaleString()}</div>
                                                        <div className={`text-[10px] ${row.changeClicks >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {row.changeClicks > 0 ? '+' : ''}{row.changeClicks}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-right">{row.impressions.toLocaleString()}</td>
                                                    <td className="p-3 text-right font-mono">{row.position.toFixed(1)}</td>
                                                    <td className="p-3">
                                                        <SparkLine data={row.timeline} color="#10b981" />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- SparkLine Component ---
const SparkLine = ({ data, color }: { data: number[], color: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !data) return;

        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        chartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data,
                    borderColor: color,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false, min: 0 }
                },
                layout: { padding: 0 }
            }
        });

        return () => {
            if (chartRef.current) chartRef.current.destroy();
        };
    }, [data, color]);

    return (
        <div className="h-8 w-20">
            <canvas ref={canvasRef} />
        </div>
    );
};
