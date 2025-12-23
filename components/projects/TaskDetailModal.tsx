import React, { useState, useEffect } from 'react';
import { Project, Task, TaskService } from '../../lib/task_manager';
import { ContentService } from '../../lib/ContentService';
import { motion } from 'framer-motion';
import { X, Calendar, User, Save, Trash2, ExternalLink, Lock, Edit3, Sparkles, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { TaskMetricsChart } from './TaskMetricsChart';

interface TaskDetailModalProps {
    task: Task;
    project?: Project;
    onClose: () => void;
    onUpdate: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, project, onClose, onUpdate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState(task.title);
    const [desc, setDesc] = useState(task.description || '');
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [type, setType] = useState<'task' | 'content'>(task.type || 'task');
    const [secondaryUrl, setSecondaryUrl] = useState(task.secondary_url || '');
    const [keyword, setKeyword] = useState(task.target_keyword || '');
    const [trackingMetrics, setTrackingMetrics] = useState(task.tracking_metrics || false);
    const [completedAt, setCompletedAt] = useState(task.completed_at || '');
    const [isSaving, setIsSaving] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(task.locked_by || null);

    const isLocked = ContentService.isLocked(task, user?.id || '');

    useEffect(() => {
        // If status changes to done, set completed_at
        if (status === 'done' && !completedAt) {
            setCompletedAt(new Date().toISOString());
        } else if (status !== 'done' && completedAt === task.completed_at) {
            // Keep it if it was already saved, or clear it if it was just added in this session?
            // Safer to keep it if it was already in DB, or only clear if user manually changes back.
            // For now, let's only set it when going TO done.
        }
    }, [status]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await TaskService.updateTask(task.id, {
                title,
                description: desc,
                status,
                priority,
                type,
                secondary_url: secondaryUrl,
                target_keyword: keyword,
                tracking_metrics: trackingMetrics,
                completed_at: completedAt
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al actualizar tarea");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Seguro que deseas eliminar esta tarea?")) return;
        try {
            await TaskService.deleteTask(task.id);
            onUpdate();
            onClose();
        } catch (error) {
            alert("Error al eliminar");
        }
    };

    const handleEditContent = async (version: 1 | 2) => {
        if (!user) return;
        if (isLocked) {
            alert("Contenido bloqueado por otro usuario.");
            return;
        }
        try {
            await ContentService.lockContent(task.id);
            if (version === 1) {
                navigate(`/herramientas/redactor-ia?draftId=${task.id}&context=project`);
            } else {
                navigate(`/herramientas/redactor-ia-2?taskId=${task.id}`);
            }
        } catch (e: any) {
            alert("Error al bloquear: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="p-6 border-b border-brand-power/5 flex justify-between items-start bg-slate-50/50">
                    <div className="flex-1 mr-4">
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="text-2xl font-bold text-brand-power bg-transparent border-none outline-none w-full focus:ring-2 focus:ring-brand-accent/20 rounded-lg px-2 -ml-2"
                        />
                        <div className="flex items-center gap-4 mt-2 text-xs text-brand-power/40 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Calendar size={12} /> Creada: {new Date(task.created_at).toLocaleDateString()}</span>
                            {completedAt && (
                                <span className="flex items-center gap-1 text-emerald-500"><Activity size={12} /> Finalizada: {new Date(completedAt).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDelete} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Eliminar tarea">
                            <Trash2 size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-brand-power/30 hover:text-brand-power rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2 space-y-8">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-3">Descripción / Notas</label>
                                <textarea
                                    value={desc} onChange={e => setDesc(e.target.value)}
                                    placeholder="Detalles sobre la tarea..."
                                    className="w-full bg-brand-soft/10 border border-brand-power/5 rounded-2xl p-4 text-sm outline-none focus:border-brand-accent min-h-[120px] resize-none"
                                />
                            </div>

                            {/* Specialized Sections based on Type */}
                            {type === 'content' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Palabra Clave Objetivo</label>
                                        <input
                                            value={keyword} onChange={e => setKeyword(e.target.value)}
                                            placeholder="Ej: mejores zapatillas running 2024"
                                            className="w-full bg-brand-soft/20 border border-brand-power/10 rounded-lg p-3 text-sm outline-none focus:border-brand-accent"
                                        />
                                    </div>
                                    <div className="bg-gradient-to-br from-brand-power/5 to-transparent rounded-xl p-6 border border-brand-power/5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="font-bold text-brand-power mb-1">Redacción de Contenido</h4>
                                                <p className="text-xs text-brand-power/60">Usa la IA para generar el artículo.</p>
                                            </div>
                                            <Sparkles className="text-brand-accent animate-pulse" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleEditContent(1)}
                                                disabled={isLocked}
                                                className="px-3 py-2 bg-brand-soft text-brand-power rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-brand-accent/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                <Edit3 size={12} /> Redactor 1.0
                                            </button>
                                            <button
                                                onClick={() => handleEditContent(2)}
                                                disabled={isLocked}
                                                className="px-3 py-2 bg-brand-power text-white rounded-lg shadow-lg shadow-brand-power/20 font-bold text-[10px] uppercase tracking-wider hover:bg-brand-accent hover:text-brand-power disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Sparkles size={12} /> Redactor 2.0 PRO
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-brand-soft/10 rounded-2xl p-6 border border-brand-power/5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex-1 mr-4">
                                                <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">URLs de Trabajo / Seguimiento</label>
                                                <input
                                                    value={secondaryUrl} onChange={e => setSecondaryUrl(e.target.value)}
                                                    placeholder="https://ejemplo.com/p1, https://ejemplo.com/p2"
                                                    className="w-full bg-white border border-brand-power/10 rounded-xl p-3 text-sm outline-none focus:border-brand-accent font-mono shadow-inner"
                                                />
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <label className="text-[10px] font-bold uppercase text-brand-power/40 mb-2 tracking-tighter">Tracking GSC</label>
                                                <button
                                                    onClick={() => setTrackingMetrics(!trackingMetrics)}
                                                    className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 ${trackingMetrics ? 'bg-brand-accent text-brand-power font-bold overflow-hidden' : 'bg-slate-100 text-slate-400'}`}
                                                >
                                                    <Activity size={18} />
                                                    {trackingMetrics && <span className="text-[10px] uppercase">Activo</span>}
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-brand-power/40 mt-2 italic px-1">Separa varias URLs con comas para agrupar sus métricas.</p>
                                    </div>

                                    {trackingMetrics && project && (
                                        <div className="animate-in slide-in-from-bottom-4 duration-500">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-4 flex items-center gap-2">
                                                <Activity size={14} /> Rendimiento Real de la Tarea
                                            </label>
                                            <TaskMetricsChart
                                                project={project}
                                                task={{ ...task, secondary_url: secondaryUrl, tracking_metrics: trackingMetrics, completed_at: completedAt }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {lockedBy === user?.id && (
                                <div className="text-center">
                                    <button
                                        onClick={() => ContentService.unlockContent(task.id).then(() => setLockedBy(null))}
                                        className="text-xs text-brand-power/50 hover:text-brand-power underline"
                                    >
                                        Liberar edición bloqueada por ti
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Sidebar Settings */}
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-2xl p-6 space-y-6 border border-brand-power/5">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Tipo de Tarea</label>
                                    <select
                                        value={type} onChange={e => setType(e.target.value as any)}
                                        className="w-full bg-white border border-brand-power/10 rounded-lg p-2 text-sm outline-none focus:border-brand-accent font-bold text-brand-power"
                                    >
                                        <option value="task">General / SEO</option>
                                        <option value="content">Editorial / Contenido</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Estado</label>
                                    <select
                                        value={status} onChange={e => setStatus(e.target.value as any)}
                                        className="w-full bg-white border border-brand-power/10 rounded-lg p-2 text-sm outline-none focus:border-brand-accent font-bold text-brand-power"
                                    >
                                        <option value="idea">Idea</option>
                                        <option value="todo">Por Hacer</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="review">Revisión</option>
                                        <option value="done">Finalizado / Publicado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Prioridad</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['low', 'medium', 'high', 'critical'].map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setPriority(p as any)}
                                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${priority === p
                                                    ? 'bg-brand-power text-white border-brand-power'
                                                    : 'bg-white text-brand-power/50 border-brand-power/10 hover:border-brand-accent'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full bg-brand-accent text-brand-power font-bold py-4 rounded-2xl shadow-lg shadow-brand-accent/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={18} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TaskDetailModal;
