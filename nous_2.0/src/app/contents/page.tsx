
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Background2D } from "@/components/Background2D/Background2D";
import {
    ChevronRight,
    Activity,
    ChevronDown,
    Sparkles,
    FileText,
    Image as ImageIcon,
    Plus,
    Zap,
    LayoutGrid,
    Search,
    Calendar,
    Layers,
    Command
} from "lucide-react";
import { cn } from "@/utils/cn";
import Link from "next/link";

// Mock Data for Timeline
const timelineData = [
    { id: 1, title: "IA en Salud 2026", keyword: "Diagnóstico IA", health: 98, date: "2026-02-10" },
    { id: 2, title: "Estrategias SEO Neural Link", keyword: "Tecnología Neural B2B", health: 85, date: "2026-02-12" },
    { id: 3, title: "Tendencias Computación Cuántica", keyword: "SEO Cuántico", health: 92, date: "2026-02-15" },
    { id: 4, title: "Privacidad Datos Bio-Digitales", keyword: "Seguridad Datos Médicos", health: 78, date: "2026-02-18" },
    { id: 5, title: "Futuro de la Telemedicina", keyword: "Atención Remota", health: 95, date: "2026-02-20" },
    { id: 6, title: "Avances Cirugía Robótica", keyword: "Robótica", health: 88, date: "2026-02-22" },
    { id: 7, title: "SEO Secuenciación Genómica", keyword: "Genómica", health: 91, date: "2026-02-25" },
];

