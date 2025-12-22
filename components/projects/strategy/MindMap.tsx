import React, { useState, useEffect } from 'react';
import { Project, Task, ProjectService } from '../../../lib/task_manager';
import { Plus, X, ChevronRight, ChevronDown, CheckCircle } from 'lucide-react';

interface MindMapProps {
    project: Project;
    tasks: Task[];
    onUpdateProject: () => void;
}

interface Phase {
    id: string;
    name: string;
    tasks: string[]; // Task IDs
}

export const MindMap: React.FC<MindMapProps> = ({ project, tasks, onUpdateProject }) => {
    const [phases, setPhases] = useState<Phase[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        // Load phases from project settings
        if (project.settings?.phases) {
            setPhases(project.settings.phases);
        }
    }, [project.settings]);

    const handleAddPhase = async () => {
        const name = prompt("Nombre de la Fase:");
        if (!name) return;

        const newPhase: Phase = {
            id: Date.now().toString(),
            name,
            tasks: []
        };

        const newPhases = [...phases, newPhase];
        await savePhases(newPhases);
    };

    const handleDeletePhase = async (phaseId: string) => {
        if (!confirm("Eliminar esta fase?")) return;
        const newPhases = phases.filter(p => p.id !== phaseId);
        await savePhases(newPhases);
    };

    const savePhases = async (newPhases: Phase[]) => {
        setPhases(newPhases);
        await ProjectService.updateProject(project.id, {
            settings: { ...project.settings, phases: newPhases }
        });
        onUpdateProject();
    };

    // Filter tasks not in any phase
    const assignedTaskIds = new Set(phases.flatMap(p => p.tasks));
    const unassignedTasks = tasks.filter(t => !assignedTaskIds.has(t.id.toString()));

    const handleDropTask = async (phaseId: string, taskId: string) => {
        // Remove from other phases
        const newPhases = phases.map(p => ({
            ...p,
            tasks: p.tasks.filter(tid => tid !== taskId)
        }));

        // Add to target phase
        const targetPhase = newPhases.find(p => p.id === phaseId);
        if (targetPhase) {
            targetPhase.tasks.push(taskId);
        }

        await savePhases(newPhases);
    };

    // Simple Drag & Drop Logic (HTML5 DnD)
    const onDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData("taskId", taskId);
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const onDrop = (e: React.DragEvent, phaseId: string) => {
        const taskId = e.dataTransfer.getData("taskId");
        if (taskId) handleDropTask(phaseId, taskId);
    };

    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-brand-power/5 overflow-x-auto">
            <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-brand-power text-xl">Mapa Mental del Proyecto</h3>
                <button
                    onClick={handleAddPhase}
                    className="flex items-center gap-1 text-xs font-bold bg-brand-accent text-white px-3 py-2 rounded-lg hover:bg-brand-accent/90"
                >
                    <Plus size={14} /> Nueva Fase
                </button>
            </div>

            <div className="flex items-start gap-8 min-w-max">
                {/* Root Node */}
                <div className="flex flex-col items-center justify-center p-4 bg-brand-power text-brand-white rounded-xl shadow-lg border-2 border-brand-power z-10 w-48 text-center">
                    <div className="font-bold text-lg mb-1">{project.name}</div>
                    <div className="text-[10px] opacity-70 uppercase tracking-widest">Proyecto Principal</div>
                </div>

                {/* Connector */}
                {phases.length > 0 && (
                    <div className="h-0.5 w-16 bg-brand-power/20 self-center"></div>
                )}

                {/* Phases Tree */}
                <div className="flex flex-col gap-8">
                    {phases.map(phase => (
                        <div key={phase.id} className="flex items-start gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            {/* Phase Node */}
                            <div
                                className="relative flex flex-col p-4 bg-brand-soft/20 rounded-xl border-2 border-brand-power/10 w-64 group hover:border-brand-accent/50 transition-colors"
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, phase.id)}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-bold text-brand-power">{phase.name}</h4>
                                    <button onClick={() => handleDeletePhase(phase.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {phase.tasks.length === 0 && <div className="text-xs text-brand-power/30 text-center py-4 border-2 border-dashed border-brand-power/5 rounded-lg">Arrastra tareas aquí</div>}

                                    {phase.tasks.map(tid => {
                                        const t = tasks.find(tsk => tsk.id.toString() === tid);
                                        if (!t) return null;
                                        return (
                                            <div
                                                key={tid}
                                                draggable
                                                onDragStart={(e) => onDragStart(e, tid)}
                                                className="bg-white p-2 rounded shadow-sm border border-brand-power/5 text-xs text-brand-power flex items-center justify-between cursor-move hover:scale-[1.02] transition-transform"
                                            >
                                                <span className="truncate">{t.title}</span>
                                                {t.status === 'done' && <CheckCircle size={10} className="text-emerald-500 shrink-0" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Unassigned Pool */}
                <div className="ml-8 w-64 shrink-0">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Sin Asignar ({unassignedTasks.length})</h4>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {unassignedTasks.map(t => (
                                <div
                                    key={t.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, t.id.toString())}
                                    className="bg-white p-2 rounded shadow-sm border border-slate-200 text-xs text-slate-600 cursor-move hover:shadow-md transition-all"
                                >
                                    {t.title}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
