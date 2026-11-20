import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  RefreshCw, 
  Database, 
  FolderGit2, 
  ArrowRight, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function SupabasePanel({ onSelectTask, activeSupabaseTask }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('por_corregir');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingTaskBodyId, setLoadingTaskBodyId] = useState(null);
  const [error, setError] = useState(null);

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Load tasks when project or status changes
  useEffect(() => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId, selectedStatus === 'todos' ? null : selectedStatus);
    }
  }, [selectedProjectId, selectedStatus]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    setError(null);
    try {
      if (window.api && window.api.supabaseGetProjects) {
        const data = await window.api.supabaseGetProjects();
        setProjects(data || []);
        if (data && data.length > 0 && !selectedProjectId) {
          // Default to Optica Bassol if available
          const bassol = data.find(p => p.name.toLowerCase().includes('bassol')) || data[0];
          setSelectedProjectId(bassol.id);
        }
      } else {
        // Fallback demo projects if testing outside electron
        setProjects([
          { id: '47644a17-844d-4801-8c08-8a7cdfb06edd', name: 'Optica Bassol', domain: 'opticabassol.com' },
          { id: '0208825f-ee14-4832-9a7c-3087a70e1191', name: 'Fortuna Expeditions', domain: 'fortunaexpeditions.com' }
        ]);
        setSelectedProjectId('47644a17-844d-4801-8c08-8a7cdfb06edd');
      }
    } catch (err) {
      console.error(err);
      setError('Error conectando con Supabase: ' + err.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadTasks = async (projId, statusFilter) => {
    setLoadingTasks(true);
    setError(null);
    try {
      if (window.api && window.api.supabaseGetTasks) {
        const data = await window.api.supabaseGetTasks(projId, statusFilter);
        setTasks(data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Error al cargar tareas de Supabase: ' + err.message);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleSelectTask = async (task) => {
    setLoadingTaskBodyId(task.id);
    try {
      let bodyData = null;
      if (window.api && window.api.supabaseGetTaskBody) {
        bodyData = await window.api.supabaseGetTaskBody(task.id);
      }
      if (onSelectTask) {
        onSelectTask({
          id: task.id,
          title: task.title,
          status: task.status,
          target_keyword: task.target_keyword,
          word_count: task.word_count,
          content_body: bodyData ? bodyData.content_body : ''
        });
      }
    } catch (err) {
      console.error(err);
      setError('Error al descargar el contenido de la tarea: ' + err.message);
    } finally {
      setLoadingTaskBodyId(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (t.title && t.title.toLowerCase().includes(q)) || 
           (t.target_keyword && t.target_keyword.toLowerCase().includes(q));
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'por_humanizar':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">Por Humanizar</span>;
      case 'por_corregir':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">Por Corregir</span>;
      case 'por_desplagiar':
      case 'Por desplagiar':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">Por Desplagiar</span>;
      case 'por_revisar':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Por Revisar</span>;
      case 'por_maquetar':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">Por Maquetar</span>;
      case 'publicado':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-300 border border-gray-500/30">Publicado</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600">{status}</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0b0d14] text-slate-200 overflow-hidden">
      {/* Top Banner / Supabase Header */}
      <div className="bg-[#121624] border-b border-slate-800/80 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Nous Cloud • Supabase Data Engine</h2>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Conectado (wswylghsczgusgagucbd)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sincroniza y humaniza los contenidos en vivo de la base de datos de Nous con el motor neuro-simbólico local.
            </p>
          </div>
        </div>

        <button 
          onClick={loadProjects}
          disabled={loadingProjects}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingProjects ? 'animate-spin' : ''}`} />
          Recargar Proyectos
        </button>
      </div>

      {/* Main Controls: Project Selector & Status Filter */}
      <div className="p-6 border-b border-slate-800/60 bg-[#0e121d] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-emerald-400" />
              Proyecto:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-[#161b2a] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.domain})</option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center bg-[#161b2a] p-1 rounded-lg border border-slate-700/80">
            {[
              { id: 'por_corregir', label: 'Por Corregir' },
              { id: 'por_humanizar', label: 'Por Humanizar' },
              { id: 'por_desplagiar', label: 'Por Desplagiar' },
              { id: 'por_revisar', label: 'Por Revisar' },
              { id: 'todos', label: 'Todos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  selectedStatus === tab.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#161b2a] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-950/40 border border-red-500/40 rounded-lg flex items-center gap-2.5 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Task List */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Contenidos Disponibles en Nous ({filteredTasks.length})
          </span>
          {activeSupabaseTask && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Actualmente cargado: <strong>{activeSupabaseTask.title}</strong>
            </span>
          )}
        </div>

        {loadingTasks ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
            <span className="text-xs font-medium">Consultando tareas en Supabase...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl bg-[#0e121d]">
            <FileText className="w-8 h-8 text-slate-600 mb-2" />
            <span className="text-xs font-medium">No se encontraron tareas con este filtro en el proyecto seleccionado.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredTasks.map((task) => {
              const isCurrentlyActive = activeSupabaseTask && activeSupabaseTask.id === task.id;
              const isLoadingThis = loadingTaskBodyId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-xl border transition flex items-center justify-between gap-4 ${
                    isCurrentlyActive
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/40'
                      : 'bg-[#121624] border-slate-800/80 hover:border-slate-700 hover:bg-[#151a2b]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(task.status)}
                      {task.ai_percentage !== null && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {task.ai_percentage}% IA
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
                        {task.body_length ? `${task.body_length} caracteres` : 'Borrador vacío'}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-white truncate mb-1">
                      {task.title}
                    </h3>

                    {task.target_keyword && (
                      <p className="text-xs text-slate-400 truncate">
                        Keyword: <span className="text-slate-300 font-mono">{task.target_keyword}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectTask(task)}
                      disabled={isLoadingThis}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                        isCurrentlyActive
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {isLoadingThis ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Descargando...
                        </>
                      ) : isCurrentlyActive ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Cargado
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Importar a Humanizador
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
