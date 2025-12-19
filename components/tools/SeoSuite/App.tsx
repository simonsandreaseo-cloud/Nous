
import React, { useState, useCallback } from 'react';
import { parseCSV, detectCannibalization, processComparisonData } from './services/csvProcessor';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ModuleSelector from './components/ModuleSelector';
import ModuleResults from './components/ModuleResults';
import ClusterView from './components/ClusterView';
import ModeSelector from './components/ModeSelector';
import AutoTaskDashboard from './components/AutoTaskDashboard';
import GlobalTaskDashboard from './components/GlobalTaskDashboard';
import ApiKeySetup from './components/ApiKeySetup';
import { CannibalizationGroup, Language, DataSourceMode, ModuleId, ComparisonRow, GlobalSiteStats, ModuleState, ExternalApiKeys, ProviderConfig, AutoTaskSession } from './types';
import { LayoutGrid, Key } from 'lucide-react';
import { AVAILABLE_MODELS } from './services/aiService';

const App: React.FC = () => {
  // Global Data State
  // OPTIMIZATION: rawData is cleared after processing to save memory
  const [hasData, setHasData] = useState(false);
  
  // Specific Data States (Calculated once)
  const [cannibalizationGroups, setCannibalizationGroups] = useState<CannibalizationGroup[] | null>(null);
  const [comparisonRows, setComparisonRows] = useState<ComparisonRow[] | null>(null);
  const [siteStats, setSiteStats] = useState<GlobalSiteStats | null>(null);

  // UI State
  const [isProcessing, setIsProcessing] = useState(false);
  const [lang, setLang] = useState<Language>('es');
  const [dataSourceMode, setDataSourceMode] = useState<DataSourceMode>('csv');
  
  // App Logic State
  const [selectedMode, setSelectedMode] = useState<1 | 2 | 3 | 4 | null>(null);
  const [isAiEnabled, setIsAiEnabled] = useState(false);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [currentModule, setCurrentModule] = useState<ModuleId | 'GLOBAL_TASKS' | null>(null);
  
  // API Keys & Config
  const [apiKeys, setApiKeys] = useState<string[]>([]);
  const [externalKeys, setExternalKeys] = useState<ExternalApiKeys>({});
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>({ reader: 'JINA', serp: 'JINA', clustering: 'GEMINI' });
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0]);
  
  // Persistence State
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>({});
  const [autoTaskSession, setAutoTaskSession] = useState<AutoTaskSession | null>(null);

  const handleDataLoaded = useCallback((csvText: string) => {
    setIsProcessing(true);
    // Use setTimeout to allow UI to render spinner before heavy blocking thread work
    setTimeout(() => {
      try {
        const parsed = parseCSV(csvText);
        
        // 1. Run Cannibalization Logic (Full Dataset snapshot)
        const cGroups = detectCannibalization(parsed);
        setCannibalizationGroups(cGroups);

        // 2. Run Comparison/Period Logic
        const compData = processComparisonData(parsed);
        setComparisonRows(compData.comparisonRows);
        setSiteStats(compData.globalStats);
        
        // Reset module states on new file load
        setModuleStates({});
        setAutoTaskSession(null);
        setHasData(true);

        // OPTIMIZATION: Explicitly allow GC to collect the huge CSV string and parsed intermediate array
        // We only keep the processed groups and rows.

      } catch (error) {
        console.error("Error processing CSV:", error);
        alert(lang === 'es' 
          ? "Error al procesar CSV. Asegúrate de que coincida con el formato de GSC." 
          : "Failed to parse CSV. Please ensure it matches the GSC export format.");
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  }, [lang]);

  const handleReset = () => {
    setHasData(false);
    setCannibalizationGroups(null);
    setComparisonRows(null);
    setSiteStats(null);
    setCurrentModule(null);
    setSelectedMode(null);
    setIsAiEnabled(false);
    setShowKeySetup(false);
    setModuleStates({});
    setAutoTaskSession(null);
  };

  const handleUpdateGroups = (updatedGroups: CannibalizationGroup[]) => {
      setCannibalizationGroups(updatedGroups);
  };

  const handleUpdateRows = (updatedRows: ComparisonRow[]) => {
      setComparisonRows(updatedRows);
  };
  
  const handleSaveModuleState = (moduleId: ModuleId, state: ModuleState) => {
      setModuleStates(prev => ({
          ...prev,
          [moduleId]: state
      }));
  };

  const handleSaveAutoTaskSession = (session: AutoTaskSession) => {
      setAutoTaskSession(session);
  };

  const toggleLang = () => {
    setLang(prev => prev === 'es' ? 'en' : 'es');
  };

  const handleModeSelection = (mode: 1 | 2 | 3 | 4) => {
      if (mode === 4) {
          // Raw Data Mode - No AI, No Keys
          setIsAiEnabled(false);
          setSelectedMode(mode);
          setShowKeySetup(false);
      } else {
          // Expert, Auto, or Report - Requires Keys
          // Check if we already have keys
          if (apiKeys.length > 0) {
              setIsAiEnabled(true);
              setSelectedMode(mode);
              setShowKeySetup(false);
          } else {
              // Keys needed
              setSelectedMode(mode); // Pre-select
              setShowKeySetup(true);
          }
      }
  };

  const handleKeysConfirmed = (data: { geminiKeys: string[], externalKeys: ExternalApiKeys, providerConfig: ProviderConfig, model: string }) => {
      setApiKeys(data.geminiKeys);
      setExternalKeys(data.externalKeys);
      setProviderConfig(data.providerConfig);
      setSelectedModel(data.model);
      setIsAiEnabled(true);
      setShowKeySetup(false);
  };

  const handleKeysCanceled = () => {
      setShowKeySetup(false);
      setSelectedMode(null);
      setIsAiEnabled(false);
      // Keep keys if they exist in state, just cancel modal
  };

  const t = {
    title: 'SEO Suite',
    processing: lang === 'es' ? 'Analizando datos...' : 'Analyzing data...',
    footer: lang === 'es' 
      ? 'El procesamiento ocurre enteramente en tu navegador. No se suben datos a ningún servidor.' 
      : 'Processing happens entirely in your browser. No data is uploaded to any server.',
    brand: 'Simon SEO',
    manageKeys: lang === 'es' ? 'Gestionar Keys' : 'Manage Keys'
  };

  // Render Logic
  const renderContent = () => {
      if (isProcessing) {
          return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium animate-pulse">{t.processing}</p>
                </div>
            </div>
          );
      }

      if (!hasData) {
          return (
            <FileUpload 
                onDataLoaded={handleDataLoaded} 
                lang={lang} 
                mode={dataSourceMode}
                setMode={setDataSourceMode}
            />
          );
      }

      // If keys setup is active (Overlay)
      if (showKeySetup) {
          return (
              <ApiKeySetup 
                  lang={lang}
                  onComplete={handleKeysConfirmed}
                  onCancel={handleKeysCanceled}
                  initialGeminiKeys={apiKeys}
                  initialExternalKeys={externalKeys}
                  initialProviderConfig={providerConfig}
                  initialModel={selectedModel}
              />
          );
      }

      // If data loaded but mode not finalized (or waiting for key setup which is handled above)
      if (!selectedMode) {
          return <ModeSelector onSelectMode={handleModeSelection} lang={lang} />;
      }

      // MODE 3: Analytic Report (Placeholder)
      if (selectedMode === 3) {
          return (
              <div className="max-w-4xl mx-auto py-20 text-center">
                  <div className="bg-emerald-50 p-6 rounded-full inline-block mb-4">
                      <LayoutGrid className="w-12 h-12 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Analytic Report Generator</h2>
                  <p className="text-slate-500">Coming soon. This module will generate a PDF report.</p>
                  <button onClick={() => setSelectedMode(null)} className="mt-6 px-4 py-2 text-sm text-slate-600 hover:text-indigo-600">Back</button>
              </div>
          );
      }

      // MODE 2: Auto Task Dashboard
      if (selectedMode === 2) {
          if (!siteStats || !comparisonRows || !cannibalizationGroups) return <div>Loading Stats...</div>;
          return (
              <AutoTaskDashboard 
                 cannibalizationGroups={cannibalizationGroups}
                 comparisonRows={comparisonRows}
                 stats={siteStats}
                 lang={lang}
                 apiKeys={apiKeys}
                 externalKeys={externalKeys}
                 providerConfig={providerConfig}
                 onBack={() => setSelectedMode(null)}
                 initialModel={selectedModel}
                 onUpdateGroups={handleUpdateGroups}
                 onUpdateRows={handleUpdateRows}
                 session={autoTaskSession}
                 onSaveSession={handleSaveAutoTaskSession}
              />
          );
      }

      // MODE 1 & 4: Expert Mode / Raw Data Mode
      if (!currentModule) {
          return (
            <div>
                 <div className="max-w-6xl mx-auto px-4 pt-4">
                    <button onClick={() => setSelectedMode(null)} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        {lang === 'es' ? 'Volver a Modos' : 'Back to Modes'}
                    </button>
                </div>
                <ModuleSelector onSelect={setCurrentModule} lang={lang} />
            </div>
          );
      }

      // If Cannibalization selected
      if (currentModule === 'CANNIBALIZATION') {
          return (
            <div className="animate-in fade-in duration-300">
                <div className="max-w-6xl mx-auto px-4 pt-4">
                    <button onClick={() => setCurrentModule(null)} className="flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors">
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        {lang === 'es' ? 'Volver al Menú' : 'Back to Menu'}
                    </button>
                </div>
                <Dashboard 
                    groups={cannibalizationGroups || []} 
                    onReset={handleReset} 
                    lang={lang} 
                    onUpdateGroups={handleUpdateGroups}
                    isAiEnabled={isAiEnabled}
                    apiKeys={apiKeys}
                    externalKeys={externalKeys}
                    providerConfig={providerConfig}
                    model={selectedModel}
                />
            </div>
          );
      }

      if (currentModule === 'KEYWORD_CLUSTERS' && comparisonRows) {
          return (
              <ClusterView 
                rows={comparisonRows}
                lang={lang}
                onBack={() => setCurrentModule(null)}
              />
          );
      }

      if (currentModule === 'GLOBAL_TASKS' && comparisonRows && cannibalizationGroups) {
          return (
              <GlobalTaskDashboard 
                  cannibalizationGroups={cannibalizationGroups}
                  comparisonRows={comparisonRows}
                  lang={lang}
                  onBack={() => setCurrentModule(null)}
                  onUpdateGroups={handleUpdateGroups}
                  onUpdateRows={handleUpdateRows}
              />
          );
      }

      // Generic Module View
      if (comparisonRows && siteStats) {
          return (
            <ModuleResults 
                key={currentModule} 
                moduleId={currentModule as ModuleId}
                rows={comparisonRows}
                stats={siteStats}
                lang={lang}
                onBack={() => setCurrentModule(null)}
                savedState={moduleStates[currentModule]}
                onSaveState={(state) => handleSaveModuleState(currentModule as ModuleId, state)}
                isAiEnabled={isAiEnabled}
                apiKeys={apiKeys}
                externalKeys={externalKeys}
                providerConfig={providerConfig}
                model={selectedModel}
                onUpdateRows={handleUpdateRows}
            />
          );
      }

      return null;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setCurrentModule(null); setSelectedMode(null); }}>
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-indigo-100 flex-shrink-0">
                    <img 
                        src="https://fluyez.com/simon-seo.png" 
                        alt="Simon SEO" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                            e.currentTarget.parentElement!.innerHTML = '<span class="text-xs font-bold text-slate-400">S</span>';
                        }}
                    />
                </div>
                <div>
                     <h1 className="text-sm font-bold text-slate-800 leading-tight">
                        {t.brand}
                    </h1>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">SEO Intelligence</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
              {isAiEnabled && (
                  <button 
                    onClick={() => setShowKeySetup(true)}
                    className="mr-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
                  >
                      <Key className="w-3.5 h-3.5" />
                      {t.manageKeys}
                  </button>
              )}

              <span className={`text-xs font-bold ${lang === 'es' ? 'text-indigo-600' : 'text-slate-400'}`}>ES</span>
              <button 
                onClick={toggleLang}
                className="relative inline-flex h-5 w-9 items-center rounded-full bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className={`${lang === 'en' ? 'translate-x-4 bg-indigo-600' : 'translate-x-1 bg-white'} inline-block h-3.5 w-3.5 transform rounded-full transition-transform shadow-sm`} />
              </button>
              <span className={`text-xs font-bold ${lang === 'en' ? 'text-indigo-600' : 'text-slate-400'}`}>EN</span>
              
              {hasData && (
                  <button onClick={handleReset} className="ml-4 text-xs font-medium text-red-400 hover:text-red-600 border border-red-200 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors">
                      {lang === 'es' ? 'Reiniciar' : 'Reset'}
                  </button>
              )}
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {renderContent()}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto print:hidden">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
          <p>{t.footer}</p>
          <p className="text-xs text-slate-300">Powered by Simon SEO</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
