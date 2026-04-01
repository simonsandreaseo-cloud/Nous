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
import { AlertCircle } from "lucide-react";
import type { Article, ArticleStatus } from "./ArticleCardGrid";

const COLUMNS = [
    { id: "idea", title: "Ideas", icon: "💡" },
    { id: "briefing", title: "En Briefing", icon: "📋" },
    { id: "drafting", title: "Redacción", icon: "✍️" },
    { id: "review", title: "Refinería", icon: "✨" },
    { id: "scheduled", title: "Listos", icon: "🚀" }
];

export function ArticleKanbanBoard({ onToolSelect }: { onToolSelect: (toolId: string) => void }) {
    const { activeProjectIds } = useProjectStore();
    const { projectContents, loadProjectContents, deleteContent, loadContentById } = useWriterStore();

    const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

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

        // If dropped in a different column
        const article = articles.find(a => a.id === articleId);
        if (article && article.status !== newStatus && COLUMNS.find(c => c.id === newStatus)) {
            // Optimistic update
            await handleUpdateStatus(articleId, newStatus);
        }
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
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = require('@supabase/supabase-js').createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase.from('contents').update({ status: newStatus }).eq('id', contentId);
        if (!error) {
             await loadProjectContents(activeProjectIds);
             const updatedArticle = useWriterStore.getState().projectContents.find((c: any) => c.id === contentId);
             if (updatedArticle && selectedArticle?.id === contentId) {
                 setSelectedArticle({
                     ...selectedArticle,
                     status: updatedArticle.status as ArticleStatus
                 });
             }
        }
    };

    if (articles.length === 0) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-100 rounded-[32px]">
                <AlertCircle size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">No hay contenidos en este proyecto</p>
            </div>
        );
    }

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
                            articles={articles.filter(a => a.status === col.id || (col.id === 'scheduled' && a.status === 'published'))}
                            onOpen={setSelectedArticle}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeArticle ? <KanbanCard article={activeArticle} onOpen={() => {}} isDragging /> : null}
                </DragOverlay>
            </DndContext>

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
