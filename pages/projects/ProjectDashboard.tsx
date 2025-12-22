import React, { useEffect, useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Project } from '../../lib/task_manager';
import { GscService } from '../../services/gscService';
import GscChart from '../../components/projects/analytics/GscChart';
import MovementCard from '../../components/projects/analytics/MovementCard';
import MoversList from '../../components/projects/analytics/MoversList';
import { AlertCircle, RefreshCw } from 'lucide-react';

const ProjectDashboard: React.FC = () => {
    const { project } = useOutletContext<{ project: Project }>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Data State
    const [chartData, setChartData] = useState<any[]>([]);
    const [lastDayStats, setLastDayStats] = useState<any>({
        clicks: { current: 0, previous: 0 },
        impressions: { current: 0, previous: 0 },
        position: { current: 0, previous: 0 },
        ctr: { current: 0, previous: 0 }
    });
    const [movers, setMovers] = useState<{ urls: any[], keywords: any[] }>({ urls: [], keywords: [] });

    useEffect(() => {
        if (project.gsc_property_url) {
            fetchDashboardData();
        }
    }, [project.gsc_property_url]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const siteUrl = project.gsc_property_url!;

            // 1. Chart Data (Last 30 Days)
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);

            // Format YYYY-MM-DD
            const fmt = (d: Date) => d.toISOString().split('T')[0];

            // GSC is usually delayed by 2 days. So let's ask for data up to "today" but expect it might be empty for last 2 days.
            // Actually, fetching last available data is tricky without knwowing it.
            // We usually fetch last 32 days to be safe.

            const chartRows = await GscService.getSearchAnalytics(siteUrl, fmt(startDate), fmt(endDate), ['date']);
            setChartData(chartRows);

            // 2. Last Day vs Previous Day
            if (chartRows.length >= 2) {
                // Sort by date desc
                const sorted = [...chartRows].sort((a, b) => new Date(b.keys[0]).getTime() - new Date(a.keys[0]).getTime());
                const current = sorted[0];
                const previous = sorted[1];

                setLastDayStats({
                    clicks: { current: current.clicks, previous: previous.clicks },
                    impressions: { current: current.impressions, previous: previous.impressions },
                    position: { current: current.position, previous: previous.position },
                    ctr: { current: current.ctr, previous: previous.ctr }
                });

                // 3. Movers & Shakers (Requires Query/Page breakdown for these 2 dates)
                // We need to fetch query/page data for specific dates "current.keys[0]" and "previous.keys[0]"
                // This is 2 API calls.
                const lastDate = current.keys[0];
                const prevDate = previous.keys[0];

                const [currPages, prevPages] = await Promise.all([
                    GscService.getSearchAnalytics(siteUrl, lastDate, lastDate, ['page']),
                    GscService.getSearchAnalytics(siteUrl, prevDate, prevDate, ['page'])
                ]);

                const [currQueries, prevQueries] = await Promise.all([
                    GscService.getSearchAnalytics(siteUrl, lastDate, lastDate, ['query']),
                    GscService.getSearchAnalytics(siteUrl, prevDate, prevDate, ['query'])
                ]);

                setMovers({
                    urls: calculateMovers(currPages, prevPages, 'page'),
                    keywords: calculateMovers(currQueries, prevQueries, 'query')
                });
            }

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Error cargando datos de GSC");
        } finally {
            setLoading(false);
        }
    };

    const calculateMovers = (curr: any[], prev: any[], key: string) => {
        // Map previous data
        const prevMap = new Map(prev.map(p => [p.keys[0], p]));

        const moves = curr.map(c => {
            const p = prevMap.get(c.keys[0]);
            const prevClicks = p ? p.clicks : 0;
            const diff = c.clicks - prevClicks;
            return {
                name: c.keys[0],
                change: diff,
                currentValue: c.clicks,
                metric: 'clicks'
            };
        });

        // Sort by absolute change descending
        return moves.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
    };

    if (!project.gsc_property_url) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl shadow-sm border border-brand-power/5 text-center">
                <div className="w-16 h-16 bg-brand-soft/20 rounded-full flex items-center justify-center text-brand-power mb-4">
                    <AlertCircle size={32} />
                </div>
                <h2 className="text-xl font-bold text-brand-power mb-2">Conecta Google Search Console</h2>
                <p className="text-brand-power/50 max-w-md mb-6">Para ver el rendimiento SEO, conecta una propiedad de GSC en la configuración.</p>
                <Link to="../configuracion" className="px-6 py-3 bg-brand-power text-white font-bold rounded-xl shadow-lg shadow-brand-power/20 hover:scale-105 transition-transform">
                    Ir a Configuración
                </Link>
            </div>
        );
    }

    if (loading && chartData.length === 0) {
        return <div className="p-12 text-center font-bold text-brand-power/40 animate-pulse">Cargando métricas SEO...</div>;
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header with Title and Date of Data */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-brand-power">Rendimiento SEO</h1>
                    <p className="text-brand-power/50 text-sm">
                        Última actualización: {chartData.length > 0 ? new Date(chartData[chartData.length - 1].keys[0]).toLocaleDateString() : '-'}
                    </p>
                </div>
                <button onClick={fetchDashboardData} className="p-2 bg-white border border-brand-power/10 rounded-lg text-brand-power hover:bg-brand-soft transition-colors" title="Refrescar Datos">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Daily Movement Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MovementCard
                    title="Clics (Ayer)"
                    current={lastDayStats.clicks.current}
                    previous={lastDayStats.clicks.previous}
                />
                <MovementCard
                    title="Impresiones"
                    current={lastDayStats.impressions.current}
                    previous={lastDayStats.impressions.previous}
                />
                <MovementCard
                    title="Posición Media"
                    current={lastDayStats.position.current}
                    previous={lastDayStats.position.previous}
                    isInverse={true}
                    format="number"
                />
                <MovementCard
                    title="CTR"
                    current={lastDayStats.ctr.current * 100}
                    previous={lastDayStats.ctr.previous * 100}
                    format="percent"
                />
            </div>

            {/* Main Chart */}
            <div className="w-full">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-bold text-brand-power">Evolución (30 Días)</h3>
                </div>
                <GscChart data={chartData} />
            </div>

            {/* Movers & Shakers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-96">
                <MoversList
                    urlMovers={movers.urls}
                    keywordMovers={movers.keywords}
                    metricLabel="Clics"
                />
                <div className="bg-brand-power/5 rounded-2xl p-6 flex items-center justify-center text-brand-power/30 font-bold uppercase tracking-widest border border-brand-power/5 border-dashed">
                    Próximamente: Análisis de Oportunidades
                </div>
            </div>

        </div>
    );
};

export default ProjectDashboard;
