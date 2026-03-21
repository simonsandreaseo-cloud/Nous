import { 
    Plus, 
    MoreHorizontal, 
    MessageSquare, 
    Paperclip, 
    BarChart3, 
    Users, 
    ChevronDown, 
    Loader2, 
    Calendar,
    Target,
    AlertCircle
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjectStore, Task } from "@/store/useProjectStore";
import { useEffect, useState, useMemo } from "react";
import { cn } from "@/utils/cn";

interface StatusColumn {
    id: Task['status'];
    title: string;
    count: number;
    tasks: Task[];
}

interface TaskCardProps {
    task: Task;
}

const KanbanColumn = ({ status, canAdd, onAddTask }: { status: StatusColumn, canAdd: boolean, onAddTask: (status: Task['status']) => void }) => (
    <div className="flex flex-col space-y-4 min-w-[320px] h-full overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-200">

        <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full", getStatusColor(status.id))}></div>
                {status.title}
                <span className="ml-2 text-[9px] font-mono px-2 py-0.5 bg-slate-100 text-slate-400 rounded-full">{status.count}</span>
            </h3>
            <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <MoreHorizontal size={14} />
            </button>
        </div>

        <div className="space-y-4">
            {status.tasks.map((task) => (
                <KanbanCard key={task.id} task={task} />
            ))}
        </div>

        {canAdd && (
            <button 
                onClick={() => onAddTask(status.id)}
                className="mt-2 flex items-center justify-center w-full p-4 rounded-2xl border-2 border-dashed border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer text-slate-400 hover:text-slate-500 transition-all group"
            >
                <Plus size={16} className="mr-2 group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Tarea</span>
            </button>
        )}
    </div>
);


