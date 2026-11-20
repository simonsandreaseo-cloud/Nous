import React from 'react';
import {
  Cpu,
  Trash2,
  Brain,
  ChevronUp,
  ChevronDown,
  Database,
  Terminal
} from 'lucide-react';

export default function StudioHeader({
  bankStats,
  isReloadingBank,
  onReloadBank,
  ollamaStatus,
  onRefreshOllamaStatus,
  onLoadShortSample,
  onLoadFullSample,
  onClearAll,
  auditTrailLength,
  showAuditPanel,
  onToggleAuditPanel,
  bankGapsRegistry,
  onOpenBankGaps,
  onOpenLogs
}) {
  return (
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
              onClick={onReloadBank}
              title="Haz clic para recargar en caliente el Banco de Donantes Pre-2022"
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span className={`w-2 h-2 rounded-full bg-emerald-400 ${isReloadingBank ? 'animate-spin' : 'animate-pulse'}`}></span>
              {bankStats?.masterBricks !== null && bankStats?.masterBricks !== undefined
                ? bankStats.masterBricks.toLocaleString('es-ES')
                : '—'} Donantes Pre-2022
            </button>
            <button
              onClick={onRefreshOllamaStatus}
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
        <div className="flex items-center bg-[#181c2e] border border-slate-700/60 rounded-lg p-1 text-xs">
          <button
            onClick={onLoadShortSample}
            className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
            title="Cargar texto de prueba corto (3 párrafos)"
          >
            Muestra Corta
          </button>
          <button
            onClick={onLoadFullSample}
            className="px-2.5 py-1 text-slate-300 hover:text-white rounded hover:bg-slate-700/50 transition-colors"
            title="Cargar artículo largo completo (2.000 palabras)"
          >
            Artículo Completo
          </button>
          <button
            onClick={onClearAll}
            className="px-2 py-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-950/30 transition-colors flex items-center gap-1"
            title="Limpiar ambos cuadros"
          >
            <Trash2 className="w-3 h-3" />
            <span>Limpiar</span>
          </button>
        </div>

        {auditTrailLength > 0 && (
          <button
            onClick={onToggleAuditPanel}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all ${
              showAuditPanel
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                : 'bg-indigo-950/40 text-indigo-300 border-indigo-700/50 hover:bg-indigo-900/50'
            }`}
            title="Ver el razonamiento detallado paso a paso de cada párrafo"
          >
            <Brain className="w-3.5 h-3.5 text-indigo-300" />
            <span>Razonamientos ({auditTrailLength})</span>
            {showAuditPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}

        <button
          onClick={onOpenBankGaps}
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

        <button
          onClick={onOpenLogs}
          className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
          title="Ver logs de ejecución y razonamiento en tiempo real"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span>Logs</span>
        </button>
      </div>
    </header>
  );
}
