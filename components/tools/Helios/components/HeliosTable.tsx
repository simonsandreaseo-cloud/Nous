import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { HeliosChartConfig } from '../types/heliosSchema';

interface HeliosTableProps {
    config: HeliosChartConfig;
}

export const HeliosTable: React.FC<HeliosTableProps> = ({ config }) => {
    // Determine headers from the first data point keys if available, 
    // or generic ones if specific schema isn't strictly enforced for table columns yet.
    // For Helios V2, we assume 'data' contains objects with specific keys tailored for the table.
    // However, the current schema `HeliosChartDataPoint` is simple: { label, value, category }.
    // To support rich tables (Keywords, Position, Traffic, Trend), we might need to extend the schema
    // or reuse 'category' for extra metadata (JSON stringified?).

    // BETTER APPROACH: The user requested "tables... colors for drops and ascents".
    // We can assume 'value' is the main metric, and maybe 'category' holds the "Trend" info?
    // Let's parse 'category' if it looks like JSON, or use it as is.

    const rows = config.data.map(d => {
        let trend = 0; // 0 = neutral, >0 = up, <0 = down
        let extraCols: any = {};

        try {
            if (d.category && d.category.startsWith('{')) {
                const parsed = JSON.parse(d.category);
                if (parsed.trend) trend = parsed.trend;
                extraCols = parsed;
            } else {
                extraCols = { category: d.category };
            }
        } catch (e) {
            extraCols = { category: d.category };
        }

        return { ...d, trend, extraCols };
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b-2 border-slate-100 font-bold text-slate-500 text-[10px] bg-slate-50/50">
                    <tr>
                        <th scope="col" className="px-6 py-4 rounded-tl-xl">{config.xAxisLabel || 'Item'}</th>
                        <th scope="col" className="px-6 py-4 text-right">Metrica</th>
                        <th scope="col" className="px-6 py-4 text-center rounded-tr-xl">Tendencia</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4 font-bold text-slate-700">
                                {row.label}
                                {row.extraCols.subtitle && (
                                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{row.extraCols.subtitle}</div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-slate-600">
                                {row.value.toLocaleString()}
                            </td>
                            <td className="px-6 py-4">
                                <div className={`flex items-center justify-center gap-1 font-bold text-xs px-2 py-1 rounded-full w-fit mx-auto ${row.trend > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                        row.trend < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                            'bg-slate-50 text-slate-400 border border-slate-100'
                                    }`}>
                                    {row.trend > 0 ? <ArrowUp size={12} strokeWidth={3} /> :
                                        row.trend < 0 ? <ArrowDown size={12} strokeWidth={3} /> :
                                            <Minus size={12} strokeWidth={3} />}

                                    {row.trend !== 0 && <span>{Math.abs(row.trend)}%</span>}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {rows.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-xs">No hay datos disponibles para esta tabla.</div>
            )}
        </div>
    );
};
