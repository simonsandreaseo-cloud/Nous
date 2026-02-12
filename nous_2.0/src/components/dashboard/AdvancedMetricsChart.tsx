'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface AdvancedMetricsChartProps {
    data: any[];
    series: {
        key: string;
        color: string;
        label: string;
        dashed?: boolean;
    }[];
    height?: number;
}

export function AdvancedMetricsChart({ data, series, height = 300 }: AdvancedMetricsChartProps) {
    const { paths, maxVal } = useMemo(() => {
        if (!data || data.length < 2) return { paths: [], maxVal: 1 };

        // Find global max across all series for normalization
        const allValues = data.flatMap(d => series.map(s => Number(d[s.key]) || 0));
        const max = Math.max(...allValues) || 1;
        const min = Math.min(...allValues);
        const range = max - min || 1;

        const renderedPaths = series.map(s => {
            const points = data.map((d, i) => {
                const val = Number(d[s.key]) || 0;
                const x = (i / (data.length - 1)) * 100;
                const y = 90 - ((val - min) / range) * 80;
                return [x, y];
            });

            const linePath = points.reduce((acc, point, i) => {
                return acc + (i === 0 ? `M ${point[0]},${point[1]}` : ` L ${point[0]},${point[1]}`);
            }, '');

            return { path: linePath, color: s.color, dashed: s.dashed, key: s.key };
        });

        return { paths: renderedPaths, maxVal: max };
    }, [data, series]);

    return (
        <div className="w-full h-full relative" style={{ height }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    {series.map(s => (
                        <filter key={`glow-${s.key}`} id={`glow-${s.key}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    ))}
                </defs>

                {/* Grid Lines */}
                {[0, 25, 50, 75, 100].map(v => (
                    <line
                        key={v}
                        x1="0" y1={v} x2="100" y2={v}
                        stroke="#f1f5f9"
                        strokeWidth="0.1"
                        vectorEffect="non-scaling-stroke"
                    />
                ))}

                {/* Series Lines */}
                {paths.map(p => (
                    <motion.path
                        key={p.key}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                        d={p.path}
                        fill="none"
                        stroke={p.color}
                        strokeWidth="1.5"
                        strokeDasharray={p.dashed ? "2 2" : "none"}
                        vectorEffect="non-scaling-stroke"
                        filter={`url(#glow-${p.key})`}
                    />
                ))}
            </svg>

            {/* Legend */}
            <div className="absolute top-0 right-0 flex gap-4">
                {series.map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                        <div className="w-3 h-0.5" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
