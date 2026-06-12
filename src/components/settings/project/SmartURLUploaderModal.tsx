"use client";
import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, FileType, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet, ArrowRight, FolderTree, Wand2 } from "lucide-react";
import { NotificationService } from "@/lib/services/notifications";
import { parseSpreadsheet, ParsedData } from '@/lib/utils/excel-parser';

interface SmartURLUploaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onUploadSuccess: () => void;
}

const NOUS_URL_FIELDS = [
    { value: 'url', label: 'URL / Enlace' },
    { value: 'title', label: 'Título / Nombre' },
    { value: 'category', label: 'Categoría / Tipo' },
    { value: 'ignore', label: '-- Ignorar esta columna --' }
];

function extractCategoryFromUrl(urlString: string) {
    try {
        const url = new URL(urlString);
        const segments = url.pathname.split('/').filter(Boolean);
        return segments.length > 0 ? segments[0] : 'general';
    } catch {
        return 'general';
    }
}

function extractTitleFromSlug(urlString: string) {
    try {
        const url = new URL(urlString);
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length === 0) return null;
        const slug = segments[segments.length - 1];
        const clean = slug.replace(/\.[^/.]+$/, "");
        const title = clean.replace(/-/g, ' ');
        return title.charAt(0).toUpperCase() + title.slice(1);
    } catch {
        return null;
    }
}

interface CategorySummary {
    originalName: string;
    customName: string;
    count: number;
    sampleUrl: string;
}

interface MappedUrlInternal {
    url: string;
    title: string | null;
    originalCategory: string;
}

