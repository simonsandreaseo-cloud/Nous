'use client';

import React, { useState, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
    Sparkles, 
    Image as ImageIcon, 
    AlignLeft, 
    AlignCenter, 
    AlignRight,
    X,
    Trash2,
    Maximize2,
    Layout,
    Download,
    Maximize,
    RefreshCcw,
    Type,
    WrapText,
    AlignJustify,
    BetweenVerticalEnd,
    Layers,
    BringToFront,
    Square,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { saveAs } from 'file-saver';
import ImageLightbox from './modals/ImageLightbox';
import { useWriterStore } from '@/store/useWriterStore';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { uploadGeneratedImage, deleteImageAction } from '@/lib/actions/imageActions';

export default function NousAssetNodeView(props: any) {
    const { node, deleteNode, updateAttributes } = props;
    const { url, alt, title, prompt, type, id, width, height, align, wrapping, status, semanticAnchor } = node.attrs;

    const [isResizing, setIsResizing] = useState(false);
    const [resizerWidth, setResizerWidth] = useState(width);
    const [showMenu, setShowMenu] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    
    const { loadTaskImages, draftId } = useWriterStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    // Sync local state
    useEffect(() => {
        setResizerWidth(width);
    }, [width]);

    // --- MOUSE RESIZING ---
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        setIsResizing(true);
        startX.current = clientX;
        if (containerRef.current) {
            startWidth.current = containerRef.current.offsetWidth;
        }

        const onMove = (moveEvent: MouseEvent | TouchEvent) => {
            const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const deltaX = currentX - startX.current;
            const newWidth = Math.max(100, startWidth.current + deltaX);
            setResizerWidth(`${newWidth}px`);
        };

        const onEnd = () => {
            setIsResizing(false);
            if (containerRef.current) {
                updateAttributes({ 
                    width: `${containerRef.current.offsetWidth}px`,
                    height: 'auto'
                });
            }
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onEnd);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove);
        window.addEventListener('touchend', onEnd);
    };

    const containerStyle: React.CSSProperties = {
        width: resizerWidth,
        maxWidth: '100%',
        marginTop: '0',
        marginBottom: '0',
        marginLeft: align === 'center' ? 'auto' : (align === 'right' ? '2.5rem' : '0'),
        marginRight: align === 'center' ? 'auto' : (align === 'left' ? '2.5rem' : '0'),
        float: align === 'left' ? 'left' : align === 'right' ? 'right' : undefined,
    };

    const presets = [
        { label: 'S', value: '25%' },
        { label: 'M', value: '50%' },
        { label: 'L', value: '75%' },
        { label: 'XL', value: '100%' }
    ];

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        saveAs(url, `${title || 'nous-asset'}.jpg`);
    };

    const handleRegenerate = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isRegenerating) return;
        setIsRegenerating(true);
        try {
            const taskId = node.attrs.id.split('_')[0] || 'manual'; // Fallback logic
            // In a real scenario, we'd hit the API again with the same prompt but balanced settings
            const newUrl = PollinationsService.generateImageUrl(prompt, {
                model: 'grok-imagine-pro',
                width: 1024,
                height: 1024,
                seed: Math.floor(Math.random() * 1000000)
            });
            
            // Re-upload and update with specific pixel dimensions
            const res = await uploadGeneratedImage({
                url: newUrl,
                taskId: draftId || id.split('_')[0], 
                imageId: id,
                prompt,
                altText: alt,
                title,
                type: type === 'featured' ? 'featured' : 'inline',
                width: node.attrs.pixelWidth || 800,
                height: node.attrs.pixelHeight || 450,
                projectId: useWriterStore.getState().projectId || undefined
            });

            if (res.success) {
                updateAttributes({ url: res.publicUrl });
            }
        } catch (err) {
            console.error("Regeneration failed", err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleAbsoluteDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm("¿Eliminar esta imagen permanentemente del sistema?")) return;
        
        try {
            const taskId = node.attrs.id.split('_')[0] || 'manual';
            const storagePath = node.attrs.storage_path || `tasks/${taskId}/${id}.jpg`;
            const res = await deleteImageAction(id, storagePath);
            
            if (res.success) {
                deleteNode();
            } else {
                alert("Error al eliminar de la base de datos: " + res.error);
            }
        } catch (err) {
            console.error(err);
            alert("Error crítico al eliminar.");
        }
    };

    // Determine wrapping styles
    const wrappingStyles = React.useMemo(() => {
        switch (wrapping) {
            case 'inline': 
                return "inline-block align-middle mx-2 my-1";
            case 'wrap': 
                return align === 'right' ? "float-right ml-6 mb-4" : "float-left mr-6 mb-4";
            case 'behind':
                return "absolute -z-10 opacity-80 pointer-events-none";
            case 'front':
                return "absolute z-50 shadow-2xl";
            case 'break':
            default:
                return "block mx-auto clear-both";
        }
    }, [wrapping, align]);

    return (
        <NodeViewWrapper 
            className={cn(
                "nous-asset-node py-4 group/node relative",
                wrappingStyles,
                align === 'center' && wrapping !== 'wrap' && "w-full flex justify-center",
                align === 'full' && "w-full"
            )}
        >
                <motion.div 
                    ref={containerRef}
                    style={containerStyle}
                    layout
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className={cn(
                        "group relative transition-shadow duration-500",
                        showMenu && "z-[100]",
                        status === 'ghost' && "opacity-60 grayscale-[0.5] saturate-50 ring-4 ring-indigo-400/30 ring-offset-4"
                    )}
                    onClick={() => setShowMenu(!showMenu)}
                >

                {/* FLOATING ACTION OVERLAYS */}
                <AnimatePresence>
                    {(showMenu || isResizing) && (
                        <div className="absolute inset-0 pointer-events-none z-[110]">
                            {/* FULLSCREEN BUTTON - TOP RIGHT */}
                            <motion.button 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }}
                                className="absolute top-4 right-4 p-3 bg-black/80 backdrop-blur-md text-white rounded-2xl border border-white/20 shadow-2xl pointer-events-auto hover:bg-black hover:scale-110 transition-all z-20"
                                title="Pantalla Completa"
                            >
                                <Maximize2 size={24} />
                            </motion.button>

                                 {/* PORTADA LABEL - HTML TAG STYLE */}
                                 {type === 'featured' && (
                                     <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/90 text-white border border-white/20 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
                                         Portada Magistral
                                     </div>
                                 )}

                                 {status === 'ghost' && (
                                     <div className="absolute top-4 right-4 z-20 px-3 py-1 bg-indigo-600 text-white border border-indigo-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl animate-pulse">
                                         Sugerencia Ghost
                                     </div>
                                 )}

                        </div>
                    )}
                </AnimatePresence>

                {/* CONSOLIDATED 2-ROW PREMIUM TOOLBAR */}
                <AnimatePresence>
                    {(showMenu || isResizing) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            animate={{ opacity: 1, y: -24, scale: 1, x: "-50%" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute -top-12 left-1/2 z-[200] min-w-[320px]"
                        >
                            <div className="flex flex-col gap-2 p-3 bg-slate-950/95 backdrop-blur-3xl rounded-[1.8rem] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.6)]">
                                
                                 {/* ROW 1: SIZES & MAIN ACTIONS */}
                                 <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/5">
                                     {/* Predefined Sizes (Left) */}
                                     <div className="flex items-center gap-1 px-1">
                                         {presets.map(p => (
                                             <button 
                                                 key={p.value}
                                                 onClick={(e) => { e.stopPropagation(); updateAttributes({ width: p.value }); }}
                                                 className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-black transition-all hover:bg-white/10 group-hover:scale-105", width === p.value ? 'bg-white text-slate-950 shadow-lg shadow-white/20' : 'text-slate-500')}
                                             >
                                                 {p.label}
                                             </button>
                                         ))}
                                     </div>
                                     
                                     <div className="flex items-center gap-1 pr-1">
                                         {status === 'ghost' && (
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); updateAttributes({ status: 'final' }); }}
                                                 className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/40"
                                                 title="Aceptar esta imagen en el artículo"
                                             >
                                                 <CheckCircle2 size={16} />
                                                 <span className="text-[10px] font-black uppercase tracking-wider">Aceptar</span>
                                             </button>
                                         )}
                                         <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 mx-2">
                                             <div className="flex flex-col">
                                                 <span className="text-[7px] font-black text-slate-500 uppercase">Ancho</span>
                                                 <input type="number" value={node.attrs.pixelWidth || 800} onChange={(e) => updateAttributes({ pixelWidth: parseInt(e.target.value) })} className="w-12 bg-transparent border-none text-[10px] font-black text-white p-0 focus:ring-0" />
                                             </div>
                                             <span className="text-slate-700 text-[10px]">×</span>
                                             <div className="flex flex-col">
                                                 <span className="text-[7px] font-black text-slate-500 uppercase">Alto</span>
                                                 <input type="number" value={node.attrs.pixelHeight || 450} onChange={(e) => updateAttributes({ pixelHeight: parseInt(e.target.value) })} className="w-12 bg-transparent border-none text-[10px] font-black text-white p-0 focus:ring-0" />
                                             </div>
                                         </div>
                                         <button onClick={handleAbsoluteDelete} className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all hover:scale-110" title="Eliminar permanentemente">
                                             <Trash2 size={18} />
                                         </button>
                                         <button onClick={handleRegenerate} disabled={isRegenerating} className={cn("p-2.5 rounded-xl transition-all hover:scale-110", isRegenerating ? "animate-spin text-indigo-400" : "text-indigo-400 hover:bg-indigo-500/10")} title="Regenerar con IA">
                                             <RefreshCcw size={18} />
                                         </button>
                                         <button onClick={handleDownload} className="p-2.5 text-slate-300 hover:bg-white/10 rounded-xl transition-all hover:scale-110" title="Descargar">
                                             <Download size={18} />
                                         </button>
                                         <button onClick={(e) => { e.stopPropagation(); deleteNode(); }} className="p-2.5 text-orange-400 hover:bg-orange-500/10 rounded-xl transition-all hover:scale-110" title="Quitar del editor">
                                             <X size={18} />
                                         </button>
                                     </div>
                                  </div>
                                  
                                 {/* ROW 2: ALIGNMENT & WRAPPING */}

                                <div className="flex items-center justify-between gap-4">
                                    {/* Alignment (Left) */}
                                    <div className="flex items-center gap-1">
                                        {[
                                            { val: 'left', icon: AlignLeft, label: 'Alinear Izquierda' },
                                            { val: 'center', icon: AlignCenter, label: 'Centrar' },
                                            { val: 'right', icon: AlignRight, label: 'Alinear Derecha' },
                                            { val: 'full', icon: Maximize, label: 'Ancho Total' }
                                        ].map(item => (
                                            <button 
                                                key={item.val}
                                                onClick={(e) => { e.stopPropagation(); updateAttributes({ align: item.val }); }}
                                                className={cn("p-2.5 rounded-xl transition-all hover:scale-110", align === item.val ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40' : 'text-slate-400 hover:bg-white/5')}
                                                title={item.label}
                                            >
                                                <item.icon size={18} />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Wrapping Options (Right) - Google Docs Style */}
                                    <div className="flex items-center gap-1">
                                        {[
                                            { val: 'inline', icon: WrapText, label: 'Intercalar' },
                                            { val: 'wrap', icon: AlignJustify, label: 'Ajustar Texto' },
                                            { val: 'break', icon: BetweenVerticalEnd, label: 'Separar Texto' },
                                            { val: 'behind', icon: Layers, label: 'Detrás del Texto' },
                                            { val: 'front', icon: BringToFront, label: 'Encima del Texto' }
                                        ].map(item => (
                                            <button 
                                                key={item.val}
                                                onClick={(e) => { e.stopPropagation(); updateAttributes({ wrapping: item.val }); }}
                                                className={cn("p-2.5 rounded-xl transition-all hover:scale-110", wrapping === item.val ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/40' : 'text-slate-400 hover:bg-white/5')}
                                                title={item.label}
                                            >
                                                <item.icon size={18} />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MAIN ASSET VISUAL */}
                <div className={cn(
                    "relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl transition-all duration-500",
                    isResizing && "ring-4 ring-indigo-500/50 scale-[1.01] shadow-indigo-500/20"
                )}>
                    {/* Visual Canvas */}
                    <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                        {url ? (
                            <img 
                                src={url.includes('pollinations.ai') ? `${url}${url.includes('?') ? '&' : '?'}width=800&height=450&nologo=true` : url} 
                                alt={alt || 'Nous Asset'} 
                                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-800">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                                    <ImageIcon size={48} strokeWidth={1} />
                                </motion.div>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">IA Engine Processing...</span>
                            </div>
                        )}
                        
                        {/* Overlay Badges */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
                                <Sparkles size={11} className="text-indigo-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                    {type === 'featured' ? 'Portada Magistral' : 'Sugerencia Contextual'}
                                </span>
                            </div>
                        </div>

                        {/* Prompt Peek (Bottom bar) */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                             <p className="text-[10px] text-white/70 font-medium italic line-clamp-1">{prompt}</p>
                        </div>
                    </div>

                    {/* RESIZE HANDLES (Visible on hover or resize) */}
                    <div 
                        onMouseDown={handleResizeStart}
                        onTouchStart={handleResizeStart}
                        className="absolute bottom-3 right-3 w-10 h-10 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl hover:bg-white hover:text-indigo-600 group-active:scale-95 z-[110]"
                    >
                        <Maximize2 size={16} className="rotate-90 pointer-events-none" />
                    </div>
                </div>

                {/* DIMENSIONS HUD */}
                {isResizing && containerRef.current && (
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-[10px] font-black px-4 py-2 rounded-2xl shadow-2xl border border-slate-100 flex items-center gap-3">
                        <Layout size={12} className="text-indigo-500" />
                        <span>{containerRef.current.offsetWidth}px</span>
                        <span className="text-slate-300">×</span>
                        <span>{containerRef.current.offsetHeight}px</span>
                        <span className="ml-2 py-0.5 px-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                            {Math.round((containerRef.current.offsetWidth / (containerRef.current.parentElement?.offsetWidth || 1)) * 100)}%
                        </span>
                    </div>
                )}
            </motion.div>

            <ImageLightbox 
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                url={url}
                title={title || (type === 'featured' ? 'Portada Magistral' : 'Sugerencia Contextual')}
                alt={alt}
                prompt={prompt}
                assetId={id}
                onDelete={deleteNode}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
            />
        </NodeViewWrapper>
    );
}

