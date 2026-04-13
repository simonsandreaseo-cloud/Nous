
'use client';

import React, { useState, useRef, useCallback, memo } from 'react';
import { 
    Settings2, 
    Sparkles, 
    Loader2, 
    AlertCircle, 
    Camera, 
    Zap, 
    Download,
    Trash2,
    Plus,
    RefreshCcw,
    ChevronDown,
    Image as ImageIcon,
    CheckCircle2,
    Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { cn } from '@/utils/cn';
import ImageLightbox from './modals/ImageLightbox';

import { 
    ProcessingStatus, 
    AspectRatio, 
    InlineImageCount,
    GeneratedImage
} from '@/types/images';
import { ImageWorkflowService } from '@/lib/services/writer/image-workflow';
import { Button } from '@/components/dom/Button';
import { uploadManualImage, deleteImageAction } from '@/lib/actions/imageActions';

const PRESET_STYLES = [
    { id: 'realism', label: 'Foto Realista', model: 'grok-imagine-pro', suffix: '' },
    { id: 'cinematic', label: 'Cinemático', model: 'grok-imagine-pro', suffix: 'cinematic, dramatic lighting, highly detailed' },
    { id: '3d', label: 'Ilustración 3D', model: 'flux', suffix: '3D render, Disney Pixar style, Unreal Engine 5' },
    { id: 'vector', label: 'Minimalista Vectorial', model: 'flux', suffix: 'flat design, vector art, minimalist' },
    { id: 'cyberpunk', label: 'Cyberpunk', model: 'wan-image-pro', suffix: 'cyberpunk, digital art, vibrant' },
    { id: 'sketch', label: 'Dibujo a Mano', model: 'flux', suffix: 'hand drawn sketch, pencil art' },
];

const ImageThumb = memo(({ img, handleDragStart, handleRegenerateIndividual, handleDownload, handleDeleteImage, onFullscreen }: any) => {

    const thumbUrl = img.url.includes('pollinations.ai') 
        ? `${img.url}${img.url.includes('?') ? '&' : '?'}width=300&height=300&nologo=true`
        : img.url;

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative flex-shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-white/10 group cursor-grab active:cursor-grabbing bg-slate-900 shadow-xl"
            draggable
            onDragStart={(e) => handleDragStart(e, img)}
        >
            <img 
                src={thumbUrl} 
                className="w-full h-full object-cover opacity-80 transition-all duration-500 group-hover:scale-110 group-hover:opacity-100 placeholder:bg-slate-800"
                loading="lazy"
            />
            
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                <div className="flex items-center gap-1.5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleRegenerateIndividual(img); }}
                        className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg"
                    >
                        <Sparkles size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(img.url, img.title); }}
                        className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    >
                        <Download size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                        className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all"
                    >
                        <Trash2 size={12} />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onFullscreen(img); }}
                        className="p-1.5 rounded-lg bg-white text-slate-900 hover:bg-indigo-50 transition-all shadow-lg"
                        title="Pantalla Completa"
                    >
                        <Maximize2 size={12} />
                    </button>
                </div>
            </div>

        </motion.div>
    );
});

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
    const [selectedStyleId, setSelectedStyleId] = useState(PRESET_STYLES[0].id);
    const [featuredRatio, setFeaturedRatio] = useState<AspectRatio>('16:9');
    const [inlineImageCount, setInlineImageCount] = useState<InlineImageCount>('auto');
    
    // Realism/Model States
    const [realismMode, setRealismMode] = useState<'standard' | 'hyperrealistic'>('standard');
    const [sourceModel, setSourceModel] = useState<string>('flux');
    const [optimizePrompt, setOptimizePrompt] = useState(true); // Default ON

    // Custom Dimensions States
    const [useCustomSize, setUseCustomSize] = useState(false);
    const [customWidth, setCustomWidth] = useState(1280);
    const [customHeight, setCustomHeight] = useState(720);
    const [applyCustomToBody, setApplyCustomToBody] = useState(false);

    const [isRefreshing, setIsRefreshing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleRefresh = async () => {
        if (!draftId) return;
        setIsRefreshing(true);
        await loadTaskImages(draftId);
        setIsRefreshing(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'featured' | 'inline' = 'inline') => {
        const file = e.target.files?.[0];
        if (!file || !draftId) return;

        setStatus(ProcessingStatus.SAVING);
        setStatusMessage("Subiendo arte...");

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const res = await uploadManualImage({
                base64,
                fileType: file.type,
                taskId: draftId,
                fileName: file.name,
                type: type
            });

            if (res.success) {
                await loadTaskImages(draftId);
                setStatus(ProcessingStatus.COMPLETED);
                setStoreStatus("✅ Imagen cargada con éxito.");
            } else {
                setError(res.error || "Error al subir imagen");
                setStatus(ProcessingStatus.ERROR);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleDropUpload = async (file: File, type: 'featured' | 'inline') => {
        if (!file || !draftId) return;
        setStatus(ProcessingStatus.SAVING);
        setStatusMessage("Subiendo arte...");

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            const res = await uploadManualImage({
                base64,
                fileType: file.type,
                taskId: draftId,
                fileName: file.name,
                type: type
            });

            if (res.success) {
                await loadTaskImages(draftId);
                setStatus(ProcessingStatus.COMPLETED);
            } else {
                setError(res.error || "Error al subir");
                setStatus(ProcessingStatus.IDLE);
            }
        };
        reader.readAsDataURL(file);
    };

    const AddPlaceholder = ({ type, className }: { type: 'featured' | 'inline', className?: string }) => {
        const [isOver, setIsOver] = useState(false);

        const onDrop = (e: React.DragEvent) => {
            e.preventDefault();
            setIsOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleDropUpload(file, type);
        };

        return (
            <button 
                onClick={() => {
                    const input = fileInputRef.current;
                    if (input) {
                        input.onchange = (e: any) => handleFileUpload(e, type);
                        input.click();
                    }
                }}
                onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
                onDragLeave={() => setIsOver(false)}
                onDrop={onDrop}
                className={cn(
                    "flex-shrink-0 flex flex-col items-center justify-center gap-2 border border-dashed transition-all group relative",
                    isOver ? "bg-indigo-500/10 border-indigo-500 scale-105 shadow-2xl" : "border-white/10 hover:bg-white/5 hover:border-white/20",
                    className
                )}
            >
                <Plus size={16} className={cn("transition-all", isOver ? "text-indigo-400 scale-125" : "text-white/20 group-hover:text-white group-hover:scale-110")} />
                <span className={cn("text-[7px] font-black uppercase tracking-[0.2em] transition-all", isOver ? "text-indigo-400" : "text-white/10 group-hover:text-white/40")}>Agregar</span>
                {isOver && <div className="absolute inset-0 border-2 border-indigo-500 rounded-inherit animate-pulse" />}
            </button>
        );
    };

    const handleDeleteImage = useCallback(async (img: any) => {
        if (!window.confirm("¿Eliminar esta imagen permanentemente?")) return;
        
        setIsRefreshing(true);
        const res = await deleteImageAction(img.id, img.storage_path);
        if (res.success) {
            await loadTaskImages(draftId);
        } else {
            alert("Error al eliminar: " + res.error);
        }
        setIsRefreshing(false);
    }, [draftId, loadTaskImages]);

    const handleDownload = useCallback((url: string, title?: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${title || 'art'}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, []);

    const handleRegenerateIndividual = useCallback(async (img: GeneratedImage) => {
        const refinement = window.prompt("¿Cómo deseas mejorar esta imagen?", "Más realista, luz natural...");
        if (refinement === null) return;

        setStatus(ProcessingStatus.GENERATING_IMAGES);
        setStatusMessage("Regenerando activo...");

        try {
            const currentStyle = PRESET_STYLES.find(s => s.id === selectedStyleId);
            const res = await ImageWorkflowService.regenerateImage(img, {
                sourceModel: currentStyle?.model || sourceModel,
                optimizePrompt: optimizePrompt,
                useCustomSize: useCustomSize,
                customDimensions: { width: customWidth, height: customHeight },
                applyCustomToBody: applyCustomToBody,
                taskId: draftId,
                projectLogoUrl: activeProject?.logo_url
            }, refinement);

            if (res) {
                await loadTaskImages(draftId);
                setStatus(ProcessingStatus.COMPLETED);
                setStoreStatus("✅ Activo regenerado.");
            }
        } catch (e: any) {
            setError(e.message);
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, selectedStyleId, sourceModel, optimizePrompt, useCustomSize, customWidth, customHeight, applyCustomToBody, activeProject?.logo_url, loadTaskImages, setStoreStatus]);

    const handleDragStart = useCallback((e: React.DragEvent, img: any) => {
        e.dataTransfer.setData('application/nous-asset', JSON.stringify({
            id: img.id,
            url: img.url,
            alt: img.alt_text,
            type: img.type,
            storage_path: img.storage_path
        }));

        const ghost = document.createElement('div');
        ghost.style.width = '100px';
        ghost.style.height = '100px';
        ghost.style.borderRadius = '16px';
        ghost.style.overflow = 'hidden';
        ghost.style.opacity = '0.6';
        ghost.style.position = 'absolute';
        ghost.style.top = '-1000px';
        ghost.style.left = '-1000px';
        
        const dragImg = document.createElement('img');
        dragImg.src = img.url;
        dragImg.style.width = '100%';
        dragImg.style.height = '100%';
        dragImg.style.objectFit = 'cover';
        
        ghost.appendChild(dragImg);
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 50, 50);
        
        setTimeout(() => {
            if (document.body.contains(ghost)) {
                document.body.removeChild(ghost);
            }
        }, 0);
    }, []);

    const processGeneration = async () => {
        if (!draftId || !content) return;

        try {
            setError(null);
            setStatus(ProcessingStatus.READING_CONTENT);
            setStatusMessage("Analizando contenido...");

            const paragraphs = content.split(/<p>|<\/p>|\n\n/).filter((p: string) => p.trim() !== "");
            const currentStyle = PRESET_STYLES.find(s => s.id === selectedStyleId);
            const combinedInstructions = `${instructions} ${currentStyle?.suffix || ''}`.trim();

            const { images: finalImages } = await ImageWorkflowService.executeFullPipeline(paragraphs, {
                instructions: combinedInstructions,
                language: 'es',
                inlineImageCount,
                realismMode: currentStyle?.id === 'realism' ? 'hyperrealistic' : realismMode,
                sourceModel: currentStyle?.model || sourceModel,
                optimizePrompt,
                featuredRatio,
                useCustomSize,
                customDimensions: { width: customWidth, height: customHeight },
                applyCustomToBody,
                taskId: draftId,
                projectLogoUrl: activeProject?.logo_url,
                onStatusChange: (s, msg) => {
                    setStatus(s);
                    setStatusMessage(msg);
                },
                onImageGenerated: async () => {}
            }) as { images: GeneratedImage[] };

            await loadTaskImages(draftId);

            if (editor && finalImages.length > 0) {
                setStatusMessage("Ubicando artes en el contenido...");
                
                const inlines = finalImages
                    .filter(img => img.type === 'inline' && img.paragraphIndex != null)
                    .sort((a, b) => (b.paragraphIndex ?? 0) - (a.paragraphIndex ?? 0)); // Bottom-up to preserve positions

                // Build a map of block-level paragraph positions
                const paragraphPositions: { pos: number; endPos: number; index: number }[] = [];
                let blockIndex = 0;
                
                editor.view.state.doc.forEach((node: any, offset: number) => {
                    // Only count content blocks (paragraphs, headings, lists, etc.)
                    if (node.type.name === 'paragraph' || node.type.name === 'heading' || 
                        node.type.name === 'bulletList' || node.type.name === 'orderedList' ||
                        node.type.name === 'blockquote') {
                        paragraphPositions.push({
                            pos: offset,
                            endPos: offset + node.nodeSize,
                            index: blockIndex
                        });
                        blockIndex++;
                    }
                });

                console.log(`[MediaTab] Found ${paragraphPositions.length} blocks. Inserting ${inlines.length} images.`);

                // Insert images bottom-up to avoid position shifts
                for (const img of inlines) {
                    const targetBlock = paragraphPositions.find(p => p.index === img.paragraphIndex);
                    
                    if (targetBlock) {
                        const insertPos = targetBlock.endPos;
                        console.log(`[MediaTab] Inserting image "${img.title}" after block ${img.paragraphIndex} at pos ${insertPos}`);
                        
                        editor.chain()
                            .insertContentAt(insertPos, {
                                type: 'nousAsset',
                                attrs: {
                                    id: img.id,
                                    url: img.url,
                                    type: 'inline',
                                    alt: (img as any).alt_text || img.altText,
                                    title: img.title,
                                    prompt: img.prompt,
                                    width: '100%',
                                    align: 'center',
                                    storage_path: (img as any).storage_path
                                }
                            })
                            .run();
                    } else {
                        // Fallback: insert at the end of the document
                        console.warn(`[MediaTab] No block found for paragraphIndex ${img.paragraphIndex}. Appending at end.`);
                        editor.chain()
                            .focus('end')
                            .insertContent({
                                type: 'nousAsset',
                                attrs: {
                                    id: img.id,
                                    url: img.url,
                                    type: 'inline',
                                    alt: (img as any).alt_text || img.altText,
                                    title: img.title,
                                    prompt: img.prompt,
                                    width: '100%',
                                    align: 'center',
                                    storage_path: (img as any).storage_path
                                }
                            })
                            .run();
                    }
                }
            }

            setStatus(ProcessingStatus.COMPLETED);
            setStoreStatus("✅ Diseño completado.");

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error inesperado");
            setStatus(ProcessingStatus.ERROR);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white overflow-hidden font-outfit">
            
            <div className="w-full bg-slate-950 px-6 py-8 border-b border-white/5 flex gap-8 overflow-hidden items-end">
                
                {/* PORTADA / FEATURED SECTION (Fixed Square) */}
                <div className="flex-shrink-0 flex flex-col gap-3">
                    <div className="relative w-32 h-32 bg-white/5 group/featured overflow-hidden border border-white/5 shadow-2xl">
                        {/* FLOATING LABEL */}
                        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/90 text-white border border-white/20 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">
                            Portada
                        </div>

                        {taskImages.find((img: any) => img.type === 'featured') ? (
                            (() => {
                                const img = taskImages.find((img: any) => img.type === 'featured');
                                return (
                                    <>
                                        <img 
                                            src={img.url} 
                                            className="w-full h-full object-cover opacity-90 transition-all duration-700 group-hover/featured:scale-110 group-hover/featured:opacity-100" 
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/featured:opacity-100 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-[2px] z-10">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleRegenerateIndividual(img); }}
                                                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg scale-90 group-hover/featured:scale-100"
                                                title="Regenerar"
                                            >
                                                <Sparkles size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDownload(img.url, img.title); }}
                                                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all scale-90 group-hover/featured:scale-100"
                                                title="Descargar"
                                            >
                                                <Download size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDeleteImage(img); }}
                                                className="p-2 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white transition-all scale-90 group-hover/featured:scale-100"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setFullscreenImage(img); }}
                                                className="p-2 rounded-xl bg-white text-slate-900 hover:bg-indigo-50 transition-all shadow-lg scale-90 group-hover/featured:scale-100"
                                                title="Pantalla Completa"
                                            >
                                                <Maximize2 size={14} />
                                            </button>
                                        </div>

                                    </>
                                );
                            })()
                        ) : (
                            <AddPlaceholder type="featured" className="w-full h-full rounded-2xl" />
                        )}
                    </div>
                </div>

                {/* CUERPO / INLINE SECTION (Scrollable flex row) */}
                <div className="flex-1 min-w-0 flex flex-col gap-3 relative">
                    {/* FLOATING LABEL FIXED AT START */}
                    <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/90 text-emerald-400 border border-emerald-500/30 rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl">
                        Cuerpo
                    </div>

                    <div className="flex gap-4 overflow-x-auto custom-scrollbar-dark pb-1 pr-10 scroll-smooth h-32 items-end">
                        <AnimatePresence>
                            {taskImages.filter((img: any) => img.type !== 'featured').map((img: any) => (
                                <ImageThumb 
                                    key={img.id} 
                                    img={img} 
                                    handleDragStart={handleDragStart} 
                                    handleRegenerateIndividual={handleRegenerateIndividual} 
                                    handleDownload={handleDownload} 
                                    handleDeleteImage={handleDeleteImage}
                                    onFullscreen={(asset: any) => setFullscreenImage(asset)}
                                />
                            ))}
                        </AnimatePresence>


                        {/* CUERPO PLACEHOLDER ALWAYS AT THE END */}
                         <AddPlaceholder type="inline" className="w-32 h-32 rounded-2xl" />
                    </div>

                    {/* REFRESH OVERLAY-ISH BUTTON */}
                    <div className="absolute right-0 bottom-1 flex items-center gap-2">
                        <button 
                            onClick={handleRefresh}
                            className={cn(
                                "p-2 rounded-full bg-slate-900 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all shadow-xl",
                                isRefreshing && "animate-spin text-indigo-400"
                            )}
                        >
                            <RefreshCcw size={12} />
                        </button>
                    </div>
                </div>

            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8 space-y-10">
                
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Dirección de Arte</label>
                         <div className="relative group/style">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-100 transition-all flex shrink-0">
                                <span className="text-[9px] font-black text-indigo-600 uppercase">
                                    {PRESET_STYLES.find(s => s.id === selectedStyleId)?.label}
                                </span>
                                <ChevronDown size={10} className="text-indigo-400" />
                            </div>
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 opacity-0 invisible group-hover/style:opacity-100 group-hover/style:visible transition-all z-50">
                                {PRESET_STYLES.map(style => (
                                    <button
                                        key={style.id}
                                        onClick={() => setSelectedStyleId(style.id)}
                                        className={cn(
                                            "w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors",
                                            selectedStyleId === style.id ? "bg-indigo-50 text-indigo-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                        )}
                                    >
                                        {style.label}
                                    </button>
                                ))}
                            </div>
                         </div>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            placeholder="Desribe el mood, colores o elementos específicos..."
                            className="w-full bg-white border-b-2 border-slate-100 py-3 text-xs font-medium focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300"
                        />
                        <div className="absolute right-0 bottom-3 flex items-center gap-2 text-[9px] font-black text-indigo-600/40 uppercase">
                            <Sparkles size={10} />
                            Enfocado
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-12 pt-4">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <Zap size={14} className={optimizePrompt ? 'text-amber-500' : 'text-slate-300'} />
                                Optimizar con IA
                            </div>
                            <button 
                                onClick={() => setOptimizePrompt(!optimizePrompt)}
                                className={cn("w-9 h-5 rounded-full p-1 transition-all", optimizePrompt ? "bg-indigo-600" : "bg-slate-200")}
                            >
                                <motion.div animate={{ x: optimizePrompt ? 16 : 0 }} className="w-3 h-3 bg-white rounded-full shadow-sm" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between group">
                            <div className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                <Maximize2 size={14} className={useCustomSize ? 'text-indigo-500' : 'text-slate-300'} />
                                Dimensiones Custom
                            </div>
                            <button 
                                onClick={() => setUseCustomSize(!useCustomSize)}
                                className={cn("w-9 h-5 rounded-full p-1 transition-all", useCustomSize ? "bg-indigo-600" : "bg-slate-200")}
                            >
                                <motion.div animate={{ x: useCustomSize ? 16 : 0 }} className="w-3 h-3 bg-white rounded-full shadow-sm" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {useCustomSize ? (
                            <div className="flex items-center gap-3">
                                <input 
                                    type="number" value={customWidth} onChange={(e) => setCustomWidth(parseInt(e.target.value) || 256)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-700 text-center"
                                />
                                <span className="text-slate-300">×</span>
                                <input 
                                    type="number" value={customHeight} onChange={(e) => setCustomHeight(parseInt(e.target.value) || 256)}
                                    className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-[10px] font-bold text-slate-700 text-center"
                                />
                            </div>
                        ) : (
                             <div className="flex items-center gap-3">
                                <select 
                                    value={inlineImageCount} onChange={(e) => setInlineImageCount(e.target.value === 'auto' ? 'auto' : parseInt(e.target.value))}
                                    className="flex-1 bg-slate-50 border-none rounded-xl p-2.5 text-[9px] font-black uppercase text-slate-600 outline-none"
                                >
                                    <option value="auto">Apoyo: Auto</option>
                                    <option value={1}>1 Imagen</option>
                                    <option value={2}>2 Imágenes</option>
                                </select>
                                <select 
                                    value={featuredRatio} onChange={(e) => setFeaturedRatio(e.target.value as AspectRatio)}
                                    className="flex-1 bg-slate-50 border-none rounded-xl p-2.5 text-[9px] font-black uppercase text-slate-600 outline-none"
                                >
                                    <option value="16:9">Ratio: 16:9</option>
                                    <option value="1:1">Ratio: 1:1</option>
                                    <option value="4:3">Ratio: 4:3</option>
                                </select>
                             </div>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Motor: Turbo / Flux</span>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-emerald-600 uppercase">Online</span>
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3">
                        <AlertCircle className="text-rose-500 shrink-0" size={14} />
                        <p className="text-[9px] text-rose-600 font-bold uppercase tracking-tight">{error}</p>
                    </motion.div>
                )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-white/50 backdrop-blur-xl">
                {status !== ProcessingStatus.IDLE && status !== ProcessingStatus.COMPLETED && status !== ProcessingStatus.ERROR ? (
                    <div className="bg-indigo-50/50 rounded-2xl p-4 flex items-center gap-4 border border-indigo-100/50">
                        <Loader2 className="animate-spin text-indigo-600" size={18} />
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-indigo-900 uppercase tracking-widest mb-1.5">{statusMessage}</p>
                            <div className="w-full h-1 bg-indigo-100/50 rounded-full overflow-hidden">
                                <motion.div className="h-full bg-indigo-600" animate={{ x: [-200, 200] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        {taskImages.length > 0 ? (
                            <>
                                <button
                                    onClick={processGeneration}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-white border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <RefreshCcw size={14} />
                                    Regenerar
                                </button>
                                <button
                                    onClick={processGeneration}
                                    className="flex-[1.5] py-4 px-6 rounded-2xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
                                >
                                    <Plus size={14} />
                                    Generar Más
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={processGeneration}
                                disabled={!draftId || !content}
                                className={cn(
                                    "w-full py-5 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl group",
                                    !draftId || !content 
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                                        : "bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 shadow-emerald-500/20"
                                )}
                            >
                                <Sparkles size={18} className="group-hover:animate-pulse" />
                                <span className="text-[11px] font-black uppercase tracking-widest italic tracking-wider">
                                    Diseñar Imágenes con Nous
                                </span>
                            </button>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .custom-scrollbar-dark::-webkit-scrollbar {
                    height: 4px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar-dark::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>

            {fullscreenImage && (
                <ImageLightbox 
                    isOpen={!!fullscreenImage}
                    onClose={() => setFullscreenImage(null)}
                    url={fullscreenImage.url}
                    title={fullscreenImage.title || (fullscreenImage.type === 'featured' ? 'Portada Magistral' : 'Sugerencia Contextual')}
                    alt={fullscreenImage.alt_text}
                    prompt={fullscreenImage.prompt}
                    assetId={fullscreenImage.id}
                    onDelete={() => handleDeleteImage(fullscreenImage)}
                    onRegenerate={(e) => handleRegenerateIndividual(fullscreenImage)}
                />
            )}
        </div>

    );
}
