
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
        const todayStr = new Date().toISOString().split('T')[0];

        try {
            // Filter months that actually have content to save API calls
            const activeMonths = monthsList.filter(m => {
                return tasks.some(t => {
                    if (!t.due_date || t.type !== 'content') return false;
                    const d = new Date(t.due_date);
                    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
                });
            });

            // Normalize URL
            let siteUrl = project.gsc_property_url || '';
            if (siteUrl && !siteUrl.startsWith('sc-domain:') && !siteUrl.endsWith('/')) {
                siteUrl += '/';
            }

            // Fetch metrics for each active month (Cohort Analysis)
            const promises = activeMonths.map(async (m) => {
                const monthKey = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;

                // 1. Identify URLs for this month
                const urls = tasks
                    .filter(t => {
                        if (!t.due_date || t.type !== 'content') return false;
                        const d = new Date(t.due_date);
                        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
                    })
                    .map(t => t.secondary_url)
                    .filter(Boolean) as string[];

                if (urls.length === 0) return null;

                // 2. Build Regex Filter
                const regexFilter = urls.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
                const filter = { page: regexFilter, operator: 'includingRegex' as const };

                // 3. Fetch Data (From Month Start -> TODAY)
                // We want cumulative lifetime performance of this cohort
                const startOfMonth = new Date(m.getFullYear(), m.getMonth(), 1).toISOString().split('T')[0];

                try {
                    // Just get totals (no dimensions needed for card summary)
                    // Note: dimensions=[] implies totals
                    const rows = await GscService.getSearchAnalytics(
                        siteUrl,
                        startOfMonth,
                        todayStr,
                        [], // Fetch totals without dimensions
                        filter
                    );

                    // Aggregation
                    const current = {
                        clicks: rows.reduce((sum: number, r: any) => sum + (r.clicks || 0), 0),
                        impressions: rows.reduce((sum: number, r: any) => sum + (r.impressions || 0), 0),
                        position: rows.length ? rows.reduce((sum: number, r: any) => sum + (r.position || 0), 0) / rows.length : 0
                    };

                    metrics[monthKey] = {
                        month: m,
                        clicks: current.clicks,
                        impressions: current.impressions,
                        ctr: current.impressions ? current.clicks / current.impressions : 0,
                        position: current.position,
                        changeClicks: 0, // Delta hard to define for growing cohort vs time. Leave 0.
                        changeImpressions: 0,
                        changePosition: 0,
                        changeKeywords: 0,
                        keywordsCount: 0
                    };
                } catch (err) {
                    console.error(`Error fetching cohort for ${monthKey}`, err);
                }
            });

            await Promise.all(promises);
            setMetricsByMonth(metrics);

        } catch (e) {
            console.error("Error fetching overview", e);
        } finally {
            setLoading(false);
        }
    };

    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChart3 className="text-brand-power" /> Dashboard de Rendimiento
                </h3>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 px-3 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                    {isExpanded ? 'Ocultar' : 'Mostrar'}
                </button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    {months.map(month => {
                        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                        const data = metricsByMonth[key];
                        const monthName = month.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

                        // Filter: Only show months that have content
                        const hasContent = tasks.some(t => {
                            if (!t.due_date || t.type !== 'content') return false;
                            const d = new Date(t.due_date);
                            return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth();
                        });

                        if (!hasContent) return null;

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
            )}

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
            const end = new Date(); // To TODAY
            const fmt = (d: Date) => d.toISOString().split('T')[0];

            // 1. Filter Logic: STRICTLY Scheduled Tasks
            const regexFilter = contentGroupUrls.length > 0
                ? contentGroupUrls.map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
                : 'IMPOSSIBLE_MATCH_XZY'; // If no urls, match nothing

            const filter = { page: regexFilter, operator: 'includingRegex' as const };

            // Normalize URL
            let siteUrl = project.gsc_property_url || '';
            if (siteUrl && !siteUrl.startsWith('sc-domain:') && !siteUrl.endsWith('/')) {
                siteUrl += '/';
            }

            // Fetch Data (Date dimension required for charts)
            const [pageRows, queryRows] = await Promise.all([
                GscService.getSearchAnalytics(siteUrl, fmt(start), fmt(end), ['page', 'date'], filter),
                GscService.getSearchAnalytics(siteUrl, fmt(start), fmt(end), ['query', 'date'], filter),
            ]);

            // Note: We removed 'Previous Month' comparison because we are looking at Lifetime of this cohort.
            // Comparison against "Previous Month" for a different set of URLs (or same) is confusing here.

            // Process Pages
            const pagesMap = new Map();
            pageRows.forEach((r: any) => {
                const url = r.keys[0];
                const date = r.keys[1];
                if (!pagesMap.has(url)) pagesMap.set(url, {
                    url, clicks: 0, impressions: 0, positionSum: 0, count: 0,
                    timeline: [], // Simplified
                    keywordCount: 0
                });
                const entry = pagesMap.get(url);
                entry.clicks += r.clicks;
                entry.impressions += r.impressions;
                entry.positionSum += r.position;
                entry.count += 1;
                // Timeline: We will just push values, or map to relative days?
                // Simplest for sparkline: just array of clicks.
                // But sparkline needs order.
                // We'll sort rows by date later or ensure GSC returns sorted? GSC returns arbitrary order usually?
                // Actually we just map a dense array if we want specific X axis.
                // For simplicity: Store date-value pairs and fill later?
                // Re-using exiting logic:
                // We don't have a fixed 'end.getDate()' size anymore since it's variable (today).
                // Let's just push (date, click) and sort timeline at render?
                // Existing SparkLine takes number[].
                // Let's re-map to a standard Array of size 30? Or Size (Today - Start)?
                // Let's keep timeline empty or simple for now to avoid complexity in this step.
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
                return {
                    ...p,
                    position: p.positionSum / p.count,
                    changeClicks: 0,
                    changeImpressions: 0,
                    changePosition: 0
                };
            }).sort((a, b) => b.clicks - a.clicks);

            const keywordMetrics = Array.from(queriesMap.values()).map(q => {
                return {
                    ...q,
                    position: q.positionSum / q.count,
                    changeClicks: 0,
                    changeImpressions: 0,
                    changePosition: 0
                };
            }).sort((a, b) => b.clicks - a.clicks);

            setData({ urlMetrics, keywordMetrics, timeline: [] });

        } catch (e: any) {
            console.error(e);
            alert("Error cargando métricas detalladas: " + (e.message || e));
            onClose(); // Close modal on error to prevent stuck state
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
            // Normalize URL
            let siteUrl = project.gsc_property_url || '';
            if (siteUrl && !siteUrl.startsWith('sc-domain:') && !siteUrl.endsWith('/')) {
                siteUrl += '/';
            }

            // Fetch Current Month: Keywords for this Page
            const [qRowsDate, qRowsTotals] = await Promise.all([
                // Date breakdown for sparklines
                GscService.getSearchAnalytics(siteUrl, fmt(start), fmt(end), ['query', 'date'], { page: url, operator: 'equals' }),
                // Totals for metrics
                GscService.getSearchAnalytics(siteUrl, fmt(start), fmt(end), ['query'], { page: url, operator: 'equals' }),
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

            // 3. Process Deltas (Disabled for lifetime view)
            const results = Array.from(queriesMap.values()).map(q => {
                return {
                    ...q,
                    changeClicks: 0,
                    changeImpressions: 0,
                    changePosition: 0
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
                                        {project.settings?.content_directories?.length
                                            ? 'Filtrado por Directorios'
                                            : contentGroupUrls.length > 0
                                                ? 'Filtrado por Artículos Programados'
                                                : 'Todo el sitio'}
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