export default function ContentCommandCenter() {
    const [selectedCard, setSelectedCard] = useState<number | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Drag to scroll logic
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
        setScrollLeft(scrollContainerRef.current?.scrollLeft || 0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0);
        const walk = (x - startX) * 2;
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = scrollLeft - walk;
        }
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
        }, 3000);
    };

    return (
        <main className="relative w-full h-screen overflow-hidden bg-[#F5F7FA]/10 text-slate-800 font-sans selection:bg-cyan-500/20">

            {/* Background Shader - Keeping it visible as the base */}
            <Background2D />

            {/* Grid Overlay Structure */}
            <div className="absolute inset-0 z-10 flex flex-col pointer-events-none">

                {/* Zone 1: Header (Barra de Estado Etérea - Clinical Light) */}
                <header className="pointer-events-auto h-20 w-full flex items-center justify-between px-10 border-b border-white/40 bg-white/40 backdrop-blur-xl z-50 shadow-sm">
                    <div className="flex items-center gap-6">
                        {/* Logo / Breadcrumbs */}
                        <div className="flex items-center gap-3 text-sm tracking-widest text-slate-500">
                            <Link href="/" className="opacity-70 hover:opacity-100 transition-opacity font-display font-bold text-slate-800">NOUS</Link>
                            <ChevronRight className="w-4 h-4 opacity-40" />
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-white/60 shadow-sm">
                                <Layers className="w-3 h-3 text-cyan-600" />
                                <span className="text-slate-900 font-medium font-display text-xs">CONTENIDOS</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-8">
                        {/* Sync Indicator */}
                        <div className="flex items-center gap-3 bg-white/30 px-4 py-2 rounded-full border border-white/40 backdrop-blur-md">
                            <div className="relative flex items-center justify-center">
                                <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,128,128,0.5)] transition-all duration-300", isGenerating ? "animate-ping bg-amber-500" : "animate-pulse bg-cyan-500")} />
                            </div>
                            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-mono font-medium">
                                {isGenerating ? "PROCESANDO..." : "SISTEMA SINCRONIZADO"}
                            </span>
                        </div>

                        {/* Domain Dropdown */}
                        <button className="flex items-center gap-3 px-4 py-2 rounded-lg border border-slate-200/60 bg-white/60 hover:bg-white/90 hover:shadow-md transition-all text-xs font-semibold tracking-wide font-mono text-slate-700">
                            <span>simonsandrea-seo</span>
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="flex-1 flex overflow-hidden relative pointer-events-auto">

                    {/* Left/Center Area */}
                    <div className="flex-1 flex flex-col relative w-3/4">

                        {/* Zone 2: Smart Timeline (Main Stage) */}
                        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                            {/* Infinite Timeline Line */}
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent blur-[1px]" />

                            {/* Cards Container */}
                            <div
                                ref={scrollContainerRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                className={cn(
                                    "w-full h-full flex items-center gap-12 overflow-x-auto no-scrollbar px-24 pb-12 pt-8 snap-x snap-mandatory cursor-grab active:cursor-grabbing",
                                    isDragging && "snap-none"
                                )}
                            >
                                {timelineData.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layoutId={`card - ${item.id} `}
                                        onClick={() => !isDragging && setSelectedCard(item.id)}
                                        initial={{ opacity: 0, y: 50 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.5, delay: item.id * 0.1 }}
                                        whileHover={{ y: -15, scale: 1.02 }}
                                        className={cn(
                                            "min-w-[300px] h-[360px] rounded-[2rem] border relative group cursor-pointer transition-all duration-500 flex flex-col justify-between p-8 snap-center select-none shadow-sm hover:shadow-2xl",
                                            selectedCard === item.id
                                                ? "bg-white/80 border-cyan-500/40 shadow-[0_20px_40px_-15px_rgba(6,182,212,0.2)] backdrop-blur-2xl"
                                                : "bg-white/40 border-white/60 hover:bg-white/70 hover:border-white/80 backdrop-blur-xl"
                                        )}
                                    >
                                        <div className="space-y-6 pointer-events-none">
                                            <div className="flex justify-between items-start">
                                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-white max-w-fit shadow-sm text-cyan-600">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/50 border border-white/50 text-[10px] font-bold uppercase font-mono shadow-sm", item.health > 90 ? "text-emerald-600" : "text-amber-500")}>
                                                    <Activity className="w-3.5 h-3.5" />
                                                    {item.health}%
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-semibold leading-tight text-slate-800 tracking-tight font-display">
                                                    {item.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                                    <p className="text-xs text-slate-500 font-mono uppercase tracking-wide">
                                                        {item.keyword}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-end justify-between pointer-events-none">
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                FECHA PUB.
                                            </div>
                                            <div className="text-xs text-slate-600 font-mono font-medium bg-slate-100 px-2 py-1 rounded-md">
                                                {item.date}
                                            </div>
                                        </div>

                                        {/* Inner Glow */}
                                        <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-cyan-500/0 via-white/0 to-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay" />
                                    </motion.div>
                                ))}

                                {/* Add New Placeholder Tile */}
                                <motion.div
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.4)" }}
                                    className="min-w-[120px] h-[360px] flex items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-300 bg-white/10 hover:border-cyan-400/50 transition-all cursor-pointer text-slate-400 hover:text-cyan-600 snap-center group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-white/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                        <Plus className="w-6 h-6" />
                                    </div>
                                </motion.div>

                                <div className="min-w-[400px]" />
                            </div>
                        </div>

                        {/* Zone 4: Insights (Data Feed) */}
                        <div className="absolute bottom-10 left-10 flex flex-col gap-6 z-40 pointer-events-auto">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1 }}
                                className="w-72 bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all"
                            >
                                <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 font-display">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    Oportunidades
                                </div>
                                <ul className="space-y-3">
                                    {['NLP Clínico', 'Vis. Bio-Datos', 'Sal Rosa del Himalaya'].map((k, i) => (
                                        <li key={i} className="flex items-center justify-between text-sm text-slate-600 font-medium group cursor-pointer hover:text-cyan-700 transition-colors p-2 hover:bg-white/50 rounded-lg">
                                            <span className="font-mono text-xs">{k}</span>
                                            <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-500" />
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>

                            {/* Quick Add Button */}
                            <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-2xl hover:bg-cyan-600 transition-colors font-display z-50"
                            >
                                <Plus className="w-6 h-6" />
                            </motion.button>
                        </div>

                    </div>

                    {/* Zone 3: Sidebar (Creation Suite - Clinical Glass) */}
                    <aside className="w-[380px] border-l border-white/40 bg-white/30 backdrop-blur-2xl h-full flex flex-col z-40 relative shadow-[-10px_0_40px_rgba(0,0,0,0.02)]">

                        <div className="p-8 flex-1 flex flex-col gap-8 overflow-hidden">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-display">CREAR</h2>
                                    <div className="h-1 w-12 bg-cyan-500 mt-2 rounded-full" />
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2 font-mono">Asistente Editorial • IA V2.0</p>
                                </div>

                                {/* Mini Orb Indicator */}
                                <div className="relative w-10 h-10 flex items-center justify-center">
                                    <div className={cn("absolute inset-0 rounded-full blur-md transition-all duration-500", isGenerating ? "bg-amber-400/30 animate-pulse scale-150" : "bg-cyan-400/20")} />
                                    <div className={cn("w-3 h-3 rounded-full shadow-lg transition-colors duration-500 border border-white", isGenerating ? "bg-amber-400" : "bg-gradient-to-tr from-cyan-400 to-blue-600")} />
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="group relative w-full h-16 overflow-hidden rounded-xl shadow-lg hover:shadow-cyan-500/20 transition-shadow"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 group-hover:bg-cyan-950 transition-colors duration-500" />

                                {/* Animated gradient border/sheen */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                <div className="relative h-full w-full flex items-center justify-center gap-3">
                                    <Sparkles className={cn("w-5 h-5 text-cyan-400 transition-transform", isGenerating ? "animate-spin" : "group-hover:rotate-12")} />
                                    <span className="text-sm font-bold tracking-widest text-white font-display">
                                        {isGenerating ? "GENERANDO..." : "SUGERIR MES"}
                                    </span>
                                </div>
                            </button>

                            {/* Contextual Editor */}
                            <div className="flex-1 rounded-2xl border border-white/50 bg-white/40 p-1 overflow-hidden shadow-inner">
                                <div className="h-full w-full bg-white/30 backdrop-blur-sm p-6 overflow-y-auto custom-scrollbar">
                                    {selectedCard ? (
                                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Título del Contenido</label>
                                                <input type="text" defaultValue={timelineData.find(c => c.id === selectedCard)?.title} className="w-full bg-transparent border-b border-slate-300 text-lg font-semibold text-slate-800 focus:border-cyan-500 focus:ring-0 px-0 py-2 font-display transition-colors focus:outline-none placeholder-slate-300" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Brief Inteligente</label>
                                                <div className="relative">
                                                    <div className="absolute left-0 top-3 bottom-0 w-[1px] bg-cyan-500/20" />
                                                    <textarea
                                                        rows={8}
                                                        className="w-full bg-transparent border-none text-xs leading-relaxed text-slate-600 focus:ring-0 pl-4 pr-0 py-2 resize-none font-mono focus:outline-none placeholder-slate-400"
                                                        defaultValue={`Asunto: ${timelineData.find(c => c.id === selectedCard)?.keyword} \n\nEnfoque Clínico: Tendencias emergentes en 2026 para diagnóstico digital.\n\nEstrategia: Se requieren backlinks de alta autoridad.\n\nEstado: Pendiente de Revisión.`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="pt-6 flex gap-3">
                                                <button className="flex-1 py-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 font-mono result-btn transition-colors">GUARDAR BORRADOR</button>
                                                <button className="p-3 rounded-lg bg-cyan-50 text-cyan-600 hover:bg-cyan-100 transition-colors border border-cyan-100"><Zap className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                                                <Command className="w-6 h-6 opacity-30" />
                                            </div>
                                            <p className="text-sm font-medium font-display text-slate-500">Ningún Contenido Seleccionado</p>
                                            <p className="text-xs font-mono max-w-[180px] leading-relaxed opacity-60">Selecciona una tarjeta de contenido de la línea de tiempo para acceder a la suite editorial.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Drag Zone */}
                            <div className="h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-white/20 hover:bg-white/40 hover:border-cyan-400 transition-all group cursor-pointer flex flex-col items-center justify-center gap-3">
                                <div className="p-3 rounded-full bg-white/60 shadow-sm group-hover:scale-110 transition-transform">
                                    <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-cyan-600 transition-colors" />
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono group-hover:text-cyan-700 transition-colors">Subir Recursos</span>
                            </div>
                        </div>

                    </aside>
                </div>
            </div>
        </main>
    );
}

