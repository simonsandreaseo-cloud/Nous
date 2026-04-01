import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import type { Article } from "./ArticleCardGrid";
import { cn } from "@/utils/cn";

interface KanbanColumnProps {
    id: string;
    title: string;
    icon: string;
    articles: Article[];
    onOpen: (article: Article) => void;
}

export function KanbanColumn({ id, title, icon, articles, onOpen }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id });

    return (
        <div className="flex flex-col w-[320px] shrink-0 h-full">
            <div className="flex items-center gap-2 mb-4 px-2">
                <span className="text-lg">{icon}</span>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-slate-700">{title}</h3>
                <span className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {articles.length}
                </span>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    "flex-1 bg-slate-100/50 rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar border border-transparent transition-colors",
                    isOver && "bg-indigo-50/50 border-indigo-100"
                )}
            >
                <SortableContext items={articles.map(a => a.id)} strategy={verticalListSortingStrategy}>
                    {articles.map(article => (
                        <KanbanCard
                            key={article.id}
                            article={article}
                            onOpen={onOpen}
                        />
                    ))}
                </SortableContext>

                {articles.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center px-4">
                            Arrastra tarjetas aquí
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
