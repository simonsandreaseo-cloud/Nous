import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users, BarChart2, ChevronRight, Trash2, MousePointer2, Eye, ListOrdered, Search, RefreshCw, AlertCircle, Globe } from 'lucide-react';
import { Project } from '../../lib/task_manager';
import { GscService } from '../../services/gscService';
import ShareModal from '../shared/ShareModal';

interface ProjectCardProps {
    project: Project;
    onDelete?: (e: React.MouseEvent, project: Project) => void;
}

interface Metrics {
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
    rows: any[];
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onDelete }) => {
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    // Random color for decoration (or based on project ID hash)
    const cardColor = useMemo(() => {
        const colors = ['bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500'];
        const hash = project.id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }, [project.id]);

    useEffect(() => {
        if (project.gsc_property_url) {
            fetchMetrics();
        }
    }, [project.gsc_property_url]);

    const fetchMetrics = async () => {
        setLoading(true);
        setError(null);
        try {
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Fetch date series for charts
            const rows = await GscService.getSearchAnalytics(project.gsc_property_url!, startDate, endDate, ['date']);

            // Calculate totals
            const totals = rows.reduce((acc: any, row: any) => ({
                clicks: acc.clicks + row.clicks,
                impressions: acc.impressions + row.impressions,
                position: acc.position + row.position,
                ctr: acc.ctr + row.ctr
            }), { clicks: 0, impressions: 0, position: 0, ctr: 0 });

            // Averages for position and CTR
            if (rows.length > 0) {
                totals.position = totals.position / rows.length;
                totals.ctr = totals.ctr / rows.length;
            }

            setMetrics({
                clicks: totals.clicks,
                impressions: totals.impressions,
                position: totals.position,
                ctr: totals.ctr,
                rows: rows
            });

        } catch (err: any) {
            console.error("Error fetching GSC metrics:", err);
            const msg = err.message || '';
            if (msg.includes('No access token') || msg.includes('sign in')) {
                setError("Re-auth Required");
            } else {
                setError("Error metrics");
            }
        } finally {
            setLoading(false);
        }
    };

    // Helper to generate SVG path
    const renderSparkline = (dataKey: string, color: string) => {
        if (!metrics?.rows || metrics.rows.length === 0) return null;

        const data = metrics.rows.map(r => r[dataKey]);
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        const width = 100;
        const height = 30;

        const points = data.map((val, i) => {
            const x = (i / (data.length - 1)) * width;
            // For position, lower is better (top of graph), so invert. For others, higher is better.
            const normalized = dataKey === 'position'
                ? (val - min) / range // 0 at min (best), 1 at max (worst) -> Y grows down
                : 1 - (val - min) / range; // 1 at min, 0 at max -> Y grows down

            const y = normalized * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        );
    };

    return (
        <div className="relative group h-full">
            <Link
                to={`/proyectos/${project.slug || project.id}`}
                className="block bg-white rounded-2xl border border-brand-power/5 shadow-sm hover:shadow-xl hover:border-brand-accent/30 transition-all flex flex-col justify-between h-full overflow-hidden"
            >
                {/* Header Strip */}
                <div className={`h-2 w-full ${cardColor}`}></div>

                <div className="p-6 pb-2">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold text-brand-power truncate pr-4">{project.name}</h3>
                            <a
                                href={project.gsc_property_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs text-brand-power/40 hover:text-brand-accent hover:underline truncate block"
                            >
                                {project.gsc_property_url || "Sin vincular"}
                            </a>
                        </div>
                        {/* Status / Role pill */}
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${project.role === 'owner' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                            {project.role === 'owner' ? 'Owner' : 'Team'}
                        </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="space-y-4 min-h-[160px]">
                        {!project.gsc_property_url ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center opacity-60">
                                <BarChart2 size={32} className="text-brand-power/20 mb-2" />
                                <p className="text-xs font-bold text-brand-power/40">Sin métricas</p>
                                <span className="text-[10px] text-brand-power/30">Conecta GSC para ver datos</span>
                            </div>
                        ) : loading ? (
                            <div className="space-y-4 animate-pulse">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="flex justify-between items-center h-10 bg-brand-soft/20 rounded-lg"></div>
                                ))}
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full py-8 text-center text-red-400">
                                <AlertCircle size={24} className="mb-2" />
                                <p className="text-xs font-bold">{error}</p>
                                <button onClick={(e) => { e.preventDefault(); fetchMetrics(); }} className="mt-2 p-2 hover:bg-red-50 rounded-full">
                                    <RefreshCw size={14} />
                                </button>
                            </div>
                        ) : metrics ? (
                            <>
                                {/* Clicks */}
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-soft/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                                            <MousePointer2 size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-brand-power">{metrics.clicks.toLocaleString()}</div>
                                            <div className="text-[10px] font-bold text-brand-power/40 uppercase tracking-wider">Clics</div>
                                        </div>
                                    </div>
                                    <div className="w-20 h-8 opacity-70">
                                        {renderSparkline('clicks', '#f97316')}
                                    </div>
                                </div>

                                {/* Impressions */}
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-soft/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                            <Eye size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-brand-power">{metrics.impressions.toLocaleString()}</div>
                                            <div className="text-[10px] font-bold text-brand-power/40 uppercase tracking-wider">Impr.</div>
                                        </div>
                                    </div>
                                    <div className="w-20 h-8 opacity-70">
                                        {renderSparkline('impressions', '#6366f1')}
                                    </div>
                                </div>

                                {/* Position */}
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-soft/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                            <ListOrdered size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-brand-power">{metrics.position.toFixed(1)}</div>
                                            <div className="text-[10px] font-bold text-brand-power/40 uppercase tracking-wider">Pos. Avg</div>
                                        </div>
                                    </div>
                                    <div className="w-20 h-8 opacity-70">
                                        {renderSparkline('position', '#10b981')}
                                    </div>
                                </div>

                                {/* CTR */}
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-brand-soft/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <Search size={16} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-brand-power">{(metrics.ctr * 100).toFixed(1)}%</div>
                                            <div className="text-[10px] font-bold text-brand-power/40 uppercase tracking-wider">CTR</div>
                                        </div>
                                    </div>
                                    <div className="w-20 h-8 opacity-70">
                                        {renderSparkline('ctr', '#3b82f6')}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="bg-brand-soft/5 px-6 py-3 border-t border-brand-power/5 flex justify-between items-center group-hover:bg-brand-accent/5 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-power/40 group-hover:text-brand-accent transition-colors">
                        Ver Detalles
                    </span>
                    <ChevronRight size={16} className="text-brand-power/20 group-hover:translate-x-1 group-hover:text-brand-accent transition-all" />
                </div>
            </Link>

            {onDelete && project.role === 'owner' && (
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowShareModal(true);
                        }}
                        className="p-2 text-brand-power/20 hover:text-brand-accent hover:bg-brand-soft rounded-lg"
                        title="Compartir Proyecto"
                    >
                        <Globe size={16} />
                    </button>
                    <button
                        onClick={(e) => onDelete(e, project)}
                        className="p-2 text-brand-power/20 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        title="Eliminar Proyecto"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )}

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                itemType="project"
                itemId={project.id}
                initialPublicAccess={project.public_access_level}
                initialShareToken={project.share_token}
            />
        </div>
    );
};

export default ProjectCard;
