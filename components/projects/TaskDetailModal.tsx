import React, { useState, useEffect } from 'react';
import { Task, TaskService } from '../../lib/task_manager';
import { ContentService } from '../../lib/ContentService';
import { motion } from 'framer-motion';
import { X, Calendar, User, Save, Trash2, ExternalLink, Lock, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface TaskDetailModalProps {
    task: Task;
    onClose: () => void;
    onUpdate: () => void;
}

const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, onClose, onUpdate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState(task.title);
    const [desc, setDesc] = useState(task.description || '');
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [isSaving, setIsSaving] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(task.locked_by || null);

    const isLocked = ContentService.isLocked(task as any, user?.id || '');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await TaskService.updateTask(task.id, {
                title,
                description: desc,
                status,
                priority
            });
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("¿Eliminar esta tarea?")) return;
        try {
            await TaskService.deleteTask(task.id);
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditContent = async () => {
        if (!user) return;
        if (isLocked) {
            alert("Contenido bloqueado por otro usuario.");
            return;
        }
        try {
            await ContentService.lockContent(task.id);
            navigate(`/herramientas/redactor-ia?draftId=${task.id}&context=project`);
        } catch (e: any) {
            alert("Error al bloquear: " + e.message);
        }
    };

    const handleUnlock = async () => {
        try {
            await ContentService.unlockContent(task.id);
            setLockedBy(null);
            onUpdate();
        } catch (e: any) {
            alert("Error: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-brand-power/80 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-brand-power/5 flex justify-between items-start">
                    <div className="flex-1 mr-4">
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="text-2xl font-bold text-brand-power w-full bg-transparent outline-none border-b border-transparent focus:border-brand-accent/50 pb-1"
                        />
                        <div className="flex items-center gap-4 mt-2 text-xs text-brand-power/50">
                            <span>ID: #{task.id}</span>
                            <span>Creado: {new Date(task.created_at).toLocaleDateString()}</span>
                            {lockedBy && (
                                <span className="flex items-center gap-1 text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">
                                    <Lock size={10} /> Bloqueado
                                </span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-brand-soft rounded-full text-brand-power/40 hover:text-brand-power">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Descripción</label>
                            <textarea
                                value={desc} onChange={e => setDesc(e.target.value)}
                                className="w-full min-h-[150px] bg-brand-soft/20 border border-brand-power/10 rounded-xl p-4 text-sm text-brand-power shadow-inner outline-none focus:border-brand-accent resize-none"
                                placeholder="Añade detalles a esta tarea..."
                            />
                        </div>

                        {/* Content Action */}
                        <div className="bg-gradient-to-br from-brand-power/5 to-transparent rounded-xl p-6 border border-brand-power/5 flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-brand-power mb-1">Contenido del Artículo</h4>
                                <p className="text-xs text-brand-power/60">Gestiona la redacción y optimización.</p>
                            </div>
                            <button
                                onClick={handleEditContent}
                                disabled={isLocked}
                                className="px-4 py-2 bg-brand-accent text-white rounded-lg shadow-lg shadow-brand-accent/20 font-bold text-xs uppercase tracking-wider hover:bg-brand-accent/90 disabled:opacity-50 flex items-center gap-2"
                            >
                                <Edit3 size={14} /> {isLocked ? 'Bloqueado' : 'Editar / Redactar'}
                            </button>
                        </div>

                        {lockedBy === user?.id && (
                            <div className="text-center">
                                <button onClick={handleUnlock} className="text-xs text-slate-400 underline hover:text-slate-600">
                                    Liberar Bloqueo Manualmente
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Estado</label>
                            <select
                                value={status} onChange={e => setStatus(e.target.value as any)}
                                className="w-full bg-white border border-brand-power/10 rounded-lg p-2 text-sm outline-none focus:border-brand-accent"
                            >
                                <option value="idea">Idea</option>
                                <option value="todo">Por Hacer</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="review">Revisión</option>
                                <option value="done">Terminado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-brand-power/40 mb-2">Prioridad</label>
                            <select
                                value={priority} onChange={e => setPriority(e.target.value as any)}
                                className="w-full bg-white border border-brand-power/10 rounded-lg p-2 text-sm outline-none focus:border-brand-accent"
                            >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>

                        <div className="pt-6 border-t border-brand-power/5 mt-auto">
                            <button
                                onClick={handleDelete}
                                className="w-full py-2 px-4 flex items-center justify-center gap-2 text-red-400 font-bold text-xs uppercase hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} /> Eliminar Tarea
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-brand-power/5 flex justify-end gap-3 bg-brand-soft/5">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-brand-power text-brand-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-brand-accent transition-colors shadow-lg flex items-center gap-2"
                    >
                        <Save size={16} /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};


export default TaskDetailModal;
