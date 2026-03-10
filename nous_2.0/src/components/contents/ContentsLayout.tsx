"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ContentsSidebar } from "./ContentsSidebar";
import { ContentsHeader } from "./ContentsHeader";
import { ArticleCardGrid } from "./ArticleCardGrid";
import { ArticleCalendar } from "./ArticleCalendar";
import { ArticleTable } from "./ArticleTable";

// Lazy-load heavy tool components from studio (already exist in the project)
// They render inside the central zone without unmounting the shell
import dynamic from "next/dynamic";

const WriterStudio = dynamic(
    () => import("@/app/studio/writer/WriterStudio"),
    { loading: () => <ToolPlaceholder name="Redactor" />, ssr: false }
);
const DataRefinery = dynamic(
    () => import("@/components/dashboard/DataRefinery"),
    { loading: () => <ToolPlaceholder name="Refinería" />, ssr: false }
);
const EditorialCalendar = dynamic(
    () => import("@/components/dashboard/EditorialCalendar").then(mod => mod.EditorialCalendar),
    { loading: () => <ToolPlaceholder name="Planificador" />, ssr: false }
);
const StrategyGrid = dynamic(
    () => import("@/components/dashboard/StrategyGrid"),
    { loading: () => <ToolPlaceholder name="Briefings" />, ssr: false }
);
const ImagesPage = dynamic(
    () => import("@/app/studio/images/page"),
    { loading: () => <ToolPlaceholder name="Imágenes" />, ssr: false }
);

// Placeholder for tools not yet fully wired
function ToolPlaceholder({ name }: { name: string }) {
    return (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-black text-slate-300">{name[0]}</span>
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{name}</p>
                <p className="text-[10px] text-slate-300 mt-1">Próximamente disponible</p>
            </div>
        </div>
    );
}

type ViewMode = "cards" | "calendar" | "table";

// Dashboard view: the article grid with 3-mode toggle
function DashboardView() {
    const [viewMode, setViewMode] = useState<ViewMode>("cards");
    const [activeTool, setActiveTool] = useState("dashboard");

    const handleToolSelect = useCallback((toolId: string) => {
        setActiveTool(toolId);
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Sub-toolbar for view toggle is handled by ContentsHeader above */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={viewMode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 overflow-y-auto custom-scrollbar p-6"
                >
                    {viewMode === "cards" && <ArticleCardGrid onToolSelect={handleToolSelect} />}
                    {viewMode === "calendar" && <ArticleCalendar />}
                    {viewMode === "table" && <ArticleTable />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

// Map tool IDs to their rendered components
function ToolView({ toolId }: { toolId: string }) {
    switch (toolId) {
        case "writer": return <WriterStudio />;
        case "refinery": return <DataRefinery />;
        case "planner": return <EditorialCalendar />;
        case "briefings": return <StrategyGrid />;
        case "images": return <ImagesPage />;
        default: return <ToolPlaceholder name={toolId} />;
    }
}

interface ContentsLayoutProps {
    initialTool?: string;
}

export function ContentsLayout({ initialTool = "dashboard" }: ContentsLayoutProps) {
    const router = useRouter();
    const [activeTool, setActiveTool] = useState(initialTool);
    const [viewMode, setViewMode] = useState<ViewMode>("cards");

    const handleToolSelect = useCallback((toolId: string) => {
        setActiveTool(toolId);
        // Update URL without full page reload
        const params = toolId === "dashboard" ? "" : `?tool=${toolId}`;
        router.push(`/contents${params}`, { scroll: false });
    }, [router]);

    return (
        <div className="flex h-screen overflow-hidden bg-[#f5f5f0] p-4 gap-4">
            {/* Left Sidebar */}
            <ContentsSidebar activeTool={activeTool} onToolSelect={handleToolSelect} />

            {/* Main panel */}
            <div className="flex-1 flex flex-col min-w-0 glass-panel border-hairline rounded-[28px] overflow-hidden shadow-sm">
                {/* Header */}
                <ContentsHeader
                    activeTool={activeTool}
                    onToolSelect={handleToolSelect}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                {/* Central content zone */}
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
                            {activeTool === "dashboard" ? (
                                <DashboardViewWithViewMode viewMode={viewMode} onToolSelect={handleToolSelect} />
                            ) : (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
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

// Separate component so viewMode is accessible inside dashboard
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
                className="flex-1 overflow-y-auto custom-scrollbar p-6"
            >
                {viewMode === "cards" && <ArticleCardGrid onToolSelect={onToolSelect} />}
                {viewMode === "calendar" && <ArticleCalendar />}
                {viewMode === "table" && <ArticleTable />}
            </motion.div>
        </AnimatePresence>
    );
}
