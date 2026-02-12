'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MetricsChartProps {
    data: any[];
    dataKey: string;
    color: string;
    height?: number;
}

export function MetricsChart({ data, dataKey, color, height = 200 }: MetricsChartProps) {
    const { pathData, areaPathData } = useMemo(() => {
        if (!data || data.length < 2) return { pathData: '', areaPathData: '' };

        const values = data.map(d => Number(d[dataKey]) || 0);
        const max = Math.max(...values) || 1;
        const min = Math.min(...values);
        // Add buffer to range so lines don't hit the absolute bottom/top
        const range = (max - min) || 1;

        const points = values.map((val, i) => {
            const x = (i / (values.length - 1)) * 100;
            // Invert Y because SVG 0 is top. 
            // Map value to 10-90% of height to add padding
            const y = 90 - ((val - min) / range) * 80;
            return [x, y];
        });

        // Build SVG path commands
        const linePath = points.reduce((acc, point, i) => {
            return acc + (i === 0 ? `M ${point[0]},${point[1]}` : ` L ${point[0]},${point[1]}`);
        }, '');

        // Close the area for gradient fill (from last point down to bottom-right, then bottom-left)
        const areaPath = `${linePath} L 100,100 L 0,100 Z`;

        return { pathData: linePath, areaPathData: areaPath };
    }, [data, dataKey]);

    return (
        <div className="w-full h-full relative" style={{ height }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                    <filter id={`glow-${dataKey}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* AREA FILL */}
                <motion.path
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                    d={areaPathData}
                    fill={`url(#gradient-${dataKey})`}
                />

                {/* LINE STROKE */}
                <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    d={pathData}
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                    filter={`url(#glow-${dataKey})`}
                />
            </svg>
        </div>
    );
}
