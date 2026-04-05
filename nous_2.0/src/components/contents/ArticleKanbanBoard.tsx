import { useState, useEffect } from "react";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useWriterStore } from "@/store/useWriterStore";
import { useProjectStore } from "@/store/useProjectStore";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { ArticleDetailDrawer } from "./ArticleCardGrid";
import { AlertCircle, Trash2, X, RefreshCw } from "lucide-react";
import type { Article, ArticleStatus } from "./ArticleCardGrid";
import { motion, AnimatePresence } from "framer-motion";

const COLUMNS = [
    { id: "idea", title: "Ideas", icon: "💡" },
    { id: "en_investigacion", title: "En Investigación", icon: "🔍" },
    { id: "por_redactar", title: "Por Redactar", icon: "📋" },
    { id: "por_corregir", title: "Por Corregir", icon: "✨" },
    { id: "por_maquetar", title: "Por Maquetar", icon: "🚀" },
    { id: "publicado", title: "Publicado", icon: "✅" }
];

const STATUS_ORDER = ['idea', 'en_investigacion', 'por_redactar', 'por_corregir', 'por_maquetar', 'publicado'];

export function ArticleKanbanBoard({ onToolSelect }: { onToolSelect: (toolId: string) => void }) {
    const { activeProjectIds, updateTask } = useProjectStore();
    const { projectContents, loadProjectContents, deleteContent, loadContentById } = useWriterStore();

    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    
    // Modal State
    const [showBackwardModal, setShowBackwardModal] = useState<{
        articleId: string;
        newStatus: string;
        options: { seo: boolean; body: boolean };
    } | null>(null);

    useEffect(() => {
        if (activeProjectIds.length > 0) {
            loadProjectContents(activeProjectIds);
        } else {
            useWriterStore.getState().setProjectContents([]);
        }
    }, [activeProjectIds]);

    const articles: Article[] = projectContents.map(c => ({
        id: c.id,
        title: c.title,
        keyword: c.target_keyword || "",
        status: (c.status || "idea") as ArticleStatus,
        scheduledDate: c.created_at,
        seo_data: c.seo_data,
        appliedTools: c.seo_data ? ["planner", "writer"] : []
    }));

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const articleId = active.id as string;
        const newStatus = over.id as string;

        const article = articles.find(a => a.id === articleId);
        if (!article || article.status === newStatus) return;

        const currentIndex = STATUS_ORDER.indexOf(article.status);
        const nextIndex = STATUS_ORDER.indexOf(newStatus);

        if (nextIndex < currentIndex) {
            // Backward move: Show modal
            setShowBackwardModal({
                articleId,
                newStatus,
                options: { seo: nextIndex < 1, body: nextIndex < 3 } // Suggest deletion based on target
            });
        } else {
            // Forward move: Trigger update (Store handles validation)
            await handleUpdateStatus(articleId, newStatus);
        }
    };

    const handleConfirmBackward = async (deleteData: boolean) => {
        if (!showBackwardModal) return;
        const { articleId, newStatus, options } = showBackwardModal;
        
        const updates: any = { status: newStatus };
        if (deleteData) {
            if (options.seo) updates.seo_data = {};
            if (options.body) updates.content_body = "";
        }

        await updateTask(articleId, updates);
        await loadProjectContents(activeProjectIds);
        setShowBackwardModal(null);
    };

    const handleOpenTool = async (contentId: string, toolId: string) => {
        if (toolId === 'writer') {
            await loadContentById(contentId);
            onToolSelect('writer');
        } else {
            onToolSelect(toolId);
        }
        setSelectedArticle(null);
    };

    const handleDelete = async (contentId: string) => {
        await deleteContent(contentId);
        setSelectedArticle(null);
    };

    const handleUpdateStatus = async (contentId: string, newStatus: string) => {
        await updateTask(contentId, { status: newStatus as any });
        await loadProjectContents(activeProjectIds);
    };

    const activeArticle = activeId ? articles.find(a => a.id === activeId) : null;

    return (
        <div className="relative h-full flex overflow-x-auto pb-4 custom-scrollbar">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex gap-6 min-w-max h-full">
                    {COLUMNS.map(col => (
                        <KanbanColumn
                            key={col.id}
                            id={col.id}
                            title={col.title}
                            icon={col.icon}
                            articles={articles.filter(a => 
                                a.status === col.id || 
                                (col.id === 'idea' && a.status === 'idea') ||
                                (col.id === 'en_investigacion' && a.status === 'investigacion_proceso') ||
                                (col.id === 'por_maquetar' && a.status === 'done') ||
                                (col.id === 'publicado' && a.status === 'done')
                            )}
                            onOpen={setSelectedArticle}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeArticle ? <KanbanCard article={activeArticle} onOpen={() => {}} isDragging /> : null}
                </DragOverlay>
            </DndContext>

            {/* BACKWARD TRANSITION MODAL */}
            <AnimatePresence>
                {showBackwardModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white w-full max-w-md rounded-[40px] p-10 shadow-2xl overflow-hidden relative"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-amber-50 rounded-2xl">
                                    <AlertCircle className="text-amber-500" size={24} />
                                </div>
                                <button onClick={() => setShowBackwardModal(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-4">¿Retroceder fase de contenido?</h3>
                            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                                Estas moviendo el contenido a una fase anterior. ¿Deseas que borremos los datos avanzados (Investigación SEO o Redacción) generados hasta ahora?
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => handleConfirmBackward(true)}
                                    className="w-full py-4 bg-rose-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                                >
                                    <Trash2 size={16} /> Borrar datos y cambiar
                                </button>
                                <button
                                    onClick={() => handleConfirmBackward(false)}
                                    className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    Cambiar estatus sin borrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {selectedArticle && (
                <ArticleDetailDrawer
                    article={selectedArticle}
                    onClose={() => setSelectedArticle(null)}
                    onOpenTool={handleOpenTool}
                    onDelete={handleDelete}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
}
