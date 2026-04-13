"use client";

import { useState, useEffect, useRef } from "react";
import { 
    X, 
    Zap, 
    Play, 
    Plus, 
    Globe, 
    Settings2, 
    Loader2,
    CheckCircle2,
    AlertCircle,
    Copy,
    Save,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Beaker,
    ArrowRight,
    Search,
    Layout,
    FileText,
    Code,
    Hash,
    Type,
    Check,
    Wand2,
    Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";
import { NousExtractorService, type ExtractionResult } from "@/lib/services/nous-extractor";
import type { NousExtractorRule, CustomWidget } from "@/types/project";

interface NousExtractorConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    widget: CustomWidget;
    onUpdate: (updates: Partial<CustomWidget>) => void;
}

/**
 * COMPONENTE INTERNO: NousExtractorRow
 * Representa una regla con múltiples cláusulas y lógica AND/OR (Constructor tipo Looker)
 */
function NousExtractorRow({ 
    rule, 
    onUpdate, 
    onDelete, 
    onToggle 
}: { 
    rule: NousExtractorRule; 
    onUpdate: (updates: Partial<NousExtractorRule>) => void;
    onDelete: () => void;
    onToggle: () => void;
}) {
    const addClause = () => {
        const newClause: any = {
            id: crypto.randomUUID(),
            field: 'url',
            operator: 'regex',
            value: ''
        };
        onUpdate({ clauses: [...(rule.clauses || []), newClause] });
    };

    const updateClause = (clauseId: string, updates: any) => {
        const newClauses = rule.clauses.map(c => c.id === clauseId ? { ...c, ...updates } : c);
        onUpdate({ clauses: newClauses });
    };

    const removeClause = (clauseId: string) => {
        onUpdate({ clauses: rule.clauses.filter(c => c.id !== clauseId) });
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "group flex flex-col gap-4 p-6 rounded-[32px] border transition-all relative",
                rule.is_active ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50/50 border-transparent opacity-60"
            )}
        >
            {/* Rule Header: Name & Logic */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                        <Zap size={16} />
                    </div>
                    <input 
                        type="text"
                        value={rule.name}
                        onChange={(e) => onUpdate({ name: e.target.value })}
                        placeholder="Nombre de la regla..."
                        className="bg-transparent border-none text-sm font-black text-slate-800 uppercase tracking-tight focus:ring-0 outline-none w-48"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                        <button 
                            onClick={() => onUpdate({ logic_operator: 'AND' })}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                rule.logic_operator === 'AND' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            AND
                        </button>
                        <button 
                            onClick={() => onUpdate({ logic_operator: 'OR' })}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                                rule.logic_operator === 'OR' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                        >
                            OR
                        </button>
                    </div>
                    <div className="w-[1px] h-6 bg-slate-100 mx-2" />
                    <div className="flex items-center bg-slate-100/50 p-1 rounded-xl">
                        {[
                            { id: 'research', label: 'Investigación', icon: Search },
                            { id: 'planner', label: 'Planner', icon: Layout },
                            { id: 'writer', label: 'Escritor', icon: FileText }
                        ].map((phase) => {
                            const Icon = phase.icon;
                            const isActive = rule.target_phases?.includes(phase.id as any);
                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => {
                                        const phases = rule.target_phases || [];
                                        const newPhases = isActive 
                                            ? phases.filter(p => p !== phase.id)
                                            : [...phases, phase.id as any];
                                        onUpdate({ target_phases: newPhases });
                                    }}
                                    className={cn(
                                        "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-tight flex items-center gap-1.5 transition-all",
                                        isActive 
                                            ? "bg-indigo-600 text-white shadow-sm" 
                                            : "text-slate-400 hover:bg-slate-200"
                                    )}
                                    title={`Activar en ${phase.label}`}
                                >
                                    <Icon size={10} />
                                    {phase.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="w-[1px] h-6 bg-slate-100 mx-1" />
                    <button 
                        onClick={onToggle}
                        className="p-1"
                    >
                        {rule.is_active ? <ToggleRight className="text-emerald-500" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                    </button>
                    <button 
                        onClick={onDelete}
                        className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Clauses List */}
            <div className="space-y-2">
                {rule.clauses.map((clause: any, idx) => (
                    <div key={clause.id} className="flex items-center gap-2 group/clause">
                        <div className="flex-1 flex items-center gap-2 bg-slate-50/50 p-2 pl-4 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                            <span className="text-[10px] font-black text-slate-300 uppercase w-4 italic">{idx === 0 ? "IF" : rule.logic_operator}</span>
                            
                            <select 
                                value={clause.field}
                                onChange={(e) => updateClause(clause.id, { field: e.target.value as any })}
                                className="bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-50"
                            >
                                <option value="url">URL</option>
                                <option value="content">CONTENIDO</option>
                            </select>

                            <select 
                                value={clause.operator}
                                onChange={(e) => updateClause(clause.id, { operator: e.target.value as any })}
                                className="bg-white border border-slate-100 rounded-lg text-[10px] font-black text-slate-600 px-2 py-1 outline-none appearance-none cursor-pointer hover:bg-slate-50"
                            >
                                <option value="regex">REGEX (MATCH)</option>
                                <option value="contains">CONTIENE</option>
                                <option value="not_contains">NO CONTIENE</option>
                                <option value="matches">ES EXACTO</option>
                            </select>

                            <input 
                                type="text" 
                                value={clause.value}
                                onChange={(e) => updateClause(clause.id, { value: e.target.value })}
                                placeholder="patrón o texto..."
                                className="flex-1 bg-white border border-slate-100 rounded-lg text-[11px] font-bold text-slate-700 px-3 py-1.5 focus:ring-2 focus:ring-indigo-500/5 outline-none"
                            />

                            <button 
                                onClick={() => removeClause(clause.id)}
                                className={cn(
                                    "p-1.5 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover/clause:opacity-100",
                                    rule.clauses.length === 1 && "hidden"
                                )}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                ))}
                
                <button 
                    onClick={addClause}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:bg-indigo-50 rounded-xl transition-all"
                >
                    <Plus size={12} />
                    Añadir Condición
                </button>
            </div>

            {/* Extraction Section (Compact) */}
            <div className="mt-2 p-5 bg-emerald-50/30 rounded-[24px] border border-emerald-50 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                        <Code size={16} />
                    </div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase italic">EXTRAER</span>
                </div>

                <select 
                    value={rule.extraction_type}
                    onChange={(e) => onUpdate({ extraction_type: e.target.value as any })}
                    className="h-9 px-3 bg-white border border-emerald-100 rounded-xl text-[10px] font-black text-emerald-700 focus:ring-0 outline-none cursor-pointer"
                >
                    <option value="regex">REGEX</option>
                    <option value="selector">CSS</option>
                </select>

                <input 
                    type="text"
                    value={rule.extraction_value}
                    onChange={(e) => onUpdate({ extraction_value: e.target.value })}
                    placeholder={rule.extraction_type === 'regex' ? '"id":(\\d+)' : '.price'}
                    className="h-9 px-4 bg-white border border-emerald-100 rounded-xl text-xs font-mono text-emerald-900 flex-1 min-w-[200px] outline-none"
                />

                <ArrowRight size={14} className="text-emerald-300" />

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase italic">COMO</span>
                    <input 
                        type="text"
                        value={rule.output_template}
                        onChange={(e) => onUpdate({ output_template: e.target.value })}
                        placeholder="{value}"
                        className="h-9 px-4 bg-slate-900 text-white rounded-xl text-xs font-black w-32 outline-none"
                    />
                </div>

                <div className="h-9 px-3 bg-white border border-slate-100 rounded-xl flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Ubicación</span>
                    <select 
                        value={rule.placement_mode || 'inline'}
                        onChange={(e) => onUpdate({ placement_mode: e.target.value as any })}
                        className="bg-transparent border-none text-[10px] font-black text-indigo-600 focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="inline">Misma Línea</option>
                        <option value="new_line">Nueva Línea</option>
                        <option value="new_paragraph">Párrafo Independiente</option>
                    </select>
                </div>
            </div>
        </motion.div>
    );
}

export function NousExtractorConfigModal({ isOpen, onClose, widget, onUpdate }: NousExtractorConfigModalProps) {
    const [testUrl, setTestUrl] = useState("");
    const [isTesting, setIsTesting] = useState(false);
    const [testResults, setTestResults] = useState<ExtractionResult[]>([]);
    const [testError, setTestError] = useState<string | null>(null);
    
    // Local state for rules and name to allow "manual save"
    const [localRules, setLocalRules] = useState<NousExtractorRule[]>([]);
    const [localName, setLocalName] = useState("");
    const [hasChanges, setHasChanges] = useState(false);

    const wasOpenRef = useRef(false);

    useEffect(() => {
        if (isOpen && !wasOpenRef.current) {
            setLocalRules(widget.config?.rules || []);
            setLocalName(widget.name || "Extractor Nous");
            setHasChanges(false);
            wasOpenRef.current = true;
        } 
        
        if (!isOpen) {
            wasOpenRef.current = false;
        }
    }, [isOpen, widget.config?.rules, widget.name]); 

    const addRule = () => {
        const newRule: NousExtractorRule = {
            id: crypto.randomUUID(),
            name: `Nueva Regla ${localRules.length + 1}`,
            is_active: true,
            logic_operator: 'AND',
            clauses: [
                { id: crypto.randomUUID(), field: 'url', operator: 'regex', value: '' } as any
            ],
            extraction_type: "regex",
            extraction_value: "",
            output_template: "{value}",
            target_phases: ["research", "writer"],
        };
        setLocalRules([...localRules, newRule]);
        setHasChanges(true);
    };

    const updateLocalRule = (id: string, updates: Partial<NousExtractorRule>) => {
        setLocalRules(localRules.map(r => r.id === id ? { ...r, ...updates } : r));
        setHasChanges(true);
    };

    const deleteRule = (id: string) => {
        setLocalRules(localRules.filter(r => r.id !== id));
        setHasChanges(true);
    };

    const toggleRule = (id: string) => {
        setLocalRules(localRules.map(r => r.id === id ? { ...r, is_active: !r.is_active } : r));
        setHasChanges(true);
    };

    const handleSaveChanges = () => {
        onUpdate({ 
            name: localName,
            config: { ...widget.config, rules: localRules } 
        });
        setHasChanges(false);
    };

    const handleTest = async () => {
        if (!testUrl) return;
        setIsTesting(true);
        setTestError(null);
        setTestResults([]);

        try {
            const activeRules = localRules.filter(r => r.is_active);
            if (activeRules.length === 0) {
                setTestError("No hay reglas activas para probar.");
                return;
            }

            const response = await NousExtractorService.extract(testUrl, activeRules);
            if (response.success) {
                if (response.results.length === 0) {
                    setTestError("La URL no coincide con las condiciones lógicas de ninguna regla activa.");
                } else {
                    setTestResults(response.results);
                }
            } else {
                setTestError(response.error || "Error en el proceso de extracción.");
            }
        } catch (e: any) {
            setTestError("Error crítico: " + e.message);
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                        className="bg-white/95 backdrop-blur-md w-full max-w-7xl max-h-[90vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border border-white/40"
                    >
                        {/* Header Compact */}
                        <div className="p-6 px-10 flex items-center justify-between border-b border-slate-50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
                                    <Sparkles size={20} className="fill-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="text"
                                            value={localName}
                                            onChange={(e) => {
                                                setLocalName(e.target.value);
                                                setHasChanges(true);
                                            }}
                                            className="text-lg font-black text-slate-900 uppercase italic tracking-tight bg-transparent border-none outline-none focus:ring-0 p-0 hover:bg-slate-100/50 rounded-lg transition-colors px-2 -ml-2"
                                            placeholder="Nombre del Extractor..."
                                        />
                                        {hasChanges && (
                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase rounded-full border border-amber-100 flex items-center gap-1 animate-pulse">
                                                <AlertCircle size={8} /> Cambios sin guardar
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                                        Inteligencia de Enlaces y Extracción Dinámica
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {hasChanges && (
                                    <button 
                                        onClick={handleSaveChanges}
                                        className="h-10 px-6 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-100 ring-4 ring-emerald-500/5 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        <Save size={14} />
                                        Guardar Cambios
                                    </button>
                                )}
                                <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            
                            {/* Rules Canvas */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-50/30">
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Pipeline de Reglas ({localRules.length})</h3>
                                        <button 
                                            onClick={addRule}
                                            className="px-5 h-9 bg-white border border-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-all"
                                        >
                                            <Plus size={14} />
                                            Nueva Regla
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        {localRules.map((rule) => (
                                            <NousExtractorRow 
                                                key={rule.id}
                                                rule={rule}
                                                onUpdate={(updates) => updateLocalRule(rule.id, updates)}
                                                onDelete={() => deleteRule(rule.id)}
                                                onToggle={() => toggleRule(rule.id)}
                                            />
                                        ))}

                                        {localRules.length === 0 && (
                                            <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-[40px] bg-white/50">
                                                <Search size={32} className="mx-auto text-slate-200 mb-4" />
                                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay reglas en el pipeline.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tester Panel */}
                            <div className="w-full md:w-[400px] border-l border-slate-50 p-10 overflow-y-auto custom-scrollbar bg-white/50 space-y-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                            <Beaker size={16} />
                                        </div>
                                        <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest underline decoration-indigo-500/30 underline-offset-4">Sandbox Inspector</h3>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Prueba tus reglas en tiempo real antes de desplegarlas.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">URL de Destino:</label>
                                        <div className="relative group">
                                            <input 
                                                type="text" 
                                                placeholder="https://ejemplo.com/..."
                                                value={testUrl}
                                                onChange={(e) => setTestUrl(e.target.value)}
                                                className="w-full h-12 pl-5 pr-12 rounded-2xl border bg-slate-50 text-[13px] font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                                            />
                                            <button 
                                                onClick={handleTest}
                                                disabled={isTesting || !testUrl}
                                                className="absolute right-1.5 top-1.5 w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 transition-all"
                                            >
                                                {isTesting ? <Loader2 size={16} className="animate-spin" /> : <Play size={14} className="fill-white" />}
                                            </button>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {testError && (
                                            <motion.div 
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-5 rounded-3xl bg-rose-50 border border-rose-100 flex gap-4"
                                            >
                                                <AlertCircle size={20} className="text-rose-500 shrink-0" />
                                                <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight">{testError}</p>
                                            </motion.div>
                                        )}

                                        {testResults.length > 0 && (
                                            <div className="space-y-3">
                                                {testResults.map((res, i) => (
                                                    <motion.div 
                                                        key={i}
                                                        layout
                                                        className="p-5 rounded-[32px] bg-white border border-slate-100 shadow-sm space-y-4"
                                                    >
                                                        <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                                            <div className="flex items-center gap-2">
                                                                <Check size={14} className="text-emerald-500" />
                                                                <span className="text-[9px] font-black text-slate-400 uppercase">Coincidencia Exitosa</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    if (document.hasFocus()) {
                                                                        navigator.clipboard.writeText(res.formatted);
                                                                    }
                                                                }}
                                                                className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded-2xl text-[12px] font-mono text-indigo-600 break-all select-all">
                                                            {res.formatted}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
