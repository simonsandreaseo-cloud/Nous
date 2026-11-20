import React from 'react';
import {
  Terminal,
  Cpu,
  Brain,
  FileText,
  Check,
  Copy,
  Trash2,
  FolderOpen
} from 'lucide-react';

function getFilteredLogs(logsContent, logFilter) {
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
}

export default function RuntimeLogsModal({
  isOpen,
  onClose,
  logsContent,
  logFilter,
  setLogFilter,
  logsCopied,
  onCopyLogs,
  onClearLogs
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#111422] border border-slate-700 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#141829]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
              Logs del Motor Neuro-Simbólico &amp; Razonamientos (nous_runtime.log)
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
              onClick={onCopyLogs}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Copiar todos los logs al portapapeles"
            >
              {logsCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{logsCopied ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={onClearLogs}
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
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body: Pre log view */}
        <pre className="flex-1 overflow-auto p-4 font-mono text-[11px] text-slate-300 bg-[#0a0c14] leading-relaxed whitespace-pre-wrap select-text">
          {getFilteredLogs(logsContent, logFilter)}
        </pre>
      </div>
    </div>
  );
}
