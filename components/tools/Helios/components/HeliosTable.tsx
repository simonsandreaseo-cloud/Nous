import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { HeliosChartConfig } from '../types/heliosSchema';

interface HeliosTableProps {
    config: HeliosChartConfig;
}

export const HeliosTable: React.FC<HeliosTableProps> = ({ config }) => {
    // Standard Generic Headers if not provided
    const columns = config.tableColumns || [
        { key: 'label', label: config.xAxisLabel || 'Item', format: 'text' },
        { key: 'value', label: 'Métrica', format: 'number' },
        { key: 'trend', label: 'Tendencia', format: 'trend' }
    ];

    const renderCell = (row: any, col: any) => {
        const val = row[col.key];

        if (col.format === 'trend') {
            // Trend handling
            // If explicit trendKey is provided (e.g. 'clicksChange'), use it. 
            // Otherwise check 'trend' property or fall back to parsing category JSON if legacy.
            let trendVal = val;
            if (col.trendKey) trendVal = row[col.trendKey];

            // Legacy handling compatibility
            if (trendVal === undefined && row.category && typeof row.category === 'string' && row.category.startsWith('{')) {
                try {
                    const parsed = JSON.parse(row.category);
                    if (parsed.trend !== undefined) trendVal = parsed.trend;
                } catch (e) { }
            }

            const num = Number(trendVal || 0);

            return (
                <div className={`flex items-center justify-center gap-1 font-bold text-xs px-2 py-1 rounded-full w-fit mx-auto ${num > 0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        num < 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                    {num > 0 ? <ArrowUp size={12} strokeWidth={3} /> :
                        num < 0 ? <ArrowDown size={12} strokeWidth={3} /> :
                            <Minus size={12} strokeWidth={3} />}
                    <span>{Math.abs(num)}%</span>
                </div>
            );
        }

        if (col.format === 'number') {
            return <span className="font-mono text-slate-600">{Number(val || 0).toLocaleString()}</span>;
        }

        if (col.format === 'percent') {
            return <span className="font-mono text-slate-600">{Number(val || 0).toFixed(2)}%</span>;
        }

        // Default Text
        return (
            <div className="font-bold text-slate-700">
                {val}
                {/* Legacy Subtitle Support */}
                {col.key === 'label' && row.category && !row.category.startsWith('{') && (
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">{row.category}</div>
                )}
            </div>
        );
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="uppercase tracking-wider border-b-2 border-slate-100 font-bold text-slate-500 text-[10px] bg-slate-50/50">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} scope="col" className={`px-6 py-4 ${idx === 0 ? 'rounded-tl-xl' : ''} ${idx === columns.length - 1 ? 'rounded-tr-xl text-center' : 'text-left'}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {config.data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                            {columns.map((col, cIdx) => (
                                <td key={cIdx} className={`px-6 py-4 ${col.format === 'number' ? 'text-right' : ''}`}>
                                    {renderCell(row, col)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {config.data.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-xs">No hay datos disponibles para esta tabla.</div>
            )}
        </div>
    );
};