const KanbanCard = ({ task }: { task: Task }) => {
    const { projects } = useProjectStore();
    const project = projects.find(p => p.id === task.project_id);
    
    return (
        <div className="group relative bg-white border border-slate-100 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 cursor-grab active:cursor-grabbing">
            {/* Project / Priority */}
            <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                    "text-[9px] uppercase font-black px-2.5 py-1 rounded-lg border",
                    project?.color ? `border-opacity-20` : "text-slate-400 border-slate-200 bg-slate-50"
                )} style={project?.color ? { borderColor: `${project.color}33`, backgroundColor: `${project.color}11`, color: project.color } : {}}>
                    {project?.name || "Global"}
                </span>
                
                {task.priority === 'high' || task.priority === 'critical' ? (
                    <div className="ml-auto w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse"></div>
                ) : null}
            </div>

            <h4 className="text-sm font-medium text-slate-800 mb-4 leading-relaxed group-hover:text-indigo-600 transition-colors">{task.title}</h4>

            {/* Keyword / URL context if available */}
            {task.target_keyword && (
                <div className="flex items-center gap-2 mb-4">
                    <Target size={12} className="text-slate-300" />
                    <span className="text-[10px] font-bold text-slate-400 truncate">{task.target_keyword}</span>
                </div>
            )}

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
                {/* Meta */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold">
                            {task.scheduled_date ? new Date(task.scheduled_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) : 'Sin fecha'}
                        </span>
                    </div>
                </div>

                {/* Assignee Avatar Mock */}
                <div className="flex -space-x-1.5">
                    {task.assigned_to ? (
                        <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black text-white border-2 border-white uppercase">
                            {task.assigned_to.substring(0, 1)}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-white">
                            <Plus size={10} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const getStatusColor = (status: Task['status']) => {
    switch (status) {
        case "todo": return "bg-slate-300";
        case "in_progress": return "bg-indigo-500";
        case "review": return "bg-amber-400";
        case "done": return "bg-emerald-500";
        default: return "bg-slate-200";
    }
};

const STATUS_CONFIG: { id: Task['status'], title: string }[] = [
    { id: "todo", title: "Para Hacer" },
    { id: "in_progress", title: "En Proceso" },
    { id: "review", title: "Revisión" },
    { id: "done", title: "Finalizado" }
];

const mockStatuses: StatusColumn[] = [
    {
        title: "To Do",
        count: 3,
        tasks: [
            {
                title: "Brainstorming: Q3 SEO Strategy for Medical Blog",
                project: "SEO Growth",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "medium",
                comments: 2,
                attachments: 1,
                tags: ["Strategy"]
            },
            {
                title: "Keyword Research: 'Biotech Startups' Niche",
                project: "Research",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026704d",
                priority: "low",
                comments: 0,
                attachments: 0,
                tags: ["Keywords"]
            },
            {
                title: "Update Client Reporting Structure",
                project: "Client Ops",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "medium",
                comments: 5,
                attachments: 2,
                tags: ["Reporting"]
            }
        ],
    },
    {
        title: "In Progress",
        count: 2,
        tasks: [
            {
                title: "Technical Audit: Site Speed Optimization",
                project: "Tech SEO",
                assignee: "https://i.pravatar.cc/150?u=a04258114e29026302d",
                priority: "high",
                comments: 12,
                attachments: 4,
                tags: ["Technical", "Critical"]
            },
            {
                title: "Content Writing: 'Future of Clinical AI'",
                project: "Blog",
                assignee: "https://i.pravatar.cc/150?u=a048581f4e29026701d",
                priority: "medium",
                comments: 1,
                attachments: 0,
                tags: ["Content"]
            }

        ],
    },
    {
        title: "Review",
        count: 1,
        tasks: [
            {
                title: "Review: On-Page Optimization for Home Page",
                project: "On-Page",
                assignee: "https://i.pravatar.cc/150?u=a042581f4e29026024d",
                priority: "high",
                comments: 3,
                attachments: 1,
                tags: ["Review"]
            }
        ],
    },
    {
        title: "Done",
        count: 5,
        tasks: [
            {
                title: "Launch: New Landing Page",
                project: "Development",
                assignee: "https://i.pravatar.cc/150?u=a04258114e29026302d",
                priority: "high",
                comments: 8,
                attachments: 5,
                tags: ["Launch"]
            }
        ],
    },
];

export function Workspace() {
    const { role } = usePermissions();
    const canManage = role !== 'client';
    const { tasks, fetchProjectTasks, activeProject, addTask, isLoading, projects } = useProjectStore();

    useEffect(() => {
        if (activeProject) {
            fetchProjectTasks(activeProject.id);
        }
    }, [activeProject, fetchProjectTasks]);

    const columns: StatusColumn[] = useMemo(() => {
        return STATUS_CONFIG.map(config => ({
            id: config.id,
            title: config.title,
            count: tasks.filter(t => t.status === config.id).length,
            tasks: tasks.filter(t => t.status === config.id)
        }));
    }, [tasks]);

    const handleAddTask = async (status: Task['status']) => {
        if (!activeProject) {
            alert("No hay un proyecto activo seleccionado.");
            return;
        }

        const title = prompt("Título de la nueva tarea:");
        if (!title) return;

        await addTask({
            project_id: activeProject.id,
            title,
            status,
            priority: 'medium',
            scheduled_date: new Date().toISOString()
        });
    };

    return (
        <div className="flex-1 h-full overflow-hidden flex flex-col pt-6 pl-6 pr-0">

            {/* Workspace Toolbar / Filters */}
            <div className="mb-8 flex items-center justify-between pr-6">
                <div className="flex items-center gap-6">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">{activeProject?.name || "Global Workspace"}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Tareas SEO</p>
                    </div>

                    <div className="flex items-center space-x-1 glass-panel border-hairline p-1 rounded-xl bg-white/40">
                        <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-800 bg-white shadow-sm rounded-lg transition-all">Tablero</button>
                        <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all rounded-lg">Lista</button>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    {isLoading && <Loader2 className="animate-spin text-slate-300" size={16} />}
                    <div className="relative group">
                        <div className="px-4 py-2 rounded-xl border border-hairline bg-white/50 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-white cursor-pointer transition-colors flex items-center gap-2">
                            <Users size={12} />
                            <span>Filtro: Todos</span>
                            <ChevronDown size={10} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Kanban Board Container */}
            <div className="flex-1 flex overflow-x-auto pb-8 space-x-4 scrollbar-thin scrollbar-thumb-slate-200 snap-x snap-mandatory pr-6">
                {columns.map((st) => (
                    <div key={st.id} className="snap-start shrink-0">
                        <KanbanColumn status={st} canAdd={canManage} onAddTask={handleAddTask} />
                    </div>
                ))}


                {/* Empty State / Hints */}
                {tasks.length === 0 && !isLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center -ml-6 opacity-30">
                        <div className="p-10 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                            <AlertCircle size={48} className="text-slate-300 mb-4" />
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 text-center">No hay tareas activas<br/>en este proyecto</p>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
