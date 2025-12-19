
import React, { useState, useMemo } from 'react';
import { ComparisonRow, Language, ClusterGroup, ExternalApiKeys, ProviderConfig } from '../types';
import { LayoutGrid, Blocks, Layers, ArrowRight, Lightbulb, ShoppingCart, Info, MapPin } from 'lucide-react';
import AiControlBar from './AiControlBar';
import { AVAILABLE_MODELS, clusterKeywordsWithAi } from '../services/aiService';

interface ClusterViewProps {
    rows: ComparisonRow[];
    lang: Language;
    onBack: () => void;
}

const ClusterView: React.FC<ClusterViewProps> = ({ rows, lang, onBack }) => {
    const [topN, setTopN] = useState(100);
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState(AVAILABLE_MODELS[0]);
    const [siteContext, setSiteContext] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [clusters, setClusters] = useState<ClusterGroup[] | null>(null);

    const t = {
        title: lang === 'es' ? 'Clustering Semántico' : 'Semantic Clustering',
        subtitle: lang === 'es' 
            ? 'Agrupa tus palabras clave por intención de búsqueda para descubrir oportunidades de contenido.' 
            : 'Group your keywords by search intent to discover content opportunities.',
        configTitle: lang === 'es' ? 'Configuración' : 'Configuration',
        topNLabel: lang === 'es' ? 'Analizar Top N Keywords (por Impresiones)' : 'Analyze Top N Keywords (by Impressions)',
        start: lang === 'es' ? 'Generar Clusters' : 'Generate Clusters',
        results: lang === 'es' ? 'Clusters Detectados' : 'Detected Clusters',
        emptyState: lang === 'es' 
            ? 'Ingresa tu API Key y selecciona la cantidad de palabras clave para comenzar el análisis.' 
            : 'Enter your API Key and select the number of keywords to start the analysis.',
        keywordCount: lang === 'es' ? 'Keywords' : 'Keywords',
        totalImp: lang === 'es' ? 'Volumen Total' : 'Total Volume',
        avgPos: lang === 'es' ? 'Pos. Media' : 'Avg. Pos',
        intent: lang === 'es' ? 'Intención' : 'Intent'
    };

    const sortedRows = useMemo(() => {
        // Sort by Impressions Period B descending
        return [...rows].sort((a, b) => b.periodB.impressions - a.periodB.impressions);
    }, [rows]);

    const handleClustering = async () => {
        if (!apiKey) {
            alert(lang === 'es' ? 'Por favor ingresa una API Key.' : 'Please enter an API Key.');
            return;
        }
        
        setIsAnalyzing(true);
        const keywordsToCluster = sortedRows.slice(0, topN).map(r => r.query);

        try {
            // Clustering doesn't use Jina/External providers, only Gemini
            const result = await clusterKeywordsWithAi(keywordsToCluster, {
                apiKeys: [apiKey],
                externalKeys: {}, 
                providerConfig: { reader: 'JINA', serp: 'JINA', clustering: 'GEMINI' },
                lang,
                model,
                siteContext
            });
            setClusters(result.clusters);
        } catch (error: any) {
            console.error(error);
            alert('Error: ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getIntentIcon = (intent: string) => {
        const i = intent.toLowerCase();
        if (i.includes('info')) return <Info className="w-3 h-3" />;
        if (i.includes('trans') || i.includes('comm')) return <ShoppingCart className="w-3 h-3" />;
        if (i.includes('nav')) return <MapPin className="w-3 h-3" />;
        return <Lightbulb className="w-3 h-3" />;
    };

    const getClusterStats = (keywords: string[]) => {
        let totalImp = 0;
        let weightedPos = 0;
        
        keywords.forEach(k => {
            const row = rows.find(r => r.query === k);
            if (row) {
                totalImp += row.periodB.impressions;
                weightedPos += (row.periodB.position * row.periodB.impressions);
            }
        });

        return {
            imp: totalImp,
            avgPos: totalImp > 0 ? weightedPos / totalImp : 0
        };
    };

    const fmt = (n: number) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(n);

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-6">
                <div className="flex items-start gap-4">
                    <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 bg-white shadow-sm">
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 leading-tight flex items-center gap-2">
                            {t.title}
                            <Blocks className="w-5 h-5 text-indigo-500" />
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">{t.subtitle}</p>
                    </div>
                </div>

                <AiControlBar 
                    lang={lang}
                    isAnalyzing={isAnalyzing}
                    progress={{ processed: 0, total: 0 }} // Not used for single batch
                    onStart={handleClustering}
                    onStop={() => {}}
                    apiKey={apiKey}
                    setApiKey={setApiKey}
                    model={model}
                    setModel={setModel}
                    siteContext={siteContext}
                    setSiteContext={setSiteContext}
                >
                     <div className="w-full sm:w-auto mt-2 sm:mt-0 flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg border border-white/20">
                        <span className="text-xs font-semibold text-indigo-100 whitespace-nowrap">Top N:</span>
                        <input 
                            type="number" 
                            min="10" 
                            max="500" 
                            step="10"
                            value={topN} 
                            onChange={(e) => setTopN(Number(e.target.value))}
                            className="w-16 bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-white"
                            disabled={isAnalyzing}
                        />
                     </div>
                </AiControlBar>
            </div>

            {/* Content */}
            {!clusters ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                    <div className="bg-indigo-50 p-4 rounded-full mb-4">
                        <Layers className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">{t.start}</h3>
                    <p className="text-slate-500 max-w-md">{t.emptyState}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clusters.map((cluster, idx) => {
                        const stats = getClusterStats(cluster.keywords);
                        return (
                            <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
                                <div className="p-4 border-b border-gray-100 bg-slate-50/50">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{cluster.name}</h3>
                                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                            {getIntentIcon(cluster.intent)}
                                            {cluster.intent}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">{t.totalImp}</span>
                                            <span className="font-semibold text-slate-700">{fmt(stats.imp)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] uppercase font-bold text-slate-400">{t.avgPos}</span>
                                            <span className="font-semibold text-slate-700">{stats.avgPos.toFixed(1)}</span>
                                        </div>
                                         <div className="flex flex-col ml-auto">
                                            <span className="text-[9px] uppercase font-bold text-slate-400 text-right">{t.keywordCount}</span>
                                            <span className="font-semibold text-slate-700 text-right">{cluster.keywords.length}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 bg-white">
                                    <ul className="space-y-1.5">
                                        {cluster.keywords.slice(0, 10).map((k, kIdx) => (
                                            <li key={kIdx} className="text-xs text-slate-600 flex items-center gap-2">
                                                <ArrowRight className="w-3 h-3 text-slate-300 flex-shrink-0" />
                                                <span className="truncate" title={k}>{k}</span>
                                            </li>
                                        ))}
                                        {cluster.keywords.length > 10 && (
                                            <li className="text-[10px] text-slate-400 font-medium italic pl-5 mt-2">
                                                +{cluster.keywords.length - 10} more...
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ClusterView;
