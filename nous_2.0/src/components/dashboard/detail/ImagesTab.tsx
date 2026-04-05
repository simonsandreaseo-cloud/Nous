'use client';

import { useState, useRef, useCallback } from 'react';
import {
    Upload,
    Image as ImageIcon,
    X,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Download,
    Expand,
    Info
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface ImagesTabProps {
    task: Task;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

interface UploadedImage {
    id: string;
    url: string;
    name: string;
    size: number;
    alt?: string;
    created_at: string;
}

export default function ImagesTab({ task }: ImagesTabProps) {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [lightboxImage, setLightboxImage] = useState<UploadedImage | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const uploadFile = async (file: File) => {
        setUploadError(null);

        // Validation
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setUploadError(`Tipo no soportado: ${file.type}. Usa JPG, PNG, WebP o GIF.`);
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            setUploadError(`El archivo "${file.name}" supera el límite de ${MAX_FILE_SIZE_MB}MB. (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
            return;
        }

        setUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No hay sesión activa.');

            // Path: task-assets/<userId>/<taskId>/<timestamp>-<filename>
            const ext = file.name.split('.').pop();
            const path = `${session.user.id}/${task.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

            const { error: uploadError } = await supabase.storage
                .from('task-assets')
                .upload(path, file, { upsert: false, contentType: file.type });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('task-assets')
                .getPublicUrl(path);

            const newImage: UploadedImage = {
                id: path,
                url: urlData.publicUrl,
                name: file.name,
                size: file.size,
                created_at: new Date().toISOString(),
            };

            // Save attachment reference in task
            const currentAttachments = task.attachments || [];
            await supabase.from('tasks').update({
                attachments: [...currentAttachments, newImage]
            }).eq('id', task.id);

            setImages(prev => [...prev, newImage]);
        } catch (err: any) {
            console.error('[ImagesTab] Upload error:', err);
            setUploadError(err.message || 'Error al subir la imagen. Verifica la configuración del bucket.');
        } finally {
            setUploading(false);
        }
    };

    const handleFiles = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        for (const file of fileArray) {
            await uploadFile(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFiles(files);
    }, []);

    const handleDelete = async (image: UploadedImage) => {
        await supabase.storage.from('task-assets').remove([image.id]);
        const updatedAttachments = (task.attachments || []).filter((a: any) => a.id !== image.id);
        await supabase.from('tasks').update({ attachments: updatedAttachments }).eq('id', task.id);
        setImages(prev => prev.filter(i => i.id !== image.id));
    };

    // Load existing images from task.attachments on mount
    useState(() => {
        if (task.attachments) {
            setImages(task.attachments as UploadedImage[]);
        }
    });

    return (
        <div className="space-y-8">
            {/* Info Bar about storage */}
            <div className="flex items-center gap-3 px-6 py-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                <Info size={16} className="text-indigo-500 shrink-0" />
                <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                    Las imágenes se almacenan en Supabase Storage (bucket: <span className="font-black">task-assets</span>). Límite por archivo: <span className="font-black">{MAX_FILE_SIZE_MB}MB</span>. Formatos: JPG, PNG, WebP, GIF.
                </p>
            </div>

            {/* Drop Zone */}
            <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => !uploading && inputRef.current?.click()}
                className={cn(
                    'relative border-2 border-dashed rounded-[40px] p-16 text-center cursor-pointer transition-all duration-300',
                    isDragging
                        ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                        : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30',
                    uploading && 'cursor-not-allowed opacity-70'
                )}
            >
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES.join(',')}
                    className="hidden"
                    onChange={e => e.target.files && handleFiles(e.target.files)}
                    disabled={uploading}
                />

                <div className={cn(
                    'w-20 h-20 rounded-lg flex items-center justify-center mx-auto mb-6 transition-all',
                    isDragging ? 'bg-indigo-500 scale-110' : 'bg-slate-100'
                )}>
                    {uploading
                        ? <Loader2 size={32} className="text-indigo-600 animate-spin" />
                        : <Upload size={32} className={isDragging ? 'text-white' : 'text-slate-400'} />
                    }
                </div>

                <h3 className="text-lg font-black text-slate-700 uppercase italic tracking-tighter mb-2">
                    {uploading ? 'Subiendo imagen...' : isDragging ? '¡Suéltala aquí!' : 'Arrastra y suelta imágenes'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    o haz clic para explorar — Máx. {MAX_FILE_SIZE_MB}MB por archivo
                </p>

                {/* Animated ring when dragging */}
                {isDragging && (
                    <div className="absolute inset-4 rounded-[36px] border-2 border-indigo-400 animate-pulse pointer-events-none" />
                )}
            </div>

            {/* Error Display */}
            <AnimatePresence>
                {uploadError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-6 py-4 bg-red-50 border border-red-100 rounded-lg"
                    >
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                        <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex-1">{uploadError}</p>
                        <button onClick={() => setUploadError(null)} className="text-red-300 hover:text-red-500">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gallery */}
            {images.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-5">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Galería — {images.length} {images.length === 1 ? 'imagen' : 'imágenes'}
                        </span>
                        <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-5">
                        {images.map((img) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative bg-white rounded-lg border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
                            >
                                {/* Image */}
                                <div
                                    className="aspect-video bg-slate-100 overflow-hidden cursor-pointer"
                                    onClick={() => setLightboxImage(img)}
                                >
                                    <img
                                        src={img.url}
                                        alt={img.alt || img.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Expand size={24} className="text-white" />
                                    </div>
                                </div>

                                {/* Meta */}
                                <div className="p-4">
                                    <p className="text-[10px] font-bold text-slate-700 truncate mb-1">{img.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                        {(img.size / 1024).toFixed(0)}KB
                                    </p>
                                </div>

                                {/* Actions overlay */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={img.url} download target="_blank"
                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-md hover:bg-white transition-all shadow-sm"
                                    >
                                        <Download size={12} className="text-slate-600" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(img)}
                                        className="p-2 bg-white/90 backdrop-blur-sm rounded-md hover:bg-red-50 transition-all shadow-sm"
                                    >
                                        <X size={12} className="text-red-400" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {images.length === 0 && !uploading && (
                <div className="text-center py-8">
                    <ImageIcon size={40} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Aún no hay imágenes adjuntas a este contenido</p>
                </div>
            )}

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-8"
                        onClick={() => setLightboxImage(null)}
                    >
                        <button
                            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                            onClick={() => setLightboxImage(null)}
                        >
                            <X size={20} />
                        </button>
                        <motion.img
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            src={lightboxImage.url}
                            alt={lightboxImage.alt || lightboxImage.name}
                            className="max-w-full max-h-full rounded-[32px] shadow-2xl object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-lg">
                            <p className="text-white text-[10px] font-bold uppercase tracking-widest">{lightboxImage.name}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
