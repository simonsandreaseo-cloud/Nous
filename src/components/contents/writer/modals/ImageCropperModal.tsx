'use client';

import React, { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ZoomIn, Pipette, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64: string) => void;
    originalBase64: string;
    targetWidth: number;
    targetHeight: number;
}

export default function ImageCropperModal({
    isOpen,
    onClose,
    onSave,
    originalBase64,
    targetWidth,
    targetHeight
}: ImageCropperModalProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [bgColor, setBgColor] = useState('#ffffff');
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);

    // Initial scale calculation to fit the image sensibly within the crop area
    useEffect(() => {
        if (!originalBase64 || !isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            setBgColor('#ffffff');
            setImageLoaded(false);
            return;
        }

        const img = new Image();
        img.onload = () => {
            setImgSize({ w: img.width, h: img.height });
            
            // Calculate a default scale so the image covers the target area reasonably well
            const scaleX = targetWidth / img.width;
            const scaleY = targetHeight / img.height;
            // Let's make it cover the smallest dimension initially so it fills
            const coverScale = Math.max(scaleX, scaleY);
            setScale(coverScale);
            
            setImageLoaded(true);
        };
        img.src = originalBase64;
    }, [originalBase64, targetWidth, targetHeight, isOpen]);

    // Handle Dragging
    const handleDragStart = (e: ReactMouseEvent | ReactTouchEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setDragStart({ x: clientX - position.x, y: clientY - position.y });
    };

    const handleDragMove = (e: ReactMouseEvent | ReactTouchEvent) => {
        if (!isDragging) return;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        });
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    const handleEyeDropper = async () => {
        if (!('EyeDropper' in window)) {
            alert('Tu navegador no soporta el cuentagotas nativo. Usa el selector de color regular.');
            return;
        }
        try {
            const eyeDropper = new (window as any).EyeDropper();
            const result = await eyeDropper.open();
            setBgColor(result.sRGBHex);
        } catch (e) {
            console.log('User canceled the eyedropper');
        }
    };

    const handleSave = () => {
        if (!imgRef.current || !containerRef.current) return;

        // 1. Create a canvas of the EXACT target dimensions
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 2. Fill with the chosen background color
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // 3. Draw the image
        // We know the container's visual size vs the target size.
        const containerRect = containerRef.current.getBoundingClientRect();
        
        // The ratio between the actual target size and the visual container size
        const ratioX = targetWidth / containerRect.width;
        const ratioY = targetHeight / containerRect.height;

        // Let's assume the center of the canvas is (targetWidth/2, targetHeight/2)
        const centerX = targetWidth / 2;
        const centerY = targetHeight / 2;

        // The image's native dimensions scaled
        const drawWidth = imgSize.w * scale;
        const drawHeight = imgSize.h * scale;

        // The translation in pixels applied by the user in the visual DOM.
        // We must scale the DOM translation to the Canvas coordinates.
        const translatedX = position.x * ratioX;
        const translatedY = position.y * ratioY;

        // Top left corner to start drawing
        const drawX = centerX - (drawWidth / 2) + translatedX;
        const drawY = centerY - (drawHeight / 2) + translatedY;

        ctx.drawImage(imgRef.current, drawX, drawY, drawWidth, drawHeight);

        // 4. Export to base64
        const resultBase64 = canvas.toDataURL('image/jpeg', 0.95);
        onSave(resultBase64);
    };

    if (!isOpen) return null;

    // Calculate maximum visual width for the container so it fits on screen nicely
    const aspect = targetWidth / targetHeight;
    const maxVisualHeight = 400; // max height for the preview box
    const visualWidth = Math.min(600, maxVisualHeight * aspect);
    const visualHeight = visualWidth / aspect;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
                    onClick={onClose}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl flex flex-col z-10"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <ImageIcon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                                    Encuadre de Portada
                                </h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    Resolución exacta: {targetWidth}x{targetHeight}px
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Editor Body */}
                    <div className="flex flex-col lg:flex-row bg-slate-50/50">
                        {/* Cropper Area */}
                        <div 
                            className="flex-1 relative flex items-center justify-center border-r border-slate-100 overflow-hidden bg-slate-900/5"
                            onMouseDown={handleDragStart}
                            onMouseMove={handleDragMove}
                            onMouseUp={handleDragEnd}
                            onMouseLeave={handleDragEnd}
                            onTouchStart={handleDragStart}
                            onTouchMove={handleDragMove}
                            onTouchEnd={handleDragEnd}
                            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                        >
                            {/* 1. Background Color matching the crop box */}
                            <div 
                                ref={containerRef}
                                className="absolute shadow-sm"
                                style={{
                                    width: visualWidth,
                                    height: visualHeight,
                                    backgroundColor: bgColor
                                }}
                            />

                            {/* 2. The Draggable Image */}
                            {imageLoaded && (
                                <div 
                                    className="absolute top-1/2 left-1/2"
                                    style={{
                                        transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
                                    }}
                                >
                                    <img 
                                        ref={imgRef}
                                        src={originalBase64} 
                                        alt="Crop preview" 
                                        draggable={false}
                                        style={{
                                            width: imgSize.w,
                                            height: imgSize.h,
                                            transform: `scale(${scale})`,
                                            transformOrigin: 'center center',
                                            pointerEvents: 'none'
                                        }}
                                    />
                                </div>
                            )}

                            {/* 3. The Dark Overlay with Cutout */}
                            <div 
                                className="absolute pointer-events-none border border-white/50"
                                style={{
                                    width: visualWidth,
                                    height: visualHeight,
                                    boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.75)'
                                }}
                            >
                                {/* Guide lines */}
                                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                                    <div className="border-b border-r border-white"></div>
                                    <div className="border-b border-r border-white"></div>
                                    <div className="border-b border-white"></div>
                                    <div className="border-b border-r border-white"></div>
                                    <div className="border-b border-r border-white"></div>
                                    <div className="border-b border-white"></div>
                                    <div className="border-r border-white"></div>
                                    <div className="border-r border-white"></div>
                                    <div></div>
                                </div>
                            </div>
                        </div>

                        {/* Controls Sidebar */}
                        <div className="w-full lg:w-72 p-6 flex flex-col gap-8 bg-white">
                            
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                                        <ZoomIn size={14} className="text-indigo-500" /> 
                                        Escala de la Imagen
                                    </label>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {Math.round(scale * 100)}%
                                    </span>
                                </div>
                                <input 
                                    type="range" 
                                    min={0.1} 
                                    max={5} 
                                    step={0.01} 
                                    value={scale} 
                                    onChange={(e) => setScale(parseFloat(e.target.value))}
                                    className="w-full accent-indigo-600"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                                    Color de Relleno (Fondo)
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-xl border border-slate-200 overflow-hidden shadow-sm flex-shrink-0 cursor-pointer hover:border-indigo-400 transition-colors">
                                        <input 
                                            type="color" 
                                            value={bgColor}
                                            onChange={(e) => setBgColor(e.target.value)}
                                            className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">
                                            {bgColor}
                                        </span>
                                        {'EyeDropper' in window && (
                                            <button 
                                                onClick={handleEyeDropper}
                                                className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                            >
                                                <Pipette size={12} /> Gotero
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                    Si la imagen es más pequeña que el marco {targetWidth}x{targetHeight}, se usará este color para rellenar los bordes.
                                </p>
                            </div>

                            <div className="mt-auto pt-6 border-t border-slate-100">
                                <button
                                    onClick={handleSave}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    <Check size={16} /> Guardar Recorte
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
