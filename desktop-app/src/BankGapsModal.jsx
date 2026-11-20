import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  FileText,
  FolderOpen,
  RefreshCw,
  Trash2
} from 'lucide-react';

export default function BankGapsModal({
  isOpen,
  onClose,
  registry,
  bankStats,
  onRefresh,
  onReloadBank,
  onUpdateStatus,
  onClearResolved,
  onCopyBrief,
  onOpenFile,
  onResetUsage,
  isReloading,
  briefCopied
}) {
  const [filterTab, setFilterTab] = useState('pending'); // 'pending' | 'critical' | 'resolved' | 'all'

  if (!isOpen) return null;

  const usage = bankStats?.usageStats || {};
  const cleanCapacity = usage.totalCleanCapacity || bankStats?.usableCleanBlocks || 0;

  const stats = registry?.stats || {
    totalArticlesProcessed: 0,
    totalParagraphsEvaluated: 0,
    totalGapsOpen: 0,
    totalGapsCritical: 0,
    totalGapsMedium: 0,
    totalGapsResolved: 0
  };
  const allGaps = Array.isArray(registry?.gaps) ? registry.gaps : [];

  const filteredGaps = allGaps.filter((g) => {
    if (filterTab === 'pending') return g.status === 'PENDIENTE';
    if (filterTab === 'critical') return g.status === 'PENDIENTE' && g.severity === 'CRITICO';
    if (filterTab === 'resolved') return g.status === 'RESUELTO';
    return true;
  });

  const severityBadgeClass = (gap) => {
    if (gap.status === 'RESUELTO') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (gap.status === 'IGNORADO') {
      return 'bg-slate-700/40 text-slate-400 border-slate-600/40';
    }
    if (gap.severity === 'CRITICO') {
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-[#111422] border border-slate-700 rounded-2xl w-full max-w-6xl h-[84vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#141829]">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-400" />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-100">
                Radar de Huecos del Banco Pre-2022 ({(bankStats?.masterBricks || 0).toLocaleString('es-ES')} ladrillos activos)
              </h3>
              <p className="text-[11px] text-slate-400">
                Detección acumulativa por párrafo + brief automático para cosecha Wayback Machine (&lt; 2022)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onCopyBrief}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                briefCopied
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-indigo-600/90 hover:bg-indigo-500 text-white border-indigo-500'
              }`}
              title="Copia los huecos pendientes con keywords y filtros Wayback CDX listos para el subagente cosechador"
            >
              {briefCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{briefCopied ? 'Brief copiado' : 'Copiar Brief Cosechador'}</span>
            </button>

            <button
              onClick={onReloadBank}
              disabled={isReloading}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
              title="Recargar banco JSON en caliente sin reiniciar Nous"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              <span>Recargar Banco</span>
            </button>

            <button
              onClick={onOpenFile}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Abrir REPORTE_HUECOS_ACUMULADOS.md en el explorador"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Abrir Reporte MD</span>
            </button>

            <button
              onClick={onClearResolved}
              className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Eliminar del historial los huecos ya resueltos o ignorados"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar Resueltos</span>
            </button>

            <button
              onClick={onRefresh}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
              title="Actualizar vista desde disco"
            >
              ↻
            </button>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 text-sm font-bold ml-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* KPI Cards + Filter Tabs */}
        <div className="p-4 border-b border-slate-800/80 bg-[#0e111d] space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <div className="bg-[#141829] border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] text-slate-400">Artículos analizados</div>
              <div className="text-lg font-bold font-mono text-slate-100 mt-0.5">
                {stats.totalArticlesProcessed}
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ({stats.totalParagraphsEvaluated} párr.)
                </span>
              </div>
            </div>
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-3">
              <div className="text-[11px] text-rose-300">Huecos críticos</div>
              <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                {stats.totalGapsCritical}
              </div>
            </div>
            <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
              <div className="text-[11px] text-amber-300">Huecos medios</div>
              <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                {stats.totalGapsMedium}
              </div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-3">
              <div className="text-[11px] text-emerald-300">Auto-resueltos / cerrados</div>
              <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                {stats.totalGapsResolved}
              </div>
            </div>
            <div className="bg-indigo-950/25 border border-indigo-800/40 rounded-xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-indigo-300">Rotación inter-artículo</span>
                {onResetUsage && (
                  <button
                    onClick={onResetUsage}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-indigo-700 text-indigo-200 border border-indigo-600/40 transition-colors"
                    title="Reiniciar contador de donantes ya usados entre artículos"
                  >
                    Reiniciar Rotación
                  </button>
                )}
              </div>
              <div className="text-sm font-bold font-mono text-indigo-200 mt-1">
                {usage.uniqueDonorsUsed || 0}
                <span className="text-[11px] font-normal text-slate-400 ml-1">
                  /{cleanCapacity ? cleanCapacity.toLocaleString('es-ES') : '?'} ({usage.coverageRatioPct ?? 0}%)
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                {usage.totalArticlesTracked || 0} arts · {usage.repeatedDonorsCount || 0} repetidos
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center bg-[#181c2e] border border-slate-700/70 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setFilterTab('pending')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTab === 'pending' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Pendientes ({stats.totalGapsOpen})
              </button>
              <button
                onClick={() => setFilterTab('critical')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTab === 'critical' ? 'bg-rose-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Críticos ({stats.totalGapsCritical})
              </button>
              <button
                onClick={() => setFilterTab('resolved')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTab === 'resolved' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Resueltos ({stats.totalGapsResolved})
              </button>
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded transition-colors ${
                  filterTab === 'all' ? 'bg-slate-600 text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                Todos ({allGaps.length})
              </button>
            </div>

            {registry?.updatedAt && (
              <span className="text-[11px] text-slate-500 font-mono">
                Actualizado: {new Date(registry.updatedAt).toLocaleString('es-ES')}
              </span>
            )}
          </div>
        </div>

        {/* Gaps List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0c14]">
          {filteredGaps.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/80" />
              <p className="text-sm font-semibold text-slate-200">
                {allGaps.length === 0
                  ? 'Aún no hay huecos detectados en el banco'
                  : 'No hay huecos en este filtro'}
              </p>
              <p className="text-xs max-w-lg text-slate-500">
                Cada vez que ejecutes una humanización, Nous evalúa cada párrafo (tamaño de pool, similitud semántica, conceptos cubiertos y fricción Qwen) y registra automáticamente aquí los subtemas que necesiten más donantes pre-2022.
              </p>
            </div>
          ) : (
            filteredGaps.map((gap) => (
              <div
                key={gap.gapId || gap.gapKey}
                className="bg-[#121626] border border-slate-800 rounded-xl p-4 space-y-3"
              >
                {/* Card Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${severityBadgeClass(gap)}`}>
                        {gap.status === 'RESUELTO' ? 'RESUELTO' : gap.status === 'IGNORADO' ? 'IGNORADO' : gap.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-semibold">
                        {gap.targetFrame}
                      </span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {gap.topicSignature}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>Prioridad: <strong className="text-slate-200">{gap.priorityScore}</strong></span>
                      <span>Apariciones: <strong className="text-slate-200">{gap.occurrences}x</strong></span>
                      <span>Cobertura media: <strong className={gap.avgCoverageScore < 55 ? 'text-rose-400' : 'text-amber-300'}>{gap.avgCoverageScore}%</strong></span>
                      <span>Pool medio: <strong className="text-slate-200">{gap.avgPoolSize}</strong></span>
                      <span>Sem: <strong className="text-cyan-300">{gap.avgSemScore}</strong></span>
                      <span>Formato: <strong className="text-slate-300">{gap.harvestSpec?.targetType}</strong></span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center gap-2">
                    {gap.status !== 'RESUELTO' ? (
                      <button
                        onClick={() => onUpdateStatus(gap.gapId || gap.gapKey, 'RESUELTO')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50 transition-colors"
                      >
                        Marcar Resuelto
                      </button>
                    ) : (
                      <button
                        onClick={() => onUpdateStatus(gap.gapId || gap.gapKey, 'PENDIENTE')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 border border-amber-700/50 transition-colors"
                      >
                        Reabrir
                      </button>
                    )}
                    {gap.status === 'PENDIENTE' && (
                      <button
                        onClick={() => onUpdateStatus(gap.gapId || gap.gapKey, 'IGNORADO')}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition-colors"
                      >
                        Ignorar
                      </button>
                    )}
                  </div>
                </div>

                {/* Reasons */}
                {Array.isArray(gap.reasons) && gap.reasons.length > 0 && (
                  <div className="text-xs text-slate-300 flex items-start gap-2 bg-[#0d101c] p-2.5 rounded-lg border border-slate-800/80">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>{gap.reasons.join(' · ')}</span>
                  </div>
                )}

                {/* Chips: Missing Concepts & Harvest Keywords */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300/90">
                      Conceptos sin cubrir en el banco
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(gap.missingConcepts && gap.missingConcepts.length > 0) ? (
                        gap.missingConcepts.map((mc, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/25 text-[11px] font-mono">
                            {mc}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Cobertura general / escasez de pool</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/90">
                      Keywords pre-2022 sugeridas
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(gap.harvestSpec?.keywords || []).map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 text-[11px] font-mono">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CDX Filter, Domains & Sample Input */}
                <div className="bg-[#0b0e18] border border-slate-800/80 rounded-lg p-2.5 space-y-1.5 text-[11px] font-mono">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-400">
                    <span>
                      Filtro CDX: <code className="text-indigo-300">{gap.harvestSpec?.cdxUrlFilter}</code>
                    </span>
                    <span>
                      Dominios: <span className="text-slate-300">{(gap.harvestSpec?.recommendedDomains || []).join(', ')}</span>
                    </span>
                  </div>
                  {gap.sampleInputs?.[0] && (
                    <div className="text-slate-400 font-sans flex items-start gap-1.5 pt-1 border-t border-slate-800/60">
                      <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      <span className="italic">"{gap.sampleInputs[0]}..."</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
