'use client';

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const BUCKET = 'task-assets';
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

import { uploadEditorImageAction } from '@/lib/actions/imageActions';

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

    const uploadFile = useCallback(async (file: File) => {
        // Validate type
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(`Tipo de archivo no soportado. Usa: ${ALLOWED_TYPES.map(t => t.split('/')[1]).join(', ')}`);
            return;
        }

        // Validate size
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB > MAX_SIZE_MB) {
            toast.error(`La imagen supera el límite de ${MAX_SIZE_MB}MB (${sizeMB.toFixed(1)}MB)`);
            return;
        }

        setIsUploading(true);
        const toastId = toast.loading('Optimizando y subiendo imagen...');

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('taskId', taskId);
            formData.append('altText', file.name);

            const res = await uploadEditorImageAction(formData);

            if (!res.success) throw new Error(res.error || 'Error en el procesamiento de la imagen');

            toast.success('Imagen optimizada y subida', { id: toastId });
            onSuccess(res.publicUrl, file.name);
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

    /** Handles a ClipboardEvent and uploads the first image found */
    const handlePaste = useCallback((e: ClipboardEvent): boolean => {
        const items = Array.from(e.clipboardData?.items ?? []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        if (!imageItem) return false;

        const file = imageItem.getAsFile();
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

    return { isUploading, openFilePicker, handlePaste, handleFileDrop, uploadFile };
}
