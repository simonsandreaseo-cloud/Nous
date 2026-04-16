'use client';

import React, { useState } from 'react';
import { 
    Sparkles, 
    Loader2, 
    AlertCircle, 
    RefreshCcw,
    Zap,
    Image as ImageIcon,
    X,
    Settings2,
    LayoutTemplate,
    Anchor,
    Layout,
    Type
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import ImageLightbox from './modals/ImageLightbox';
import { AssetCard } from './MediaTab/AssetCard';
import { useImageManager } from '@/hooks/useImageManager';
import { Button } from '@/components/dom/Button';
import { ProcessingStatus } from '@/types/images';
import { BlueprintService } from '@/lib/services/BlueprintService';


export function MediaTab() {
    const { state, actions } = useImageManager();
    const { status, statusMessage, error, assets, selectedAssetId } = state;

    const [instructions, setInstructions] = useState("");
    const [fullscreenAsset, setFullscreenAsset] = useState<any>(null);
    const [selectedBlueprint, setSelectedBlueprint] = useState<string>('basic_blog');

    const handleApplyBlueprint = (id: string) => {
        setSelectedBlueprint(id);
        actions.applyBlueprint(id);
    };

    const selectedAsset = assets.find(a => a.id === selectedAssetId);

    // Orchestrates generation for the selected asset or the first pending one
    const handleMainAction = () => {
        if (selectedAssetId) {
            actions.handleGenerateAsset(selectedAssetId);
        } else {
            const firstPending = assets.find(a => a.status === 'pending');
            if (firstPending) actions.handleGenerateAsset(firstPending.id);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-outfit">
            
            {/* TOP ACTION BAR */}
            <div className="w-full bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1 bg-indigo-600 rounded text-white shadow-sm">
                            <Sparkles size={12} />
                        </div>
                        <h2 className="text-slate-900 text-[10px] font-black uppercase tracking-tighter">Senior Layout Engine</h2>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                            <LayoutTemplate size={10} className="text-slate-400 ml-1" />
                            <select 
                                value={selectedBlueprint}
                                onChange={(e) => handleApplyBlueprint(e.target.value)}
                                className="bg-transparent border-none text-[9px] font-bold text-slate-600 outline-none cursor-pointer pr-1"
                            >
                                {BlueprintService.getAvailableBlueprints().map(bp => (
                                    <option key={bp.id} value={bp.id}>{bp.name}</option>
                                ))}
                            </select>
                        </div>

                        <Button 
                            onClick={() => actions.applyBlueprint(selectedBlueprint)}
                            disabled={status !== ProcessingStatus.IDLE}
                            className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg px-2 py-1 text-[9px] font-black uppercase flex items-center gap-1"
                        >
                            {status === ProcessingStatus.IDLE ? <><Layout size={10} /> Planificar</> : <Loader2 size={10} className="animate-spin" />}
                        </Button>

                        <Button 
                            onClick={handleMainAction}
                            disabled={status !== ProcessingStatus.IDLE || (assets.length === 0)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-2 py-1 text-[9px] font-black uppercase flex items-center gap-1 shadow-indigo-500/20 shadow-lg"
                        >
                            {status === ProcessingStatus.IDLE ? (
                                <><Zap size={10} /> {selectedAssetId ? 'Generar Seleccionado' : 'Generar Siguiente'}</>
                            ) : (
                                <Loader2 size={10} className="animate-spin" />
                            )}
                        </Button>
                    </div>
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Instrucciones maestras de diseño editorial..."
                        className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-[11px] text-slate-600 outline-none focus:border-indigo-500 transition-all"
                    />
                </div>
            </div>


            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* ASSET GRID */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-slate-50/30">
                    {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                            <AlertCircle className="text-rose-500 shrink-0" size={12} />
                            <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tight">{error}</p>
                        </motion.div>
                    )}

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Activos del Proyecto</h3>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase">{assets.length}</span>
                        </div>
                        <button 
                            onClick={() => actions.handleRefresh()}
                            className={cn(
                                "p-1.5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all",
                                status === ProcessingStatus.SAVING && "animate-spin"
                            )}
                        >
                            <RefreshCcw size={12} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <AnimatePresence mode="popLayout">
                            {assets.map((asset) => (
                                <AssetCard 
                                    key={asset.id}
                                    asset={asset}
                                    isSelected={selectedAssetId === asset.id}
                                    onSelect={() => actions.setSelectedAssetId(asset.id)}
                                    onUpdate={(id, updates) => actions.updateAssetAttributes(id, updates)}
                                    onGenerate={(id) => actions.handleGenerateAsset(id)}
                                    onDelete={(id) => actions.handleDeleteAsset(id, asset.storagePath)}
                                    onFullscreen={() => setFullscreenAsset(asset)}
                                    onDownload={() => actions.handleDownload(asset.url || "", asset.title)}
                                    onUpload={async () => {}}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {assets.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="p-4 bg-slate-100 rounded-full text-slate-300 mb-4">
                                <ImageIcon size={32} />
                            </div>
                            <p className="text-xs font-medium text-slate-400">No hay activos diseñados.</p>
                            <p className="text-[10px] text-slate-300 mt-1">Usa &quot;Planificar&quot; para orquestar el diseño visual.</p>
                        </div>
                    )}
                </div>

                {/* EDITORIAL INSPECTOR */}
                <AnimatePresence>
                    {selectedAsset && (
                        <motion.div 
                            initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
                            className="w-80 border-l border-slate-200 bg-white flex flex-col shadow-xl z-10"
                        >
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <Settings2 size={14} className="text-slate-500" />
                                    <h3 className="text-xs font-black uppercase text-slate-800">Inspector de Activo</h3>
                                </div>
                                <button onClick={() => actions.setSelectedAssetId(null)} className="p-1 hover:bg-slate-200 rounded-md transition-colors">
                                    <X size={14} className="text-slate-400" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                                <section className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Type size={12} className="text-indigo-500" />
                                        <label className="text-[9px] font-black uppercase text-slate-400">Contexto Visual</label>
                                    </div>
                                    <textarea 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 outline-none focus:border-indigo-500 transition-all min-h-[80px]"
                                        value={selectedAsset.prompt}
                                        onChange={(e) => actions.updateAssetAttributes(selectedAssetId!, { prompt: e.target.value })}
                                    />
                                </section>

                                <section className="space-y-3 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <div className="flex items-center gap-2">
                                        <Anchor size={12} className="text-indigo-600" />
                                        <label className="text-[9px] font-black uppercase text-indigo-600">Anclaje Semántico</label>
                                    </div>
                                    <input 
                                        type="text"
                                        className="w-full bg-white border border-indigo-200 rounded-lg px-2 py-1.5 text-[10px] font-medium text-slate-700 outline-none focus:border-indigo-500"
                                        value={selectedAsset.positioning.semanticAnchor || ""}
                                        onChange={(e) => actions.updateAssetAttributes(selectedAssetId!, { positioning: { ...selectedAsset.positioning, semanticAnchor: e.target.value } })}
                                        placeholder="Frase del texto..."
                                    />
                                </section>

                                <section className="space-y-3">
                                    <label className="text-[9px] font-black uppercase text-slate-400 block">Alineación Magistral</label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {['left', 'center', 'right', 'full'].map(align => (
                                            <button 
                                                key={align}
                                                onClick={() => actions.updateAssetAttributes(selectedAssetId!, { design: { ...selectedAsset.design, align: align as any } })}
                                                className={cn(
                                                    "py-2 text-[9px] font-black uppercase rounded-lg border transition-all",
                                                    selectedAsset.design.align === align ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                                )}
                                            >
                                                {align}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <div className="pt-6 border-t border-slate-100">
                                    <Button 
                                        onClick={() => actions.handleGenerateAsset(selectedAssetId!)}
                                        disabled={status !== ProcessingStatus.IDLE}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        {status === ProcessingStatus.IDLE ? <><RefreshCcw size={14} /> Regenerar Activo</> : <Loader2 size={14} className="animate-spin" />}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ImageLightbox isOpen={!!fullscreenAsset} url={fullscreenAsset?.url} onClose={() => setFullscreenAsset(null)} />
        </div>
    );
}
