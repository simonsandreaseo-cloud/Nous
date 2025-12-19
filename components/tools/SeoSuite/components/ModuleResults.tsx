
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ComparisonRow, GlobalSiteStats, ModuleId, Language, ModuleState, TrendAnalysis, AiBatchOptions, ExternalApiKeys, ProviderConfig } from '../types';
import { analyzeModule } from '../services/analyzer';
import { analyzeKeywordTrend, analyzeSeoCase, AVAILABLE_MODELS } from '../services/aiService';
import { LayoutGrid, ExternalLink, Trash2, Ban, Info, Filter, ArrowUpDown, Layers, TrendingUp, Search, ChevronLeft, ChevronRight, Check, Clock, Activity, Download, Printer, X, SortAsc, SortDesc, List, Edit3, Save } from 'lucide-react';
import RangeSlider from './RangeSlider';
import { MODULES } from './ModuleSelector';
import SerpPreview from './SerpPreview';
import AiControlBar from './AiControlBar';
import TaskView from './TaskView';
import ErrorModal, { ErrorDetails } from './ErrorModal';

interface ModuleResultsProps {
    moduleId: ModuleId;
    rows: ComparisonRow[];
    stats: GlobalSiteStats;
    lang: Language;
    onBack: () => void;
    savedState?: ModuleState;
    onSaveState?: (state: ModuleState) => void;
    isAiEnabled: boolean;
    apiKeys: string[];
    externalKeys: ExternalApiKeys;
    providerConfig: ProviderConfig;
    model: string;
    onUpdateRows?: (rows: ComparisonRow[]) => void;
}

type SortKey = 'IMP' | 'IMP_DELTA' | 'CLICKS' | 'CLICKS_DELTA' | 'POS' | 'POS_DELTA' | 'CTR' | 'CTR_DELTA' | 'BOUNCE' | 'BOUNCE_DELTA' | 'DURATION' | 'DURATION_DELTA';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'list' | 'tasks';

interface ColumnConfig {
    showImp: boolean;
    showClicks: boolean;
    showCtr: boolean;
    showPos: boolean;
    showBounce: boolean;
    showTime: boolean;
    isLostModule?: boolean;
}

const ITEMS_PER_PAGE = 50;

const getModuleConfig = (id: ModuleId): ColumnConfig => {
    switch (id) {
        case 'GHOST_KEYWORDS':
            return { showImp: true, showClicks: false, showCtr: false, showPos: true, showBounce: true, showTime: true };
        case 'LOST_KEYWORDS':
            return { showImp: true, showClicks: true, showCtr: false, showPos: true, showBounce: false, showTime: false, isLostModule: true };
        default:
            return { showImp: true, showClicks: true, showCtr: true, showPos: true, showBounce: true, showTime: true };
    }
}

const formatDuration = (seconds: number) => {
    if (!seconds && seconds !== 0) return '-';
    const absSeconds = Math.abs(seconds);
    const m = Math.floor(absSeconds / 60);
    const s = Math.round(absSeconds % 60);
    const str = `${m}:${s.toString().padStart(2, '0')}`;
    return seconds < 0 ? `-${str}` : str;
};

// OPTIMIZATION: Extract MetricCell to standalone memoized component
const MetricCell = React.memo(({ current, prev, delta, inverse = false, isPercent = false, isDuration = false, isLostMode = false, isChild = false }: any) => {
    const fmt = (n: number) => {
        if (isDuration) return formatDuration(n);
        if (isPercent) return n.toFixed(1) + '%';
        return new Intl.NumberFormat('en-US', { notation: "compact" }).format(n);
    };

    const fmtDelta = (n: number) => {
        const sign = n > 0 ? '+' : '';
        if (isDuration) return sign + formatDuration(n);
        if (isPercent) return sign + n.toFixed(1) + '%';
        return sign + n.toFixed(0); 
    };
    
    if (isLostMode) {
        return (
            <div className="flex flex-col items-end">
                <div className="flex items-center gap-1">
                    <span className={`text-slate-700 ${isChild ? 'text-xs font-medium' : 'text-sm font-bold'}`}>{fmt(prev)}</span>
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded uppercase">Lost</span>
                </div>
            </div>
        );
    }

    let isGood = delta > 0;
    if (inverse) isGood = delta < 0;

    const colorClass = delta === 0 ? 'text-slate-300' : isGood ? 'text-emerald-600' : 'text-rose-600';
    const isRelevantDelta = isDuration ? Math.abs(delta) >= 1 : Math.abs(delta) > 0.01;
    const valueClass = isChild 
        ? "text-xs font-medium text-slate-600" 
        : "text-sm font-bold text-slate-800"; 
    const deltaClass = isChild 
        ? "text-[10px] font-medium" 
        : "text-[10px] font-bold";

    return (
        <div className="flex flex-col items-end leading-tight">
            <span className={valueClass}>{fmt(current)}</span>
            {isRelevantDelta && (
                <span className={`${deltaClass} ${colorClass}`}>
                    ({fmtDelta(delta)})
                </span>
            )}
        </div>
    );
});

