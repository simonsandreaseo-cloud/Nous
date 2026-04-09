"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle2, Clock, Share2, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { Task } from "@/types/project";
import { motion } from "framer-motion";

interface DistributionCardProps {
    task: Task;
    onClick: () => void;
}

export function DistributionCard({ task, onClick }: DistributionCardProps) {
    const isPublished = task.status === 'publicado';
    
    // Calculate word count from content_body
    const wordCount = task.content_body 
        ? task.content_body.replace(/<[^>]*>?/gm, '').trim().split(/\s+/).filter(Boolean).length 
        : 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={onClick}
            className="group bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all cursor-pointer flex flex-col gap-4 relative overflow-hidden"
        >
            {/* Status Badge Overlay */}
            <div className={cn(
                "absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[8px] font-black uppercase tracking-widest transition-colors",
                isPublished ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white"
            )}>
                {isPublished ? "Publicado" : "Por Maquetar"}
            </div>

            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        {task.scheduled_date ? format(new Date(task.scheduled_date), 'dd MMM yyyy', { locale: es }) : 'Sin fecha'}
                    </span>
                </div>
                <h3 className="text-sm font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 uppercase italic tracking-tight">
                    {task.title}
                </h3>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg text-slate-400">
                        <Clock size={10} />
                        <span className="text-[9px] font-bold">{wordCount} W</span>
                    </div>
                    {task.target_url_slug && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg text-indigo-500">
                            <Share2 size={10} />
                            <span className="text-[9px] font-bold uppercase">URL</span>
                        </div>
                    )}
                </div>
                
                <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <ArrowRight size={14} />
                </div>
            </div>

            {/* Progress indicator for Published */}
            {isPublished && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500/20">
                    <div className="h-full bg-emerald-500 w-full" />
                </div>
            )}
        </motion.div>
    );
}
