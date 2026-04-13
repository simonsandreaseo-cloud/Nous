"use client";
import { useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";
import { 
    Plus, 
    LayoutGrid, 
    Sparkles, 
    Box,
    Loader2
} from "lucide-react";
import { motion } from "framer-motion";

// Reusing existing components from the contents/settings path for now
// to maintain consistency while we centralize
import { WidgetCard } from "@/components/contents/settings/widgets/WidgetCard";
import { WidgetGalleryModal } from "@/components/contents/settings/widgets/WidgetGalleryModal";
import { NousExtractorConfigModal } from "@/components/contents/settings/widgets/NousExtractorConfigModal";

import type { CustomWidget } from "@/types/project";

export default function ToolsSettingsView() {
    const { activeProject, updateProject } = useProjectStore();
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

    const widgets = activeProject?.custom_widgets || [];
    const editingWidget = widgets.find(w => w.id === editingWidgetId);

    const addWidget = async (type: 'nous_extractor' | 'link_patcher' | 'price_monitor' | 'entity_extractor') => {
        if (!activeProject) return;
        
        const newWidget: CustomWidget = {
            id: crypto.randomUUID(),
            type,
            name: type === 'nous_extractor' ? "Nous Extractor" : "Nueva Herramienta",
            config: type === 'nous_extractor' ? { rules: [] } : {},
            is_active: true,
            created_at: new Date().toISOString()
        };

        const currentWidgets = activeProject?.custom_widgets || [];
        await updateProject(activeProject.id, {
            custom_widgets: [...currentWidgets, newWidget]
        });
        
        setIsGalleryOpen(false);
        setEditingWidgetId(newWidget.id);
    };

    const updateWidget = async (id: string, updates: Partial<CustomWidget>) => {
        if (!activeProject) return;
        const currentWidgets = activeProject?.custom_widgets || [];
        const newWidgets = currentWidgets.map(w => w.id === id ? { ...w, ...updates } : w);
        await updateProject(activeProject.id, { custom_widgets: newWidgets });
    };

    const deleteWidget = async (id: string) => {
        if (!activeProject) return;
        if (!confirm("¿Estás seguro de que quieres eliminar esta herramienta?")) return;
        const currentWidgets = activeProject?.custom_widgets || [];
        const newWidgets = currentWidgets.filter(w => w.id !== id);
        await updateProject(activeProject.id, { custom_widgets: newWidgets });
    };

    const toggleWidget = async (id: string) => {
        if (!activeProject) return;
        const currentWidgets = activeProject?.custom_widgets || [];
        const widget = currentWidgets.find(w => w.id === id);
        if (widget) {
            updateWidget(id, { is_active: !widget.is_active });
        }
    };

    if (!activeProject) return null;

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Custom Tools</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Automatización y Extracción Técnica de Datos</p>
                </div>
                
                <button 
                    onClick={() => setIsGalleryOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                >
                    <Plus size={14} />
                    Nueva Herramienta
                </button>
            </header>

            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* The "Add New" placeholder card */}
                    <motion.button
                        whileHover={{ scale: 1.02, y: -4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsGalleryOpen(true)}
                        className="h-[180px] rounded-[32px] border-2 border-dashed border-slate-200 bg-white/50 flex flex-col items-center justify-center gap-4 group transition-all hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 text-center"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <Plus size={24} />
                        </div>
                        <div className="px-6">
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-indigo-600 uppercase tracking-widest block mb-1">Añadir Nueva Herramienta</span>
                        </div>
                    </motion.button>

                    {/* Render existing widgets */}
                    {widgets.map((widget) => (
                        <WidgetCard 
                            key={widget.id}
                            widget={widget}
                            onEdit={() => setEditingWidgetId(widget.id)}
                            onToggle={() => toggleWidget(widget.id)}
                            onDelete={() => deleteWidget(widget.id)}
                        />
                    ))}
                </div>

                {/* Footer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 mt-12 border-t border-slate-100">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Inteligencia Compartida</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm lowercase">
                                LAS CUSTOM TOOLS INYECTAN CONTEXTO DIRECTAMENTE EN EL PROMPT DEL REDACTOR, PERMITIENDO QUE LA IA USE DATOS TÉCNICOS REALES EN TIEMPO REAL.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <WidgetGalleryModal 
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={addWidget}
            />

            {editingWidget && (
                <NousExtractorConfigModal 
                    isOpen={!!editingWidgetId}
                    onClose={() => setEditingWidgetId(null)}
                    widget={editingWidget}
                    onUpdate={(updates) => updateWidget(editingWidget.id, updates)}
                />
            )}
        </div>
    );
}
