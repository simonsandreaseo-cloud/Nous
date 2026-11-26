import { useState, useEffect, useMemo } from 'react';
import { convertHtmlToPlainText } from '../../shared/html-to-plain-text';
import { fullBohoArticle, shortBohoArticle } from '../../shared/sample-drafts/boho-eyewear-sample';

const DEFAULT_MODEL_PRESETS = [
  { value: 'gemma-4-26b-a4b-it', label: 'gemma-4-26b-a4b-it (Gemma 4 26B MoE · AI Studio ⭐)' },
  { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Cascada #1 · AI Studio)' },
  { value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Cascada #2 · AI Studio)' },
  { value: 'gemma-4-31b-it', label: 'gemma-4-31b-it (Gemma 4 31B Denso · AI Studio)' },
  { value: 'qwen2.5:1.5b', label: 'qwen2.5:1.5b (Ollama Local CPU)' },
  { value: 'gemma3:4b', label: 'gemma3:4b (Ollama Local)' }
];

export function useHumanizerSession() {
  const [inputText, setInputText] = useState(shortBohoArticle);
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logsCopied, setLogsCopied] = useState(false);
  const [modelName, setModelName] = useState('gemma-4-26b-a4b-it');
  const [antiOutro, setAntiOutro] = useState(true);
  const [injectGlitches, setInjectGlitches] = useState(false);
  const [useLocalLLM, setUseLocalLLM] = useState(true);
  const [enableCarrilB, setEnableCarrilB] = useState(true);
  const [domainId, setDomainId] = useState('optica');
  const [domainPacks, setDomainPacks] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState({ checked: false, available: false, models: [] });

  const [showLogs, setShowLogs] = useState(false);
  const [logsContent, setLogsContent] = useState('');
  const [logFilter, setLogFilter] = useState('all');
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const [auditTrail, setAuditTrail] = useState([]);
  const [expandedParas, setExpandedParas] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  const [bankStats, setBankStats] = useState({ masterBricks: null, unifiedBricks: 0, goldenCount: 0 });
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

  const modelOptions = useMemo(() => {
    const installed = Array.isArray(ollamaStatus.models) ? ollamaStatus.models : [];
    const seen = new Set();
    const list = [];

    for (const m of installed) {
      if (!m?.name || seen.has(m.name)) continue;
      seen.add(m.name);
      const isCloud = m.provider === 'google-ai-studio';
      const sizeInfo = m.parameter_size && m.parameter_size !== 'unknown' ? m.parameter_size : m.size;
      list.push({
        value: m.name,
        label: isCloud
          ? `${m.name} (${sizeInfo ? `${sizeInfo} · ` : ''}Google AI Studio)`
          : `${m.name} (${sizeInfo ? `${sizeInfo} · ` : ''}Ollama local)`
      });
    }

    for (const preset of DEFAULT_MODEL_PRESETS) {
      if (!seen.has(preset.value)) {
        seen.add(preset.value);
        list.push(preset);
      }
    }

    return list;
  }, [ollamaStatus.models]);

  const refreshOllamaStatus = async () => {
    if (window.api && window.api.ollamaStatus) {
      try {
        const status = await window.api.ollamaStatus();
        const models = status?.models || [];
        const available = !!status?.available;
        setOllamaStatus({ checked: true, available, models });

        if (available && models.length > 0) {
          const installedNames = models.map(m => m.name);
          setModelName(prev => {
            if (installedNames.includes(prev)) return prev;
            if (installedNames.includes('gemma-4-26b-a4b-it')) return 'gemma-4-26b-a4b-it';
            if (installedNames.includes('qwen2.5:1.5b')) return 'qwen2.5:1.5b';
            return installedNames[0];
          });
        }
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
      if (window.api && window.api.humanizeNeurosymbolic) {
        const res = await window.api.humanizeNeurosymbolic(inputText, {
          modelName,
          domainId,
          antiOutro,
          injectGlitches,
          useLocalLLM,
          enableCarrilB,
          carrilBMode: 'auto',
          antiPlagiarism: true,
          strictFailFast: true
        });

        if (res && res.bankEmptyForDomain) {
          setErrorMsg(res.message || `Nicho "${res.domainLabel || domainId}" preparado sin corpus cosechado todavía.`);
          setOutputText('');
          setAuditTrail([]);
          return;
        }

        if (res && res.success === false) {
          setOutputText('');
          setErrorMsg(res.error || 'La operación se detuvo por no superar las compuertas de calidad.');
          if (Array.isArray(res.auditTrail) && res.auditTrail.length > 0) {
            setAuditTrail(res.auditTrail);
            setShowAuditPanel(true);
            setExpandedParas({ [res.auditTrail.length - 1]: true });
          }
          if (window.api.getRecentLogs) {
            const freshLogs = await window.api.getRecentLogs();
            setLogsContent(freshLogs);
          }
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

  return {
    inputText,
    setInputText,
    outputText,
    setOutputText,
    isProcessing,
    copied,
    logsCopied,
    modelName,
    setModelName,
    modelOptions,
    antiOutro,
    setAntiOutro,
    injectGlitches,
    setInjectGlitches,
    useLocalLLM,
    setUseLocalLLM,
    enableCarrilB,
    setEnableCarrilB,
    domainId,
    setDomainId,
    domainPacks,
    ollamaStatus,
    showLogs,
    setShowLogs,
    logsContent,
    logFilter,
    setLogFilter,
    showAuditPanel,
    setShowAuditPanel,
    auditTrail,
    setAuditTrail,
    expandedParas,
    errorMsg,
    bankStats,
    bankGapsRegistry,
    showBankGaps,
    setShowBankGaps,
    isReloadingBank,
    briefCopied,
    metrics,
    inputWords,
    outputWords,
    shortBohoArticle,
    fullBohoArticle,
    refreshOllamaStatus,
    refreshBankRadar,
    handleOpenBankGaps,
    handleReloadBank,
    handleUpdateGapStatus,
    handleClearResolvedGaps,
    handleCopyGapsBrief,
    handleResetDonorUsage,
    handleOpenLogs,
    handleClearLogs,
    handleCopyLogs,
    toggleParaExpand,
    handleHumanize,
    handleCopy,
    handleDownload
  };
}
