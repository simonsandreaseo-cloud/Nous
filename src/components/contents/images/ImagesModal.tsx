"use client";

import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Wand2, Download, FileText, AlertCircle, Loader2, CheckCircle2, Settings2, Globe, Trash2, Layout, Zap, Search, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ImageAsset, ProcessingStatus } from '@/types/images';
import { parseDocx } from '@/lib/services/images/docxService';
import { executeImagePipelineAction } from '@/lib/actions/imageActions';

interface ImagesModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
}

export default function ImagesModal({ isOpen, onClose, projectId }: ImagesModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [instructions, setInstructions] = useState("");
    const [assets, setAssets] = useState<ImageAsset[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) setFile(e.target.files[0]);
    };

    const handleGenerate = async () => {
        if (!file) return;
        setStatus(ProcessingStatus.ANALYZING_TEXT);
        setError(null);

        try {
            const blogPost = await parseDocx(file);
            setStatus(ProcessingStatus.GENERATING_IMAGES);

            const res = await executeImagePipelineAction({
                paragraphs: blogPost.paragraphs,
                instructions,
                language: 'es',
                taskId: `bulk-${Date.now()}`,
                projectId: projectId
            });

            if (res.success && res.assets) {
                setAssets(res.assets);
                setStatus(ProcessingStatus.COMPLETED);
            } else {
                throw new Error(res.error || "Fallo en la generación remota");
            }
        } catch (err: any) {
            setError(err.message);
            setStatus(ProcessingStatus.ERROR);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white w-full max-w-4xl h-[80vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100"
                >
                    {/* Header */}
                    <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                                <ImageIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Generador de Activos Bulk</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 text-indigo-500">Master Engine V3</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"><X size={20} /></button>
                    </header>

                    <div className="flex-1 overflow-hidden flex">
                        {/* Sidebar Config */}
                        <aside className="w-80 border-r border-slate-100 p-6 space-y-6 bg-slate-50/30 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Cargar Documento</label>
                                <input type="file" accept=".docx" onChange={handleFileChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer" />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Instrucciones Maestras</label>
                                <textarea 
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Estilo visual, marca, tonos..."
                                    className="w-full h-32 bg-white border border-slate-200 rounded-2xl p-4 text-xs font-medium text-slate-600 focus:border-indigo-500 outline-none resize-none transition-all"
                                />
                            </div>

                            <button 
                                onClick={handleGenerate}
                                disabled={!file || status !== ProcessingStatus.IDLE}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl flex items-center justify-center gap-3"
                            >
                                {status === ProcessingStatus.IDLE ? <><Zap size={16} className="text-indigo-400" /> Iniciar Generación</> : <Loader2 size={16} className="animate-spin text-indigo-400" />}
                            </button>
                        </aside>

                        {/* Results Grid */}
                        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar bg-white relative">
                            {status === ProcessingStatus.IDLE && assets.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Search size={32} className="text-slate-300" /></div>
                                    <p className="text-sm font-bold text-slate-400 uppercase">Esperando carga de datos...</p>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-3 mb-6 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle size={16} /> {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {assets.map((asset, idx) => (
                                    <motion.div 
                                        key={asset.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50"
                                    >
                                        <img src={asset.url} alt={asset.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button onClick={() => saveAs(asset.url!, `${asset.title}.jpg`)} className="p-3 bg-white rounded-xl text-slate-900 shadow-xl hover:scale-110 transition-all"><Download size={18} /></button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </main>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function X({ size }: { size: number }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}
