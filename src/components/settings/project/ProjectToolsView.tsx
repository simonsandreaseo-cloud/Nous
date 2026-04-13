"use client";
import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { 
    Sliders, 
    Code, 
    Zap, 
    Save, 
    RefreshCw,
    MessageSquareText,
    Activity,
    Plus,
    LayoutGrid,
    Info,
    Sparkles
} from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

// Local Components
import { WidgetCard } from "@/components/contents/settings/widgets/WidgetCard";
import { WidgetGalleryModal } from "@/components/contents/settings/widgets/WidgetGalleryModal";
import { NousExtractorConfigModal } from "@/components/contents/settings/widgets/NousExtractorConfigModal";
import { LinkPatcherConfigModal } from "@/components/contents/settings/widgets/LinkPatcherConfigModal";

// Types
import type { CustomWidget } from "@/types/project";

export default function ProjectToolsView() {
    const { activeProject, updateProject } = useProjectStore();
    
    // States for Management
    const [instructions, setInstructions] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

    useEffect(() => {
        if (activeProject) {
            setInstructions(activeProject.architecture_instructions || "");
        }
    }, [activeProject]);

    // Data Preparation
    const widgets = activeProject?.custom_widgets || [];
    const legacyBridges = activeProject?.logic_bridges || [];
    
    // Unify "Nous Extractors" (Legacy items + Custom widgets of type nous_extractor)
    const nousExtractorsCount = legacyBridges.length + widgets.filter(w => w.type === 'nous_extractor').length;
    const editingWidget = widgets.find(w => w.id === editingWidgetId);

    // Automation Handlers
    const addWidget = async (type: 'nous_extractor' | 'link_patcher' | 'price_monitor' | 'entity_extractor') => {
        if (!activeProject) return;
        
        const newWidget: CustomWidget = {
            id: crypto.randomUUID(),
            type,
            name: (type === 'nous_extractor') ? "Nuevo Nous Extractor" : (type === 'link_patcher' ? "Nuevo Link Patcher" : "Nueva Herramienta"),
            config: type === 'nous_extractor' 
                ? { rules: [] } 
                : type === 'link_patcher' 
                ? { 
                    rules: [], 
                    integrations: {
                        internal_linking: false,
                        translator: false,
                        writer: false,
                        extractor: { enabled: false, target_extractor_id: "" }
                    }
                  } 
                : {},
            is_active: true,
            created_at: new Date().toISOString()
        };

        const currentWidgets = activeProject.custom_widgets || [];
        await updateProject(activeProject.id, {
            custom_widgets: [...currentWidgets, newWidget]
        });
        
        setIsGalleryOpen(false);
        if (type === 'nous_extractor' || type === 'link_patcher') {
            setEditingWidgetId(newWidget.id);
        }
    };

    const updateWidget = async (id: string, updates: Partial<CustomWidget>) => {
        if (!activeProject) return;
        const currentWidgets = activeProject.custom_widgets || [];
        const newWidgets = currentWidgets.map(w => w.id === id ? { ...w, ...updates } : w);
        await updateProject(activeProject.id, { custom_widgets: newWidgets });
    };

    const deleteWidget = async (id: string) => {
        if (!activeProject || !confirm("¿Estás seguro de que quieres eliminar esta herramienta?")) return;
        const currentWidgets = activeProject.custom_widgets || [];
        const newWidgets = currentWidgets.filter(w => w.id !== id);
        await updateProject(activeProject.id, { custom_widgets: newWidgets });
    };

    const toggleWidget = async (id: string) => {
        if (!activeProject) return;
        const currentWidgets = activeProject.custom_widgets || [];
        const widget = currentWidgets.find(w => w.id === id);
        if (widget) {
            updateWidget(id, { is_active: !widget.is_active });
        }
    };

    const handleSaveInstructions = async () => {
        if (!activeProject) return;
        setIsSaving(true);
        try {
            await updateProject(activeProject.id, {
                architecture_instructions: instructions
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header>
                <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Herramientas & Reglas</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Configura el comportamiento inteligente y reglas de negocio del proyecto</p>
            </header>

            <div className="grid grid-cols-1 gap-12">
                {/* Architecture Instructions Section */}
                <section className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500 shadow-sm">
                                <MessageSquareText size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Instrucciones de Arquitectura</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Guías maestras para la IA</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleSaveInstructions}
                            disabled={isSaving}
                            className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2"
                        >
                            {isSaving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                            Guardar Prompt
                        </button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prompt de Contexto Global</label>
                        <textarea 
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={8}
                            className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-violet-500/10 transition-all resize-none font-mono"
                            placeholder="Define el tono, estilo, reglas de enlazado interno, y cualquier instrucción específica de la marca..."
                        />
                    </div>
                </section>

                {/* Automation Management Section */}
                <section className="space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase italic">Nous Extractor & Automatización</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gestión de extracciones y herramientas custom</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col items-center border-r border-slate-100 pr-6">
                                <span className="text-[14px] font-black text-slate-900">{nousExtractorsCount}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Master</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[14px] font-black text-slate-900">{widgets.length}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Widgets</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Add Widget Button */}
                        <motion.button
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsGalleryOpen(true)}
                            className="h-[180px] rounded-[32px] border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center gap-4 group transition-all hover:bg-white hover:border-amber-200 hover:shadow-xl hover:shadow-amber-500/5 text-center"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-amber-50 flex items-center justify-center text-slate-400 group-hover:text-amber-500 transition-colors">
                                <Plus size={24} />
                            </div>
                            <div className="px-6">
                                <span className="text-[10px] font-black text-slate-400 group-hover:text-amber-600 uppercase tracking-widest block mb-1">Añadir Herramienta</span>
                                <span className="text-[8px] font-bold text-slate-300 uppercase block tracking-widest italic">Galería de Inteligencia</span>
                            </div>
                        </motion.button>

                        {/* Existing Widgets */}
                        <AnimatePresence mode="popLayout">
                            {widgets.map((widget) => (
                                <WidgetCard 
                                    key={widget.id}
                                    widget={widget}
                                    onEdit={() => setEditingWidgetId(widget.id)}
                                    onToggle={() => toggleWidget(widget.id)}
                                    onDelete={() => deleteWidget(widget.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Pro Tips */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-900 rounded-[32px] text-white">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Nous Extractor</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    Permiten que la IA extraiga datos técnicos (como identificadores de producto) de las URLs que detecte en el contenido en tiempo real.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-cyan-400">
                                <Info size={18} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-widest mb-1">Contexto Global</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                    Las herramientas instaladas inyectan conocimiento específico en cada fase del proceso editorial (Planner, Research, Writer).
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Modals */}
            <WidgetGalleryModal 
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={addWidget}
            />

            {editingWidget && editingWidget.type === 'nous_extractor' && (
                <NousExtractorConfigModal 
                    isOpen={!!editingWidgetId}
                    onClose={() => setEditingWidgetId(null)}
                    widget={editingWidget}
                    onUpdate={(updates) => updateWidget(editingWidget.id, updates)}
                />
            )}

            {editingWidget && editingWidget.type === 'link_patcher' && (
                <LinkPatcherConfigModal 
                    isOpen={!!editingWidgetId}
                    onClose={() => setEditingWidgetId(null)}
                    widget={editingWidget}
                    onUpdate={(updates) => updateWidget(editingWidget.id, updates)}
                />
            )}
        </div>
    );
}
