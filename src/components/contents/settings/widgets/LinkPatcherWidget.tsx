"use client";

import { useState } from "react";
import { 
    ToggleLeft, 
    ToggleRight, 
    Link as LinkIcon, 
    Play, 
    Plus, 
    Trash2, 
    Globe, 
    Loader2,
    ChevronDown,
    ArrowRight,
    Beaker
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { useProjectStore } from "@/store/useProjectStore";
import { LinkPatcherService } from "@/lib/services/link-patcher";
import { LinkPatcherConfigModal } from "./LinkPatcherConfigModal";

export function LinkPatcherWidget() {
    const { activeProject, updateProject } = useProjectStore();
    const [testUrl, setTestUrl] = useState("");
    const [testResult, setTestResult] = useState<string | null>(null);
    const [showTester, setShowTester] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);

    // Get rules from project config or migration-ready field
    const rules = activeProject?.link_patcher_rules || [];
    const isActive = rules.length > 0;
    
    const deleteRule = async (index: number) => {
        const newRules = rules.filter((_, i) => i !== index);
        await updateProject(activeProject!.id, { link_patcher_rules: newRules });
    };

    const handleTest = () => {
        if (!testUrl) return;
        const result = LinkPatcherService.patchUrl(testUrl, rules);
        setTestResult(result);
    };

    if (!activeProject) return null;

    const widget = activeProject?.custom_widgets?.find(w => w.type === 'link_patcher');

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col group/widget">
            {/* Widget Header */}
            <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                        <LinkIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Link Patcher</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Normalización de URLs</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsConfigOpen(true)}
                        className="p-2.5 bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* List of Rules (Compact) */}
            <div className="p-6 space-y-3 min-h-[200px]">
                {rules.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-slate-50 rounded-[28px] bg-slate-50/20">
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mb-4 italic">Sin parches activos</p>
                        <button 
                            onClick={() => setIsConfigOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-50"
                        >
                            Configurar Motor
                        </button>
                    </div>
                ) : (
                    rules.slice(0, 3).map((rule, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-white shadow-sm">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="px-2 py-0.5 rounded-lg bg-slate-50 text-[9px] font-mono text-slate-500 truncate max-w-[80px]">
                                    {rule.regex}
                                </div>
                                <ArrowRight size={10} className="text-slate-300 shrink-0" />
                                <div className="px-2 py-0.5 rounded-lg bg-emerald-50 text-[9px] font-mono text-emerald-600 font-bold truncate max-w-[80px]">
                                    {rule.replacement || "/"}
                                </div>
                            </div>
                            <button onClick={() => deleteRule(idx)} className="p-1 text-slate-200 hover:text-rose-500 rounded-lg shrink-0">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
                {rules.length > 3 && (
                    <button onClick={() => setIsConfigOpen(true)} className="w-full text-center text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-emerald-600 transition-colors">
                        Y {rules.length - 3} parches más...
                    </button>
                )}
            </div>

            {/* Tester Trigger */}
            <div className="mt-auto border-t border-slate-50 bg-slate-50/50 p-4">
                <button 
                    onClick={() => setShowTester(!showTester)}
                    className="w-full h-10 px-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest hover:border-emerald-100 hover:text-emerald-600 transition-all shadow-sm"
                >
                    <div className="flex items-center gap-2">
                        <Beaker size={12} />
                        <span>Link Sandbox</span>
                    </div>
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
                                    placeholder="URL a parchar..."
                                    value={testUrl}
                                    onChange={(e) => setTestUrl(e.target.value)}
                                    className="w-full h-10 pl-4 pr-12 rounded-xl border border-white bg-white text-[11px] font-bold focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 transition-all outline-none"
                                />
                                <button 
                                    onClick={handleTest}
                                    disabled={!testUrl || rules.length === 0}
                                    className="absolute right-1.5 top-1.5 w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-lg"
                                >
                                    <Play size={10} className="fill-white" />
                                </button>
                            </div>

                            {testResult !== null && (
                                <div className="p-3 bg-white border border-emerald-50 rounded-xl space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resultado Esperado</span>
                                    </div>
                                    <p className={cn(
                                        "text-[10px] font-mono break-all select-all font-bold",
                                        testResult === testUrl ? "text-slate-400 italic" : "text-emerald-600"
                                    )}>
                                        {testResult}
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900 flex items-center justify-between">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Patcher Engine Alpha v1</span>
                <span className="text-[8px] font-black text-emerald-400 uppercase">Regex Mode</span>
            </div>

            <LinkPatcherConfigModal 
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                widget={widget as any}
                onUpdate={(updates) => {
                    // Modal updates project's link_patcher_rules directly for now
                }}
            />
        </div>
    );
}
