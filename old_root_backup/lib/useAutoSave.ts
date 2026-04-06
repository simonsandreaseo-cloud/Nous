import { useEffect, useRef, useState } from 'react';
import { VersioningService } from './VersioningService';

interface AutoSaveOptions {
    enabled?: boolean;
    interval?: number; // ms
    onSaveSuccess?: () => void;
    onSaveError?: (error: any) => void;
}

/**
 * Hook to automatically save content history at intervals if changes are detected.
 */
export function useAutoSave(
    resourceType: string,
    resourceId: string | number | null,
    content: any,
    options: AutoSaveOptions = {}
) {
    const {
        enabled = true,
        interval = 30000, // 30 seconds default
        onSaveSuccess,
        onSaveError
    } = options;

    const [isSaving, setIsSaving] = useState(false);
    const [lastSavedContent, setLastSavedContent] = useState<string>('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Initial load: set the current content as "last saved" to avoid immediate save
    useEffect(() => {
        if (content) {
            setLastSavedContent(JSON.stringify(content));
        }
    }, [resourceId]);

    useEffect(() => {
        if (!enabled || !resourceId || !content) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        const currentContentStr = JSON.stringify(content);

        // Clear existing timer
        if (timerRef.current) clearInterval(timerRef.current);

        // Setup auto-save interval
        timerRef.current = setInterval(async () => {
            // Only save if content has changed
            if (currentContentStr !== lastSavedContent && !isSaving) {
                try {
                    setIsSaving(true);
                    await VersioningService.saveVersion(
                        resourceType,
                        resourceId,
                        content,
                        true
                    );
                    setLastSavedContent(currentContentStr);
                    if (onSaveSuccess) onSaveSuccess();
                } catch (error) {
                    console.error("AutoSave Error:", error);
                    if (onSaveError) onSaveError(error);
                } finally {
                    setIsSaving(false);
                }
            }
        }, interval);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [content, resourceId, enabled, interval, lastSavedContent, isSaving]);

    return { isSaving };
}
