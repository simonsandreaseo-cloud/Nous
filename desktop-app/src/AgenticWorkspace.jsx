import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  Cpu, 
  Layers, 
  FileSearch, 
  Sparkles,
  Bot,
  Terminal,
  Activity,
  ArrowRight,
  Timer,
  Brain,
  ChevronRight,
  Copy,
  Cloud,
  CloudUpload,
  Database
} from 'lucide-react';
import { convertHtmlToPlainText } from './utils/textUtils';

export default function AgenticWorkspace({ 
  inputText, 
  outputText, 
  setOutputText, 
  activeSupabaseTask, 
  onTaskSaved 
}) {
  const [tasks, setTasks] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [thoughtLogs, setThoughtLogs] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showThoughtModal, setShowThoughtModal] = useState(false);
  const [modalThoughtContent, setModalThoughtContent] = useState('');
  const [modalTaskTitle, setModalTaskTitle] = useState('');
  const [totalWorkflowTime, setTotalWorkflowTime] = useState(null);
  const [copied, setCopied] = useState(null); // 'plain', 'html', or null
  const [previewMode, setPreviewMode] = useState('plain'); // 'plain' or 'html'
  const [isSavingToSupabase, setIsSavingToSupabase] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const logsEndRef = useRef(null);

  const handleSyncToSupabase = async () => {
    if (!activeSupabaseTask || !outputText) return;
    setIsSavingToSupabase(true);
    try {
      if (window.api && window.api.supabaseSaveTask) {
        await window.api.supabaseSaveTask({
          taskId: activeSupabaseTask.id,
          contentBody: outputText,
          aiPercentage: null,
          status: 'por_revisar',
          metrics: {
            humanized_at: new Date().toISOString()
          }
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
        if (onTaskSaved) onTaskSaved(activeSupabaseTask.id);
      }
    } catch (e) {
      console.error('Error guardando en Supabase:', e);
      alert('Error guardando en Supabase: ' + e.message);
    } finally {
      setIsSavingToSupabase(false);
    }
  };

  const handleCopyOutput = (mode = 'plain') => {
    if (!outputText) return;
    const content = mode === 'html' ? outputText : convertHtmlToPlainText(outputText);
    navigator.clipboard.writeText(content);
    setCopied(mode);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [thoughtLogs]);

  useEffect(() => {
    if (!window.api || !window.api.onAgentEvent) return;

    const cleanup = window.api.onAgentEvent((msg) => {
      const { event, data } = msg;

      if (event === 'workflow:started') {
        setTasks(data.tasks);
        setIsRunning(true);
        setIsPaused(false);
        setTotalWorkflowTime(null);
        setThoughtLogs([{
          time: new Date().toLocaleTimeString(),
          agent: 'Supervisor',
          type: 'info',
          text: `Iniciando flujo agéntico de macro-secciones (${data.tasksCount} tareas planificadas).`
        }]);
      } else if (event === 'task:started') {
        setTasks(prev => prev.map((t, i) => i === data.taskIndex ? { ...t, status: 'in_progress' } : t));
        setSelectedTask(data.task);
      } else if (event === 'agent:thought') {
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: data.agent,
          type: 'thought',
          text: data.thought
        }]);
      } else if (event === 'agent:tool_call') {
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: data.agent,
          type: 'tool',
          text: `[Tool Call] ${data.tool}: "${data.query}"`
        }]);
      } else if (event === 'agent:donor_selected') {
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: 'Julián',
          type: 'tool',
          text: `Cluster de donantes cargado (${data.donorsCount} donantes pre-2022 de ${data.domain}).`
        }]);
      } else if (event === 'agent:supervisor_critique') {
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: data.agent || 'Supervisor de Leyes',
          type: 'warning',
          text: data.thought || (data.reasons ? `Violación de Leyes: ${data.reasons.join(' | ')}` : data.reason || 'Rechazado')
        }]);
      } else if (event === 'task:completed') {
        setTasks(prev => prev.map((t, i) => i === data.taskIndex ? { 
          ...t, 
          status: 'approved', 
          outputText: data.outputChunk || t.outputText,
          durationSec: data.durationSec,
          tokens: data.tokens,
          thoughts: data.thoughts || t.thoughts
        } : t));

        if (data.outputChunk) {
          setOutputText(prev => prev ? `${prev}\n\n${data.outputChunk}` : data.outputChunk);
        }
      } else if (event === 'task:failed') {
        setTasks(prev => prev.map((t, i) => i === data.taskIndex ? { 
          ...t, 
          status: 'failed', 
          error: data.error 
        } : t));
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: 'Supervisor',
          type: 'error',
          text: `Tarea ${data.taskIndex + 1} no completada: ${data.error || 'Error de procesamiento'}`
        }]);
      } else if (event === 'workflow:completed') {
        setIsRunning(false);
        setOutputText(data.finalText);
        setTotalWorkflowTime(data.totalTimeSec);
        setThoughtLogs(prev => [...prev, {
          time: new Date().toLocaleTimeString(),
          agent: 'Supervisor',
          type: 'success',
          text: `Certificación Agéntica finalizada en ${data.totalTimeSec}s. Burstiness: σ=${data.metrics.burstiness}, Coincidencias >= 8w: ${data.metrics.plagioRuns}.`
        }]);
      } else if (event === 'workflow:paused') {
        setIsPaused(true);
      } else if (event === 'workflow:resumed') {
        setIsPaused(false);
      } else if (event === 'workflow:stopped') {
        setIsRunning(false);
        setIsPaused(false);
      }
    });

    return () => cleanup && cleanup();
  }, [setOutputText]);

  const handleStart = () => {
    if (!inputText.trim()) return;
    setOutputText('');
    setThoughtLogs([]);
    if (window.api && window.api.startAgentWorkflow) {
      window.api.startAgentWorkflow(inputText);
    }
  };

  const handlePause = () => {
    if (window.api && window.api.pauseAgentWorkflow) {
      window.api.pauseAgentWorkflow();
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (window.api && window.api.resumeAgentWorkflow) {
      window.api.resumeAgentWorkflow();
      setIsPaused(false);
    }
  };

  const handleStop = () => {
    if (window.api && window.api.stopAgentWorkflow) {
      window.api.stopAgentWorkflow();
      setIsRunning(false);
    }
  };

  const handleInspectThoughts = (task, e) => {
    e.stopPropagation();
    setModalTaskTitle(task.title);
    setModalThoughtContent(task.thoughts || 'Este paso no generó cadena de pensamiento separada.');
    setShowThoughtModal(true);
  };

  const completedCount = tasks.filter(t => t.status === 'approved').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0d0f17]">
      {/* Left Column: Task Chain & Graph */}
      <div className="w-96 border-r border-slate-800 flex flex-col bg-[#101321]">
        {/* Header & Controls */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
                Macro-Secciones
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {totalWorkflowTime && (
                <span className="text-[11px] text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {totalWorkflowTime}s
                </span>
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
                {completedCount}/{tasks.length}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden mb-4">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Execution Controls */}
          <div className="flex items-center gap-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={!inputText.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg transition-all shadow-lg shadow-indigo-600/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Ejecutar Macro-Secciones
              </button>
            ) : (
              <>
                {isPaused ? (
                  <button
                    onClick={handleResume}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-lg transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Reanudar
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium py-2 rounded-lg transition-all"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    Pausar
                  </button>
                )}
                <button
                  onClick={handleStop}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs rounded-lg transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {tasks.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Bot className="w-8 h-8 mb-2 stroke-1 text-slate-600" />
              <p className="text-xs">Pulsa "Ejecutar Macro-Secciones" para agrupar el texto en bloques coherentes y procesarlos a alta velocidad.</p>
            </div>
          ) : (
            tasks.map((task, idx) => {
              const isSelected = selectedTask && selectedTask.id === task.id;
              return (
                <div
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30' 
                      : 'bg-[#15192b] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-medium text-slate-200 line-clamp-1">{task.title}</span>
                    {task.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                    {task.status === 'in_progress' && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />}
                    {task.status === 'pending' && <Clock className="w-4 h-4 text-slate-500 shrink-0" />}
                    {task.status === 'failed' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700">
                        {task.agent}
                      </span>
                      {task.metrics?.preservedPct && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono font-medium">
                          {task.metrics.preservedPct}% Humano
                        </span>
                      )}
                      {task.durationSec && (
                        <span className="text-amber-400 font-mono font-medium flex items-center gap-0.5">
                          <Timer className="w-3 h-3" />
                          {task.durationSec}s
                        </span>
                      )}
                    </div>

                    {task.thoughts && (
                      <button
                        onClick={(e) => handleInspectThoughts(task, e)}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 underline font-sans"
                        title="Ver pensamientos internos de Gemma 4 31B"
                      >
                        <Brain className="w-3 h-3" />
                        <span>Razonamiento</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Center Column: Live Agent Scratchpad & Thought Stream */}
      <div className="flex-1 flex flex-col border-r border-slate-800 bg-[#0d0f17]">
        {/* Terminal Header */}
        <div className="h-10 border-b border-slate-800 px-4 flex items-center justify-between text-xs font-medium text-slate-400 bg-[#121524]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-200">Terminal de Ejecución Agéntica & Preservación Humana</span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Supervisión Activa
          </span>
        </div>

        {/* Live Thought Stream */}
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-3">
          {thoughtLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-600 font-sans">
              <Cpu className="w-8 h-8 mb-2 stroke-1 text-slate-700" />
              <p className="text-xs">Los tiempos por petición, razonamientos internos de Gemma 4 31B y auditorías del Supervisor aparecerán aquí en vivo.</p>
            </div>
          ) : (
            thoughtLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 leading-relaxed">
                <span className="text-slate-600 text-[10px] shrink-0">{log.time}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 font-sans ${
                  log.agent === 'Supervisor' 
                    ? 'bg-violet-950 text-violet-300 border border-violet-800' 
                    : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                }`}>
                  {log.agent}
                </span>
                <span className={`flex-1 ${
                  log.type === 'thought' ? 'text-slate-300' :
                  log.type === 'tool' ? 'text-amber-300 font-medium' :
                  log.type === 'warning' ? 'text-rose-400 font-semibold' :
                  log.type === 'success' ? 'text-emerald-400 font-bold' : 'text-slate-400'
                }`}>
                  {log.text}
                </span>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Selected Task Details Footer */}
        {selectedTask && (
          <div className="border-t border-slate-800 p-3 bg-[#111422] text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-medium text-slate-200">Detalles: {selectedTask.title}</span>
              <div className="flex items-center gap-3">
                {selectedTask.durationSec && (
                  <span className="text-amber-400 font-mono text-[11px]">
                    ⏱️ {selectedTask.durationSec}s
                  </span>
                )}
                {selectedTask.metrics && selectedTask.metrics.burstiness > 0 && (
                  <span className="text-emerald-400 font-mono text-[11px]">
                    σ = {selectedTask.metrics.burstiness}
                  </span>
                )}
              </div>
            </div>
            {selectedTask.donorPool && selectedTask.donorPool.length > 0 && (
              <p className="text-[11px] text-slate-400 truncate italic">
                Donante primario: "{selectedTask.donorPool[0]?.text}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Supervisor Scorecard & Certified Output */}
      <div className="w-96 flex flex-col bg-[#101321]">
        {/* Supervisor Header */}
        <div className="h-10 border-b border-slate-800 px-4 flex items-center gap-2 text-xs font-semibold text-slate-200 bg-[#121524]">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Panel de Supervisión Editorial</span>
        </div>

        {/* Scorecard */}
        <div className="p-4 space-y-3 border-b border-slate-800">
          <div className="p-3 rounded-lg bg-[#15192b] border border-slate-800">
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-slate-400">Objetivo Burstiness (σ)</span>
              <span className="text-emerald-400 font-mono font-bold">≥ 12.0</span>
            </div>
            <p className="text-[10px] text-slate-500">Alterna cláusulas subordinadas con pausas de 3 palabras.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#15192b] border border-slate-800">
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-slate-400">Tolerancia N-Grams</span>
              <span className="text-emerald-400 font-mono font-bold">0 cadenas ≥ 8w</span>
            </div>
            <p className="text-[10px] text-slate-500">Corte quirúrgico si se detectan 8 palabras idénticas al donante.</p>
          </div>

          <div className="p-3 rounded-lg bg-[#15192b] border border-slate-800">
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-slate-400">Mutación Isomórfica</span>
              <span className="text-emerald-400 font-mono font-bold">≤ 18%</span>
            </div>
            <p className="text-[10px] text-slate-500">Preserva al menos el 82% del ritmo humano pre-2022.</p>
          </div>
        </div>

        {/* Supabase Active Task & Sync Box */}
        {activeSupabaseTask && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/40 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nous Cloud Conectado</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {activeSupabaseTask.status}
              </span>
            </div>
            
            <p className="text-xs text-white font-medium truncate" title={activeSupabaseTask.title}>
              {activeSupabaseTask.title}
            </p>

            {outputText && (
              <button
                onClick={handleSyncToSupabase}
                disabled={isSavingToSupabase}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs shadow-md transition cursor-pointer ${
                  saveSuccess 
                    ? 'bg-emerald-500 text-black' 
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950'
                }`}
              >
                <CloudUpload className={`w-4 h-4 ${isSavingToSupabase ? 'animate-bounce' : ''}`} />
                <span>
                  {isSavingToSupabase 
                    ? 'Guardando en Supabase...' 
                    : saveSuccess 
                      ? '✓ ¡Guardado en Nous Cloud!' 
                      : 'Sincronizar y Guardar en Nous Cloud'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Live Output Preview */}
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2">
              <span>Texto Aprobado en Vivo</span>
              <span className="text-[11px] text-slate-500 font-mono">
                {outputText.trim() ? convertHtmlToPlainText(outputText).split(/\s+/).length : 0} palabras
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {outputText && (
                <div className="flex bg-[#111422] p-0.5 rounded border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setPreviewMode('plain')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      previewMode === 'plain' 
                        ? 'bg-indigo-600 text-white font-medium shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Texto Plano
                  </button>
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      previewMode === 'html' 
                        ? 'bg-indigo-600 text-white font-medium shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    HTML
                  </button>
                </div>
              )}

              {outputText && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyOutput('plain')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium shadow-sm transition-colors cursor-pointer"
                    title="Copiar texto plano limpio (sin etiquetas HTML)"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied === 'plain' ? '¡Texto Copiado!' : 'Copiar Texto Plano'}</span>
                  </button>

                  <button
                    onClick={() => handleCopyOutput('html')}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium transition-colors cursor-pointer border border-slate-700"
                    title="Copiar código HTML con etiquetas"
                  >
                    <span>{copied === 'html' ? '✓ HTML' : 'Copiar HTML'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 rounded-lg bg-[#0a0c14] border border-slate-800 text-xs text-slate-300 leading-relaxed font-serif whitespace-pre-wrap select-text selection:bg-indigo-600/40">
            {outputText ? (
              previewMode === 'plain' ? convertHtmlToPlainText(outputText) : outputText
            ) : (
              <span className="text-slate-600 font-sans italic">
                El texto procesado aparecerá aquí sección por sección...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Internal Thought Inspection Modal */}
      {showThoughtModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#111422] border border-indigo-500/40 rounded-xl w-full max-w-3xl h-[70vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#15192e]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  Razonamiento Interno de Gemma 4 31B: {modalTaskTitle}
                </h3>
              </div>
              <button
                onClick={() => setShowThoughtModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 font-mono text-xs text-slate-300 bg-[#0a0c14] leading-relaxed whitespace-pre-wrap select-text">
              {modalThoughtContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
