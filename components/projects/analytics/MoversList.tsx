import React, { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface MoverItem {
    name: string;
    change: number;
    currentValue: number;
    metric: 'clicks' | 'impressions' | 'position';
}

interface MoversListProps {
    urlMovers: MoverItem[];
    keywordMovers: MoverItem[];
    metricLabel: string; // "Clics", "Impresiones"
}

const MoversList: React.FC<MoversListProps> = ({ urlMovers, keywordMovers, metricLabel }) => {
    const [activeTab, setActiveTab] = useState<'urls' | 'keywords'>('urls');

    const items = activeTab === 'urls' ? urlMovers : keywordMovers;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-brand-power/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-brand-power text-lg">Mayores Cambios ({metricLabel})</h3>
                <div className="flex bg-brand-soft/20 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('urls')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${activeTab === 'urls' ? 'bg-white shadow-sm text-brand-power' : 'text-brand-power/50 hover:text-brand-power'
                            }`}
                    >
                        URLs
                    </button>
                    <button
                        onClick={() => setActiveTab('keywords')}
                        className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${activeTab === 'keywords' ? 'bg-white shadow-sm text-brand-power' : 'text-brand-power/50 hover:text-brand-power'
                            }`}
                    >
                        Keywords
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {items.length === 0 ? (
                    <div className="text-center text-xs text-brand-power/40 py-10">
                        No hay datos suficientes para calcular movimientos.
                    </div>
                ) : (
                    items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between group p-2 rounded-lg hover:bg-brand-soft/10 transition-colors">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="text-sm font-medium text-brand-power truncate" title={item.name}>
                                    {item.name}
                                </div>
                                <div className="text-[10px] text-brand-power/40 font-mono">
                                    {item.currentValue.toLocaleString()} total
                                </div>
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold ${item.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {item.change > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                {Math.abs(item.change).toLocaleString()}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-brand-power/5 text-center">
                <button className="text-xs font-bold text-brand-accent uppercase tracking-widest hover:text-brand-power transition-colors">
                    Ver Reporte Completo
                </button>
            </div>
        </div>
    );
};

export default MoversList;
