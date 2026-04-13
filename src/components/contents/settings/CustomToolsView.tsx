"use client";

import { useState } from "react";
import { Plus, LayoutGrid, Info, Sparkles, Box } from "lucide-react";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/utils/cn";

// Components
import { WidgetCard } from "./widgets/WidgetCard";
import { WidgetGalleryModal } from "./widgets/WidgetGalleryModal";
import { NousExtractorConfigModal } from "./widgets/NousExtractorConfigModal";
import { LinkPatcherConfigModal } from "./widgets/LinkPatcherConfigModal";
import { AssetPatcherConfigModal } from "./widgets/AssetPatcherConfigModal";
import { SettingsSidebar } from "./SettingsSidebar";

import type { CustomWidget } from "@/types/project";

export default function CustomToolsView() {
    const { activeProject, updateProject } = useProjectStore();
    const [subTool, setSubTool] = useState("custom-tools");
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

    const widgets = activeProject?.custom_widgets || [];
    const editingWidget = widgets.find(w => w.id === editingWidgetId);

    const addWidget = async (type: 'nous_extractor' | 'link_patcher' | 'price_monitor' | 'entity_extractor' | 'asset_patcher') => {
        const newWidget: CustomWidget = {
            id: crypto.randomUUID(),
            type,
            name: type === 'nous_extractor' ? "Extractor Nous" : 
                  type === 'link_patcher' ? "Link Patcher" : 
                  type === 'asset_patcher' ? "Patcher Master" : "Nueva Herramienta",
            config: (type === 'nous_extractor' || type === 'link_patcher' || type === 'asset_patcher') ? { 
                rules: [],
                useNousDimensions: true,
                hideFeatured: false,
                hideAllImages: false
            } : {},
            is_active: true,
            created_at: new Date().toISOString()
        };

        const currentWidgets = activeProject?.custom_widgets || [];
        await updateProject(activeProject!.id, {
            custom_widgets: [...currentWidgets, newWidget]
        });
        
        setIsGalleryOpen(false);
        setEditingWidgetId(newWidget.id);
    };

    const updateWidget = async (id: string, updates: Partial<CustomWidget>) => {
        const currentWidgets = activeProject?.custom_widgets || [];
        const newWidgets = currentWidgets.map(w => w.id === id ? { ...w, ...updates } : w);
        await updateProject(activeProject!.id, { custom_widgets: newWidgets });
    };

    const deleteWidget = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta herramienta?")) return;
        const currentWidgets = activeProject?.custom_widgets || [];
        const newWidgets = currentWidgets.filter(w => w.id !== id);
        await updateProject(activeProject!.id, { custom_widgets: newWidgets });
    };

    const toggleWidget = async (id: string) => {
        const currentWidgets = activeProject?.custom_widgets || [];
        const widget = currentWidgets.find(w => w.id === id);
        if (widget) {
            updateWidget(id, { is_active: !widget.is_active });
        }
    };

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-white">
            {/* Secondary Vertical Menu */}
            <SettingsSidebar activeTool={subTool} onSelect={setSubTool} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar bg-slate-50/30">
                {/* Header */}
                <div className="shrink-0 p-8 pt-10 flex flex-col gap-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                            <Box size={16} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Custom Tools</h1>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
                        Extiende las capacidades de Nous con herramientas a medida y automatizaciones de extracción técnica.
                    </p>
                </div>

                {/* Widgets Grid */}
                <div className="px-8 pb-12">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <LayoutGrid size={16} className="text-slate-400" />
                            <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Herramientas Instaladas ({widgets.length})</h2>
                        </div>
                    </div>

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
                                <span className="text-[8px] font-bold text-slate-300 uppercase block tracking-widest">Explorar la Galería de Widgets</span>
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

                    {/* Pro Tips / Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 mt-12 border-t border-slate-100">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Sparkles size={18} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Inteligencia Compartida</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm">
                                    Las Custom Tools inyectan contexto directamente en el prompt del redactor, permitiendo que la IA use datos técnicos reales en tiempo real.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 shrink-0 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                                <Info size={18} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-1">Escalabilidad</h4>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm">
                                    Puedes configurar múltiples instancias de un mismo tipo de widget para diferentes casos de uso (ej: Tienda Principal vs Blog Corporativo).
                                </p>
                            </div>
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

            {editingWidget && editingWidget.type === 'asset_patcher' && (
                <AssetPatcherConfigModal 
                    isOpen={!!editingWidgetId}
                    onClose={() => setEditingWidgetId(null)}
                    widget={editingWidget}
                    onUpdate={(updates) => updateWidget(editingWidget.id, updates)}
                />
            )}
        </div>
    );
}