// OPTIMIZATION: Extract Row to standalone memoized component
const ModuleRow = React.memo(({ row, colConfig, isAiEnabled, trendResult, onTrendAnalysis, onHide, onSerp, onToggleExpand, isExpanded }: any) => {
    const displayUrl = row.urlBreakdown && row.urlBreakdown.length > 0 
        ? row.urlBreakdown[0].url 
        : (row as any).urls ? (row as any).urls[0] : '';
    
    return (
        <React.Fragment>
            <tr className={`hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-indigo-50/20' : ''}`}>
                <td className="px-6 py-3 align-top truncate">
                    <div className="flex flex-col gap-1 max-w-full">
                        <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800 text-sm truncate" title={row.query}>{row.query}</div>
                            <button onClick={(e) => { e.stopPropagation(); onSerp(row.query); }} className="p-1 rounded text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"><Search className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex items-center gap-2">
                                <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-indigo-600 font-mono flex items-center gap-1 truncate max-w-[90%]">
                                <span className="truncate">{displayUrl}</span><ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                            </a>
                            {row.urlBreakdown && row.urlBreakdown.length > 1 && <button onClick={onToggleExpand} className={`flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors whitespace-nowrap ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Layers className="w-3 h-3" />{isExpanded ? 'Hide' : `+${row.urlBreakdown.length - 1}`}</button>}
                        </div>
                    </div>
                </td>
                {/* Metrics Columns */}
                {colConfig.showImp && <td className="px-4 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.impressions : row.periodB.impressions} prev={colConfig.isLostModule ? 0 : row.periodA.impressions} delta={colConfig.isLostModule ? 0 : row.diffImp} isLostMode={colConfig.isLostModule} isChild={false} /></td>}
                {colConfig.showClicks && <td className="px-4 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.clicks : row.periodB.clicks} prev={colConfig.isLostModule ? 0 : row.periodA.clicks} delta={colConfig.isLostModule ? 0 : row.diffClicks} isLostMode={colConfig.isLostModule} isChild={false} /></td>}
                {colConfig.showCtr && <td className="px-4 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.ctr : row.periodB.ctr} prev={0} delta={colConfig.isLostModule ? 0 : (row.periodB.ctr - row.periodA.ctr)} isPercent={true} isLostMode={colConfig.isLostModule} isChild={false} /></td>}
                {colConfig.showPos && <td className="px-6 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.position : row.periodB.position} prev={colConfig.isLostModule ? 0 : row.periodA.position} delta={colConfig.isLostModule ? 0 : row.diffPos} inverse={true} isLostMode={colConfig.isLostModule} isChild={false} /></td>}
                {colConfig.showBounce && <td className="px-4 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.bounceRate || 0 : row.periodB.bounceRate || 0} prev={0} delta={colConfig.isLostModule ? 0 : row.diffBounce} inverse={true} isPercent={true} isLostMode={colConfig.isLostModule} isChild={false} /></td>}
                {colConfig.showTime && <td className="px-4 py-3 align-top"><MetricCell current={colConfig.isLostModule ? row.periodA.sessionDuration || 0 : row.periodB.sessionDuration || 0} prev={0} delta={colConfig.isLostModule ? 0 : row.diffTime} isDuration={true} isLostMode={colConfig.isLostModule} isChild={false} /></td>}

                {isAiEnabled && (
                    <td className="px-4 py-3 align-middle text-center">
                        {trendResult ? <div className="flex flex-col items-center gap-1"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${trendResult.verdict === 'SEASONAL' ? 'bg-amber-100 text-amber-700' : trendResult.verdict === 'SEO_ISSUE' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{trendResult.verdict}</span></div> : <button onClick={onTrendAnalysis} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><TrendingUp className="w-4 h-4" /></button>}
                    </td>
                )}
                <td className="px-4 py-3 align-middle text-center"><button onClick={onHide} className="p-2 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button></td>
            </tr>
            
            {/* Child rows logic */}
            {isExpanded && row.urlBreakdown && row.urlBreakdown.map((ub: any, idx2: number) => {
                    const p = colConfig.isLostModule ? ub.periodA : ub.periodB;
                    if (p.impressions === 0 && !colConfig.isLostModule) return null;
                    if (colConfig.isLostModule && ub.periodA.impressions === 0) return null;
                    const dImp = ub.periodB.impressions - ub.periodA.impressions;
                    const dClicks = ub.periodB.clicks - ub.periodA.clicks;
                    const dCtr = ub.periodB.ctr - ub.periodA.ctr;
                    const dPos = ub.periodB.position - ub.periodA.position;
                    return (
                        <tr key={`${row.query}-child-${idx2}`} className="bg-slate-50/60 hover:bg-slate-100 transition-colors">
                            <td className="px-6 py-2 pl-12 font-mono text-xs text-slate-500 truncate border-l-4 border-indigo-200">
                                <div className="flex items-center gap-2 max-w-full">
                                    <Layers className="w-3 h-3 text-indigo-300 flex-shrink-0" />
                                    <span className="truncate" title={ub.url}>{ub.url}</span>
                                </div>
                            </td>
                            {colConfig.showImp && <td className="px-4 py-2 align-top"><MetricCell current={p.impressions} prev={0} delta={dImp} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            {colConfig.showClicks && <td className="px-4 py-2 align-top"><MetricCell current={p.clicks} prev={0} delta={dClicks} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            {colConfig.showCtr && <td className="px-4 py-2 align-top"><MetricCell current={p.ctr} prev={0} delta={dCtr} isPercent={true} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            {colConfig.showPos && <td className="px-6 py-2 align-top"><MetricCell current={p.position} prev={0} delta={dPos} inverse={true} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            {colConfig.showBounce && <td className="px-4 py-2 align-top"><MetricCell current={colConfig.isLostModule ? ub.periodA.bounceRate || 0 : ub.periodB.bounceRate || 0} prev={0} delta={colConfig.isLostModule ? 0 : ub.diffBounce} inverse={true} isPercent={true} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            {colConfig.showTime && <td className="px-4 py-2 align-top"><MetricCell current={colConfig.isLostModule ? ub.periodA.sessionDuration || 0 : ub.periodB.sessionDuration || 0} prev={0} delta={colConfig.isLostModule ? 0 : ub.diffTime} isDuration={true} isLostMode={colConfig.isLostModule} isChild={true} /></td>}
                            <td colSpan={isAiEnabled ? 2 : 1}></td>
                        </tr>
                    )
            })}
        </React.Fragment>
    );
});


const ModuleResults: React.FC<ModuleResultsProps> = ({ 
    moduleId, rows, stats, lang, onBack, savedState, onSaveState, isAiEnabled, apiKeys, externalKeys, providerConfig, model, onUpdateRows 
}) => {
    
    const rawResults = useMemo(() => {
        return analyzeModule(moduleId, rows, stats);
    }, [moduleId, rows, stats]);

    const config = useMemo(() => {
        const defaults = { 
            imp: {min:0, max:100, start:0, end:100}, 
            pos: {min:1, max:100, start:1, end:100}, 
            ctr: {min:0, max:100, start:0, end:100} 
        };
        if (rawResults.length === 0) return defaults;

        let maxImp = 0, maxPos = 0, maxCtr = 0, minPos = 100;
        rawResults.forEach(r => {
            const ref = moduleId === 'LOST_KEYWORDS' ? r.periodA : r.periodB;
            if (ref.impressions > maxImp) maxImp = ref.impressions;
            if (ref.position > maxPos) maxPos = ref.position;
            if (ref.position < minPos) minPos = ref.position;
            if (ref.ctr > maxCtr) maxCtr = ref.ctr;
        });

        const absMaxImp = Math.ceil(maxImp * 1.1);
        const absMaxPos = Math.ceil(maxPos);
        const absMinPos = Math.floor(minPos);
        const absMaxCtr = Math.ceil(maxCtr + 1);

        return { 
            imp: { min: 0, max: absMaxImp, start: 0, end: absMaxImp },
            pos: { min: absMinPos, max: absMaxPos, start: absMinPos, end: absMaxPos },
            ctr: { min: 0, max: absMaxCtr, start: 0, end: absMaxCtr }
        };
    }, [rawResults, moduleId]);

    // UI States
    const [hiddenQueries, setHiddenQueries] = useState<Set<string>>(savedState ? new Set(savedState.hiddenQueries) : new Set());
    const [expandedQueries, setExpandedQueries] = useState<Set<string>>(savedState ? new Set(savedState.expandedQueries) : new Set());
    const [impRange, setImpRange] = useState<[number, number]>(savedState ? savedState.filters.imp : [config.imp.start, config.imp.end]); 
    const [posRange, setPosRange] = useState<[number, number]>(savedState ? savedState.filters.pos : [config.pos.start, config.pos.end]);
    const [ctrRange, setCtrRange] = useState<[number, number]>(savedState ? savedState.filters.ctr : [config.ctr.start, config.ctr.end]);
    const [sortKey, setSortKey] = useState<SortKey>((savedState ? savedState.sort.key : 'IMP') as SortKey);
    const [sortOrder, setSortOrder] = useState<SortOrder>((savedState ? savedState.sort.order : 'desc') as SortOrder);
    const [viewMode, setViewMode] = useState<ViewMode>(savedState?.viewMode || 'list');
    const [editorMode, setEditorMode] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // AI & Tool States
    const [activeApiKeys, setActiveApiKeys] = useState<string[]>(apiKeys);
    const [activeModel, setActiveModel] = useState(model);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState({ processed: 0, total: 0 });
    const [siteContext, setSiteContext] = useState('');
    const stopAnalysisRef = useRef(false);
    const [errorPopup, setErrorPopup] = useState<ErrorDetails | null>(null);
    
    const [analyzingTrendId, setAnalyzingTrendId] = useState<string | null>(null);
    const [trendResults, setTrendResults] = useState<Record<string, TrendAnalysis>>({});
    const [serpQuery, setSerpQuery] = useState<string | null>(null);

    useEffect(() => {
        setActiveApiKeys(apiKeys);
        setActiveModel(model);
    }, [apiKeys, model]);

    // Reset pagination on filter/sort change
    useEffect(() => {
        setCurrentPage(1);
    }, [impRange, posRange, ctrRange, sortKey, sortOrder, viewMode]);

    useEffect(() => {
        if (onSaveState) {
            onSaveState({
                hiddenQueries: Array.from(hiddenQueries),
                expandedQueries: Array.from(expandedQueries),
                filters: { imp: impRange, pos: posRange, ctr: ctrRange },
                sort: { key: sortKey, order: sortOrder },
                viewMode: viewMode
            });
        }
    }, [hiddenQueries, expandedQueries, impRange, posRange, ctrRange, sortKey, sortOrder, viewMode, onSaveState]);

    const activeResults = useMemo(() => rawResults.filter(r => !hiddenQueries.has(r.query)), [rawResults, hiddenQueries]);

    const processedResults = useMemo(() => {
        const isLost = moduleId === 'LOST_KEYWORDS';
        let res = activeResults.filter(r => {
            const ref = isLost ? r.periodA : r.periodB;
            if (ref.impressions < impRange[0] || ref.impressions > impRange[1]) return false;
            if (ref.position < posRange[0] || ref.position > posRange[1]) return false;
            if (ref.ctr < ctrRange[0] || ref.ctr > ctrRange[1]) return false;
            return true;
        });

        res.sort((a, b) => {
            let valA = 0, valB = 0;
            const refA = isLost ? a.periodA : a.periodB;
            const refB = isLost ? b.periodA : b.periodB;

            switch (sortKey) {
                case 'IMP': valA = refA.impressions; valB = refB.impressions; break;
                case 'IMP_DELTA': valA = a.diffImp; valB = b.diffImp; break;
                
                case 'CLICKS': valA = refA.clicks; valB = refB.clicks; break;
                case 'CLICKS_DELTA': valA = a.diffClicks; valB = b.diffClicks; break;
                
                case 'POS': valA = refA.position; valB = refB.position; break;
                case 'POS_DELTA': valA = a.diffPos; valB = b.diffPos; break;
                
                case 'CTR': valA = refA.ctr; valB = refB.ctr; break;
                case 'CTR_DELTA': valA = a.periodB.ctr - a.periodA.ctr; valB = b.periodB.ctr - b.periodA.ctr; break;
                
                case 'BOUNCE': valA = refA.bounceRate || 0; valB = refB.bounceRate || 0; break;
                case 'BOUNCE_DELTA': valA = a.diffBounce || 0; valB = b.diffBounce || 0; break;
                
                case 'DURATION': valA = refA.sessionDuration || 0; valB = refB.sessionDuration || 0; break;
                case 'DURATION_DELTA': valA = a.diffTime || 0; valB = b.diffTime || 0; break;
            }
            
            if (sortOrder === 'asc') return valA - valB;
            return valB - valA;
        });
        return res;
    }, [activeResults, impRange, posRange, ctrRange, sortKey, sortOrder, moduleId]);

    const totalPages = Math.ceil(processedResults.length / ITEMS_PER_PAGE);
    const paginatedResults = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return processedResults.slice(start, start + ITEMS_PER_PAGE);
    }, [processedResults, currentPage]);

    const summary = useMemo(() => ({
        count: processedResults.length,
        totalImp: processedResults.reduce((acc, r) => acc + (moduleId === 'LOST_KEYWORDS' ? r.periodA.impressions : r.periodB.impressions), 0)
    }), [processedResults, moduleId]);

    // --- AI HANDLERS ---

    const handleAiError = (error: any) => {
        console.error("Module AI Error:", error);
        let msg = error.message || "Unknown error";
        if (error.error && error.error.message) msg = error.error.message;
        const isQuota = JSON.stringify(error).includes('429') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
        
        setErrorPopup({
            title: isQuota ? 'API Quota Exceeded' : 'AI Analysis Error',
            cause: isQuota 
                ? (lang === 'es' ? 'Se ha alcanzado el límite de solicitudes de la API de Gemini.' : 'Gemini API request limit reached.')
                : (lang === 'es' ? 'Ocurrió un error inesperado al comunicarse con Gemini.' : 'An unexpected error occurred communicating with Gemini.'),
            solution: isQuota
                ? (lang === 'es' ? 'Agrega nuevas API Keys para continuar el análisis.' : 'Add new API Keys to resume analysis.')
                : (lang === 'es' ? 'Intenta de nuevo o verifica tu conexión.' : 'Try again or check connection.'),
            rawMessage: msg,
            isRecoverable: isQuota || true
        });
    };

    const handleRetryFromModal = (newKeys: string[], newModel: string) => {
        setErrorPopup(null);
        setActiveApiKeys([...newKeys]);
        setActiveModel(newModel);
        handleBatchAnalysis(newKeys, newModel);
    };

    const handleBatchAnalysis = async (overrideKeys?: string[], overrideModel?: string) => {
        const keysToUse = overrideKeys || activeApiKeys;
        const modelToUse = overrideModel || activeModel;

        if (keysToUse.length === 0) return;

        // Process only visible (filtered) rows that haven't been analyzed yet
        const rowsToAnalyze = processedResults.filter(r => !r.aiDiagnosis);
        const total = rowsToAnalyze.length;

        if (total === 0) {
            alert(lang === 'es' ? 'Todos los casos visibles ya han sido analizados.' : 'All visible cases have already been analyzed.');
            return;
        }

        setIsAnalyzing(true);
        stopAnalysisRef.current = false;
        setProgress({ processed: 0, total });

        const aiOptions: AiBatchOptions = {
            apiKeys: keysToUse, 
            externalKeys,
            providerConfig,
            lang,
            model: modelToUse,
            siteContext
        };

        try {
            for (let i = 0; i < total; i++) {
                if (stopAnalysisRef.current) break;
                
                const row = rowsToAnalyze[i];
                const res = await analyzeSeoCase(row, moduleId, aiOptions);
                
                if (res) {
                    // Update Row in place (needs to propagate up to parent if we want persistence)
                    row.aiDiagnosis = res.diagnosis;
                    row.aiActions = res.actions;
                    row.aiAnalyzed = true;
                }
                
                setProgress(prev => ({ ...prev, processed: i + 1 }));
                // Rate limit niceness
                await new Promise(r => setTimeout(r, 800));
            }
        } catch (error) {
            handleAiError(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSortSelect = (key: SortKey) => {
        setSortKey(key);
        setShowSortMenu(false);
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    };

    const handleSingleTrendAnalysis = async (query: string) => {
        if (!isAiEnabled || activeApiKeys.length === 0) return;
        setAnalyzingTrendId(query);
        const result = await analyzeKeywordTrend(query, activeApiKeys[0], lang);
        setTrendResults(prev => ({ ...prev, [query]: result }));
        setAnalyzingTrendId(null);
    };

    const handleDownloadCsv = () => {
        if (processedResults.length === 0) return;
        
        const csvRows = ["Query,URL,Status,RootCause,Diagnosis,ActionTitle,ActionContent,Imp,Pos"];
        
        processedResults.forEach(r => {
             const diag = r.aiDiagnosis;
             const act = r.aiActions?.[0];
             
             // Escape CSV fields
             const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
             
             csvRows.push([
                 esc(r.query),
                 esc(r.urlBreakdown[0]?.url),
                 esc(diag?.status),
                 esc(diag?.rootCause),
                 esc(diag?.explanation),
                 esc(act?.title),
                 esc(act?.content), // Include rich content
                 moduleId === 'LOST_KEYWORDS' ? r.periodA.impressions : r.periodB.impressions,
                 moduleId === 'LOST_KEYWORDS' ? r.periodA.position.toFixed(1) : r.periodB.position.toFixed(1)
             ].join(','));
        });
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${moduleId.toLowerCase()}_analysis.csv`;
        a.click();
    };
    
    const handleCleanPrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        
        const html = `
        <html>
        <head>
            <title>${t.moduleTitle} Report</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .status { font-weight: bold; padding: 2px 4px; border-radius: 4px; font-size: 10px; border: 1px solid #ccc; }
                @media print {
                    @page { margin: 1cm; size: landscape; }
                }
            </style>
        </head>
        <body>
            <h1>${t.moduleTitle}</h1>
            <table>
                <thead>
                    <tr>
                        <th>Query</th>
                        <th>URL</th>
                        <th>Status</th>
                        <th>Diagnosis</th>
                        <th>Action</th>
                        <th>Imp</th>
                        <th>Pos</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedResults.map(r => `
                        <tr>
                            <td>${r.query}</td>
                            <td>${r.urlBreakdown[0]?.url}</td>
                            <td>${r.aiDiagnosis ? `<span class="status">${r.aiDiagnosis.status}</span>` : ''}</td>
                            <td>${r.aiDiagnosis?.explanation || ''}</td>
                            <td>${r.aiActions?.[0]?.title || ''}</td>
                            <td>${moduleId === 'LOST_KEYWORDS' ? r.periodA.impressions : r.periodB.impressions}</td>
                            <td>${moduleId === 'LOST_KEYWORDS' ? r.periodA.position.toFixed(1) : r.periodB.position.toFixed(1)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <script>window.print();</script>
        </body>
        </html>
      `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // Handler for dismissing/deleting a task
    const handleDismiss = (query: string) => {
        setHiddenQueries(prev => {
            const n = new Set(prev);
            n.add(query);
            return n;
        });
    };

    const handleRowUpdate = (updatedRow: ComparisonRow) => {
        if (!onUpdateRows) return;
        const newRows = rows.map(r => r.query === updatedRow.query ? updatedRow : r);
        onUpdateRows(newRows);
    };

    const moduleInfo = MODULES.find(m => m.id === moduleId);
    const colConfig = getModuleConfig(moduleId);
    const t = {
        moduleTitle: moduleInfo?.title[lang] || moduleId,
        aiTrend: lang === 'es' ? 'Tendencia IA' : 'AI Trend',
        summaryCount: lang === 'es' ? 'Keywords' : 'Keywords',
        summaryImp: lang === 'es' ? 'Impresiones' : 'Impressions',
        sortBy: lang === 'es' ? 'Ordenar por' : 'Sort by',
        noData: lang === 'es' ? 'No se encontraron resultados.' : 'No results found.',
        page: lang === 'es' ? 'Página' : 'Page',
        of: lang === 'es' ? 'de' : 'of',
        listMode: lang === 'es' ? 'Ver Lista' : 'List View',
        taskMode: lang === 'es' ? 'Ver Tareas' : 'Task View',
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-6 animate-in fade-in duration-300">
            <ErrorModal error={errorPopup} onClose={() => setErrorPopup(null)} lang={lang} currentKeys={activeApiKeys} currentModel={activeModel} onRetry={handleRetryFromModal} />

            {/* Header & Controls */}
            <div className="mb-6 flex flex-col gap-6">
                <div className="flex items-start gap-4">
                    <button onClick={onBack} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 bg-white shadow-sm"><LayoutGrid className="w-5 h-5" /></button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 leading-tight flex items-center gap-2">
                            {t.moduleTitle}
                            <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">{summary.count}</span>
                        </h2>
                        {moduleInfo && <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5" />{moduleInfo.description[lang]}</p>}
                    </div>
                </div>

                {isAiEnabled && (
                    <AiControlBar 
                        lang={lang}
                        isAnalyzing={isAnalyzing}
                        progress={progress}
                        onStart={() => handleBatchAnalysis()}
                        onStop={() => stopAnalysisRef.current = true}
                        apiKey={activeApiKeys[0] || '***'}
                        setApiKey={() => {}} 
                        model={activeModel}
                        setModel={setActiveModel}
                        siteContext={siteContext}
                        setSiteContext={setSiteContext}
                    />
                )}
                
                {/* View Mode Toggle */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setEditorMode(!editorMode)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${editorMode ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                            {editorMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{editorMode ? 'Exit Editor' : 'Editor'}
                        </button>
                    </div>

                     <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <List className="w-3.5 h-3.5" />{t.listMode}
                        </button>
                        <button onClick={() => setViewMode('tasks')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'tasks' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Layers className="w-3.5 h-3.5" />{t.taskMode}
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-wrap items-center gap-6">
                    {/* Filters & Ranges */}
                    <div className="flex items-center gap-2 mr-2 text-slate-400"><Filter className="w-4 h-4" /></div>
                    <div className="flex gap-8 sm:gap-12 flex-wrap flex-1">
                        {colConfig.showImp && <RangeSlider label="Impresiones" min={config.imp.min} max={config.imp.max} initialStart={impRange[0]} initialEnd={impRange[1]} onChange={setImpRange} formatLabel={(v) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(v)} />}
                        {colConfig.showPos && <RangeSlider label="Position" min={config.pos.min} max={config.pos.max} initialStart={posRange[0]} initialEnd={posRange[1]} onChange={setPosRange} />}
                        {colConfig.showCtr && <RangeSlider label="CTR (%)" min={config.ctr.min} max={config.ctr.max} initialStart={ctrRange[0]} initialEnd={ctrRange[1]} onChange={setCtrRange} />}
                    </div>
                    
                    {/* Summary & Buttons */}
                    <div className="flex items-center gap-4 ml-auto border-l border-gray-100 pl-4">
                         <div className="hidden lg:flex flex-col items-end mr-2">
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{t.summaryImp}</span>
                             <span className="text-sm font-bold text-slate-700">{new Intl.NumberFormat('en-US', { notation: "compact" }).format(summary.totalImp)}</span>
                         </div>
                         
                         {viewMode === 'list' && (
                             <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                 <div className="relative">
                                     <button onClick={() => setShowSortMenu(!showSortMenu)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 rounded hover:bg-white transition-all">
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                        <span>{sortKey.replace('_', ' ')}</span>
                                     </button>
                                     {showSortMenu && (
                                         <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1 overflow-hidden">
                                             <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border-b border-gray-100">{t.sortBy}</div>
                                             <div className="max-h-64 overflow-y-auto">
                                                {/* Metrics */}
                                                <div className="px-3 py-1 text-[9px] font-bold text-indigo-400 uppercase tracking-wide mt-1">Metrics</div>
                                                <button onClick={() => handleSortSelect('IMP')} className="w-full text-left px-4 py-1.5 text-xs hover:bg-indigo-50 text-slate-700">Impressions</button>
                                                {/* ... other sort options */}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                                 <div className="w-px h-4 bg-slate-200"></div>
                                 <button 
                                    onClick={toggleSortOrder}
                                    className="p-1.5 hover:bg-white rounded text-slate-500 hover:text-indigo-600 transition-colors"
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
                                 </button>
                             </div>
                         )}

                         <button onClick={handleCleanPrint} className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 border border-transparent hover:border-gray-200 transition-all"><Printer className="w-4 h-4" /></button>
                         <button onClick={handleDownloadCsv} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all"><Download className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {/* Table or Task View */}
            {viewMode === 'tasks' ? (
                <TaskView 
                    mode="GENERIC" 
                    rows={processedResults} 
                    lang={lang} 
                    isEditorMode={editorMode} 
                    onDismiss={handleDismiss}
                    onUpdateRow={handleRowUpdate}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px] flex flex-col">
                    {processedResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-slate-400 py-20"><Ban className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm font-medium">{t.noData}</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                                            <th className="px-6 py-3 w-[35%]">Query / URL</th>
                                            {colConfig.showImp && <th className="px-4 py-3 text-right w-[10%]">Imp</th>}
                                            {colConfig.showClicks && <th className="px-4 py-3 text-right w-[8%]">Clicks</th>}
                                            {colConfig.showCtr && <th className="px-4 py-3 text-right w-[8%]">CTR</th>}
                                            {colConfig.showPos && <th className="px-6 py-3 text-right w-[10%]">Pos</th>}
                                            {colConfig.showBounce && <th className="px-4 py-3 text-right w-[8%]">Bounce</th>}
                                            {colConfig.showTime && <th className="px-4 py-3 text-right w-[8%]">Time</th>}
                                            {isAiEnabled && <th className="px-4 py-3 text-center w-[10%]">{t.aiTrend}</th>}
                                            <th className="px-4 py-3 w-[5%]"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-sm">
                                        {paginatedResults.map((row, idx) => (
                                            <ModuleRow 
                                                key={`${row.query}-${idx}`}
                                                row={row}
                                                colConfig={colConfig}
                                                isAiEnabled={isAiEnabled}
                                                trendResult={trendResults[row.query]}
                                                onTrendAnalysis={() => handleSingleTrendAnalysis(row.query)}
                                                onHide={() => handleDismiss(row.query)}
                                                onSerp={setSerpQuery}
                                                onToggleExpand={() => setExpandedQueries(prev => { const n = new Set(prev); n.has(row.query) ? n.delete(row.query) : n.add(row.query); return n; })}
                                                isExpanded={expandedQueries.has(row.query)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                             {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-slate-50/50">
                                    <div className="text-xs text-slate-500">
                                        Showing <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, processedResults.length)}</span> {t.of} <span className="font-medium">{processedResults.length}</span> results
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
                                        <span className="text-xs font-bold text-slate-700 px-2">{t.page} {currentPage} / {totalPages}</span>
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors text-slate-600"><ChevronRight className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {serpQuery && <SerpPreview query={serpQuery} lang={lang} onClose={() => setSerpQuery(null)} />}
        </div>
    );
};

export default ModuleResults;
