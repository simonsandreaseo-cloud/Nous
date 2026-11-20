import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Copy, 
  Download, 
  FileText, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  Terminal,
  FolderOpen,
  Trash2,
  Cpu,
  Zap,
  Check,
  Brain,
  Database,
  AlertTriangle,
  Eye,
  EyeOff,
  Filter,
  ListTree
} from 'lucide-react';
import { convertHtmlToPlainText } from './utils/textUtils';
import { fullBohoArticle, shortBohoArticle } from './samples/bohoSample';
import BankGapsModal from './BankGapsModal';

export default function App() {
  const [inputText, setInputText] = useState(shortBohoArticle);
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);
  const [modelName, setModelName] = useState('qwen2.5:1.5b');
  const [antiOutro, setAntiOutro] = useState(true);
  const [injectGlitches, setInjectGlitches] = useState(false);
  const [useLocalLLM, setUseLocalLLM] = useState(true);
  const [enableCarrilB, setEnableCarrilB] = useState(true);
  const [domainId, setDomainId] = useState('optica');
  const [domainPacks, setDomainPacks] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState({ checked: false, available: false, models: [] });
  
  // Logs & Reasoning State
  const [showLogs, setShowLogs] = useState(false);
  const [logsContent, setLogsContent] = useState('');
  const [logFilter, setLogFilter] = useState('all'); // 'all' | 'qwen' | 'reasoning' | 'texts'
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [expandedParas, setExpandedParas] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  // Radar de Huecos del Banco Pre-2022
  const [bankStats, setBankStats] = useState({ masterBricks: 8510, unifiedBricks: 0, goldenCount: 0 });
  const [bankGapsRegistry, setBankGapsRegistry] = useState(null);
  const [showBankGaps, setShowBankGaps] = useState(false);
  const [isReloadingBank, setIsReloadingBank] = useState(false);
  const [briefCopied, setBriefCopied] = useState(false);

  const [metrics, setMetrics] = useState({
    wordCount: 0,
    burstiness: 0,
    plagioRuns: 0,
    divergencePct: null,
    uniqueDonorDomains: 0,
    centeringTransitions: null,
    avgCoverageScore: null,
    bankCoverageGapsCount: 0,
    criticalGapsCount: 0,
    qwenStats: null,
    carrilBStats: null
  });

  const inputWords = inputText.trim() ? inputText.trim().split(/\s+/).filter(Boolean).length : 0;
  const outputWords = outputText.trim() ? outputText.trim().split(/\s+/).filter(Boolean).length : 0;

  const refreshOllamaStatus = async () => {
    if (window.api && window.api.ollamaStatus) {
      try {
        const status = await window.api.ollamaStatus();
        setOllamaStatus({
          checked: true,
          available: !!status?.available,
          models: status?.models || []
        });
      } catch {
        setOllamaStatus({ checked: true, available: false, models: [] });
      }
    }
  };

  const refreshBankRadar = async () => {
    try {
      if (window.api?.getBankStats) {
        const s = await window.api.getBankStats();
        if (s) setBankStats(s);
      }
      if (window.api?.getBankGaps) {
        const reg = await window.api.getBankGaps();
        if (reg) setBankGapsRegistry(reg);
      }
    } catch {}
  };

  useEffect(() => {
    refreshOllamaStatus();
    refreshBankRadar();
    if (window.api?.getDomainPacks) {
      window.api.getDomainPacks().then(packs => {
        if (Array.isArray(packs) && packs.length) setDomainPacks(packs);
      }).catch(() => {});
    }
  }, []);

  const handleOpenBankGaps = async () => {
    await refreshBankRadar();
    setShowBankGaps(true);
  };

  const handleReloadBank = async () => {
    if (!window.api?.reloadBank) return;
    setIsReloadingBank(true);
    try {
      const s = await window.api.reloadBank();
      if (s) setBankStats(s);
      await refreshBankRadar();
    } finally {
      setIsReloadingBank(false);
    }
  };

  const handleUpdateGapStatus = async (gapId, status) => {
    if (!window.api?.updateBankGapStatus) return;
    const updated = await window.api.updateBankGapStatus(gapId, status);
    if (updated) setBankGapsRegistry(updated);
  };

  const handleClearResolvedGaps = async () => {
    if (!window.api?.clearResolvedBankGaps) return;
    const updated = await window.api.clearResolvedBankGaps();
    if (updated) setBankGapsRegistry(updated);
  };

  const handleCopyGapsBrief = async () => {
    if (!window.api?.exportBankGapsBrief) return;
    const brief = await window.api.exportBankGapsBrief(12);
    if (brief) {
      navigator.clipboard.writeText(brief);
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2200);
    }
  };

  const handleResetDonorUsage = async () => {
    if (!window.api?.resetDonorUsage) return;
    await window.api.resetDonorUsage();
    await refreshBankRadar();
  };

  // Real-time log stream listener
  useEffect(() => {
    if (window.api && window.api.onAgentEvent) {
      const unsubscribe = window.api.onAgentEvent((data) => {
        if (data && data.event === 'log' && data.data) {
          setLogsContent(prev => (prev ? prev + '\n' : '') + data.data);
        }
      });
      return () => unsubscribe && unsubscribe();
    }
  }, []);

  const handleOpenLogs = async () => {
    if (window.api && window.api.getRecentLogs) {
      const logs = await window.api.getRecentLogs();
      setLogsContent(logs);
    }
    setShowLogs(true);
  };

  const handleClearLogs = async () => {
    if (window.api && window.api.clearRuntimeLogs) {
      await window.api.clearRuntimeLogs();
      setLogsContent('[SYSTEM] Logs reiniciados correctamente.');
    }
  };

  const handleCopyLogs = () => {
    if (!logsContent) return;
    navigator.clipboard.writeText(logsContent);
    setLogsCopied(true);
    setTimeout(() => setLogsCopied(false), 2000);
  };

  const toggleParaExpand = (idx) => {
    setExpandedParas(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleHumanize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      if (window.api && (window.api.humanizeNeurosymbolic || window.api.humanizeWithJulian)) {
        const fn = window.api.humanizeNeurosymbolic || window.api.humanizeWithJulian;
        const res = await fn(inputText, {
          modelName,
          domainId,
          antiOutro,
          injectGlitches,
          useLocalLLM,
          enableCarrilB,
          carrilBMode: 'auto',
          antiPlagiarism: false
        });

        if (res && res.bankEmptyForDomain) {
          setErrorMsg(res.message || `Nicho "${res.domainLabel || domainId}" preparado sin corpus cosechado todavía.`);
          setOutputText('');
          setAuditTrail([]);
          return;
        }

        if (res && (res.success || res.text || res.output)) {
          const finalOutput = res.output || res.text || '';
          setOutputText(finalOutput);
          
          if (res.auditTrail && Array.isArray(res.auditTrail)) {
            setAuditTrail(res.auditTrail);
            setShowAuditPanel(true);
          }

          if (res.metrics) {
            setMetrics({
              wordCount: res.metrics.wordCount || res.wordCount || 0,
              burstiness: res.metrics.burstiness || 0,
              plagioRuns: res.metrics.plagiarismRunsCount || 0,
              divergencePct: res.metrics.divergencePct ?? null,
              uniqueDonorDomains: res.metrics.uniqueDonorDomains ?? 0,
              centeringTransitions: res.metrics.centeringTransitions || null,
              avgCoverageScore: res.metrics.avgCoverageScore ?? null,
              bankCoverageGapsCount: res.metrics.bankCoverageGapsCount ?? 0,
              criticalGapsCount: res.metrics.criticalGapsCount ?? 0,
              qwenStats: res.metrics.qwenStats || null,
              carrilBStats: res.metrics.carrilBStats || null
            });
          }

          refreshOllamaStatus();
          refreshBankRadar();

          // Fetch fresh runtime logs
          if (window.api.getRecentLogs) {
            const freshLogs = await window.api.getRecentLogs();
            setLogsContent(freshLogs);
          }
        } else if (res && res.error) {
          setErrorMsg(res.error);
        }
      } else {
        setErrorMsg('API de Electron no disponible. Asegúrate de ejecutar la app con iniciar_nous.bat');
      }
    } catch (err) {
      console.error('Error durante humanización:', err);
      setErrorMsg(err.message || 'Error en el proceso de humanización');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(convertHtmlToPlainText(outputText));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!outputText) return;
    const blob = new Blob([convertHtmlToPlainText(outputText)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `articulo_humanizado_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs based on active tab
  const getFilteredLogs = () => {
    if (!logsContent) return 'Sin registros disponibles.';
    if (logFilter === 'all') return logsContent;

    const lines = logsContent.split('\n');
    if (logFilter === 'qwen') {
      const filtered = lines.filter(l =>
        l.includes('[QWEN_') ||
        l.includes('[OLLAMA]') ||
        l.includes('[PÁRRAFO') ||
        l.includes('Procesos Qwen:') ||
        l.includes('Motor Neuronal Activo:') ||
        l.includes('====')
      );
      return filtered.length ? filtered.join('\n') : 'Sin procesos de Qwen registrados en los logs recientes.';
    }

    if (logFilter === 'reasoning') {
      const filtered = lines.filter(l =>
        l.includes('[FASE') ||
        l.includes('[QWEN_') ||
        l.includes('[OLLAMA]') ||
        l.includes('[DONANTE') ||
        l.includes('[CENTERING') ||
        l.includes('[CLICHÉ') ||
        l.includes('[BURSTINESS') ||
        l.includes('[GLITCH') ||
        l.includes('[ANTI_OUTRO') ||
        l.includes('[MÉTRICAS_PÁRRAFO') ||
        l.includes('[PÁRRAFO') ||
        l.includes('Transiciones Centrado DAG:') ||
        l.includes('====')
      );
      return filtered.length ? filtered.join('\n') : 'Sin razonamientos registrados en los logs recientes.';
    }

    if (logFilter === 'texts') {
      const filtered = lines.filter(l =>
        l.includes('[TEXTO ORIGINAL]') ||
        l.includes('[TEXTO TRANSFORMADO]') ||
        l.includes('[QWEN_FASE_4_RESULTADO]') ||
        l.includes('[PÁRRAFO') ||
        l.includes('====')
      );
      return filtered.length ? filtered.join('\n') : 'Sin comparativas de texto en los logs recientes.';
    }

    return logsContent;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d0f17] text-slate-100 font-sans">
      {/* Top Header */}
      <header className="h-16 border-b border-slate-800 bg-[#111422] flex items-center justify-between px-6 select-none shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-500/25">
            N
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-bold tracking-tight text-white">
                NOUS <span className="text-indigo-400 font-medium">| Humanizador Neuro-Simbólico</span>
              </h1>
              <button
                onClick={handleReloadBank}
                title="Haz clic para recargar en caliente el Banco de Donantes Pre-2022"
                className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isReloadingBank ? 'animate-spin' : 'animate-pulse'}`}></span>
                {(bankStats?.masterBricks || 8510).toLocaleString('es-ES')} Donantes Pre-2022
              </button>
              <button
                onClick={refreshOllamaStatus}
                title="Haz clic para verificar la conexión con Ollama y los modelos Qwen instalados"
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  ollamaStatus.available
                    ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/20'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>
                  {!ollamaStatus.checked
                    ? 'Verificando Ollama...'
                    : ollamaStatus.available
                      ? `Ollama + Qwen (${ollamaStatus.models.length})`
                      : 'Ollama desconectado (auto-arranque)'}
                </span>
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Motor neuro-simbólico local: esqueletos humanos, transferencia guiada y auditoría estructural
            </p>
          </div>
        </div>

        {/* Quick Tools & Info */}
        <div className="flex items-center gap-3">
          {/* Quick presets */}
          <div className="flex items-center bg-[#181c2e] border border-slate-700/60 rounded-lg p-1 text-xs">
            <button
              onClick={() => { setInputText(shortBohoArticle); setAuditTrail([]); }}
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
              title="Cargar texto de prueba corto (3 párrafos)"
            >
              Muestra Corta
            </button>
            <button
              onClick={() => { setInputText(fullBohoArticle); setAuditTrail([]); }}
              className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
              title="Cargar artículo largo completo (2.000 palabras)"
            >
              Artículo Completo
            </button>
            <button
              onClick={() => { setInputText(''); setOutputText(''); setAuditTrail([]); }}
              className="px-2 py-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/30 transition-colors flex items-center gap-1"
              title="Limpiar ambos cuadros"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>

          {/* Audit Toggle Button */}
          {auditTrail.length > 0 && (
            <button
              onClick={() => setShowAuditPanel(prev => !prev)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                showAuditPanel
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50 hover:bg-indigo-900/50'
              }`}
              title="Ver el razonamiento detallado paso a paso de cada párrafo"
            >
              <Brain className="w-3.5 h-3.5 text-indigo-300" />
              <span>Razonamientos ({auditTrail.length})</span>
              {showAuditPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {/* Bank Gaps Radar Button */}
          <button
            onClick={handleOpenBankGaps}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              (bankGapsRegistry?.stats?.totalGapsCritical || 0) > 0
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40'
                : (bankGapsRegistry?.stats?.totalGapsOpen || 0) > 0
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
            title="Ver huecos detectados en el Banco Pre-2022 y exportar brief de cosecha"
          >
            <Database className="w-3.5 h-3.5" />
            <span>Huecos Banco ({bankGapsRegistry?.stats?.totalGapsOpen || 0})</span>
          </button>

          {/* Logs Button */}
          <button
            onClick={handleOpenLogs}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
            title="Ver logs de ejecución y razonamiento en tiempo real"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Logs</span>
          </button>
        </div>
      </header>

      {/* Main Split-Screen Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column: Input Draft */}
        <section className="flex-1 border-r border-slate-800/80 flex flex-col bg-[#0f121d]">
          {/* Column Header */}
          <div className="h-11 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#141829]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>1. BORRADOR DE ENTRADA (TEXTO A HUMANIZAR)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-mono text-[11px] border border-slate-700/50">
                {inputWords} palabras
              </span>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Pega aquí el artículo, borrador de ChatGPT o texto de IA que deseas humanizar con esqueletos biológicos pre-2022..."
            className="flex-1 w-full bg-transparent p-5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-mono leading-relaxed selection:bg-indigo-600/30"
          />

          {/* Error Banner if any */}
          {errorMsg && (
            <div className="bg-rose-950/60 border-t border-rose-800/60 px-4 py-2 flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Bottom Controls & EXECUTE BUTTON */}
          <div className="p-4 border-t border-slate-800/90 bg-[#121626] flex flex-col gap-3">
            {/* Options Toggles */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={antiOutro}
                    onChange={(e) => setAntiOutro(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>🛡️ Podar Outro Cliché</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={injectGlitches}
                    onChange={(e) => setInjectGlitches(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>⚡ Glitch Oral Taller</span>
                </label>

                <label 
                  className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                  title="Activado: Compilación neuro-simbólica completa (Qwen 2.5 para Atomización, Injerto Colocacional y Ruptura k-gramas + Donantes Pre-2022). Desactivado: Modo simbólico determinista sin LLM."
                >
                  <input
                    type="checkbox"
                    checked={useLocalLLM}
                    onChange={(e) => setUseLocalLLM(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span className={useLocalLLM ? "text-indigo-400 font-semibold" : "text-emerald-400 font-semibold"}>
                    {useLocalLLM ? "🧠 Qwen 2.5 Neuro-Simbólico" : "🧬 Solo Donantes Simbólicos"}
                  </span>
                </label>

                <label
                  className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                  title="Redirige únicamente los párrafos marcados como CRITICO hacia un andamio humano editado de forma mínima con juez mecánico determinista."
                >
                  <input
                    type="checkbox"
                    checked={enableCarrilB}
                    onChange={(e) => setEnableCarrilB(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span className={enableCarrilB ? "text-cyan-300 font-semibold" : "text-slate-500"}>
                    🛤️ Carril B Guiado (solo críticos)
                  </span>
                </label>
              </div>

              {/* Niche & Model selection */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Nicho:</span>
                  <select
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
                    title="Compartimentos temáticos estancos y arquitectura multi-nicho"
                  >
                    {domainPacks.length > 0 ? domainPacks.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.label}{p.hasBank ? '' : ' [Sin banco]'}
                      </option>
                    )) : (
                      <>
                        <option value="optica">🕶️ Óptica & Audiología</option>
                        <option value="criptomonedas">🪙 Criptomonedas & Web3 (Preparado)</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Modelo:</span>
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                  >
                    <option value="qwen2.5:1.5b">qwen2.5:1.5b (Recomendado)</option>
                    <option value="qwen2.5:0.5b">qwen2.5:0.5b (Ultra Rápido)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BIG PROMINENT EXECUTE BUTTON */}
            <button
              onClick={handleHumanize}
              disabled={isProcessing || !inputText.trim()}
              className={`w-full h-12 rounded-xl text-sm font-bold tracking-wide transition-all shadow-xl flex items-center justify-center gap-2.5 ${
                isProcessing
                  ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 cursor-wait'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/30 hover:shadow-indigo-500/40 active:scale-[0.99] cursor-pointer'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-300" />
                  <span>ANALIZANDO CLICHÉS, BURSTINESS Y DONANTES...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>✨ EJECUTAR HUMANIZACIÓN (MOTOR NEUROSÍMBÓLICO)</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column: Humanized Output */}
        <section className="flex-1 flex flex-col bg-[#0b0d14]">
          {/* Column Header */}
          <div className="h-11 border-b border-slate-800/80 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 bg-[#141829]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>2. TEXTO HUMANIZADO (SALIDA)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-mono text-[11px] border border-slate-700/50">
                {outputWords} palabras
              </span>
              <button
                onClick={handleCopy}
                disabled={!outputText}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  copied 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-indigo-600/80 hover:bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
                title="Copiar texto al portapapeles"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
              <button
                onClick={handleDownload}
                disabled={!outputText}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-40"
                title="Descargar como archivo de texto"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            readOnly
            value={outputText}
            placeholder="El resultado humanizado aparecerá aquí tras pulsar el botón 'EJECUTAR HUMANIZACIÓN'. Cada párrafo mantendrá la riqueza sintáctica de los donantes biológicos pre-2022..."
            className="flex-1 w-full bg-transparent p-5 text-sm text-slate-100 placeholder-slate-700 focus:outline-none resize-none font-serif leading-relaxed selection:bg-emerald-600/30"
          />

          {/* Bottom Metrics Bar */}
          <div className="min-h-14 py-2 border-t border-slate-800/90 bg-[#121626] px-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span className="text-slate-400">Burstiness (σ):</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {metrics.burstiness ? metrics.burstiness : '—'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <span className="text-slate-400">Shingles ≥7w:</span>
                <span className="font-mono text-slate-200">
                  {metrics.plagioRuns} coincidencias
                </span>
              </div>
              {metrics.divergencePct !== null && (
                <div className="flex items-center gap-2" title="Diferencia léxica medida frente al borrador de entrada (tokens únicos modificados)">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Divergencia:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {metrics.divergencePct}%
                  </span>
                </div>
              )}
              {metrics.uniqueDonorDomains > 0 && (
                <div className="flex items-center gap-2" title="Dominios distintos del banco de ladrillos usados en la generación">
                  <span className="text-slate-400">Dominios:</span>
                  <span className="font-mono text-teal-300 font-semibold">
                    {metrics.uniqueDonorDomains}
                  </span>
                </div>
              )}
              {metrics.avgCoverageScore !== null && (
                <button
                  onClick={handleOpenBankGaps}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-[11px] transition-colors cursor-pointer ${
                    metrics.criticalGapsCount > 0
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                      : metrics.bankCoverageGapsCount > 0
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                  title="Haz clic para abrir el Radar de Huecos del Banco Pre-2022"
                >
                  <Database className="w-3 h-3" />
                  <span>Cobertura Banco: {metrics.avgCoverageScore}% ({metrics.bankCoverageGapsCount} huecos)</span>
                </button>
              )}
              {metrics.qwenStats && (
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-400">Qwen:</span>
                  <span className="font-mono text-cyan-300">
                    {metrics.qwenStats.enabled
                      ? `${metrics.qwenStats.calls} proc. · ${metrics.qwenStats.totalTokens} tok · ${(metrics.qwenStats.totalDurationMs / 1000).toFixed(1)}s`
                      : 'Simbólico'}
                  </span>
                </div>
              )}
              {metrics.carrilBStats && metrics.carrilBStats.triggered > 0 && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono text-[11px]"
                  title="Transferencia guiada sobre andamio humano verificada por juez mecánico"
                >
                  <span>Carril B: {metrics.carrilBStats.approved}/{metrics.carrilBStats.triggered} aprob.</span>
                  {metrics.carrilBStats.avgSkeletonLCS !== null && (
                    <span>· LCS {metrics.carrilBStats.avgSkeletonLCS}</span>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              {auditTrail.length > 0 && (
                <button
                  onClick={() => setShowAuditPanel(prev => !prev)}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1"
                >
                  <ListTree className="w-3.5 h-3.5" />
                  <span>Ver {auditTrail.length} Razonamientos Paso a Paso</span>
                </button>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Interactive Step-by-Step AI Reasoning & Text Comparison Drawer */}
      {showAuditPanel && auditTrail.length > 0 && (
        <section className="h-72 border-t border-slate-800 bg-[#0e111c] flex flex-col shadow-2xl">
          <div className="h-10 px-4 border-b border-slate-800/80 bg-[#141828] flex items-center justify-between text-xs font-semibold text-slate-200">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-400" />
              <span>AUDITORÍA PASO A PASO: RAZONAMIENTO DEL MOTOR NEUROSÍMBÓLICO ({auditTrail.length} PÁRRAFOS)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400">Haz clic en cualquier párrafo para ver la comparativa de texto antes/después</span>
              <button
                onClick={() => setShowAuditPanel(false)}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-xs"
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {auditTrail.map((para, pIdx) => {
              const isExpanded = !!expandedParas[pIdx];
              return (
                <div 
                  key={pIdx} 
                  className={`border rounded-xl transition-all ${
                    para.isHeading 
                      ? 'border-blue-900/40 bg-blue-950/20' 
                      : 'border-slate-800/80 bg-[#121626]/80'
                  }`}
                >
                  {/* Paragraph Header */}
                  <div 
                    onClick={() => toggleParaExpand(pIdx)}
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold flex items-center justify-center text-slate-300">
                        {para.paragraphIndex}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        para.isHeading ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-slate-700/40 text-slate-300'
                      }`}>
                        {para.isHeading ? 'Encabezado / Modelo Protegido' : 'Cuerpo Narrativo'}
                      </span>
                      {Array.isArray(para.subdomains) && para.subdomains.length > 0 && (() => {
                        const primarySub = para.subdomains[0];
                        const subBadge = primarySub === 'AUDIOLOGY'
                          ? { label: '🎧 AUDIOLOGY', cls: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
                          : primarySub === 'OPTICAL_CLINICAL'
                            ? { label: '🩺 CLINICAL', cls: 'bg-teal-500/15 text-teal-300 border-teal-500/30' }
                            : (primarySub === 'OPTICAL_EYEWEAR' || primarySub === 'GENERAL_LIFESTYLE')
                              ? { label: '👓 EYEWEAR', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
                              : { label: `🧩 ${primarySub}`, cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
                        return (
                          <span
                            className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${subBadge.cls}`}
                            title={`Subdominios activos en sección: ${para.subdomains.join(', ')}`}
                          >
                            {subBadge.label}
                          </span>
                        );
                      })()}
                      <span className="text-xs text-slate-400 truncate max-w-md">
                        "{para.originalText.slice(0, 65)}..."
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!para.isHeading && para.coverage?.track?.startsWith('CARRIL_B') && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          para.coverage.track === 'CARRIL_B_APROBADO'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}>
                          {para.coverage.track === 'CARRIL_B_APROBADO' ? 'CARRIL B ✓' : 'CARRIL B ✗'}
                        </span>
                      )}
                      {!para.isHeading && para.coverage && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                          para.coverage.severity === 'CRITICO'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : para.coverage.severity === 'MEDIO'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {para.coverage.severity === 'OK' ? 'OK' : `HUECO ${para.coverage.severity}`} {para.coverage.coverageScore}%
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {para.steps ? `${para.steps.length} razonamientos` : 'Sin cambios'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Details: Reasoning Steps & Text Comparison */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800/60 bg-[#0d101a] space-y-4">
                      {/* Reasoning Badges */}
                      <div>
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Razonamientos Aplicados por la IA:
                        </h4>
                        {para.steps && para.steps.length > 0 ? (
                          <div className="space-y-2">
                            {para.steps.map((st, sIdx) => (
                              <div key={sIdx} className="text-xs flex items-start gap-2 bg-[#15192a] p-2.5 rounded-lg border border-slate-800">
                                {st.stage === 'DAVIDSON_ATOMIZATION' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px] shrink-0 border border-cyan-500/30">
                                      FASE 1: ÁTOMOS Y TUPLAS
                                    </span>
                                    <div className="text-slate-300 w-full">
                                      <span className="text-cyan-400 font-mono font-semibold">Tuplas Fácticas ({st.frame}):</span> {st.atoms}
                                      {Array.isArray(st.tuples) && st.tuples.length > 0 && (
                                        <div className="mt-1 space-y-0.5 font-mono text-[11px] text-cyan-200/90 bg-slate-900/60 p-1.5 rounded">
                                          {st.tuples.map((t, ti) => (
                                            <div key={ti}>
                                              {t.id}: &lt;{t.entity}, {t.predicate}, {t.argument}{t.requiredSlots?.length ? `, [${t.requiredSlots.join(',')}]` : ''}&gt;
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'QWEN_ATOMIZATION' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px] shrink-0 border border-sky-500/30">
                                      QWEN P1: ATOMIZACIÓN
                                    </span>
                                    <div className="text-slate-300 w-full">
                                      <div className="flex items-center justify-between text-[11px] text-sky-300 font-mono mb-1">
                                        <span>Modelo: {st.model}</span>
                                        <span>{st.durationMs}ms · {st.evalCount} tokens</span>
                                      </div>
                                      <pre className="text-[11px] text-slate-200 font-mono bg-slate-900/70 p-2 rounded whitespace-pre-wrap">{st.rawResponse}</pre>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'DONOR_SELECTION' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px] shrink-0 border border-teal-500/30">
                                      FASE 2: DONANTE PRE-2022
                                    </span>
                                    <div className="text-slate-300">
                                      <span className="text-teal-400 font-mono font-semibold">ID: {st.donor_id} · Marco: {st.frame} · Fuente: {st.source} (score {st.score})</span>
                                      <div className="mt-1 font-serif italic text-slate-200 bg-slate-900/50 p-1.5 rounded">"{st.skeleton}"</div>
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'SEMANTIC_RERANKER' && (
                                  <>
                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 border ${
                                      st.severity === 'CRITICO'
                                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                        : st.severity === 'MEDIO'
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    }`}>
                                      RADAR DE HUECOS
                                    </span>
                                    <div className="text-slate-300 w-full space-y-1">
                                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                                        <span>Cobertura: <strong>{st.coverageScore ?? '—'}%</strong></span>
                                        <span>Pool: <strong>{st.poolSize ?? st.candidateCount ?? 0} cand.</strong></span>
                                        <span>Encaje Qwen: <strong>{st.fitScore ?? '—'}/10</strong></span>
                                        <span>Sem: <strong>{st.semScore ?? 0}</strong></span>
                                      </div>
                                      {Array.isArray(st.missingConcepts) && st.missingConcepts.length > 0 && (
                                        <p className="text-[11px] text-rose-300 font-mono">
                                          Conceptos faltantes: {st.missingConcepts.join(', ')}
                                        </p>
                                      )}
                                      {Array.isArray(st.harvestKeywords) && st.harvestKeywords.length > 0 && (
                                        <p className="text-[11px] text-cyan-300 font-mono">
                                          Keywords sugeridas: {st.harvestKeywords.join(', ')}
                                        </p>
                                      )}
                                      <p className="text-[11px] text-slate-400 font-sans">
                                        {(Array.isArray(st.gapReasons) && st.gapReasons.length > 0) ? st.gapReasons.join(' · ') : st.reason}
                                      </p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'CENTERING_SOLVER' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] shrink-0 border border-purple-500/30">
                                      FASE 3: DAG DIJKSTRA
                                    </span>
                                    <div className="text-slate-300">
                                      <span className="text-purple-400 font-mono font-semibold">Ancla Cb:</span> "{st.anchor}" · <span className="font-mono">Transiciones: {(st.transitions && st.transitions.length ? st.transitions.join(' → ') : st.transitionType)}</span>
                                      {st.dagCost !== undefined && <span className="ml-2 text-cyan-300 font-mono">Coste DAG: {st.dagCost}</span>}
                                      {Array.isArray(st.pathDonors) && st.pathDonors.length > 0 && <span className="ml-2 text-teal-300 font-mono">Ruta: [{st.pathDonors.join(' → ')}]</span>}
                                      <span className="ml-2 font-mono">Pro-Drop: {st.hasProDrop ? 'SÍ' : 'NO'}{st.proDropHealed ? ' (Sanado)' : ''}</span>
                                      {st.hinge && <span className="ml-2 text-amber-300 font-mono">Bisagra: "{st.hinge}"</span>}
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'QWEN_COLLOCATIONAL_GRAFT' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] shrink-0 border border-indigo-500/30">
                                      QWEN P2: INJERTO COLOCACIONAL
                                    </span>
                                    <div className="text-slate-300 w-full">
                                      <div className="flex items-center justify-between text-[11px] text-indigo-300 font-mono mb-1">
                                        <span>Modelo: {st.model} · Donante: {st.donorId}</span>
                                        <span>{st.durationMs}ms · {st.evalCount} tokens</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mb-1">Esqueleto entrada: <span className="italic text-slate-300">"{st.preFilledSkeleton}"</span></p>
                                      <p className="text-[11px] text-emerald-200 font-mono bg-slate-900/70 p-2 rounded">Resultado Qwen: "{st.rawResponse}"</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'CARRIL_B_GUIDED_TRANSFER' && (
                                  <>
                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] shrink-0 border ${
                                      st.status === 'APPROVED'
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    }`}>
                                      CARRIL B: EDICIÓN GUIADA {st.status === 'APPROVED' ? '✓' : '✗'}
                                    </span>
                                    <div className="text-slate-300 w-full space-y-1">
                                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-cyan-300">
                                        <span>Modelo: {st.model} · Andamio: {st.scaffoldId || '—'} ({st.scaffoldDomain || '—'})</span>
                                        <span>Intentos: {st.attemptsCount ?? 0}/4</span>
                                      </div>
                                      {st.metrics && (
                                        <div className="flex flex-wrap gap-3 text-[11px] font-mono text-slate-300">
                                          <span>LCS Esqueleto: <strong>{st.metrics.functionSkeletonLCS}</strong></span>
                                          <span>Entail: <strong>{st.metrics.entailmentScore}%</strong></span>
                                          <span>Copia Fuente: <strong>{st.metrics.maskedSourceTrigramOverlap}</strong></span>
                                        </div>
                                      )}
                                      {st.scaffoldText && (
                                        <p className="text-[11px] text-slate-400">Molde humano: <span className="italic text-slate-300">"{st.scaffoldText}"</span></p>
                                      )}
                                      {Array.isArray(st.failedGates) && st.failedGates.length > 0 && (
                                        <p className="text-[11px] text-rose-300 font-mono">Puertas fallidas: {st.failedGates.join(', ')}</p>
                                      )}
                                      <p className="text-[11px] text-slate-400 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'QWEN_SHINGLE_BREAKER' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 font-bold text-[10px] shrink-0 border border-fuchsia-500/30">
                                      QWEN P3: ANTIPLAGIO K&lt;=6
                                    </span>
                                    <div className="text-slate-300 w-full">
                                      <div className="flex items-center justify-between text-[11px] text-fuchsia-300 font-mono mb-1">
                                        <span>Modelo: {st.model} · Restantes: {st.remainingOverlaps}</span>
                                        <span>{st.durationMs}ms · {st.evalCount} tokens</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mb-1">Cadenas &gt;=7w rotas: {st.brokenShingles?.join(' | ')}</p>
                                      <p className="text-[11px] text-slate-200 font-mono bg-slate-900/70 p-2 rounded">Resultado Qwen: "{st.rawResponse}"</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'CLICHE_NEUTRALIZATION' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] shrink-0 border border-amber-500/30">
                                      CLICHÉ IA
                                    </span>
                                    <div className="text-slate-300">
                                      Reemplazado <span className="line-through text-rose-400 font-mono">"{st.original}"</span> por <span className="text-emerald-400 font-semibold font-mono">"{st.replacement}"</span>.
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'BURSTINESS_SPLIT' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold text-[10px] shrink-0 border border-violet-500/30">
                                      BURSTINESS
                                    </span>
                                    <div className="text-slate-300">
                                      Oración larga de {st.originalWords} palabras dividida en cláusula <span className="text-violet-400 font-mono">"{st.splitTarget}"</span> para crear compases asimétricos.
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'GLITCH_INJECTION' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] shrink-0 border border-emerald-500/30">
                                      GIRO DEL BANCO
                                    </span>
                                    <div className="text-slate-300">
                                      Inyectado giro expresivo del banco: <span className="text-emerald-400 font-serif font-medium">"{st.glitch}"</span>
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {st.stage === 'ANTI_OUTRO_PRUNED' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px] shrink-0 border border-rose-500/30">
                                      ANTI-OUTRO
                                    </span>
                                    <div className="text-slate-300">
                                      Podada frase de cierre genérica: <span className="line-through text-rose-400 font-mono">"{st.sentence}"</span>.
                                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">{st.reason}</p>
                                    </div>
                                  </>
                                )}
                                {(st.stage === 'HEADING_PROTECTION' || st.stage === 'HEADING_HUMANIZATION') && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-[10px] shrink-0 border border-blue-500/30">
                                      ENCABEZADO
                                    </span>
                                    <div className="text-slate-300">
                                      {st.reason}
                                      {st.original && st.text && st.original !== st.text && (
                                        <div className="mt-1 text-[11px] text-slate-400">
                                          <span className="text-red-400 line-through mr-1">{st.original}</span>
                                          <span className="text-emerald-400 font-medium">➔ {st.text}</span>
                                        </div>
                                      )}
                                    </div>
                                  </>
                                )}
                                {st.stage === 'LOCAL_LLM_REASONING' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-[10px] shrink-0 border border-indigo-500/30">
                                      IA LOCAL (QWEN)
                                    </span>
                                    <div className="text-slate-300">
                                      <p className="font-semibold text-indigo-300 mb-0.5">Razonamiento Qwen 2.5: {st.thought}</p>
                                      <p className="text-[11px] text-slate-300 font-mono bg-slate-900/60 p-1.5 rounded">Resultado: "{st.transformedSentence}"</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No se requirieron modificaciones (texto ya biológico o encabezado).</p>
                        )}
                      </div>

                      {/* Before / After Text Side-by-Side */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                        <div className="bg-[#121524] p-3 rounded-lg border border-slate-800">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                            Texto Original (Antes):
                          </span>
                          <p className="text-xs text-slate-300 font-mono leading-relaxed select-text">
                            {para.originalText}
                          </p>
                        </div>
                        <div className="bg-[#0f1d19] p-3 rounded-lg border border-emerald-900/40">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                            Texto Humanizado (Después):
                          </span>
                          <p className="text-xs text-slate-100 font-serif leading-relaxed select-text">
                            {para.humanizedText}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Logs Modal with Filters & Highlighting */}
      {showLogs && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#111422] border border-slate-700 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#141829]">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Logs del Motor Neuro-Simbólico & Razonamientos (nous_runtime.log)
                </h3>
              </div>

              {/* Filters */}
              <div className="flex items-center bg-[#1a1f33] border border-slate-700 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setLogFilter('all')}
                  className={`px-3 py-1 rounded transition-colors ${
                    logFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Todos los Logs
                </button>
                <button
                  onClick={() => setLogFilter('qwen')}
                  className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                    logFilter === 'qwen' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Cpu className="w-3 h-3 text-cyan-300" />
                  <span>Procesos Qwen</span>
                </button>
                <button
                  onClick={() => setLogFilter('reasoning')}
                  className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                    logFilter === 'reasoning' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Brain className="w-3 h-3 text-indigo-300" />
                  <span>Solo Razonamientos IA</span>
                </button>
                <button
                  onClick={() => setLogFilter('texts')}
                  className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                    logFilter === 'texts' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <FileText className="w-3 h-3 text-emerald-300" />
                  <span>Textos Antes / Después</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title="Copiar todos los logs al portapapeles"
                >
                  {logsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{logsCopied ? 'Copiado' : 'Copiar'}</span>
                </button>

                <button
                  onClick={handleClearLogs}
                  className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title="Limpiar archivo de logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>

                <button
                  onClick={() => window.api?.openLogFolder?.()}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  title="Abrir carpeta de logs en el explorador"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                <button
                  onClick={() => setShowLogs(false)}
                  className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold ml-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Pre log view */}
            <pre className="flex-1 overflow-auto p-4 font-mono text-[11px] text-slate-300 bg-[#0a0c14] leading-relaxed whitespace-pre-wrap select-text">
              {getFilteredLogs()}
            </pre>
          </div>
        </div>
      )}

      <BankGapsModal
        isOpen={showBankGaps}
        onClose={() => setShowBankGaps(false)}
        registry={bankGapsRegistry}
        bankStats={bankStats}
        onRefresh={refreshBankRadar}
        onReloadBank={handleReloadBank}
        onUpdateStatus={handleUpdateGapStatus}
        onClearResolved={handleClearResolvedGaps}
        onCopyBrief={handleCopyGapsBrief}
        onOpenFile={() => window.api?.openBankGapsFile?.()}
        onResetUsage={handleResetDonorUsage}
        isReloading={isReloadingBank}
        briefCopied={briefCopied}
      />
    </div>
  );
}
