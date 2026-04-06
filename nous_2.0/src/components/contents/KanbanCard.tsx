import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";
import { FileText, MoreVertical, GripVertical } from "lucide-react";

export function KanbanCard({ article, onOpen, isDragging = false }: { article: Task, onOpen: (article: Task) => void, isDragging?: boolean }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isSortableDragging
    } = useSortable({ id: article.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const draggingClass = (isDragging || isSortableDragging) ? "opacity-50 scale-105 shadow-xl rotate-2" : "";

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all",
                draggingClass
            )}
            onClick={(e) => {
                // Ignore clicks if they happened on the drag handle
                if ((e.target as HTMLElement).closest('.drag-handle')) return;
                onOpen(article);
            }}
        >
            <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div
                    {...attributes}
                    {...listeners}
                    className="drag-handle p-1 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
                >
                    <GripVertical size={14} />
                </div>
            </div>

            <div className="pl-6">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
                        {article.target_keyword || "Sin Keyword"}
                    </span>
                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                        <MoreVertical size={14} />
                    </button>
                </div>
                <h4 className="text-xs font-bold text-slate-800 leading-snug line-clamp-2 mb-3">
                    {article.title || "Artículo sin título"}
                </h4>

                <div className="flex items-center gap-2 mt-auto">
                    {article.seo_data?.lsi_keywords ? (
                        <div className="flex -space-x-1">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center">
                                <span className="text-[8px] font-black text-indigo-600">IA</span>
                            </div>
                        </div>
                    ) : (
                        <FileText size={12} className="text-slate-300" />
                    )}
                    <span className="text-[9px] font-bold text-slate-400">
                        {article.seo_data ? "Investigado" : "Borrador"}
                    </span>
                </div>
            </div>
        </div>
    );
}
