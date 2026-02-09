"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import {
    ChevronRight,
    Activity,
    ChevronDown,
    Sparkles,
    FileText,
    Plus,
    Zap,
    Layers,
    Calendar,
    Target,
    BarChart3,
    ArrowUpRight,
    Search,
    Filter,
    Clock,
    CheckCircle2,
    Settings2
} from "lucide-react";
import { cn } from "@/utils/cn";
import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { useAuthStore } from "@/store/useAuthStore";

// Mock Data for Timeline - Enhanced with more SEO details
const timelineData = [
    { id: 1, title: "IA en Salud 2026", keyword: "Diagnóstico IA", health: 98, date: "2026-02-10", status: "published", traffic: "+12%" },
    { id: 2, title: "Estrategias SEO Neural", keyword: "B2B Tech", health: 85, date: "2026-02-12", status: "draft", traffic: "--" },
    { id: 3, title: "Computación Cuántica", keyword: "SEO Cuántico", health: 92, date: "2026-02-15", status: "scheduled", traffic: "--" },
    { id: 4, title: "Privacidad Bio-Digital", keyword: "Seguridad Datos", health: 78, date: "2026-02-18", status: "draft", traffic: "--" },
    { id: 5, title: "Telemedicina 2.0", keyword: "Atención Remota", health: 95, date: "2026-02-20", status: "scheduled", traffic: "--" },
    { id: 6, title: "Cirugía Robótica", keyword: "Robótica", health: 88, date: "2026-02-22", status: "draft", traffic: "--" },
    { id: 7, title: "Genómica SEO", keyword: "Genómica", health: 91, date: "2026-02-25", status: "draft", traffic: "--" },
];

