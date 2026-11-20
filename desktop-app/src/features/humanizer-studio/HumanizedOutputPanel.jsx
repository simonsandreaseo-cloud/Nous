import React from 'react';
import {
  CheckCircle2,
  Check,
  Copy,
  Download,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  ListTree
} from 'lucide-react';

export default function HumanizedOutputPanel({
  outputText,
  outputWords,
  copied,
  onCopy,
  onDownload,
  metrics,
  auditTrailLength,
  onOpenBankGaps,
  onToggleAuditPanel
}) {
  return (
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
            onClick={onCopy}
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
            onClick={onDownload}
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
              onClick={onOpenBankGaps}
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
          {auditTrailLength > 0 && (
            <button
              onClick={onToggleAuditPanel}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1"
            >
              <ListTree className="w-3.5 h-3.5" />
              <span>Ver {auditTrailLength} Razonamientos Paso a Paso</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
