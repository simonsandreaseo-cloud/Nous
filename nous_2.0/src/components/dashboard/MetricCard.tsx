'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: number; // percentage
    color: string;
}

export function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
    return (
        <div className="relative p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden group">
            <div className={cn(
                "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:opacity-20 transition-opacity duration-700",
                color === 'cyan' ? "from-cyan-400 to-blue-400" :
                    color === 'purple' ? "from-purple-400 to-pink-400" :
                        "from-emerald-400 to-teal-400"
            )} />

            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={cn(
                    "p-3 rounded-2xl bg-white/5 border border-white/10 text-white shadow-lg",
                    color === 'cyan' ? "text-cyan-400" :
                        color === 'purple' ? "text-purple-400" :
                            "text-emerald-400"
                )}>
                    <Icon size={20} />
                </div>
                {trend !== undefined && (
                    <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full border",
                        trend >= 0
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                        {trend > 0 ? '+' : ''}{trend}%
                    </span>
                )}
            </div>

            <div className="relative z-10">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h3>
                <p className="text-3xl font-black text-white tracking-tight">{value}</p>
            </div>
        </div>
    );
}
