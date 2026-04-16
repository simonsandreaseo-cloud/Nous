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
    CheckCircle2,
    WrapText,
    AlignJustify,
    BetweenVerticalEnd,
    Layers,
    BringToFront
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { saveAs } from 'file-saver';
import ImageLightbox from './modals/ImageLightbox';
import { useImageManager } from '@/hooks/useImageManager';
import { AssetAlignment, AssetWrapping } from '@/types/images';

export default function NousAssetNodeView(props: any) {
    const { node, deleteNode, updateAttributes } = props;
    
    // Destructuración basada en el nuevo modelo ImageAsset (aplanado para Tiptap)
    const { 
        id, url, alt, title, prompt, status, 
        role, semanticAnchor, 
        width, align, wrapping, aspectRatio 
    } = node.attrs;

    const [isResizing, setIsResizing] = useState(false);
    const [resizerWidth, setResizerWidth] = useState(width || '100%');
    const [showMenu, setShowMenu] = useState(false);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    
    const { actions, state } = useImageManager();
    const isRegenerating = state.status === 'GENERATING_IMAGES' && state.selectedAssetId === id;
    
    const containerRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startWidth = useRef(0);

    // Sincronización del estado local de redimensionado
    useEffect(() => {
        setResizerWidth(width || '100%');
    }, [width]);

    // --- LÓGICA DE REDIMENSIONADO ---
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

    // --- SCREAMING HTML (Estilos Inline para Portabilidad) ---
    const containerStyle: React.CSSProperties = {
        width: resizerWidth,
        maxWidth: '100%',
        display: align === 'full' ? 'block' : 'inline-block',
        marginLeft: align === 'center' ? 'auto' : (align === 'right' ? '1.5rem' : '0'),
        marginRight: align === 'center' ? 'auto' : (align === 'left' ? '1.5rem' : '0'),
        float: wrapping === 'wrap' ? (align === 'right' ? 'right' : 'left') : undefined,
        clear: wrapping === 'break' ? 'both' : undefined,
    };

    const presets = [
        { label: 'S', value: '25%' },
        { label: 'M', value: '50%' },
        { label: 'L', value: '75%' },
        { label: 'XL', value: '100%' }
    ];

    return (
        <NodeViewWrapper 
            className={cn(
                "nous-asset-node py-4 group/node relative",
                align === 'center' && wrapping !== 'wrap' && "w-full flex justify-center",
                align === 'full' && "w-full"
            )}
        >
            <motion.div 
                ref={containerRef}
                style={containerStyle}
                layout
                className={cn(
                    "group relative transition-shadow duration-500",
                    showMenu && "z-[100]",
                    status === 'ghost' && "opacity-60 grayscale-[0.5] ring-4 ring-indigo-400/30"
                )}
                onClick={() => setShowMenu(!showMenu)}
            >
                {/* TOOLBAR FLOTANTE DE ALTA FIDELIDAD */}
                <AnimatePresence>
                    {(showMenu || isResizing) && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                            animate={{ opacity: 1, y: -24, scale: 1, x: "-50%" }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute -top-12 left-1/2 z-[200] min-w-[320px]"
                        >
                            <div className="flex flex-col gap-2 p-3 bg-slate-950/95 backdrop-blur-3xl rounded-[1.8rem] border border-white/10 shadow-2xl">
                                
                                 {/* FILA 1: TAMAÑOS Y ACCIONES CRÍTICAS */}
                                 <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/5">
                                     <div className="flex items-center gap-1 px-1">
                                         {presets.map(p => (
                                             <button 
                                                 key={p.value}
                                                 onClick={(e) => { e.stopPropagation(); updateAttributes({ width: p.value }); }}
                                                 className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-[9px] font-black transition-all hover:bg-white/10", width === p.value ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500')}
                                             >
                                                 {p.label}
                                             </button>
                                         ))}
                                     </div>
                                     
                                     <div className="flex items-center gap-1 pr-1">
                                         {status === 'ghost' && (
                                             <button 
                                                 onClick={(e) => { e.stopPropagation(); updateAttributes({ status: 'final' }); }}
                                                 className="p-2 bg-emerald-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all"
                                             >
                                                 <CheckCircle2 size={16} />
                                             </button>
                                         )}
                                         <button 
                                            onClick={(e) => { e.stopPropagation(); actions.handleGenerateAsset(id); }} 
                                            disabled={isRegenerating}
                                            className={cn("p-2.5 rounded-xl transition-all", isRegenerating ? "animate-spin text-indigo-400" : "text-indigo-400 hover:bg-white/5")}
                                         >
                                             <RefreshCcw size={18} />
                                         </button>
                                         <button onClick={(e) => { e.stopPropagation(); actions.handleDeleteAsset(id, node.attrs.storage_path); }} className="p-2.5 text-rose-500 hover:bg-white/5 rounded-xl">
                                             <Trash2 size={18} />
                                         </button>
                                         <button onClick={(e) => { e.stopPropagation(); setIsLightboxOpen(true); }} className="p-2.5 text-slate-300 hover:bg-white/5 rounded-xl">
                                             <Maximize2 size={18} />
                                         </button>
                                     </div>
                                  </div>
                                  
                                 {/* FILA 2: ALINEACIÓN Y WRAPPING */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-1">
                                        {[
                                            { val: 'left', icon: AlignLeft },
                                            { val: 'center', icon: AlignCenter },
                                            { val: 'right', icon: AlignRight },
                                            { val: 'full', icon: Maximize }
                                        ].map(item => (
                                            <button 
                                                key={item.val}
                                                onClick={(e) => { e.stopPropagation(); updateAttributes({ align: item.val }); }}
                                                className={cn("p-2.5 rounded-xl transition-all", align === item.val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5')}
                                            >
                                                <item.icon size={18} />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {[
                                            { val: 'inline', icon: WrapText },
                                            { val: 'wrap', icon: AlignJustify },
                                            { val: 'break', icon: BetweenVerticalEnd },
                                            { val: 'behind', icon: Layers },
                                            { val: 'front', icon: BringToFront }
                                        ].map(item => (
                                            <button 
                                                key={item.val}
                                                onClick={(e) => { e.stopPropagation(); updateAttributes({ wrapping: item.val }); }}
                                                className={cn("p-2.5 rounded-xl transition-all", wrapping === item.val ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-white/5')}
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

                {/* VISUAL PRINCIPAL DEL ACTIVO */}
                <div className={cn(
                    "relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/5 shadow-2xl transition-all duration-500",
                    isResizing && "ring-4 ring-indigo-500/50 scale-[1.01]"
                )}>
                    <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                        {url ? (
                            <img 
                                src={url} 
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
                        
                        {/* BADGES EDITORIALES */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
                                <Sparkles size={11} className="text-indigo-400" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/90">
                                    {role === 'hero' ? 'Portada Magistral' : role.toUpperCase()}
                                </span>
                            </div>
                            {semanticAnchor && (
                                <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/5 text-[8px] text-white/60 font-medium italic">
                                    Anclada a: &quot;{semanticAnchor.slice(0, 30)}...&quot;
                                </div>
                            )}
                        </div>
                    </div>

                    {/* MANEJADOR DE REDIMENSIONADO NWSE */}
                    <div 
                        onMouseDown={handleResizeStart}
                        onTouchStart={handleResizeStart}
                        className="absolute bottom-3 right-3 w-10 h-10 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 hover:bg-white hover:text-indigo-600 z-[110]"
                    >
                        <Maximize2 size={16} className="rotate-90 pointer-events-none" />
                    </div>
                </div>
            </motion.div>

            <ImageLightbox 
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                url={url}
                title={title || (role === 'hero' ? 'Portada Magistral' : 'Activo Editorial')}
                alt={alt}
                prompt={prompt}
                assetId={id}
                onDelete={() => actions.handleDeleteAsset(id, node.attrs.storage_path)}
                onRegenerate={() => actions.handleGenerateAsset(id)}
                isRegenerating={isRegenerating}
            />
        </NodeViewWrapper>
    );
}
