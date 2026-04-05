"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ContentsSidebar } from "./ContentsSidebar";
import { ContentsHeader } from "./ContentsHeader";
import { ArticleCardGrid } from "./ArticleCardGrid";
import { ArticleKanbanBoard } from "./ArticleKanbanBoard";
import { ArticleCalendar } from "./ArticleCalendar";
import { ArticleTable } from "./ArticleTable";
import { Loader2 } from "lucide-react";
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
const MonitorView = dynamic(
    () => import("@/components/contents/MonitorView"),
    { loading: () => <ToolLoading name="Monitor" />, ssr: false }
);
const StrategyView = dynamic(
    () => import("@/components/contents/StrategyView"),
    { loading: () => <ToolLoading name="Estrategia" />, ssr: false }
);
const SEOView = dynamic(
    () => import("@/components/contents/SEOView"),
    { loading: () => <ToolLoading name="SEO On Page" />, ssr: false }
);
const TestsView = dynamic(
    () => import("@/components/contents/TestsView"),
    { loading: () => <ToolLoading name="Pruebas" />, ssr: false }
);

function ToolLoading({ name }: { name: string }) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-lg bg-indigo-50 animate-pulse border border-indigo-100/50 shadow-inner"></div>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin stroke-[2.5px] relative z-10" />
                </div>
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-1">{name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse opacity-60">Preparando Entorno...</p>
            </div>
        </div>
    );
}

type ViewMode = "cards" | "kanban" | "calendar" | "table";

function ToolView({ toolId }: { toolId: string }) {
    switch (toolId) {
        case "writer": return <WriterStudio />;
        case "planner": return <EditorialCalendar />;
        case "monitor": return <MonitorView />;
        case "strategy": return <StrategyView />;
        case "seo": return <SEOView />;
        case "publisher": return <div className="p-20 text-center font-black opacity-20 uppercase tracking-[0.3em]">Módulo de Distribución (En Construcción)</div>;
        case "tests": return <TestsView />;
        default: return (
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

export function ContentsLayout({ initialTool = "dashboard" }: ContentsLayoutProps) {
    const router = useRouter();
    const [activeTool, setActiveTool] = useState(initialTool);
    const [viewMode, setViewMode] = useState<ViewMode>("cards");

    // Sync active tool with URL parameter changes
    useEffect(() => {
        if (initialTool) {
            setActiveTool(initialTool);
        }
    }, [initialTool]);

    const handleToolSelect = useCallback((toolId: string) => {
        setActiveTool(toolId);
        const path = toolId === "dashboard" ? "/contents" : `/contents/${toolId}`;
        router.push(path, { scroll: false });
    }, [router]);

    return (
        <div className="flex h-screen overflow-hidden bg-white text-slate-900">
            {/* Sidebar now flush and distinct */}
            <ContentsSidebar activeTool={activeTool} onToolSelect={handleToolSelect} />

            {/* Main area flush, imitating serper. We use our light theme variables */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f0] overflow-hidden">
                {activeTool !== "writer" && activeTool !== "planner" && (
                    <div className="bg-white border-b border-slate-200 shadow-sm z-10">
                         <ContentsHeader
                            activeTool={activeTool}
                            onToolSelect={handleToolSelect}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-hidden flex flex-col relative z-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTool}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 overflow-hidden flex flex-col"
                        >
                            {activeTool === "dashboard" ? (
                                <DashboardViewWithViewMode viewMode={viewMode} onToolSelect={handleToolSelect} />
                            ) : (
                                <div className={cn(
                                    "flex-1 flex flex-col",
                                    activeTool === "writer" || activeTool === "planner" ? "overflow-hidden" : "overflow-y-auto custom-scrollbar p-6"
                                )}>
                                    <ToolView toolId={activeTool} />
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function DashboardViewWithViewMode({
    viewMode,
    onToolSelect
}: {
    viewMode: ViewMode;
    onToolSelect: (id: string) => void;
}) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 h-full"
            >
                {viewMode === "cards" && <ArticleCardGrid onToolSelect={onToolSelect} />}
                {viewMode === "kanban" && <ArticleKanbanBoard onToolSelect={onToolSelect} />}
                {viewMode === "calendar" && <ArticleCalendar onToolSelect={onToolSelect} />}
                {viewMode === "table" && <ArticleTable onToolSelect={onToolSelect} />}
            </motion.div>
        </AnimatePresence>
    );
}