export function SmartURLUploaderModal({ isOpen, onClose, projectId, onUploadSuccess }: SmartURLUploaderModalProps) {
    const [step, setStep] = useState<'upload' | 'analyzing' | 'mapping' | 'review'>('upload');
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    // New states for review phase
    const [mappedUrls, setMappedUrls] = useState<MappedUrlInternal[]>([]);
    const [categoriesSummary, setCategoriesSummary] = useState<CategorySummary[]>([]);
    const [extractTitles, setExtractTitles] = useState(true);
    const [progress, setProgress] = useState({ processed: 0, total: 0 });

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
        e.target.value = '';
    };

    const processFile = async (file: File) => {
        setStep('analyzing');
        try {
            const data = await parseSpreadsheet(file);
            if (data.rows.length === 0) {
                throw new Error("El archivo está vacío o no se pudo leer correctamente.");
            }
            setParsedData(data);

            const sampleRows = data.rows.slice(0, 5);

            const res = await fetch('/api/ai/map-columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headers: data.headers,
                    sampleRows,
                    importType: 'urls'
                })
            });

            const responseData = await res.json();
            
            if (!res.ok) {
                throw new Error(responseData.error || "Error al analizar con la IA");
            }

            const initialMapping: Record<string, string> = {};
            for (const header of data.headers) {
                const aiSuggestion = responseData.mapping[header];
                initialMapping[header] = aiSuggestion ? aiSuggestion : 'ignore';
            }

            setMapping(initialMapping);
            setStep('mapping');
            NotificationService.success("Análisis completado", "La IA ha sugerido un mapeo. Por favor, revísalo.");

        } catch (error: any) {
            console.error("Error upload:", error);
            NotificationService.error("Error al procesar", error.message || "Error desconocido");
            setStep('upload');
        }
    };

    const handleMappingChange = (header: string, internalField: string) => {
        setMapping(prev => ({ ...prev, [header]: internalField }));
    };

    const handleGoToReview = () => {
        if (!parsedData) return;
        const extractedUrls: MappedUrlInternal[] = [];
        const summaryMap = new Map<string, { count: number, sampleUrl: string }>();

        parsedData.rows.forEach(row => {
            const mappedRow: any = {};
            for (const header of parsedData.headers) {
                const targetField = mapping[header];
                if (targetField && targetField !== 'ignore') {
                    mappedRow[targetField] = row[header];
                }
            }
            
            if (mappedRow.url) {
                const rawUrl = String(mappedRow.url).trim();
                let cat = mappedRow.category ? String(mappedRow.category).trim() : null;
                
                // Autodetect category if missing
                if (!cat) {
                    cat = extractCategoryFromUrl(rawUrl);
                }

                extractedUrls.push({
                    url: rawUrl,
                    title: mappedRow.title ? String(mappedRow.title).trim() : null,
                    originalCategory: cat
                });

                if (!summaryMap.has(cat)) {
                    summaryMap.set(cat, { count: 1, sampleUrl: rawUrl });
                } else {
                    const curr = summaryMap.get(cat)!;
                    curr.count += 1;
                    summaryMap.set(cat, curr);
                }
            }
        });

        if (extractedUrls.length === 0) {
            NotificationService.error("Sin URLs válidas", "Asegúrate de mapear correctamente la columna URL.");
            return;
        }

        if (extractedUrls.length > 5000) {
            NotificationService.warn("Límite de URLs", `Se limitará la importación a las primeras 5000 URLs de ${extractedUrls.length}.`);
        }

        const summaryArray = Array.from(summaryMap.entries()).map(([cat, data]) => ({
            originalName: cat,
            customName: cat,
            count: data.count,
            sampleUrl: data.sampleUrl
        }));

        setMappedUrls(extractedUrls.slice(0, 5000));
        setCategoriesSummary(summaryArray);
        setStep('review');
    };

    const handleCategoryRename = (originalName: string, newName: string) => {
        setCategoriesSummary(prev => prev.map(c => 
            c.originalName === originalName ? { ...c, customName: newName } : c
        ));
    };

    const handleConfirmImport = async () => {
        setIsUploading(true);

        const dataToUpload = mappedUrls.map(item => {
            const catSummary = categoriesSummary.find(c => c.originalName === item.originalCategory);
            const finalCategory = catSummary ? catSummary.customName : item.originalCategory;
            
            let finalTitle = item.title;
            if (extractTitles && !finalTitle) {
                finalTitle = extractTitleFromSlug(item.url);
            }

            return {
                url: item.url,
                title: finalTitle,
                category: finalCategory
            };
        });

        const CHUNK_SIZE = 500;
        let totalInserted = 0;
        let totalUpdated = 0;

        setProgress({ processed: 0, total: dataToUpload.length });

        try {
            for (let i = 0; i < dataToUpload.length; i += CHUNK_SIZE) {
                const chunk = dataToUpload.slice(i, i + CHUNK_SIZE);
                
                const res = await fetch('/api/projects/urls/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId,
                        urls: chunk
                    })
                });

                const result = await res.json();
                if (!result.success) {
                    throw new Error(result.error || "Error subiendo el lote.");
                }
                
                totalInserted += result.inserted || 0;
                totalUpdated += result.updated || 0;
                
                setProgress({ processed: Math.min(i + CHUNK_SIZE, dataToUpload.length), total: dataToUpload.length });
            }

            NotificationService.success("Carga completada", `${totalInserted} nuevas, ${totalUpdated} actualizadas.`);
            onUploadSuccess();
            onClose();
        } catch (error: any) {
            NotificationService.error("Error al subir", error.message || "No se pudo conectar con el servidor.");
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
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <FileSpreadsheet size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Carga Inteligente de URLs</h2>
                                <p className="text-xs text-slate-500">La IA mapeará automáticamente tus columnas para el inventario de enlaces.</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            disabled={isUploading}
                            className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors disabled:opacity-50"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar relative">
                        {step === 'upload' && (
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    border-2 border-dashed rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all
                                    ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-indigo-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}
                                `}
                            >
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
                                    <Upload size={28} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Haz clic o arrastra un archivo</h3>
                                <p className="text-sm text-slate-500 max-w-sm">Sube tu Excel o CSV. La Inteligencia Artificial detectará qué columna es la URL, el Título y la Categoría basándose en el contenido.</p>
                            </div>
                        )}

                        {step === 'analyzing' && (
                            <div className="py-20 flex flex-col items-center justify-center text-center">
                                <Loader2 size={40} className="text-indigo-500 animate-spin mb-6" />
                                <h3 className="text-xl font-bold text-slate-700 mb-2">Analizando la estructura...</h3>
                                <p className="text-slate-500">Gemini 3.5 Flash está analizando tus encabezados para encontrar la mejor coincidencia.</p>
                            </div>
                        )}

                        {step === 'mapping' && parsedData && (
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-800">Revisa la propuesta de la IA</h4>
                                        <p className="text-xs text-amber-700">Asegúrate de que la columna con los enlaces apunte a "URL". Las duplicadas se sobrescribirán con el título y la categoría que indiques aquí.</p>
                                    </div>
                                </div>
                                
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                        <tr>
                                            <th className="px-6 py-4 w-1/3">Tu Columna (Excel)</th>
                                            <th className="px-6 py-4 w-1/6 text-center"></th>
                                            <th className="px-6 py-4 w-1/2">Campo en Nous</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {parsedData.headers.map((header, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800 mb-1">{header}</div>
                                                    <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                                                        Ej: {String(parsedData.rows[0]?.[header] || 'N/A').slice(0, 50)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ArrowRight size={16} className="text-slate-300 mx-auto" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select 
                                                        value={mapping[header] || 'ignore'}
                                                        onChange={(e) => handleMappingChange(header, e.target.value)}
                                                        className={`w-full p-2.5 rounded-xl border ${mapping[header] && mapping[header] !== 'ignore' ? 'border-indigo-300 bg-indigo-50/30 text-indigo-800 font-medium' : 'border-slate-200 bg-slate-50 text-slate-600'} text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                                                    >
                                                        {NOUS_URL_FIELDS.map(f => (
                                                            <option key={f.value} value={f.value}>{f.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {step === 'review' && (
                            <div className="space-y-6">
                                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-start gap-4">
                                    <div className="h-10 w-10 bg-indigo-100 text-indigo-500 rounded-xl flex items-center justify-center shrink-0">
                                        <FolderTree size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-indigo-900 mb-1">Detección de Categorías ({categoriesSummary.length})</h3>
                                        <p className="text-sm text-indigo-700/80 mb-4">Hemos agrupado tus {mappedUrls.length} URLs según la ruta. Puedes renombrar las categorías aquí antes de importar.</p>
                                        
                                        <div className="space-y-3">
                                            {categoriesSummary.map((cat, idx) => (
                                                <div key={idx} className="bg-white rounded-xl p-3 border border-indigo-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                                    <div className="flex-1 min-w-0">
                                                        <input 
                                                            type="text" 
                                                            value={cat.customName}
                                                            onChange={(e) => handleCategoryRename(cat.originalName, e.target.value)}
                                                            className="font-bold text-slate-800 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none px-1 py-0.5 w-48 transition-colors"
                                                            placeholder="Nombre de categoría"
                                                        />
                                                        <div className="text-xs text-slate-400 font-mono truncate mt-1">
                                                            Ej: {cat.sampleUrl}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs font-semibold text-slate-500 shrink-0 text-center">
                                                        {cat.count} URLs
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                                            <Wand2 size={20} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h3 className="font-bold text-slate-800">Autocompletado de Títulos</h3>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="sr-only peer"
                                                        checked={extractTitles}
                                                        onChange={(e) => setExtractTitles(e.target.checked)}
                                                        disabled={isUploading}
                                                    />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </label>
                                            </div>
                                            <p className="text-sm text-slate-500">
                                                Si una URL no tiene título, lo extraeremos inteligentemente de su slug. 
                                                <br/>
                                                <span className="text-xs italic text-slate-400">Ej: /blog/mi-articulo-nuevo → "Mi articulo nuevo"</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Progress Overlay during upload */}
                        {isUploading && step === 'review' && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-8 text-center rounded-b-3xl">
                                <Loader2 size={40} className="text-indigo-500 animate-spin mb-4" />
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Importando URLs...</h3>
                                <p className="text-sm text-slate-500 mb-6">Estamos inyectando los enlaces en la base de datos de tu proyecto.</p>
                                
                                <div className="w-full max-w-md bg-slate-100 h-3 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 transition-all duration-300 ease-out" 
                                        style={{ width: `${Math.max(5, (progress.processed / progress.total) * 100)}%` }}
                                    ></div>
                                </div>
                                <div className="mt-3 text-xs font-bold text-slate-400">
                                    {progress.processed} / {progress.total} URLs
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {step === 'mapping' && (
                        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
                            <span className="text-sm text-slate-500 font-medium">
                                {parsedData?.rows.length} filas analizadas
                            </span>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep('upload')}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Atrás
                                </button>
                                <button 
                                    onClick={handleGoToReview}
                                    className="px-6 py-2.5 bg-indigo-500 text-white text-xs font-bold rounded-xl hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                                >
                                    Siguiente paso
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between relative z-0">
                            <span className="text-sm text-slate-500 font-medium">
                                {mappedUrls.length} URLs listas
                            </span>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setStep('mapping')}
                                    disabled={isUploading}
                                    className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Atrás
                                </button>
                                <button 
                                    onClick={handleConfirmImport}
                                    disabled={isUploading}
                                    className="px-6 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    {isUploading ? "Procesando..." : "Confirmar e Importar"}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
