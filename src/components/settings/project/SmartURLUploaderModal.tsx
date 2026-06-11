"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileType, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "sonner";

interface SmartURLUploaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onUploadSuccess: () => void;
}

export function SmartURLUploaderModal({ isOpen, onClose, projectId, onUploadSuccess }: SmartURLUploaderModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [parsedData, setParsedData] = useState<any[] | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) processFile(files[0]);
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) processFile(files[0]);
    };

    const processFile = async (file: File) => {
        try {
            if (file.name.endsWith('.csv')) {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        handleParsedData(results.data);
                    },
                    error: (error: any) => {
                        toast.error(`Error procesando CSV: ${error.message}`);
                    }
                });
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(firstSheet);
                handleParsedData(data);
            } else {
                toast.error("Formato no soportado. Usa CSV o Excel.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al leer el archivo");
        }
    };

    const handleParsedData = (data: any[]) => {
        if (!data || data.length === 0) {
            toast.error("El archivo está vacío");
            return;
        }

        // Try to auto-map columns: url, title, category (case insensitive)
        const mappedData = data.map((row: any) => {
            const keys = Object.keys(row);
            const getVal = (possibleNames: string[]) => {
                const key = keys.find(k => possibleNames.includes(k.toLowerCase().trim()));
                return key ? row[key] : null;
            };

            return {
                url: getVal(['url', 'link', 'enlace', 'target']),
                title: getVal(['title', 'titulo', 'título', 'name', 'nombre']),
                category: getVal(['category', 'categoria', 'categoría', 'tag', 'tipo'])
            };
        }).filter(item => item.url); // Must have at least URL

        if (mappedData.length === 0) {
            toast.error("No se detectó ninguna columna de URL válida.");
            return;
        }

        if (mappedData.length > 5000) {
            toast.warning(`El archivo tiene ${mappedData.length} filas. Se limitará a 5000.`);
        }

        setParsedData(mappedData.slice(0, 5000));
    };

    const handleUpload = async () => {
        if (!parsedData || parsedData.length === 0) return;

        setIsUploading(true);
        try {
            const res = await fetch('/api/projects/urls/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    urls: parsedData
                })
            });

            const result = await res.json();
            if (result.success) {
                toast.success(`Carga completada: ${result.inserted} nuevas, ${result.updated} actualizadas.`);
                onUploadSuccess();
                onClose();
            } else {
                toast.error(result.error || "Error al subir las URLs");
            }
        } catch (error) {
            toast.error("Error de red al intentar subir las URLs.");
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <Upload size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">Importar URLs Manuales</h3>
                                <p className="text-[11px] font-medium text-slate-500">Agrega inventario de enlaces externo o no indexado (Max 5,000)</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        {!parsedData ? (
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                                    ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'}
                                `}
                            >
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                                    <FileType size={28} className="text-slate-400" />
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 mb-1">Arrastra tu CSV o Excel aquí</h4>
                                <p className="text-xs text-slate-500 max-w-[250px] mb-4">
                                    Columnas esperadas: URL, Título (Opcional), Categoría (Opcional)
                                </p>
                                <button className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors">
                                    Explorar Archivos
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                                    <CheckCircle2 size={24} className="shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold">Archivo procesado con éxito</h4>
                                        <p className="text-xs font-medium opacity-90">Se encontraron {parsedData.length} URLs válidas.</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 flex gap-3">
                                    <AlertTriangle size={20} className="shrink-0" />
                                    <p className="text-xs font-medium">
                                        Las URLs duplicadas que ya existen en el proyecto (incluso las detectadas por Google Search Console) serán sobrescritas con la Categoría y Título que hayas incluido en tu archivo.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Previsualización (Primeros 5)</h4>
                                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                                                <tr>
                                                    <th className="px-4 py-3">URL</th>
                                                    <th className="px-4 py-3">Título</th>
                                                    <th className="px-4 py-3">Categoría</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {parsedData.slice(0, 5).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3 font-medium text-slate-800 truncate max-w-[200px]">{row.url}</td>
                                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]">{row.title || '-'}</td>
                                                        <td className="px-4 py-3 text-slate-500 truncate max-w-[100px]">{row.category || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        {parsedData && (
                            <button 
                                onClick={handleUpload}
                                disabled={isUploading}
                                className="px-5 py-2.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                {isUploading ? "Importando..." : "Confirmar Importación"}
                            </button>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
