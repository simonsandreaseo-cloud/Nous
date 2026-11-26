import React from 'react';
import { FileText, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';

export default function DraftInputPanel({
  inputText,
  setInputText,
  inputWords,
  errorMsg,
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
  modelName,
  setModelName,
  modelOptions,
  isProcessing,
  onHumanize
}) {
  const optionsToRender = modelOptions && modelOptions.length > 0
    ? modelOptions
    : [
        { value: 'gemma-4-26b-a4b-it', label: 'gemma-4-26b-a4b-it (Gemma 4 26B MoE · AI Studio ⭐)' },
        { value: 'gemini-3.1-flash-lite', label: 'gemini-3.1-flash-lite (Cascada #1 · AI Studio)' },
        { value: 'gemini-3.5-flash-lite', label: 'gemini-3.5-flash-lite (Cascada #2 · AI Studio)' },
        { value: 'gemma-4-31b-it', label: 'gemma-4-31b-it (Gemma 4 31B Denso · AI Studio)' },
        { value: 'qwen2.5:1.5b', label: 'qwen2.5:1.5b (Ollama Local CPU)' }
      ];

  return (
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
              title="Activado: Compilación neuro-simbólica con Google AI Studio (Gemma 4 + 10 reintentos + cascada) y Donantes Pre-2022. Desactivado: Solo banco simbólico determinista."
            >
              <input
                type="checkbox"
                checked={useLocalLLM}
                onChange={(e) => setUseLocalLLM(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span className={useLocalLLM ? 'text-indigo-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {useLocalLLM ? '🧠 Motor Neuronal Activo' : '🧬 Solo Donantes Simbólicos'}
              </span>
            </label>

            <label
              className="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
              title="Transfiere todos los párrafos con huecos fácticos o semánticos sobre un andamio humano verificado por Juez Mecánico en modo estricto (Fail-Fast)."
            >
              <input
                type="checkbox"
                checked={enableCarrilB}
                onChange={(e) => setEnableCarrilB(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span className={enableCarrilB ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                🛤️ Carril B Guiado (Fail-Fast)
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
                    <option value="optica">🕶️ Óptica &amp; Audiología</option>
                    <option value="criptomonedas">🪙 Criptomonedas &amp; Web3 (Preparado)</option>
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
                {optionsToRender.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* BIG PROMINENT EXECUTE BUTTON */}
        <button
          onClick={onHumanize}
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
  );
}
