import React, { useMemo } from 'react';
import { ComparisonRow, Language } from '../types';
import { motion } from 'framer-motion';
import { Rocket, Sparkles, TrendingUp, Search, Crown, ArrowRight, Zap } from 'lucide-react';

interface NewKeywordsViewProps {
    rows: ComparisonRow[];
    lang: Language;
    isAiEnabled: boolean;
    onAnalyzeBatch: () => void;
    onAnalyzeSingle: (query: string) => void;
}

const NewKeywordsView: React.FC<NewKeywordsViewProps> = ({ rows, lang, isAiEnabled, onAnalyzeBatch, onAnalyzeSingle }) => {

    // Sort by Opportunity (Impressions in Period B)
    const sorted = useMemo(() => {
        return [...rows].sort((a, b) => b.periodB.impressions - a.periodB.impressions);
    }, [rows]);

    const topThree = sorted.slice(0, 3);
    const rest = sorted.slice(3);

    const t = {
        title: lang === 'es' ? 'Nuevas Oportunidades Detectadas' : 'New Opportunities Detected',
        subtitle: lang === 'es'
            ? 'Estas palabras clave no existían antes y ahora están generando impresiones. ¡Ataca ahora!'
            : 'These keywords didn\'t exist before and are now driving impressions. Attack now!',
        imp: lang === 'es' ? 'Impresiones' : 'Impressions',
        pos: lang === 'es' ? 'Posición' : 'Position',
        analyze: lang === 'es' ? 'Analizar con IA' : 'Analyze with AI',
        analyzed: lang === 'es' ? 'Analizado' : 'Analyzed',
        topPick: lang === 'es' ? 'Top Pick' : 'Top Pick',
        viewDetails: lang === 'es' ? 'Ver Detalles' : 'View Details',
        action: lang === 'es' ? 'Acción Propuesta' : 'Prop. Action'
    };

    const containerVar = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVar = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    };

    const WinnerCard = ({ row, rank }: { row: ComparisonRow, rank: number }) => (
        <motion.div
            variants={itemVar}
            className={`relative overflow-hidden rounded-2xl p-6 border transition-all hover:shadow-xl group
            ${rank === 1 ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white border-transparent ring-4 ring-indigo-100' : 'bg-white border-gray-100 hover:border-indigo-200'}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                {rank === 1 ? <Crown className="w-24 h-24 text-white" /> : <Rocket className="w-24 h-24 text-indigo-900" />}
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider ${rank === 1 ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                        #{rank} {t.topPick}
                    </span>
                    {row.periodB.position <= 10 && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${rank === 1 ? 'bg-emerald-400/20 text-emerald-100' : 'bg-emerald-50 text-emerald-700'}`}>
                            <Sparkles className="w-3 h-3" /> Page 1
                        </span>
                    )}
                </div>

                <h3 className={`text-2xl font-bold mb-4 line-clamp-2 ${rank === 1 ? 'text-white' : 'text-slate-800'}`}>
                    {row.query}
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <div className={`text-xs font-medium uppercase tracking-wide opacity-70 mb-1 ${rank === 1 ? 'text-indigo-100' : 'text-slate-500'}`}>{t.imp}</div>
                        <div className={`text-xl font-bold ${rank === 1 ? 'text-white' : 'text-indigo-600'}`}>
                            {new Intl.NumberFormat('en-US', { notation: "compact" }).format(row.periodB.impressions)}
                        </div>
                    </div>
                    <div>
                        <div className={`text-xs font-medium uppercase tracking-wide opacity-70 mb-1 ${rank === 1 ? 'text-indigo-100' : 'text-slate-500'}`}>{t.pos}</div>
                        <div className={`text-xl font-bold ${rank === 1 ? 'text-white' : 'text-slate-800'}`}>
                            {row.periodB.position.toFixed(1)}
                        </div>
                    </div>
                </div>

                {isAiEnabled && (
                    <div className="mt-auto">
                        {row.aiDiagnosis ? (
                            <div className={`text-sm p-3 rounded-lg backdrop-blur-sm border ${rank === 1 ? 'bg-white/10 border-white/20 text-indigo-50' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                                <div className="font-bold mb-1 flex items-center gap-1"><Zap className="w-3 h-3" /> AI Insight</div>
                                <div className="line-clamp-2 text-xs opacity-90">{row.aiActions?.[0]?.title || row.aiDiagnosis.explanation}</div>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAnalyzeSingle(row.query); }}
                                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${rank === 1 ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-indigo-200'}`}
                            >
                                <Sparkles className="w-4 h-4" /> {t.analyze}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );

    const ListItem = ({ row }: { row: ComparisonRow }) => (
        <motion.div
            variants={itemVar}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 transition-all hover:shadow-md mb-3"
        >
            <div className="flex items-center gap-4 mb-3 sm:mb-0">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 text-base">{row.query}</h4>
                    <a href={row.urlBreakdown[0]?.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-indigo-500 font-mono flex items-center gap-1 mt-0.5 max-w-[300px] truncate">
                        {row.urlBreakdown[0]?.url} <ArrowRight className="w-3 h-3" />
                    </a>
                </div>
            </div>

            <div className="flex items-center gap-6 sm:gap-12 pl-14 sm:pl-0">
                <div className="flexflex-col items-center min-w-[80px]">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.imp}</div>
                    <div className="font-bold text-slate-700">{new Intl.NumberFormat('en-US', { notation: "compact" }).format(row.periodB.impressions)}</div>
                </div>
                <div className="flex flex-col items-center min-w-[60px]">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">{t.pos}</div>
                    <div className={`font-bold ${row.periodB.position <= 10 ? 'text-emerald-600' : 'text-slate-700'}`}>{row.periodB.position.toFixed(1)}</div>
                </div>

                {isAiEnabled && (
                    <div className="min-w-[140px] flex justify-end">
                        {row.aiDiagnosis ? (
                            <div className="flex flex-col items-end text-right">
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mb-1">{t.analyzed}</span>
                                <span className="text-xs text-slate-500 font-medium max-w-[120px] truncate">{row.aiActions?.[0]?.title}</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onAnalyzeSingle(row.query)}
                                className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition-colors text-xs font-bold flex items-center gap-1.5"
                            >
                                <Sparkles className="w-3 h-3" /> {t.analyze}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-10 text-center max-w-2xl mx-auto">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center justify-center p-3 bg-indigo-100 rounded-full mb-4"
                >
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">{t.title}</h2>
                <p className="text-lg text-slate-500 leading-relaxed">
                    {t.subtitle}
                </p>
                {isAiEnabled && rows.some(r => !r.aiDiagnosis) && (
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onAnalyzeBatch}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center gap-2 mx-auto"
                    >
                        <Zap className="w-5 h-5 fill-current" /> {t.analyze} All ({rows.length})
                    </motion.button>
                )}
            </div>

            <motion.div variants={containerVar} initial="hidden" animate="show" className="space-y-8">
                {/* Top 3 Grid */}
                {topThree.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {topThree.map((row, i) => (
                            <WinnerCard key={row.query} row={row} rank={i + 1} />
                        ))}
                    </div>
                )}

                {/* The Rest List */}
                {rest.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pl-1">
                            {lang === 'es' ? `Otras ${rest.length} Oportunidades` : `Other ${rest.length} Opportunities`}
                        </h3>
                        <div>
                            {rest.map((row) => (
                                <ListItem key={row.query} row={row} />
                            ))}
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default NewKeywordsView;