export default function ContentCommandCenter() {
    const [selectedCard, setSelectedCard] = useState<number | null>(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [filter, setFilter] = useState("all");

    const user = useAuthStore((state) => state.user);

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
        setTimeout(() => setIsGenerating(false), 3000);
    };

    const selectedItem = timelineData.find(c => c.id === selectedCard);

    return (
        <div className="relative min-h-screen w-full bg-[#F5F7FA] overflow-hidden text-slate-900">
            {/* Background elements to match clinical tech aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
                <div className="absolute top-[10%] left-[-10%] w-[60%] h-[60%] bg-cyan-100 rounded-full blur-[140px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[140px]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-[0.03]" />
            </div>

            {/* Use the shared Navigation Header */}
            <NavigationHeader />

            {/* Main Command Center Layout */}
            <div className="relative z-20 pt-28 h-screen w-full flex flex-col overflow-hidden px-12">

                {/* Section Header: Path & View Controls */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl border border-white shadow-sm">
                            <Layers className="w-5 h-5 text-cyan-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-widest uppercase text-slate-400 font-mono">Contenidos</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic">Planning Neural</span>
                                <div className="h-1 w-8 bg-cyan-500 rounded-full" />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-white/70 backdrop-blur-md p-1 border border-white rounded-xl shadow-sm flex items-center">
                            {['all', 'draft', 'scheduled', 'published'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setFilter(t)}
                                    className={cn(
                                        "px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                        filter === t ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button className="p-3 bg-white border border-white rounded-xl shadow-sm hover:shadow-md transition-all text-slate-500">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Content: Split Timeline | Sidebar */}
                <div className="flex-1 flex gap-10 overflow-hidden pb-12">

                    {/* Center Column: Liquid Timeline */}
                    <div className="flex-1 flex flex-col min-w-0">
                        <div className="relative flex-1 bg-white/40 backdrop-blur-xl border border-white rounded-[40px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] border-b-white/80">

                            {/* Horizontal Line Indicator */}
                            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

                            {/* Draggable Cards Area */}
                            <div
                                ref={scrollContainerRef}
                                onMouseDown={handleMouseDown}
                                onMouseLeave={handleMouseLeave}
                                onMouseUp={handleMouseUp}
                                onMouseMove={handleMouseMove}
                                className={cn(
                                    "w-full h-full flex items-center gap-8 overflow-x-auto no-scrollbar px-16 snap-x snap-mandatory cursor-grab active:cursor-grabbing pb-12 pt-8",
                                    isDragging && "snap-none"
                                )}
                            >
                                {timelineData.filter(i => filter === 'all' || i.status === filter).map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layoutId={`card-${item.id}`}
                                        onClick={() => !isDragging && setSelectedCard(item.id)}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -8 }}
                                        className={cn(
                                            "min-w-[320px] h-[380px] rounded-[32px] border-2 transition-all duration-500 flex flex-col p-8 snap-center select-none relative group",
                                            selectedCard === item.id
                                                ? "bg-white border-cyan-500/30 shadow-[0_25px_50px_-20px_rgba(6,182,212,0.15)]"
                                                : "bg-white/60 border-transparent hover:bg-white/80 hover:border-white shadow-sm"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-auto">
                                            <div className={cn(
                                                "p-3 rounded-2xl border transition-colors",
                                                selectedCard === item.id ? "bg-cyan-50 border-cyan-100 text-cyan-600" : "bg-slate-50 border-slate-100 text-slate-400"
                                            )}>
                                                <Calendar size={20} />
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className={cn(
                                                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border",
                                                    item.status === 'published' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        item.status === 'scheduled' ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                            "bg-slate-50 text-slate-500 border-slate-100"
                                                )}>
                                                    {item.status}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 font-mono">
                                                    <Activity size={12} className="text-cyan-500" />
                                                    PULSO {item.health}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-[2.2rem] font-black leading-[0.9] text-slate-900 tracking-tighter uppercase italic">
                                                {item.title}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-[1px] bg-cyan-500" />
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-mono">
                                                    KWD: {item.keyword}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Lanzamiento</p>
                                                <p className="text-xs font-mono font-bold text-slate-600">{item.date}</p>
                                            </div>
                                            {item.status === 'published' && (
                                                <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs font-mono">
                                                    <ArrowUpRight size={14} />
                                                    {item.traffic}
                                                </div>
                                            )}
                                        </div>

                                        {/* Interaction layer */}
                                        <div className={cn(
                                            "absolute inset-0 rounded-[32px] ring-4 ring-cyan-500/10 transition-opacity duration-500 pointer-events-none",
                                            selectedCard === item.id ? "opacity-100" : "opacity-0"
                                        )} />
                                    </motion.div>
                                ))}

                                {/* Add New Node */}
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="min-w-[80px] h-[380px] flex items-center justify-center rounded-[32px] border-2 border-dashed border-slate-200 bg-white/20 hover:border-cyan-400/50 hover:bg-white/50 transition-all cursor-pointer group snap-center"
                                >
                                    <div className="flex flex-col items-center gap-4 text-slate-300 group-hover:text-cyan-500 transition-colors">
                                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                                            <Plus size={24} />
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Timeline Navigation UI */}
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-slate-900/5 backdrop-blur-md px-8 py-3 rounded-full border border-white/40">
                                <div className="text-[9px] font-bold tracking-[0.3em] text-slate-400 uppercase">Neural Stream v2.0</div>
                                <div className="h-4 w-[1px] bg-slate-200" />
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-600 uppercase font-mono tracking-widest">En Tiempo Real</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Editorial Suite (Sidebar) */}
                    <aside className="w-[450px] flex flex-col gap-6">

                        {/* Selected Content Labs */}
                        <div className="flex-1 bg-white border border-white rounded-[40px] shadow-xl shadow-slate-200/50 flex flex-col overflow-hidden relative">
                            {/* Side Accents */}
                            <div className="absolute top-0 right-0 w-2 h-full bg-cyan-500/40 rounded-r-[40px]" />

                            <div className="p-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-10">
                                    <div>
                                        <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] font-mono">Neural Factory</p>
                                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mt-1">Refinería</h3>
                                    </div>
                                    <button className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-900 transition-colors">
                                        <Settings2 size={20} />
                                    </button>
                                </div>

                                <AnimatePresence mode="wait">
                                    {selectedItem ? (
                                        <motion.div
                                            key={selectedCard}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="flex-1 flex flex-col"
                                        >
                                            {/* SEO Context Metrics */}
                                            <div className="grid grid-cols-2 gap-4 mb-10">
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-cyan-100 transition-colors">
                                                    <div className="flex items-center justify-between mb-3 text-slate-400">
                                                        <Target size={16} />
                                                        <span className="text-[9px] font-bold uppercase font-mono">Dificultad</span>
                                                    </div>
                                                    <div className="text-2xl font-black text-slate-800 tracking-tight">EASY / 12</div>
                                                    <div className="h-1 w-full bg-slate-200 rounded-full mt-3 overflow-hidden">
                                                        <div className="h-full w-1/4 bg-emerald-400" />
                                                    </div>
                                                </div>
                                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-cyan-100 transition-colors">
                                                    <div className="flex items-center justify-between mb-3 text-slate-400">
                                                        <BarChart3 size={16} />
                                                        <span className="text-[9px] font-bold uppercase font-mono">Volumen</span>
                                                    </div>
                                                    <div className="text-2xl font-black text-slate-800 tracking-tight">2.4K <span className="text-[10px] font-bold text-slate-400">MS</span></div>
                                                    <div className="h-1 w-full bg-slate-200 rounded-full mt-3 overflow-hidden">
                                                        <div className="h-full w-3/4 bg-blue-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Smart Editor Area */}
                                            <div className="flex-1 flex flex-col gap-4">
                                                <div className="space-y-4">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Título Clínico</label>
                                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 focus-within:bg-white focus-within:border-cyan-200 transition-all">
                                                        <input
                                                            type="text"
                                                            defaultValue={selectedItem.title}
                                                            className="w-full bg-transparent border-none p-0 text-xl font-bold text-slate-800 focus:ring-0 placeholder-slate-200 tracking-tight"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Sugerencia de Copiloto</label>
                                                    <div className="flex-1 p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                                                            <Sparkles className="text-cyan-500 animate-pulse" />
                                                        </div>
                                                        <textarea
                                                            className="w-full h-full bg-transparent border-none p-0 text-sm leading-relaxed text-slate-600 focus:ring-0 resize-none font-mono focus:outline-none"
                                                            defaultValue={`Análisis Neural Link B2B:\n\nEl enfoque debe centrarse en la integración bio-digital de equipos corporativos.\n\nEstructura Sugerida:\n1. El amanecer de la conexión neural\n2. Optimización del flujo cognitivo\n3. Ética y seguridad de datos 2026`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="grid grid-cols-4 gap-4 mt-10">
                                                <button
                                                    onClick={handleGenerate}
                                                    disabled={isGenerating}
                                                    className="col-span-3 h-16 bg-slate-900 rounded-[24px] text-white flex items-center justify-center gap-3 font-black text-sm tracking-[0.2em] relative overflow-hidden group shadow-2xl shadow-slate-900/20 active:scale-[0.98] transition-all"
                                                >
                                                    {isGenerating ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75" />
                                                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Sparkles size={18} className="text-cyan-400" />
                                                            REFRESCAR MES
                                                        </>
                                                    )}
                                                </button>
                                                <button className="h-16 bg-slate-50 border border-slate-100 rounded-[24px] flex items-center justify-center text-slate-400 hover:text-cyan-500 hover:border-cyan-100 transition-all">
                                                    <CheckCircle2 size={24} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                                            <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                                                <Search className="text-slate-200" size={32} />
                                            </div>
                                            <p className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest max-w-[200px] leading-relaxed">
                                                Selecciona un nodo neural para iniciar la refinería
                                            </p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Secondary Tooltip/Insights */}
                        <div className="h-32 bg-cyan-500/10 backdrop-blur-md border border-cyan-100 rounded-[40px] p-8 flex items-center gap-6 group hover:bg-cyan-500/20 transition-all cursor-pointer">
                            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-cyan-500 shadow-sm transition-transform group-hover:rotate-6">
                                <Zap size={24} fill="currentColor" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest font-mono">Insight Rápido</p>
                                <p className="text-sm font-bold text-slate-700 tracking-tight mt-1 truncate">Se detectó tendencia: Sal Rosa del Himalaya +10%</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    );
}
