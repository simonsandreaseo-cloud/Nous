"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ContentsSidebar } from "./ContentsSidebar";
import { Loader2, Sparkles, Construction } from "lucide-react";
import { cn } from "@/utils/cn";
import dynamic from "next/dynamic";

const WriterStudio = dynamic(
    () => import("@/components/contents/writer/WriterStudio"),
    { loading: () => <ToolLoading name="Redactor" />, ssr: false }
);
const EditorialCalendar = dynamic(
    () => import("@/components/dashboard/EditorialCalendar").then(mod => mod.EditorialCalendar),
    { loading: () => <ToolLoading name="Planificador" />, ssr: false }
);
const DistributionView = dynamic(
    () => import("@/components/contents/DistributionView"),
    { loading: () => <ToolLoading name="Distribución" />, ssr: false }
);
const ImageGenerator = dynamic(
    () => import("@/components/contents/images/ImageGenerator"),
    { loading: () => <ToolLoading name="Imagenes" />, ssr: false }
);
const TranslatorView = dynamic(
    () => import("@/components/contents/TranslatorView"),
    { loading: () => <ToolLoading name="Traductor" />, ssr: false }
);
const CustomToolsView = dynamic(
    () => import("@/components/contents/settings/CustomToolsView"),
    { loading: () => <ToolLoading name="Custom Tools" />, ssr: false }
);

// --- Mockup View Component ---
function MockupView({ toolId }: { toolId: string }) {
    const labels: Record<string, string> = {
        monitor: "Monitor de Tráfico",
        oficina: "Oficina Virtual",
        seo: "SEO On-Page & Auditoría",
        estrategia: "Estrategia Global",
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-white p-12 text-center">
            <div className="w-24 h-24 rounded-[40px] bg-slate-50 flex items-center justify-center mb-8 border border-slate-100 shadow-sm">
                <Construction className="text-slate-300" size={40} />
            </div>
            <h2 className="text-3xl font-black text-slate-900 mb-4 uppercase italic tracking-tight">
                {labels[toolId] || "Próximamente"}
            </h2>
            <p className="max-w-md text-slate-400 text-sm font-medium leading-relaxed uppercase tracking-widest">
                Estamos trabajando en la integración de esta herramienta para ofrecerte una experiencia SEO integral de última generación.
            </p>
            <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
                <Sparkles size={14} className="text-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Nous Intelligence v2.0</span>
            </div>
        </div>
    );
}

function ToolLoading({ name }: { name: string }) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-[32px] bg-indigo-50 animate-pulse border border-indigo-100/50 shadow-inner"></div>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin stroke-[2.5px] relative z-10" />
                </div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-1">{name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse opacity-60">Preparando Entorno...</p>
            </div>
        </div>
    );
}


function ToolView({ toolId }: { toolId: string }) {
    switch (toolId) {
        case "writer": return <WriterStudio />;
        case "planner": return <EditorialCalendar />;
        case "distribution": return <DistributionView />;
        case "imagenes": return <ImageGenerator />;
        case "translator": return <TranslatorView />;
        case "custom-tools": return <CustomToolsView />;
        default: 
            if (["monitor", "oficina", "seo", "estrategia"].includes(toolId)) {
                return <MockupView toolId={toolId} />;
            }
            return (
                <div className="flex flex-col items-center justify-center p-20 opacity-40">
                    <Loader2 size={32} className="animate-spin mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Cargando {toolId}...</p>
                </div>
            );
    }
}

interface ContentsLayoutProps {
    initialTool?: string;
}

export function ContentsLayout({ initialTool = "planner" }: ContentsLayoutProps) {
    const router = useRouter();
    const [activeTool, setActiveTool] = useState(initialTool);

    // Sync active tool with URL parameter changes
    useEffect(() => {
        if (initialTool) {
            setActiveTool(initialTool);
        }
    }, [initialTool]);

    const handleToolSelect = useCallback((toolId: string) => {
        setActiveTool(toolId);
        const path = `/contents/${toolId}`;
        router.push(path, { scroll: false });
    }, [router]);

    return (
        <div className="flex h-screen overflow-hidden bg-white">
            <ContentsSidebar activeTool={activeTool} onToolSelect={handleToolSelect} />

            <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden relative">
                <div className="flex-1 overflow-hidden flex flex-col">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTool}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                            className="flex-1 overflow-hidden flex flex-col"
                        >
                            <ToolView toolId={activeTool} />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

