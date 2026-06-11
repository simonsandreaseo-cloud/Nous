"use client";
import React, { useState, useEffect } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { supabase } from "@/lib/supabase";
import { Network, Upload, FileText } from "lucide-react";
import { cn } from "@/utils/cn";
import { LinkStrategyEditor, LinkStrategyConfig } from "./LinkStrategyEditor";
import { SmartURLUploaderModal } from "./SmartURLUploaderModal";
import { toast } from "sonner";

export function ProjectLinkStrategyView() {
    const { activeProject, updateProject } = useProjectStore();
    // Supabase client from shared instance
    
    const [categories, setCategories] = useState<string[]>([]);
    const [activeContentType, setActiveContentType] = useState<string>("");
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);

    const contentTypes = activeProject?.settings?.content_preferences?.custom_content_types || ["Blog Post"];

    useEffect(() => {
        if (!activeContentType && contentTypes.length > 0) {
            setActiveContentType(contentTypes[0]);
        }
    }, [contentTypes, activeContentType]);

    useEffect(() => {
        const fetchCategories = async () => {
            if (!activeProject?.id) return;
            setIsLoadingCategories(true);
            try {
                const { data, error } = await supabase.rpc('get_unique_categories', { p_project_id: activeProject.id });
                if (error) throw error;
                const distinct = (data || []).map((c: any) => c.category || c).filter(Boolean);
                setCategories(distinct);
            } catch (err) {
                console.error("Error fetching categories:", err);
                toast.error("Error al cargar categorías del inventario.");
            } finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [activeProject?.id, supabase]);

    if (!activeProject) return null;

    const strategySettings = activeProject.settings?.link_strategy?.per_content_type || {};

    const handleConfigChange = async (contentType: string, newConfig: LinkStrategyConfig) => {
        const currentStrategy = activeProject.settings?.link_strategy || {};
        const updatedStrategy = {
            ...currentStrategy,
            per_content_type: {
                ...currentStrategy.per_content_type,
                [contentType]: newConfig
            }
        };

        await updateProject(activeProject.id, {
            settings: {
                ...activeProject.settings,
                link_strategy: updatedStrategy
            }
        });
        toast.success(`Estrategia actualizada para: ${contentType}`);
    };

    const currentConfig: LinkStrategyConfig = strategySettings[activeContentType] || {
        strict_mode: false,
        strict_category: null,
        category_priorities: {},
        planned_priorities: {},
        vip_urls: []
    };

    return (
        <div className="w-full max-w-6xl mx-auto pb-24">
            <div className="mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Network className="text-indigo-500" size={20} />
                        </div>
                        Matriz de Estrategia de Enlazado
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-2 max-w-2xl">
                        Define el comportamiento del interlinking inteligente por cada tipo de contenido. Puedes priorizar categorías específicas o forzar modos estrictos.
                    </p>
                </div>
                <button 
                    onClick={() => setIsUploaderOpen(true)}
                    className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xl shadow-slate-900/10 flex items-center gap-2"
                >
                    <Upload size={16} />
                    Importar URLs
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Sidebar (Master) */}
                <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Tipos de Contenido</h3>
                    {contentTypes.map((type: string) => {
                        const isActive = activeContentType === type;
                        const hasConfig = !!strategySettings[type];
                        return (
                            <button
                                key={type}
                                onClick={() => setActiveContentType(type)}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-left group",
                                    isActive 
                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm" 
                                        : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                                )}
                            >
                                <span className="text-sm font-bold truncate flex items-center gap-2">
                                    <FileText size={16} className={isActive ? "text-indigo-500" : "text-slate-400"} />
                                    {type}
                                </span>
                                {hasConfig && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Configurado"></span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Editor (Detail) */}
                <div className="flex-1 min-w-0 w-full">
                    {activeContentType ? (
                        <LinkStrategyEditor 
                            contentType={activeContentType}
                            config={currentConfig}
                            categories={categories}
                            plannedTypes={contentTypes}
                            onChange={(cfg) => handleConfigChange(activeContentType, cfg)}
                        />
                    ) : (
                        <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center flex flex-col items-center justify-center text-slate-400">
                            <Network size={40} className="mb-4 opacity-50" />
                            <p className="text-sm font-medium">Selecciona un tipo de contenido a la izquierda para configurar su estrategia.</p>
                        </div>
                    )}
                </div>
            </div>

            <SmartURLUploaderModal 
                isOpen={isUploaderOpen}
                onClose={() => setIsUploaderOpen(false)}
                projectId={activeProject.id}
                onUploadSuccess={() => {
                    // Refetch categories on success if needed
                    window.location.reload();
                }}
            />
        </div>
    );
}
