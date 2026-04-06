import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

interface ProjectBadgeProps {
    projectId: string;
    className?: string;
}

export function ProjectBadge({ projectId, className }: ProjectBadgeProps) {
    const { projects } = useProjectStore();
    const project = projects.find(p => p.id === projectId);

    if (!project) return null;

    const dotColor = project.color || '#06b6d4'; // Default cyan

    return (
        <div
            className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-100 bg-white/80 shadow-sm backdrop-blur-sm",
                className
            )}
            title={project.name}
        >
            {project.logo_url ? (
                <img src={project.logo_url} alt="" className="w-3 h-3 rounded-full object-cover" />
            ) : (
                <div
                    className="w-2 h-2 rounded-full shadow-sm"
                    style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}80` }}
                />
            )}
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest truncate max-w-[80px]">
                {project.name}
            </span>
        </div>
    );
}
