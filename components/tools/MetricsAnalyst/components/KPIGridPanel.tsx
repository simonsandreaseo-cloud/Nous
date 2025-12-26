import React from 'react';
import { DashboardStats } from '../types';

interface KPIGridPanelProps {
    stats: DashboardStats;
    logo?: string | null;
    onDateRangeChange?: (range: string) => void;
}

export const KPIGridPanel: React.FC<KPIGridPanelProps> = ({ stats, logo, onDateRangeChange }) => {
    const formatNum = (n: number) => n.toLocaleString('es-ES');
    const formatPerc = (val: number, base: number) => {
        if (!base) return '0%';
        const p = (val / base) * 100;
        return `${p > 0 ? '+' : ''}${p.toFixed(1)}%`;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" /></svg>
            </div>

            <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex items-center gap-5">
                    {logo ? (
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 shadow-sm">
                            <img src={logo} alt="Project" className="h-12 w-12 object-contain" />
                        </div>
                    ) : (
                        <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                    )}
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">Análisis de Resultados</h2>
                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">GSC Insights</span>
                            <span>{stats.period2Label} vs {stats.period1Label}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 print:hidden">
                    {onDateRangeChange && (
                        <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1">
                            {[
                                { label: '28D', val: '28d' },
                                { label: 'Mes', val: 'last_month' },
                                { label: 'Trim.', val: 'last_quarter' }
                            ].map(opt => (
                                <button
                                    key={opt.val}
                                    onClick={() => onDateRangeChange(opt.val)}
                                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-slate-50/30">
                <MetricBlock
                    label="Total Clics"
                    value={formatNum(stats.kpis.clicksP2)}
                    change={formatPerc(stats.kpis.totalClicksChange, stats.kpis.clicksP1)}
                    positive={stats.kpis.totalClicksChange >= 0}
                />
                <MetricBlock
                    label="Impresiones"
                    value={formatNum(stats.kpis.impressionsP2)}
                    change={formatPerc(stats.kpis.totalImpressionsChange, stats.kpis.impressionsP1)}
                    positive={stats.kpis.totalImpressionsChange >= 0}
                />
                <MetricBlock
                    label="CTR Promedio"
                    value={stats.kpis.ctrP2.toFixed(2) + '%'}
                    change={stats.kpis.ctrChange.toFixed(1) + '%'}
                    positive={stats.kpis.ctrChange >= 0}
                />
                <MetricBlock
                    label="Posición Media"
                    value={stats.kpis.avgPosP2.toFixed(1)}
                    change={Math.abs(stats.kpis.avgPosChange).toFixed(1)}
                    positive={stats.kpis.avgPosChange <= 0}
                    isPos
                />
            </div>

            {/* GA4 Section */}
            {stats.ga4Stats && (
                <div className="border-t border-slate-100 bg-emerald-50/20">
                    <div className="px-8 py-3 border-b border-indigo-50 flex items-center gap-2">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-200">Google Analytics 4</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4">
                        <MetricBlock
                            label="Usuarios Activos"
                            value={stats.ga4Stats.activeUsers.toLocaleString()}
                            change={null} // No comparison yet
                            positive={true}
                        />
                        <MetricBlock
                            label="Consultas IA"
                            value={stats.ga4Stats.aiSessions.toLocaleString()}
                            change={((stats.ga4Stats.aiSessions / stats.ga4Stats.sessions) * 100).toFixed(1) + '%'}
                            positive={true}
                            subLabel="del tráfico total"
                        />
                        <MetricBlock
                            label="Retención (Seg)"
                            value={stats.ga4Stats.avgSessionDuration.toFixed(1) + 's'}
                            change={null}
                            positive={true}
                        />
                        <MetricBlock
                            label="Tasa de Rebote"
                            value={(stats.ga4Stats.bounceRate * 100).toFixed(1) + '%'}
                            change={null}
                            positive={stats.ga4Stats.bounceRate < 0.5} // Example threshold
                            isPos
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const MetricBlock = ({ label, value, change, positive, isPos, subLabel }: any) => (
    <div className="p-6 border-r border-slate-100 last:border-r-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">{value}</span>
            {change && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isPos ? (positive ? '↑' : '↓') : (positive ? '+' : '')}{change}
                </span>
            )}
        </div>
        {subLabel && <p className="text-[10px] text-slate-400 font-medium mt-1">{subLabel}</p>}
    </div>
);
