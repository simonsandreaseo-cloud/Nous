'use client';

import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import { 
    Sparkles, 
    Loader2, 
    AlertCircle, 
    Plus,
    RefreshCcw,
    ChevronDown,
    Zap,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { cn } from '@/utils/cn';
import ImageLightbox from './modals/ImageLightbox';
import { AssetCard } from './MediaTab/AssetCard';

import { 
    ProcessingStatus, 
    AspectRatio, 
    InlineImageCount,
    GeneratedImage,
    ImageRowConfig
} from '@/types/images';
import { ImageWorkflowService } from '@/lib/services/writer/image-workflow';
import { Button } from '@/components/dom/Button';
import { uploadManualImage, deleteImageAction } from '@/lib/actions/imageActions';
import { saveAs } from 'file-saver';

export function MediaTab() {
    const { 
        draftId, content, strategyH1, projectId, taskImages, 
        loadTaskImages, setStatus: setStoreStatus, editor 
    } = useWriterStore() as any;
    
    const { projects } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId) || null;

    // UI States
    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [fullscreenImage, setFullscreenImage] = useState<any>(null);

    // Form/Settings States
    const [instructions, setInstructions] = useState("");
    const [selectedStyleId, setSelectedStyleId] = useState('realism');
    const [featuredRatio, setFeaturedRatio] = useState<AspectRatio>('16:9');
    const [inlineImageCount, setInlineImageCount] = useState<InlineImageCount>('auto');
    
    // ROWS STATE
    const [imageRows, setImageRows] = useState<ImageRowConfig[]>([]);

    useEffect(() => {
        const imgSettings = activeProject?.settings?.images;
        const newRows: ImageRowConfig[] = [];
        
        const featuredImg = taskImages.find((i: any) => i.type === 'featured');
        newRows.push({
            id: 'portada-row',
            type: 'portada',
            imageId: featuredImg?.id,
            url: featuredImg?.url,
            model: imgSettings?.portada_preset?.model || 'grok-imagine-pro',
            ratio: imgSettings?.portada_preset?.ratio || '16:9',
            width: imgSettings?.portada_preset?.width || 1280,
            height: imgSettings?.portada_preset?.height || 720,
            miniPrompt: imgSettings?.portada_preset?.mini_prompt || ''
        });

        const inlineImgs = taskImages.filter((i: any) => i.type === 'inline');
        if (inlineImgs.length > 0) {
            inlineImgs.forEach((img: any, idx: number) => {
                newRows.push({
                    id: `body-row-${idx}`,
                    type: 'cuerpo',
                    imageId: img.id,
                    url: img.url,
                    model: imgSettings?.body_presets?.[idx]?.model || 'flux',
                    ratio: imgSettings?.body_presets?.[idx]?.ratio || '16:9',
                    width: imgSettings?.body_presets?.[idx]?.width || 800,
                    height: imgSettings?.body_presets?.[idx]?.height || 450,
                    miniPrompt: imgSettings?.body_presets?.[idx]?.mini_prompt || ''
                });
            });
        } else {
            newRows.push({
                id: 'body-default',
                type: 'cuerpo',
                model: 'flux',
                ratio: '16:9',
                width: 800,
                height: 450,
                miniPrompt: ''
            });
        }
        setImageRows(newRows);
    }, [activeProject?.id, taskImages.length]);

    const updateRow = useCallback((index: number, updates: Partial<ImageRowConfig>) => {
        setImageRows(prev => prev.map((row, i) => 
            i === index ? { ...row, ...updates } : row
        ));
    }, []);

    const addBodyRow = useCallback(() => {
        const newRow: ImageRowConfig = {
            id: `body-${Date.now()}`,
            type: 'cuerpo',
            model: 'flux',
            ratio: '16:9',
            width: 800,
            height: 450,
            miniPrompt: ''
        };
        setImageRows(prev => [...prev, newRow]);
    }, []);

    const removeBodyRow = useCallback((index: number) => {
        const row = imageRows[index];
        if (row?.type === 'portada') return;
        setImageRows(prev => prev.filter((_, i) => i !== index));
    }, [imageRows]);

    const handleGenerateRow = useCallback(async (index: number) => {
        const row = imageRows[index];
        if (!draftId) return;

        setStatus(ProcessingStatus.GENERATING_IMAGES);
        setStatusMessage(`Generando ${row.type === 'portada' ? 'portada' : 'imagen de cuerpo'}...`);

        try {
            const refinement = row.miniPrompt || "Imagen detallada y profesional";
            const existingImg = taskImages.find((img: any) => 
                row.type === 'portada' ? img.type === 'featured' : img.id === row.imageId
            );

            let resultUrl = '';
            if (existingImg) {
                const res = await ImageWorkflowService.regenerateImage(existingImg, {
                    model: row.model,
                    width: row.width,
                    height: row.height,
                    ratio: row.ratio,
                    taskId: draftId,
                    projectLogoUrl: activeProject?.logo_url
                }, refinement);
                resultUrl = res.url;
            } else {
                const res = await ImageWorkflowService.executeFullPipeline(
                    content ? [content] : ["Visual representation"],
                    {
                        instructions: refinement,
                        language: 'es',
                        taskId: draftId,
                        projectLogoUrl: activeProject?.logo_url,
                        onStatusChange: (s, msg) => {
                            setStatus(s);
                            setStatusMessage(msg);
                        },
                        onImageGenerated: async () => {}
                    }
                ) as any;
                resultUrl = res.images?.[0]?.url || '';
            }

            await loadTaskImages(draftId);
            updateRow(index, { url: resultUrl });
            setStatus(ProcessingStatus.COMPLETED);
            setStoreStatus("✅ Imagen generada con éxito.");
        } catch (e: any) {
            setError(e.message || "Error al generar la imagen");
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, imageRows, content, activeProject?.logo_url, loadTaskImages, updateRow, setStoreStatus]);

    const handleDeleteRowImage = useCallback(async (index: number) => {
        const row = imageRows[index];
        if (!row.imageId || !row.url) return;
        if (!window.confirm("¿Eliminar esta imagen permanentemente?")) return;
        
        setStatus(ProcessingStatus.SAVING);
        setStatusMessage("Eliminando imagen...");
        try {
            const res = await deleteImageAction(row.imageId, row.url);
            if (res.success) {
                await loadTaskImages(draftId);
                updateRow(index, { url: undefined, imageId: undefined });
                setStatus(ProcessingStatus.COMPLETED);
            } else {
                setError(res.error || "Error al eliminar");
                setStatus(ProcessingStatus.ERROR);
            }
        } catch (e: any) {
            setError(e.message);
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, imageRows, loadTaskImages, updateRow]);

    const handleUploadToRow = useCallback(async (index: number, file: File) => {
        const row = imageRows[index];
        if (!file || !draftId) return;

        setStatus(ProcessingStatus.SAVING);
        setStatusMessage("Subiendo imagen...");

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const dbType = row.type === 'portada' ? 'featured' : 'inline';
            
            const res = await uploadManualImage({
                base64,
                fileType: file.type,
                taskId: draftId,
                fileName: file.name,
                type: dbType
            });

            if (res.success) {
                await loadTaskImages(draftId);
                const uploadedImg = taskImages.find((img: any) => img.fileName === file.name);
                if (uploadedImg) {
                    updateRow(index, { url: uploadedImg.url, imageId: uploadedImg.id });
                }
                setStatus(ProcessingStatus.COMPLETED);
                setStoreStatus("✅ Imagen cargada.");
            } else {
                setError(res.error || "Error al subir");
                setStatus(ProcessingStatus.ERROR);
            }
        };
        reader.readAsDataURL(file);
    }, [draftId, imageRows, taskImages, loadTaskImages, updateRow, setStoreStatus]);

    const handleEnhanceRow = useCallback(async (index: number) => {
        const row = imageRows[index];
        if (!row.imageId || !row.url || !draftId) return;

        const existingImg = taskImages.find((img: any) => img.id === row.imageId);
        if (!existingImg) {
            setError("Imagen no encontrada");
            return;
        }

        const refinement = row.miniPrompt || "Mejora esta imagen haciéndola más profesional";
        
        setStatus(ProcessingStatus.GENERATING_IMAGES);
        setStatusMessage("Mejorando imagen...");

        try {
            const result = await ImageWorkflowService.regenerateImage(existingImg, {
                model: row.model,
                width: row.width,
                height: row.height,
                ratio: row.ratio,
                taskId: draftId,
                projectLogoUrl: activeProject?.logo_url
            }, refinement);

            await loadTaskImages(draftId);
            updateRow(index, { url: result.url, imageId: result.id });
            setStatus(ProcessingStatus.COMPLETED);
            setStoreStatus("✅ Imagen mejorada.");
        } catch (e: any) {
            setError(e.message);
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, imageRows, activeProject?.logo_url, taskImages, loadTaskImages, updateRow, setStoreStatus]);

    const handleRefresh = async () => {
        if (!draftId) return;
        await loadTaskImages(draftId);
    };

    const handleDownload = useCallback((url: string, title?: string) => {
        if (!url) return;
        saveAs(url, `${title || 'nous-asset'}.jpg`);
    }, []);

    const confirmAllGhosts = useCallback(() => {
        if (!editor) return;

        let ghostCount = 0;
        const { doc } = editor.state;
        
        const ghostPositions: number[] = [];
        doc.descendants((node, pos) => {
            if (node.type.name === 'nousAsset' && node.attrs.status === 'ghost') {
                ghostPositions.push(pos);
            }
        });

        if (ghostPositions.length === 0) {
            setStoreStatus("No hay sugerencias pendientes.");
            return;
        }

        for (let i = ghostPositions.length - 1; i >= 0; i--) {
            editor.chain().setNodeMarkup(ghostPositions[i], undefined, { 
                status: 'final' 
            }).run();
            ghostCount++;
        }

        setStoreStatus(`✅ ${ghostCount} sugerencias aceptadas.`);
    }, [editor, setStoreStatus]);

    const processGeneration = async () => {
        if (!draftId || !content) return;

        try {
            setError(null);
            setStatus(ProcessingStatus.READING_CONTENT);
            setStatusMessage("Analizando contenido...");

            const paragraphs = content.split(/<p>|<\/p>|\n\n/).filter((p: string) => p.trim() !== "");
            
            const { images: finalImages } = await ImageWorkflowService.executeFullPipeline(paragraphs, {
                instructions: instructions,
                language: 'es',
                masterPrompt: instructions,
                taskId: draftId,
                projectLogoUrl: activeProject?.logo_url,
                onStatusChange: (s, msg) => {
                    setStatus(s);
                    setStatusMessage(msg);
                },
                onImageGenerated: async () => {}
            }) as { images: any[] };

            await loadTaskImages(draftId);

            if (editor && finalImages.length > 0) {
                setStatusMessage("Ubicando artes en el contenido...");
                const inlines = finalImages
                    .filter(img => img.type === 'inline')
                    .sort((a, b) => (b.paragraphIndex ?? 0) - (a.paragraphIndex ?? 0));

                // Semantic Anchoring Algorithm
                const text = editor.getText();
                
                for (const img of inlines) {
                    const anchor = img.semantic_anchor;
                    let insertPos = -1;

                    if (anchor && text.includes(anchor)) {
                        // Find the end of the semantic anchor in the document
                        const anchorPos = text.indexOf(anchor);
                        insertPos = anchorPos + anchor.length;
                    } else {
                        // Fallback to paragraph index if anchor fails
                        const paragraphPositions: { pos: number; endPos: number; index: number }[] = [];
                        let blockIndex = 0;
                        editor.view.state.doc.forEach((node: any, offset: number) => {
                            if (node.type.name === 'paragraph' || node.type.name === 'heading' || 
                                node.type.name === 'bulletList' || node.type.name === 'orderedList' ||
                                node.type.name === 'blockquote') {
                                paragraphPositions.push({ pos: offset, endPos: offset + node.nodeSize, index: blockIndex });
                                blockIndex++;
                            }
                        });
                        const targetBlock = paragraphPositions.find(p => p.index === img.paragraphIndex);
                        if (targetBlock) insertPos = targetBlock.endPos;
                    }

                    if (insertPos !== -1) {
                        editor.chain().insertContentAt(insertPos, {
                            type: 'nousAsset',
                            attrs: {
                                id: img.id,
                                url: img.url,
                                type: 'inline',
                                alt: img.alt_text || img.altText,
                                title: img.title,
                                prompt: img.prompt,
                                width: '100%',
                                align: 'center',
                                storage_path: img.storage_path,
                                status: 'ghost', // GHOST MODE ENABLED
                                semanticAnchor: anchor
                            }
                        }).run();
                    } else {
                        editor.chain().focus('end').insertContent({
                            type: 'nousAsset',
                            attrs: {
                                id: img.id,
                                url: img.url,
                                type: 'inline',
                                alt: img.alt_text || img.altText,
                                title: img.title,
                                prompt: img.prompt,
                                width: '100%',
                                align: 'center',
                                storage_path: img.storage_path,
                                status: 'ghost'
                            }
                        }).run();
                    }
                }
            }

            setStatus(ProcessingStatus.COMPLETED);
            setStoreStatus("✅ Diseño completado (Modo Ghost activo).");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error inesperado");
            setStatus(ProcessingStatus.ERROR);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-outfit">
            
            {/* MAGIC ART DIRECTION BAR - COMPACT VERSION */}
            <div className="w-full bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-600 rounded-lg text-white shadow-sm">
                            <Sparkles size={14} />
                        </div>
                        <h2 className="text-slate-900 text-xs font-black uppercase tracking-tighter">Arte</h2>
                    </div>

                    <Button 
                        onClick={processGeneration}
                        disabled={status !== ProcessingStatus.IDLE}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 flex items-center gap-1.5"
                    >
                        {status === ProcessingStatus.IDLE ? (
                            <>
                                <Zap size={12} />
                                Crear Todo
                            </>
                        ) : (
                            <>
                                <Loader2 size={12} className="animate-spin" />
                                {statusMessage || "..."}
                            </>
                        )}
                    </Button>
                </div>

                <div className="relative group">
                    <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="Master Prompt..."
                        className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] text-slate-600 outline-none focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] font-black text-indigo-400 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles size={10} />
                        ADN
                    </div>
                </div>
            </div>

            {/* ASSET BOARD */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4">
                {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                        <AlertCircle className="text-rose-500 shrink-0" size={12} />
                        <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tight">{error}</p>
                    </motion.div>
                )}

                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">Activos</h3>
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full text-[8px] font-black uppercase">{imageRows.length}</span>
                    </div>
                    <button 
                        onClick={handleRefresh}
                        className={cn(
                            "p-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 transition-all",
                            status === ProcessingStatus.SAVING && "animate-spin"
                        )}
                    >
                        <RefreshCcw size={12} />
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <AnimatePresence>
                        {imageRows.map((row, index) => (
                            <AssetCard 
                                key={row.id}
                                row={row}
                                index={index}
                                onUpdate={updateRow}
                                onGenerate={handleGenerateRow}
                                onUpload={handleUploadToRow}
                                onDelete={handleDeleteRowImage}
                                onEnhance={handleEnhanceRow}
                                onFullscreen={(img) => setFullscreenImage(img)}
                                onDownload={handleDownload}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                <div className="mt-6 flex justify-center">
                    <button 
                        onClick={addBodyRow}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all group"
                    >
                        <Plus size={14} className="group-hover:scale-125 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Nuevo Activo</span>
                    </button>
                </div>
            </div>

            {/* Lightbox */}
            <ImageLightbox 
                isOpen={!!fullscreenImage}
                image={fullscreenImage} 
                onClose={() => setFullscreenImage(null)} 
            />
        </div>
    );
}
