"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Globe,
    Link2,
    RefreshCcw,
    ChevronRight,
    Layers,
    Plus,
    Trash2,
    Database,
    Zap
} from "lucide-react";
import { cn } from "@/utils/cn";

export function DiscoveryWidget() {
    const [paths, setPaths] = useState<string[]>(['/blog/', '/noticias/']);
    const [newPath, setNewPath] = useState("");
    const [isScanning, setIsScanning] = useState(false);

    const handleAddPath = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPath && !paths.includes(newPath)) {
            setPaths([...paths, newPath]);
            setNewPath("");
        }
    };

    const handleRemovePath = (index: number) => {
        setPaths(paths.filter((_, i) => i !== index));
    };

    const handleScan = () => {
        setIsScanning(true);
        setTimeout(() => setIsScanning(false), 4000);
    };

    return (
        <section className="bg-white/70 backdrop-blur-xl border border-white rounded-[32px] p-8 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">Neural Discovery</h3>
                        <p className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Escaneo Automático</p>
                    </div>
                </div>

                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
                    <Database size={16} className="text-slate-400" />
                </div>
            </div>

            <div className="flex-1 space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Directorios a Monitorear</p>

                <form onSubmit={handleAddPath} className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                        <Link2 size={16} />
                    </div>
                    <input
                        type="text"
                        value={newPath}
                        onChange={(e) => setNewPath(e.target.value)}
                        placeholder="/blog/..."
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-12 text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-cyan-600 transition-colors"
                    >
                        <Plus size={16} />
                    </button>
                </form>

                <div className="space-y-2">
                    {paths.map((path, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white/50 border border-white rounded-2xl shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                <span className="text-xs font-bold text-slate-600 font-mono tracking-tight">{path}</span>
                            </div>
                            <button
                                onClick={() => handleRemovePath(i)}
                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-10 space-y-4">
                <button
                    onClick={handleScan}
                    disabled={isScanning}
                    className="w-full h-16 bg-white border border-slate-200 rounded-[24px] flex items-center justify-center gap-3 group relative overflow-hidden transition-all hover:border-cyan-200 shadow-sm"
                >
                    <div className={cn(
                        "flex items-center gap-3 transition-opacity",
                        isScanning ? "opacity-0" : "opacity-100"
                    )}>
                        <RefreshCcw size={18} className="text-cyan-500 group-hover:rotate-180 transition-transform duration-700" />
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] font-mono">Iniciar Escaneo</span>
                    </div>

                    {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2">
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-75" />
                            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce delay-150" />
                            <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest ml-2 font-mono">Analizando URLs...</span>
                        </div>
                    )}
                </button>

                <div className="p-4 bg-cyan-50/50 rounded-2xl border border-cyan-100/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Zap size={14} className="text-cyan-500" />
                        <span className="text-[9px] font-bold text-cyan-700 uppercase tracking-widest">Última Sincronización</span>
                    </div>
                    <span className="text-[9px] font-bold text-cyan-600/60 uppercase font-mono tracking-widest italic">hace 4 horas</span>
                </div>
            </div>
        </section>
    );
}
