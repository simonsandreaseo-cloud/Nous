"use client";

import { useState } from "react";
import { 
    ToggleLeft, 
    ToggleRight, 
    Sparkles, 
    Play, 
    Plus, 
    Trash2, 
    Globe, 
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore } from "@/store/useProjectStore";
import { NousExtractorService, type ExtractionResult } from "@/lib/services/nous-extractor";
import type { NousExtractorRule } from "@/types/project";
import { NousExtractorConfigModal } from "./NousExtractorConfigModal";

export function NousExtractorWidget() {
    const { activeProject, updateProject } = useProjectStore();
    const [testUrl, setTestUrl] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<ExtractionResult[]>([]);
    const [testError, setTestError] = useState<string | null>(null);
    const [showTester, setShowTester] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    const rules = activeProject?.nous_extractors || [];
    const isActive = rules.some(r => r.is_active);
    
    const toggleAll = async () => {
        const newRules = rules.map(r => ({ ...r, is_active: !isActive }));
        await updateProject(activeProject!.id, { nous_extractors: newRules });
    };

    const toggleRule = async (id: string) => {
        const newRules = rules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r);
        await updateProject(activeProject!.id, { nous_extractors: newRules });
    };

    const deleteRule = async (id: string) => {
        const newRules = rules.filter(r => r.id !== id);
        await updateProject(activeProject!.id, { nous_extractors: newRules });
    };

    const handleTest = async () => {
        if (!testUrl) return;
        setIsTesting(true);
        setTestError(null);
        setTestResults([]);

        try {
            const activeRules = rules.filter(r => r.is_active);
            if (activeRules.length === 0) {
                throw new Error("No hay reglas activas para probar.");
            }

            const response = await NousExtractorService.extract(testUrl, activeRules);
            if (response.success) {
                setTestResults(response.results);
            } else {
                setTestError(response.error || "Fallo en la extracción");
            }
        } catch (e: any) {
            setTestError(e.message);
        } finally {
            setIsTesting(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group/widget">
            {/* Widget Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                        <Sparkles size={20} className={cn(isActive && "fill-indigo-600 animate-pulse")} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Extractor Nous</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inteligencia de Enlaces</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <Plus size={18} />
                    </button>
                    <button 
                        onClick={toggleAll}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                    >
                        {isActive ? <ToggleRight className="text-emerald-500" size={24} /> : <ToggleLeft className="text-slate-300" size={24} />}
                    </button>
                </div>
            </div>

            {/* List of Rules (Compact) */}
            <div className="p-6 space-y-3 min-h-[200px]">
                {rules.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-[28px] bg-slate-50/20">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4 italic">Sin reglas activas</p>
                    </div>
                ) : (
                    rules.slice(0, 3).map((rule) => (
                        <div key={rule.id} className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border transition-all",
                            rule.is_active ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50/50 border-transparent opacity-60"
                        )}>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                    <Globe size={12} />
                                </div>
                                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[120px]">{rule.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => toggleRule(rule.id)} className="p-1 hover:bg-slate-50 rounded-lg">
                                    {rule.is_active ? <ToggleRight className="text-emerald-500" size={18} /> : <ToggleLeft className="text-slate-300" size={18} />}
                                </button>
                                <button onClick={() => deleteRule(rule.id)} className="p-1 text-slate-200 hover:text-rose-500 rounded-lg">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
                {rules.length > 3 && (
                    <button onClick={() => setIsConfigOpen(true)} className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 transition-colors">
                        Y {rules.length - 3} reglas más...
                    </button>
                )}
            </div>

            {/* Tester Trigger */}
            <div className="mt-auto border-t border-slate-50 bg-slate-50/50 p-4">
                <button 
                    onClick={() => setShowTester(!showTester)}
                    className="w-full h-10 px-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-indigo-100 hover:text-indigo-600 transition-all shadow-sm"
                >
                    <span>Sandbox Inspector</span>
                    <ChevronDown size={14} className={cn("transition-transform", showTester && "rotate-180")} />
                </button>

                <AnimatePresence>
                    {showTester && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pt-4 space-y-4 overflow-hidden"
                        >
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="URL a inspeccionar..."
                                    value={testUrl}
                                    onChange={(e) => setTestUrl(e.target.value)}
                                    className="w-full h-10 pl-4 pr-12 rounded-xl border border-white bg-white text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all outline-none"
                                />
                                <button 
                                    onClick={handleTest}
                                    disabled={isTesting || !testUrl}
                                    className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg"
                                >
                                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Play size={10} className="fill-white" />}
                                </button>
                            </div>

                            {testResults.length > 0 && (
                                <div className="space-y-2">
                                    {testResults.map((res: any, i) => (
                                        <div key={i} className="p-3 bg-white border border-emerald-50 rounded-xl flex items-center justify-between">
                                            <span className="text-[11px] font-mono text-emerald-700 font-bold truncate max-w-[150px]">{res.formatted}</span>
                                            <button 
                                                onClick={() => {
                                                    if (document.hasFocus()) {
                                                        navigator.clipboard.writeText(res.formatted);
                                                    }
                                                }} 
                                                className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors"
                                            >
                                                <Copy size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900 flex items-center justify-between">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Nous Engine Alpha x5</span>
                <span className="text-[8px] font-black text-indigo-400 uppercase">Agnostic Mode</span>
            </div>

            <NousExtractorConfigModal 
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                widget={activeProject?.custom_widgets?.find(w => w.type === 'nous_extractor') as any}
                onUpdate={(updates) => {
                    // This handles general widget updates, but rules are in project.rous_extractors
                    // For now, modal handles its own project updates for rules.
                }}
            />
        </div>
    );
}
