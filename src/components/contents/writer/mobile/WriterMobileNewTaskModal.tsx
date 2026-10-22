'use client';

import { useState } from 'react';
import { X, Plus, Sparkles, Loader2, FileText, Folder } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProjectStore } from '@/store/useProjectStore';
import { useWriterStore } from '@/store/useWriterStore';
import { supabase } from '@/lib/supabase';

interface WriterMobileNewTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskCreated: (taskId: string) => void;
}

export function WriterMobileNewTaskModal({
    isOpen,
    onClose,
    onTaskCreated
}: WriterMobileNewTaskModalProps) {
    const { projects, activeProjectIds, addTask } = useProjectStore();
    const { projectId, loadContentById, loadProjectContents } = useWriterStore();

    const [keyword, setKeyword] = useState('');
    const [title, setTitle] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string>(
        projectId || activeProjectIds[0] || (projects[0]?.id || '')
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const mainTitle = title.trim() || keyword.trim();
        if (!mainTitle) return;
        if (!selectedProjectId) {
            alert('Por favor selecciona un proyecto.');
            return;
        }

        setIsSubmitting(true);
        try {
            const taskData: any = {
                title: mainTitle,
                keyword: keyword.trim() || mainTitle,
                project_id: selectedProjectId,
                status: 'idea',
                content_body: '<p></p>',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const created = await addTask(taskData);
            const taskId = (created as any)?.id || created?.data?.id;

            if (taskId) {
                await loadProjectContents(activeProjectIds.length > 0 ? activeProjectIds : [selectedProjectId]);
                await loadContentById(taskId);
                onTaskCreated(taskId);
                onClose();
            } else {
                // Fallback insert directly via Supabase
                const { data, error } = await supabase
                    .from('tasks')
                    .insert(taskData)
                    .select()
                    .single();

                if (error) throw error;
                if (data) {
                    await loadProjectContents(activeProjectIds.length > 0 ? activeProjectIds : [selectedProjectId]);
                    await loadContentById(data.id);
                    onTaskCreated(data.id);
                    onClose();
                }
            }
        } catch (err: any) {
            console.error('Error creating document:', err);
            alert('Error al crear documento: ' + (err.message || 'Error desconocido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 backdrop-blur-xs"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-5 z-10 overflow-hidden"
                >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                                    Nuevo Documento
                                </h3>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                    Studio
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                Título o Keyword Principal *
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ej: Guía de SEO Médico 2026"
                                required
                                autoFocus
                                className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                                Proyecto Asignado *
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                >
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <Folder className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !title.trim()}
                                className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-md hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Creando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Plus size={14} />
                                        <span>Crear Documento</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
