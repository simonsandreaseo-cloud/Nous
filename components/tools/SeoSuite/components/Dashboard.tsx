
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CannibalizationGroup, SortField, SortOrder, Language, AiActionCategory, ViewMode, ExternalApiKeys, ProviderConfig } from '../types';
import KeywordRow from './KeywordRow';
import TaskView from './TaskView';
import { ArrowUpDown, AlertTriangle, FileBarChart2, ChevronLeft, ChevronRight, TrendingDown, Loader2, Download, Printer, Edit3, Save, XCircle, X, Play, RefreshCw, List, Layers, ShieldCheck, Filter, ChevronDown, Search } from 'lucide-react';
import { analyzeBatchWithAi, auditConflictsWithAi, AVAILABLE_MODELS } from '../services/aiService';
import AiControlBar from './AiControlBar';
import RangeSlider from './RangeSlider';
import ErrorModal, { ErrorDetails } from './ErrorModal';

interface DashboardProps {
  groups: CannibalizationGroup[];
  onReset: () => void;
  lang: Language;
  onUpdateGroups: (updatedGroups: CannibalizationGroup[]) => void;
  isAiEnabled: boolean;
  apiKeys: string[];
  externalKeys: ExternalApiKeys;
  providerConfig: ProviderConfig;
  model: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    groups, onReset, lang, onUpdateGroups, isAiEnabled, apiKeys: globalKeys, externalKeys: globalExtKeys, providerConfig, model: globalModel 
}) => {
  const [sortBy, setSortBy] = useState<SortField>(SortField.IMPRESSIONS);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  
  // OPTIMIZATION: Debounce filter text
  const [filterText, setFilterText] = useState('');
  const [debouncedFilterText, setDebouncedFilterText] = useState('');
  const [urlFilterText, setUrlFilterText] = useState('');
  const [debouncedUrlFilterText, setDebouncedUrlFilterText] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editorMode, setEditorMode] = useState(false);
  const [siteContext, setSiteContext] = useState('');
  const [errorPopup, setErrorPopup] = useState<ErrorDetails | null>(null);
  
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  // Filter Ranges State
  const [impRange, setImpRange] = useState<[number, number]>([0, 0]);
  const [ctrRange, setCtrRange] = useState<[number, number]>([0, 100]);
  const [posRange, setPosRange] = useState<[number, number]>([0, 100]);
  const [rangeConfig, setRangeConfig] = useState({
      imp: { min: 0, max: 1000 },
      ctr: { min: 0, max: 100 },
      pos: { min: 1, max: 100 }
  });

  // Debounce logic
  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedFilterText(filterText);
    }, 300); // 300ms delay
    return () => clearTimeout(handler);
  }, [filterText]);

  useEffect(() => {
    const handler = setTimeout(() => {
        setDebouncedUrlFilterText(urlFilterText);
    }, 300);
    return () => clearTimeout(handler);
  }, [urlFilterText]);

  useEffect(() => {
      if (groups.length === 0) return;
      let maxImp = 0;
      let maxPos = 0;
      groups.forEach(g => {
          if (g.totalImpressions > maxImp) maxImp = g.totalImpressions;
          if (g.weightedAvgPosition > maxPos) maxPos = g.weightedAvgPosition;
      });
      maxImp = Math.ceil(maxImp * 1.1);
      maxPos = Math.ceil(maxPos + 5);

      setRangeConfig({
          imp: { min: 0, max: maxImp },
          ctr: { min: 0, max: 100 },
          pos: { min: 1, max: maxPos }
      });
      // Only set initial ranges if they were default
      if (impRange[1] === 0) setImpRange([0, maxImp]);
      if (posRange[1] === 100 && maxPos > 100) setPosRange([1, maxPos]);
  }, [groups]);

  // AI State
  const [activeApiKeys, setActiveApiKeys] = useState<string[]>(globalKeys);
  const [activeModel, setActiveModel] = useState(globalModel);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const stopAnalysisRef = useRef(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setActiveApiKeys(globalKeys);
    setActiveModel(globalModel);
  }, [globalKeys, globalModel]);

  const activeGroups = useMemo(() => groups.filter(g => !g.isExcluded), [groups]);
  
  const sortedAndFilteredGroups = useMemo(() => {
    let result = activeGroups;
    
    // Filtering (Expensive operation, so we use debounced values)
    if (debouncedFilterText) {
      const lower = debouncedFilterText.toLowerCase();
      result = result.filter(g => g.query.toLowerCase().includes(lower));
    }
    if (debouncedUrlFilterText) {
      const lowerUrl = debouncedUrlFilterText.toLowerCase();
      result = result.filter(g => g.urls.some(u => u.url.toLowerCase().includes(lowerUrl)));
    }

    result = result.filter(g => 
        g.totalImpressions >= impRange[0] && g.totalImpressions <= impRange[1] &&
        g.weightedAvgPosition >= posRange[0] && g.weightedAvgPosition <= posRange[1] &&
        g.avgCtr >= ctrRange[0] && g.avgCtr <= ctrRange[1]
    );

    return result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      if (sortBy === SortField.QUERY) {
        valA = (valA as string).toLowerCase();
        valB = (valB as string).toLowerCase();
      }
      if (valA < valB) return sortOrder === SortOrder.ASC ? -1 : 1;
      if (valA > valB) return sortOrder === SortOrder.ASC ? 1 : -1;
      return 0;
    });
  }, [activeGroups, sortBy, sortOrder, debouncedFilterText, debouncedUrlFilterText, impRange, posRange, ctrRange]);

  const totalIssues = sortedAndFilteredGroups.length;
  const paginatedGroups = useMemo(() => {
      return sortedAndFilteredGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedAndFilteredGroups, currentPage]);
  
  const totalPages = Math.ceil(sortedAndFilteredGroups.length / itemsPerPage);

  const t = {
    issuesFound: lang === 'es' ? 'Canibalizaciones' : 'Issues Found',
    wastedImp: lang === 'es' ? 'Impresiones Totales' : 'Total Impressions',
    lostClicks: lang === 'es' ? 'Clics Perdidos (Est.)' : 'Lost Clicks (Est.)',
    uploadBtn: lang === 'es' ? 'Nuevo Archivo' : 'New File',
    filterPlaceholder: lang === 'es' ? 'Filtrar palabras clave...' : 'Filter keywords...',
    filterUrlPlaceholder: lang === 'es' ? 'Filtrar por URL...' : 'Filter by URL...',
    sortBy: lang === 'es' ? 'Ordenar por:' : 'Sort by:',
    sortImp: lang === 'es' ? 'Impresiones' : 'Impressions',
    sortClicks: lang === 'es' ? 'Clics' : 'Clicks',
    sortCtr: 'CTR',
    sortPos: lang === 'es' ? 'Posición' : 'Position',
    sortLost: lang === 'es' ? 'Oportunidad' : 'Opportunity',
    noResults: lang === 'es' ? 'No se encontraron resultados.' : 'No results found.',
    page: lang === 'es' ? 'Página' : 'Page',
    of: lang === 'es' ? 'de' : 'of',
    exportCsv: lang === 'es' ? 'CSV' : 'CSV',
    listMode: lang === 'es' ? 'Ver Lista' : 'List View',
    taskMode: lang === 'es' ? 'Ver Tareas' : 'Task View',
    auditConflicts: lang === 'es' ? 'Auditar Conflictos' : 'Audit Conflicts',
    auditing: lang === 'es' ? 'Auditando...' : 'Auditing...',
    printSimple: lang === 'es' ? 'Reporte Simple (Tabla)' : 'Simple Report (Table)',
    printVisual: lang === 'es' ? 'Reporte Visual (Tarjetas)' : 'Visual Report (Cards)',
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedFilterText, debouncedUrlFilterText, sortBy, sortOrder, viewMode, impRange, posRange, ctrRange]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === SortOrder.DESC ? SortOrder.ASC : SortOrder.DESC);
    } else {
      setSortBy(field);
      setSortOrder(SortOrder.DESC);
    }
  };

  const handleDownloadCsv = () => {
    if (activeGroups.length === 0) return;
    const header = "Query,URL,Tag,Impressions,Clicks,CTR,Position\n";
    const rows = activeGroups.flatMap(g => 
        g.urls.map(u => `"${g.query}","${u.url}","${u.aiTag || ''}",${u.impressions},${u.clicks},${u.ctr},${u.position}`)
    );
    const csvContent = header + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cannibalization_analysis.csv';
    a.click();
  };

  const handlePrintClean = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>SEO Cannibalization Report</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                table { border-collapse: collapse; width: 100%; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .tag { font-weight: bold; padding: 2px 4px; border-radius: 4px; font-size: 10px; border: 1px solid #ccc; }
                @media print {
                    @page { margin: 1cm; size: landscape; }
                }
            </style>
        </head>
        <body>
            <h1>SEO Cannibalization Analysis</h1>
            <table>
                <thead>
                    <tr>
                        <th>Query</th>
                        <th>URL</th>
                        <th>Action/Tag</th>
                        <th>Imp</th>
                        <th>Clicks</th>
                        <th>Pos</th>
                    </tr>
                </thead>
                <tbody>
                    ${activeGroups.flatMap(g => g.urls.map(u => `
                        <tr>
                            <td>${g.query}</td>
                            <td>${u.url}</td>
                            <td>${u.aiTag ? `<span class="tag">${u.aiTag}</span>` : ''}</td>
                            <td>${u.impressions}</td>
                            <td>${u.clicks}</td>
                            <td>${u.position.toFixed(1)}</td>
                        </tr>
                    `)).join('')}
                </tbody>
            </table>
            <script>
                setTimeout(function() {
                    window.focus();
                    window.print();
                }, 500);
            </script>
        </body>
        </html>
      `;
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
  };

  const handlePrintVisual = () => {
      setTimeout(() => {
          window.print();
      }, 100);
  };

  const handleDeleteGroup = (query: string) => {
      const updated = groups.map(g => g.query === query ? { ...g, isExcluded: true } : g);
      onUpdateGroups(updated);
  };

  const handleGroupUpdate = (updatedGroup: CannibalizationGroup) => {
      const updated = groups.map(g => g.query === updatedGroup.query ? updatedGroup : g);
      onUpdateGroups(updated);
  };

  const handleUrlTagUpdate = (groupQuery: string, url: string, newTag: string) => {
      const updatedGroups = groups.map(group => {
          if (group.query !== groupQuery) return group;
          
          let newWinner = group.winnerUrl;
          if (newTag.toLowerCase().includes('winner') || newTag.toLowerCase().includes('ganadora')) {
              newWinner = url;
          }

          const updatedUrls = group.urls.map(u => {
              if (u.url === url) {
                  return { ...u, aiTag: newTag };
              }
              return u;
          });

          return { ...group, urls: updatedUrls, winnerUrl: newWinner };
      });
      onUpdateGroups(updatedGroups);
  };

  const processAiResults = (results: any[], currentGroups: CannibalizationGroup[]) => {
     const resultsMap = new Map(results.map(r => [r.query, r]));
     return currentGroups.map(group => {
        const res = resultsMap.get(group.query);
        if (res) {
            const urlMap = new Map(res.classifications.map((c: any) => [c.url, c.tag]));
            let winner = group.winnerUrl;
            
            let updatedUrls = group.urls.map(u => {
                const tag = urlMap.get(u.url);
                if (tag && ((tag as string).toUpperCase().includes('WINNER') || (tag as string).toUpperCase().includes('GANADORA'))) {
                    winner = u.url;
                }
                return { ...u, aiTag: tag as string };
            });

             const hasNegativeAction = updatedUrls.some(u => {
                 const t = (u.aiTag || '').toUpperCase();
                 return t.includes('REDIRECT') || t.includes('MERGE') || t.includes('DE-OPTIMIZE');
             });

             const hasExplicitWinner = updatedUrls.some(u => {
                 const t = (u.aiTag || '').toUpperCase();
                 return t.includes('WINNER') || t.includes('GANADORA');
             });

             if (hasNegativeAction && !hasExplicitWinner) {
                 const survivors = updatedUrls.filter(u => {
                     const t = (u.aiTag || '').toUpperCase();
                     return !t.includes('REDIRECT') && !t.includes('MERGE') && !t.includes('DE-OPTIMIZE');
                 });

                 if (survivors.length > 0) {
                     const bestSurvivor = survivors.sort((a,b) => b.impressions - a.impressions)[0];
                     winner = bestSurvivor.url;
                     updatedUrls = updatedUrls.map(u => {
                         if (u.url === bestSurvivor.url) {
                             return { ...u, aiTag: lang === 'es' ? 'GANADORA' : 'WINNER' };
                         }
                         return u;
                     });
                 }
             }

             if (!winner && hasNegativeAction) {
                 const sorted = [...updatedUrls].sort((a,b) => b.impressions - a.impressions);
                 if (sorted.length > 0) {
                     winner = sorted[0].url;
                     const t = (sorted[0].aiTag || '').toUpperCase();
                     if (!t.includes('REDIRECT')) {
                         updatedUrls = updatedUrls.map(u => u.url === winner ? { ...u, aiTag: lang === 'es' ? 'GANADORA' : 'WINNER' } : u);
                     }
                 }
             }

            return {
                ...group,
                urls: updatedUrls,
                winnerUrl: winner, 
                aiReasoning: "AI Analysis Completed via Expert Mode (Master Logic)",
                marketAnalysis: res.market_analysis 
            };
        }
        return group;
     });
  };

  const handleAiError = (error: any) => {
        console.error("Dashboard AI Error:", error);
        
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

  const handleAiAnalysis = async (overrideKeys?: string[], overrideModel?: string) => {
    const keysToUse = overrideKeys || activeApiKeys;
    const modelToUse = overrideModel || activeModel;

    if (keysToUse.length === 0) return;

    setIsAnalyzing(true);
    stopAnalysisRef.current = false;

    // Filter active groups that need analysis
    const groupsToAnalyze = sortedAndFilteredGroups.filter(g => !g.urls.some(u => u.aiTag));
    const total = groupsToAnalyze.length;
    
    if (total === 0) {
        alert(lang === 'es' ? 'Los grupos visibles ya han sido analizados.' : 'Visible groups have already been analyzed.');
        setIsAnalyzing(false);
        return;
    }

    setProgress({ processed: 0, total });

    const BATCH_SIZE = 1; 
    let processedCount = 0;
    
    // Create a local copy to update iteratively without waiting for React state update cycles
    let currentGroupsState = [...groups];

    try {
        for (let i = 0; i < groupsToAnalyze.length; i += BATCH_SIZE) {
            if (stopAnalysisRef.current) break;

            const batch = groupsToAnalyze.slice(i, i + BATCH_SIZE);
            
            const results = await analyzeBatchWithAi(batch, { 
                apiKeys: keysToUse, 
                externalKeys: globalExtKeys,
                providerConfig,
                lang, 
                siteContext, 
                model: modelToUse 
            });
            
            // Process results into the main list
            currentGroupsState = processAiResults(results, currentGroupsState);
            processedCount += batch.length;
            
            // Update UI State periodically
            setProgress({ processed: processedCount, total });
            onUpdateGroups([...currentGroupsState]); // Pass a new array reference
        }
    } catch (error) {
        handleAiError(error);
    } finally {
        setIsAnalyzing(false);
        stopAnalysisRef.current = false;
    }
  };

  const handleAuditConflicts = async () => { /* ... */ };
  
  const handleRetryFromModal = (newKeys: string[], newModel: string) => {
      setErrorPopup(null);
      setActiveApiKeys([...newKeys]);
      setActiveModel(newModel);
      handleAiAnalysis(newKeys, newModel);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 animate-in fade-in duration-500">
      
      <div className="print:hidden">
        {isAiEnabled && (
            <AiControlBar 
                lang={lang}
                isAnalyzing={isAnalyzing}
                progress={progress}
                onStart={() => handleAiAnalysis()}
                onStop={() => stopAnalysisRef.current = true}
                apiKey={activeApiKeys[0] || '***'}
                setApiKey={() => {}} 
                model={activeModel}
                setModel={setActiveModel}
                siteContext={siteContext}
                setSiteContext={setSiteContext}
            >
                <button 
                    onClick={handleAuditConflicts}
                    disabled={isAnalyzing || isAuditing}
                    className="w-full mt-1 px-4 py-1.5 bg-indigo-800/50 hover:bg-indigo-800 text-indigo-100 rounded-lg text-xs font-medium border border-indigo-400/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isAuditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                    {isAuditing ? t.auditing : t.auditConflicts}
                </button>
            </AiControlBar>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 print:hidden">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
                <div className="p-2.5 bg-amber-50 rounded-lg mr-3"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
                <div>
                    <div className="text-xl font-bold text-slate-800">{new Intl.NumberFormat('en-US').format(totalIssues)}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t.issuesFound}</div>
                </div>
            </div>
            
            {/* Filters */}
            <div className="col-span-2 bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
                 <div className="relative flex-1">
                     <input 
                        type="text" 
                        placeholder={t.filterPlaceholder}
                        value={filterText}
                        onChange={(e) => setFilterText(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                     <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                 </div>
                 <div className="relative flex-1">
                     <input 
                        type="text" 
                        placeholder={t.filterUrlPlaceholder}
                        value={urlFilterText}
                        onChange={(e) => setUrlFilterText(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                     />
                     <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                 </div>
            </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6 items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm print:hidden">
         <div className="flex flex-wrap gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <List className="w-3.5 h-3.5" />{t.listMode}
                </button>
                <button onClick={() => setViewMode('tasks')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all ${viewMode === 'tasks' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Layers className="w-3.5 h-3.5" />{t.taskMode}
                </button>
            </div>
            <button onClick={() => setEditorMode(!editorMode)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${editorMode ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>
                {editorMode ? <Save className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}{editorMode ? 'Exit Editor' : 'Editor'}
            </button>
         </div>
         <div className="flex gap-2 relative">
             <div className="relative group">
                 <button 
                    onClick={() => setShowPrintMenu(!showPrintMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium"
                 >
                     <Printer className="w-4 h-4" /> Print
                     <ChevronDown className="w-3 h-3 ml-1" />
                 </button>
                 {showPrintMenu && (
                     <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                         <button 
                             onClick={() => { handlePrintClean(); setShowPrintMenu(false); }}
                             className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600"
                         >
                             {t.printSimple}
                         </button>
                         <button 
                             onClick={() => { handlePrintVisual(); setShowPrintMenu(false); }}
                             className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border-t border-gray-100"
                         >
                             {t.printVisual}
                         </button>
                     </div>
                 )}
                 {showPrintMenu && <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />}
             </div>

             <button onClick={handleDownloadCsv} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-100 text-sm font-medium">
                 <Download className="w-4 h-4" /> CSV
             </button>
         </div>
      </div>
      
      <ErrorModal error={errorPopup} onClose={() => setErrorPopup(null)} lang={lang} currentKeys={activeApiKeys} currentModel={activeModel} onRetry={handleRetryFromModal} />

      {viewMode === 'tasks' ? (
          <TaskView 
              mode="CANNIBALIZATION"
              groups={sortedAndFilteredGroups} 
              lang={lang} 
              isEditorMode={editorMode} 
              onUpdateUrlTag={handleUrlTagUpdate} 
          />
      ) : (
          <div className="space-y-3 min-h-[400px]">
            {sortedAndFilteredGroups.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-500">{t.noResults}</p></div>
            ) : (
                paginatedGroups.map((group, idx) => (
                    <KeywordRow key={`${group.query}-${idx}`} group={group} lang={lang} onAnalyze={() => { if(isAiEnabled) handleAiAnalysis([], undefined) }} isAnalyzing={false} onDelete={() => handleDeleteGroup(group.query)} onUpdate={handleGroupUpdate} onUpdateUrlTag={(url, newTag) => handleUrlTagUpdate(group.query, url, newTag)} isEditorMode={editorMode} forceExpand={viewMode === 'tasks'} />
                ))
            )}
          </div>
      )}

      {viewMode === 'list' && totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 gap-4 print:hidden">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white disabled:hover:bg-transparent transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
          <span className="text-sm text-slate-600 font-medium">{t.page} {currentPage} {t.of} {totalPages}</span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 hover:bg-white disabled:hover:bg-transparent transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
