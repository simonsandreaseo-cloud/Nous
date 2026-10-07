'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const BUCKET = 'task-assets';
const MAX_SIZE_MB = 100; // Increased to support videos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'];

import { uploadEditorImageAction, getSignedUploadUrlAction, registerUploadedAssetAction } from '@/lib/actions/imageActions';
import { compressVideo } from '@/lib/videoCompression';

/** Max payload we send through a server action (Vercel limit is ~4.5MB) */
const SERVER_ACTION_SAFE_BYTES = 3.5 * 1024 * 1024;

/** Converts an image to WebP in the browser, reducing quality/dimensions until it fits `maxBytes`. */
async function shrinkImageToWebP(file: File, maxBytes: number): Promise<File> {
    const bitmap = await createImageBitmap(file);
    let maxDim = 3000;
    let quality = 0.9;

    for (let attempt = 0; attempt < 8; attempt++) {
        const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas no disponible');
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

        const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
        if (blob && blob.size <= maxBytes) {
            bitmap.close?.();
            const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
            return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
        }
        quality = Math.max(0.6, quality - 0.1);
        maxDim = Math.round(maxDim * 0.8);
    }
    bitmap.close?.();
    throw new Error('No se pudo reducir la imagen lo suficiente');
}

interface UseImageUploadOptions {
    /** Folder inside the user's directory. Defaults to 'editor-uploads' */
    folder?: string;
    /** The task ID for the current context */
    taskId: string;
    /** Called with the public URL after a successful upload */
    onSuccess: (url: string, fileName: string) => void;
}

export function useImageUpload({ folder = 'editor-uploads', taskId, onSuccess }: UseImageUploadOptions) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);

    const uploadFile = useCallback(async (file: File) => {
        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(`Tipo de archivo no soportado. Usa: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`);
            return;
        }

        // Validate size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_SIZE_MB) {
            toast.error(`El archivo supera el límite de ${MAX_SIZE_MB}MB (${sizeMB.toFixed(1)}MB)`);
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Procesando archivo...');

        try {
            let publicUrl = '';
            
            if (file.type.startsWith('video/')) {
                let finalFile = file;
                try {
                    // Try to compress the video using the client CPU
                    toast.loading('Comprimiendo video (0%)...', { id: toastId });
                    setUploadProgress(0);
                    finalFile = await compressVideo(file, (progress) => {
                        toast.loading(`Comprimiendo video (${progress}%)...`, { id: toastId });
                        setUploadProgress(progress);
                    });
                } catch (compressionError) {
                    console.warn("Video compression failed, falling back to raw upload:", compressionError);
                    toast.loading('La compresión falló por el tamaño, subiendo video original...', { id: toastId });
                    finalFile = file; // Fallback to raw file
                } finally {
                    setUploadProgress(null);
                }
                
                toast.loading('Subiendo video...', { id: toastId });
                const signRes = await getSignedUploadUrlAction(taskId, finalFile.name, finalFile.type);
                if (!signRes.success || !signRes.signedUrl) throw new Error(signRes.error || 'Error obteniendo URL segura');
                
                const uploadRes = await fetch(signRes.signedUrl, {
                    method: 'PUT',
                    body: finalFile,
                    headers: { 'Content-Type': finalFile.type }
                });
                if (!uploadRes.ok) throw new Error('Fallo al transferir archivo al Storage');
                
                const regRes = await registerUploadedAssetAction(taskId, signRes.storagePath!, finalFile.name, finalFile.name);
                if (!regRes.success) throw new Error(regRes.error || 'Error registrando el archivo');
                
                publicUrl = regRes.publicUrl;
            } else {
                // Images always go through the server pipeline (WebP conversion + size limit + DB registration).
                // If the file is too big for a Vercel server action (~4.5MB), shrink it to WebP in the browser first.
                let imageToSend = file;
                if (file.size > SERVER_ACTION_SAFE_BYTES && !file.type.includes('gif')) {
                    toast.loading('Optimizando imagen...', { id: toastId });
                    try {
                        imageToSend = await shrinkImageToWebP(file, SERVER_ACTION_SAFE_BYTES);
                    } catch (shrinkError) {
                        console.warn('[useImageUpload] Client-side shrink failed:', shrinkError);
                    }
                }

                if (imageToSend.size > SERVER_ACTION_SAFE_BYTES) {
                    // Last resort (e.g. big GIF or shrink failed): direct upload to Storage
                    const signRes = await getSignedUploadUrlAction(taskId, imageToSend.name, imageToSend.type);
                    if (!signRes.success || !signRes.signedUrl) throw new Error(signRes.error || 'Error obteniendo URL segura');

                    const uploadRes = await fetch(signRes.signedUrl, {
                        method: 'PUT',
                        body: imageToSend,
                        headers: { 'Content-Type': imageToSend.type }
                    });
                    if (!uploadRes.ok) throw new Error('Fallo al transferir archivo al Storage');

                    const regRes = await registerUploadedAssetAction(taskId, signRes.storagePath!, imageToSend.name, imageToSend.name);
                    if (!regRes.success) throw new Error(regRes.error || 'Error registrando el archivo');

                    publicUrl = regRes.publicUrl;
                } else {
                    const formData = new FormData();
                    formData.append('file', imageToSend);
                    formData.append('taskId', taskId);
                    formData.append('altText', file.name);

                    const res = await uploadEditorImageAction(formData);
                    if (!res.success) throw new Error(res.error || 'Error en el procesamiento');
                    publicUrl = res.publicUrl;
                }
            }

            toast.success('Archivo subido con éxito', { id: toastId });
            onSuccess(publicUrl, file.name);
        } catch (err: any) {
            console.error('[useImageUpload]', err);
            toast.error(`Error al subir: ${err.message}`, { id: toastId });
        } finally {
            setIsUploading(false);
        }
    }, [taskId, onSuccess]);

    /** Opens a native file picker and uploads the selected file */
    const openFilePicker = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = ALLOWED_TYPES.join(',');
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) uploadFile(file);
        };
        input.click();
    }, [uploadFile]);

    /** Handles a ClipboardEvent and uploads the first image/video found */
    const handlePaste = useCallback((e: ClipboardEvent): boolean => {
        const items = Array.from(e.clipboardData?.items ?? []);
        const mediaItem = items.find(item => item.type.startsWith('image/') || item.type.startsWith('video/'));
        if (!mediaItem) return false;

        const file = mediaItem.getAsFile();
        if (!file) return false;

        e.preventDefault();
        uploadFile(file);
        return true;
    }, [uploadFile]);

    /** Handles a DragEvent with local image files */
    const handleFileDrop = useCallback((e: DragEvent): boolean => {
        const files = Array.from(e.dataTransfer?.files ?? []);
        const imageFile = files.find(f => ALLOWED_TYPES.includes(f.type));
        if (!imageFile) return false;

        uploadFile(imageFile);
        return true;
    }, [uploadFile]);

    return { isUploading, uploadProgress, openFilePicker, handlePaste, handleFileDrop, uploadFile };
}
