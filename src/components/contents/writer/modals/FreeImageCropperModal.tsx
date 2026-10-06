'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Crop as CropIcon, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FreeImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64: string) => void;
    imageUrl: string;
}

// Helper para convertir el canvas recortado a base64
function getCroppedImg(image: HTMLImageElement, crop: PixelCrop): string {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = crop.width;
    canvas.height = crop.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Pixel ratio para mayor calidad en pantallas retina
    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    return canvas.toDataURL('image/webp', 0.9);
}

export default function FreeImageCropperModal({
    isOpen,
    onClose,
    onSave,
    imageUrl
}: FreeImageCropperModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);

    // Reiniciar estado al abrir
    useEffect(() => {
        if (isOpen) {
            setCrop(undefined);
            setCompletedCrop(undefined);
            setAspect(undefined);
        }
    }, [isOpen]);

    const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // Definir un recorte inicial por defecto centrado al cargar la imagen
        const initialCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 90,
                },
                width / height, // Use initial aspect to just be a 90% square roughly
                width,
                height
            ),
            width,
            height
        );
        setCrop(initialCrop);
    };

    const handleSave = () => {
        if (completedCrop?.width && completedCrop?.height && imgRef.current) {
            const base64 = getCroppedImg(imgRef.current, completedCrop);
            onSave(base64);
        } else {
            // Si no movió nada, pero le dio a guardar
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-5xl bg-[#1a1b23] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full max-h-[85vh]"
                >
                    {/* Botón cerrar */}
                    <button 
                        onClick={onClose}
                        className="absolute top-6 right-6 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* Editor (Centro) */}
                    <div className="flex-1 relative bg-black/50 overflow-hidden flex items-center justify-center p-4 md:p-8">
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspect}
                            className="max-h-full max-w-full outline-none"
                        >
                            <img
                                ref={imgRef}
                                alt="Crop Preview"
                                src={imageUrl}
                                onLoad={onImageLoad}
                                crossOrigin="anonymous"
                                className="max-h-[70vh] w-auto object-contain"
                            />
                        </ReactCrop>
                    </div>

                    {/* Sidebar de Herramientas */}
                    <div className="w-full md:w-80 bg-[#1a1b23] border-t md:border-t-0 md:border-l border-white/10 flex flex-col p-6 shrink-0 z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                <CropIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Recorte Libre</h3>
                                <p className="text-slate-400 text-xs">Ajusta la imagen a medida</p>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-6">
                            {/* Proporciones predefinidas */}
                            <div>
                                <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 block">Proporción (Aspect Ratio)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={() => setAspect(undefined)}
                                        className={cn("px-4 py-2 text-sm font-medium rounded-xl border transition-all", !aspect ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10')}
                                    >
                                        Libre
                                    </button>
                                    <button 
                                        onClick={() => setAspect(1)}
                                        className={cn("px-4 py-2 text-sm font-medium rounded-xl border transition-all", aspect === 1 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10')}
                                    >
                                        1:1 (Cuadrado)
                                    </button>
                                    <button 
                                        onClick={() => setAspect(16 / 9)}
                                        className={cn("px-4 py-2 text-sm font-medium rounded-xl border transition-all", aspect === 16 / 9 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10')}
                                    >
                                        16:9 (Horizontal)
                                    </button>
                                    <button 
                                        onClick={() => setAspect(9 / 16)}
                                        className={cn("px-4 py-2 text-sm font-medium rounded-xl border transition-all", aspect === 9 / 16 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10')}
                                    >
                                        9:16 (Vertical)
                                    </button>
                                    <button 
                                        onClick={() => setAspect(4 / 3)}
                                        className={cn("px-4 py-2 text-sm font-medium rounded-xl border transition-all", aspect === 4 / 3 ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-transparent text-slate-300 hover:bg-white/10')}
                                    >
                                        4:3 (Clásico)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleSave}
                            className="mt-auto w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-900/20"
                        >
                            <Check size={18} />
                            Aplicar Recorte
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
