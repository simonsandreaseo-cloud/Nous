import React from 'react';
import { Brain, ChevronUp, ChevronDown } from 'lucide-react';

export default function ParagraphAuditDrawer({
  isOpen,
  auditTrail,
  expandedParas,
  toggleParaExpand,
  onClose
}) {
  if (!isOpen || !Array.isArray(auditTrail) || auditTrail.length === 0) return null;

  return (
    <section className="h-72 border-t border-slate-800 bg-[#0e111c] flex flex-col shadow-2xl">
      <div className="h-10 px-4 border-b border-slate-800/80 bg-[#141828] flex items-center justify-between text-xs font-semibold text-slate-200">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-400" />
          <span>AUDITORÍA PASO A PASO: RAZONAMIENTO DEL MOTOR NEUROSÍMBÓLICO ({auditTrail.length} PÁRRAFOS)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-slate-400">Haz clic en cualquier párrafo para ver la comparativa de texto antes/después</span>
          <button
            onClick={onClose}
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
  );
}
