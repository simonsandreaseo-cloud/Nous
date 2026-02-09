"use client";

import { useState, useRef } from "react";
import { Upload, X, FileSpreadsheet, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/cn";

interface BulkUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function BulkUploadModal({ isOpen, onClose }: BulkUploadModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setUploadStatus('idle');
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        // Simulate upload
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsUploading(false);
        setUploadStatus('success');
        setTimeout(() => {
            onClose();
            setFile(null);
            setUploadStatus('idle');
        }, 1500);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={onClose} />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 m-auto max-w-md h-fit bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
                    >
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Importar Programación</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">CSV / Excel</p>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-8">
                            {!file ? (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/10 transition-all group"
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-cyan-500">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 mb-1">Haz clic para subir archivo</p>
                                    <p className="text-[10px] text-slate-400 font-mono">.csv, .xlsx, .json</p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                                        <FileSpreadsheet size={20} />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-xs font-bold text-slate-900 truncate">{file.name}</p>
                                        <p className="text-[9px] text-slate-400 font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <button onClick={() => setFile(null)} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".csv,.xlsx,.json"
                                onChange={handleFileChange}
                            />

                            {uploadStatus === 'success' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-4 p-3 bg-emerald-50 text-emerald-600 rounded-xl flex items-center gap-2 text-xs font-bold"
                                >
                                    <Check size={14} /> Importación exitosa
                                </motion.div>
                            )}

                            <div className="mt-8 flex gap-3">
                                <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors uppercase tracking-widest">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={!file || isUploading}
                                    className={cn(
                                        "flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2",
                                        (!file || isUploading) && "opacity-50 cursor-not-allowed",
                                        uploadStatus === 'success' && "bg-emerald-500 shadow-emerald-500/20"
                                    )}
                                >
                                    {isUploading ? "Subiendo..." : uploadStatus === 'success' ? "Listo" : "Procesar"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
