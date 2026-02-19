import React from 'react';

interface Metric {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard: React.FC<Metric> = ({ label, value, trend }) => {
    const trendClass = trend === 'up'
        ? 'metric-pill-up'
        : trend === 'down'
            ? 'metric-pill-down'
            : 'bg-slate-50 text-slate-400';

    return (
        <div className="report-card !p-6 flex flex-col justify-between group hover:!border-purple-200">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{label}</span>
            <div className="flex items-baseline justify-between">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
                {trend && <div className={`metric-pill ${trendClass} scale-90 origin-right`}>{trend}</div>}
            </div>
        </div>
    );
};
