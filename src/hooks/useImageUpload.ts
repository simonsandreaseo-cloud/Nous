'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const BUCKET = 'task-assets';
const MAX_SIZE_MB = 100; // Increased to support videos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'];

import { uploadEditorImageAction, getSignedUploadUrlAction, registerUploadedAssetAction } from '@/lib/actions/imageActions';
import { compressVideo } from '@/lib/videoCompression';

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
            } else if (file.size > 4 * 1024 * 1024) {
                // Bypass Vercel 4.5MB limit for large images
                const signRes = await getSignedUploadUrlAction(taskId, file.name, file.type);
                if (!signRes.success || !signRes.signedUrl) throw new Error(signRes.error || 'Error obteniendo URL segura');
                
                const uploadRes = await fetch(signRes.signedUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type }
                });
                if (!uploadRes.ok) throw new Error('Fallo al transferir archivo al Storage');
                
                const regRes = await registerUploadedAssetAction(taskId, signRes.storagePath!, file.name, file.name);
                if (!regRes.success) throw new Error(regRes.error || 'Error registrando el archivo');
                
                publicUrl = regRes.publicUrl;
            } else {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('taskId', taskId);
                formData.append('altText', file.name);

                const res = await uploadEditorImageAction(formData);
                if (!res.success) throw new Error(res.error || 'Error en el procesamiento');
                publicUrl = res.publicUrl;
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
