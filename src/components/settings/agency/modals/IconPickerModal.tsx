"use client";

import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { X, Search, Upload, Check, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

const ICON_NAMES = Object.keys(LucideIcons).filter(name => typeof (LucideIcons as any)[name] === 'function' && name !== 'createLucideIcon');

interface IconPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectIcon: (iconName: string) => void;
    onSelectImage: (url: string) => void;
}

export function IconPickerModal({ isOpen, onClose, onSelectIcon, onSelectImage }: IconPickerProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const filteredIcons = ICON_NAMES.filter(name => 
        name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 60);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validation: Small PNG
        if (file.type !== "image/png") {
            setUploadError("El archivo debe ser un PNG");
            return;
        }

        if (file.size > 256 * 1024) { // 256KB limit
            setUploadError("El archivo es demasiado grande (Máx 256KB)");
            return;
        }

        setIsUploading(true);
        setUploadError(null);

        try {
            // Check for transparency (Alpha channel)
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            
            // Sample corners for transparency
            const corners = [
                ctx?.getImageData(0, 0, 1, 1).data[3],
                ctx?.getImageData(img.width - 1, 0, 1, 1).data[3],
                ctx?.getImageData(0, img.height - 1, 1, 1).data[3],
                ctx?.getImageData(img.width - 1, img.height - 1, 1, 1).data[3]
            ];

            const hasTransparency = corners.some(alpha => alpha !== undefined && alpha < 255);
            
            if (!hasTransparency) {
                // Not a hard rejection but warn or reject based on user preference
                // Per instructions: "si tiene fondo lo rechazaremos"
                setUploadError("La imagen debe tener fondo transparente");
                setIsUploading(false);
                return;
            }

            // Here we would upload to Supabase Storage
            // For now, return a placeholder or implement storage logic
            onSelectImage("https://placehold.co/100x100?text=PNG"); 
            onClose();

        } catch (err) {
            setUploadError("Error al procesar la imagen");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                    />
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                    >
                        <header className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase italic">Seleccionar Icono</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Librería Lucide o Carga PNG</p>
                            </div>
                            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 flex items-center justify-center transition-colors">
                                <X size={20} />
                            </button>
                        </header>

                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Upload Section */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subir PNG Personalizado</h4>
                                <label className={cn(
                                    "flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all",
                                    uploadError ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-300"
                                )}>
                                    {isUploading ? (
                                        <Loader2 size={24} className="text-indigo-500 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload size={24} className={uploadError ? "text-red-400" : "text-slate-300"} />
                                            <div className="text-center">
                                                <p className="text-[10px] font-black uppercase text-slate-900">Seleccionar archivo</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-0.5">PNG pequeño sin fondo</p>
                                            </div>
                                        </>
                                    )}
                                    <input type="file" accept=".png" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                </label>
                                {uploadError && (
                                    <p className="text-[9px] font-bold text-red-500 flex items-center gap-1">
                                        <AlertCircle size={10} /> {uploadError}
                                    </p>
                                )}
                            </div>

                            {/* Search Icons */}
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar icono..."
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold border-none outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-6 gap-3">
                                    {filteredIcons.map(name => {
                                        const Icon = (LucideIcons as any)[name];
                                        return (
                                            <button
                                                key={name}
                                                onClick={() => {
                                                    onSelectIcon(name);
                                                    onClose();
                                                }}
                                                className="aspect-square rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
                                            >
                                                <Icon size={24} className="group-hover:scale-110 transition-transform" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
