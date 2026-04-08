"use client";

import { useToastStore, ToastType } from "@/store/useToastStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    Info, 
    X 
} from "lucide-react";
import { cn } from "@/utils/cn";

const TOAST_STYLES: Record<ToastType, { icon: any, color: string, border: string, bg: string }> = {
    success: { 
        icon: CheckCircle2, 
        color: "text-emerald-500", 
        border: "border-emerald-500/20", 
        bg: "bg-emerald-500/10" 
    },
    error: { 
        icon: XCircle, 
        color: "text-rose-500", 
        border: "border-rose-500/20", 
        bg: "bg-rose-500/10" 
    },
    warning: { 
        icon: AlertTriangle, 
        color: "text-amber-500", 
        border: "border-amber-500/20", 
        bg: "bg-amber-500/10" 
    },
    info: { 
        icon: Info, 
        color: "text-indigo-500", 
        border: "border-indigo-500/20", 
        bg: "bg-indigo-500/10" 
    }
};

export function Toaster() {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {toasts.map((toast) => {
                    const style = TOAST_STYLES[toast.type];
                    const Icon = style.icon;

                    return (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className={cn(
                                "min-w-[320px] max-w-sm pointer-events-auto",
                                "p-4 rounded-[28px] border backdrop-blur-xl shadow-2xl flex items-start gap-4 transition-all group",
                                style.bg,
                                style.border
                            )}
                        >
                            <div className={cn("mt-0.5 shrink-0", style.color)}>
                                <Icon size={20} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-800">
                                    {toast.title}
                                </h4>
                                {toast.description && (
                                    <p className="text-[10px] text-slate-500 font-bold mt-1 leading-relaxed">
                                        {toast.description}
                                    </p>
                                )}
                            </div>

                            <button 
                                onClick={() => removeToast(toast.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={14} />
                            </button>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
