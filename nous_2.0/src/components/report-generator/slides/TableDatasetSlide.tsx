import React from 'react';

interface TableDatasetProps {
    title: string;
    subtitle?: string;
    tableData: any[]; // Usually an array of row objects from Gemini
}

export const TableDatasetSlide: React.FC<TableDatasetProps> = ({
    title,
    subtitle = "Desglose de métricas reales del periodo",
    tableData
}) => {

    // Safety check
    if (!tableData || !Array.isArray(tableData) || tableData.length === 0 || !tableData[0]) {
        return (
            <section className="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col items-center justify-center">
                <p className="text-slate-400">Sin datos de tabla para mostrar.</p>
            </section>
        );
    }

    // Extract headers dynamically from first row keys
    const headers = Object.keys(tableData[0]).filter(k => k !== 'key'); // 'key' is usually the URL/Keyword

    return (
        <section className="report-slide bg-white h-full relative overflow-hidden p-12 flex flex-col">
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[var(--color-nous-mint)]/30 text-slate-800 rounded-lg flex items-center justify-center shadow-sm">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 12h16" /><path d="M4 6h16" /><path d="M4 18h16" /></svg>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">{title}</h2>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{subtitle}</p>
                        </div>
                    </div>
                    <div className="px-6 py-2 glass-panel bg-[var(--color-nous-mist)]/20 text-[var(--color-nous-mist)] rounded-md text-[10px] font-black uppercase tracking-widest border-hairline">Dataset Completo</div>
                </div>

                <div className="flex-1 overflow-hidden rounded-[32px] glass-panel border-hairline shadow-sm flex flex-col bg-white/60">
                    <div className="overflow-auto flex-1 custom-scrollbar">
                        <table className="report-table w-full">
                            <thead>
                                <tr>
                                    <th className="text-left font-black tracking-widest uppercase text-xs text-slate-400 py-4 px-6 border-b border-slate-100">Elemento Clave</th>
                                    {headers.map(h => (
                                        <th key={h} className="text-right font-black tracking-widest uppercase text-xs text-slate-400 py-4 px-6 border-b border-slate-100">
                                            {h.replace(/([A-Z])/g, ' $1').trim()}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors border-b border-hairline border-slate-100/30 last:border-0">
                                        <td className="py-4 px-6 text-sm font-medium text-[var(--color-nous-mint)] font-bold max-w-[300px] truncate" title={row.key}>
                                            {row.key || '-'}
                                        </td>
                                        {headers.map(h => {
                                            let val = row[h];
                                            let displayClass = "text-right py-4 px-6 text-sm text-slate-600";

                                            // Simple formatting heuristics
                                            if (typeof val === 'number') {
                                                if (val % 1 !== 0) val = val.toFixed(2); // floats
                                                if (h.toLowerCase().includes('change') || h.toLowerCase().includes('fluctu')) {
                                                    displayClass += val > 0 ? " text-emerald-500 font-bold" : val < 0 ? " text-rose-500 font-bold" : "";
                                                    val = val > 0 ? `+${val}` : val;
                                                }
                                            }

                                            return (
                                                <td key={h} className={displayClass}>
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
};
