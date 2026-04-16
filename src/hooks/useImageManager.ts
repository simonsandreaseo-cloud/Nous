import { useState, useCallback, useMemo } from 'react';
import { useWriterStore } from '@/store/useWriterStore';
import { useProjectStore } from '@/store/useProjectStore';
import { 
    ProcessingStatus, 
    ImageAsset,
    AssetStatus,
    LayoutRole,
    AssetAlignment,
    AssetWrapping
} from '@/types/images';
import { 
    deleteImageAction, 
    uploadGeneratedImage, 
    executeImagePipelineAction 
} from '@/lib/actions/imageActions';
import { saveAs } from 'file-saver';
import { BlueprintService } from '@/lib/services/BlueprintService';
import { supabase } from '@/lib/supabase';
import { PatcherMaster, PatcherRule } from '@/lib/services/images/PatcherMaster';

/**
 * Marshaller: Converts flat Tiptap attributes to a rich ImageAsset object.
 */
function mapNodeToAsset(node: any, patcherRules: PatcherRule[] = []): ImageAsset {
    const attrs = node.attrs;
    const rawUrl = attrs.url || "";
    const patchedUrl = PatcherMaster.quickPatch(rawUrl, attrs.role === 'hero' ? 'featured' : 'inline', patcherRules);

    return {
        id: attrs.id,
        status: (attrs.status as AssetStatus) || (node.type.name === 'nousAsset' ? 'final' : 'pending'),
        type: node.type.name === 'nousAsset' ? 'image' : 'slot',
        role: (attrs.role || attrs.type || 'feature') as LayoutRole,
        url: patchedUrl,
        storagePath: attrs.storage_path,
        prompt: attrs.prompt || '',
        alt: attrs.alt || '',
        title: attrs.title || '',
        rationale: attrs.rationale,
        design: {
            width: attrs.width || '100%',
            align: (attrs.align as AssetAlignment) || 'center',
            wrapping: (attrs.wrapping as AssetWrapping) || 'break',
            aspectRatio: attrs.aspectRatio || '16:9',
            pixelDimensions: attrs.pixelWidth ? { w: attrs.pixelWidth, h: attrs.pixelHeight } : undefined
        },
        positioning: {
            semanticAnchor: attrs.semanticAnchor,
            paragraphIndex: attrs.paragraphIndex || 0,
            offset: attrs.offset
        }
    };
}

/**
 * Unmarshaller: Flattens an ImageAsset update for Tiptap consumption.
 */
function flattenAssetUpdates(updates: Partial<ImageAsset>): any {
    const flattened: any = {};
    if (updates.id) flattened.id = updates.id;
    if (updates.status) flattened.status = updates.status;
    if (updates.url) flattened.url = updates.url;
    if (updates.storagePath) flattened.storage_path = updates.storagePath;
    if (updates.prompt) flattened.prompt = updates.prompt;
    if (updates.alt) flattened.alt = updates.alt;
    if (updates.title) flattened.title = updates.title;
    if (updates.rationale) flattened.rationale = updates.rationale;
    if (updates.role) flattened.role = updates.role;
    if (updates.design) {
        if (updates.design.width) flattened.width = updates.design.width;
        if (updates.design.align) flattened.align = updates.design.align;
        if (updates.design.wrapping) flattened.wrapping = updates.design.wrapping;
        if (updates.design.aspectRatio) flattened.aspectRatio = updates.design.aspectRatio;
    }
    if (updates.positioning) {
        if (updates.positioning.semanticAnchor) flattened.semanticAnchor = updates.positioning.semanticAnchor;
    }
    return flattened;
}

export function useImageManager() {
    const { 
        draftId, content, projectId, loadTaskImages, setStatus: setStoreStatus, editor 
    } = useWriterStore() as any;
    
    const { projects } = useProjectStore();
    const activeProject = projects.find(p => p.id === projectId) || null;

    const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
    const [statusMessage, setStatusMessage] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    const assets = useMemo(() => {
        if (!editor) return [];
        const foundAssets: ImageAsset[] = [];
        const { doc } = editor.state;
        const patcherRules = activeProject?.settings?.patcher_rules || [];
        doc.descendants((node: any) => {
            if (node.type.name === 'nousAsset' || node.type.name === 'imageSlot') {
                foundAssets.push(mapNodeToAsset(node, patcherRules));
            }
        });
        return foundAssets;
    }, [editor, activeProject]);

    const updateAssetAttributes = useCallback((id: string, updates: Partial<ImageAsset>) => {
        if (!editor) return;
        const { doc } = editor.state;
        let targetPos = -1;
        let currentAttrs = {};
        doc.descendants((node: any, pos: number) => {
            if ((node.type.name === 'nousAsset' || node.type.name === 'imageSlot') && node.attrs.id === id) {
                targetPos = pos;
                currentAttrs = node.attrs;
                return false; 
            }
        });

        if (targetPos !== -1) {
            const flattened = flattenAssetUpdates(updates);
            if ((updates.role === 'hero' || (currentAttrs as any).role === 'hero') && draftId) {
                const imageUrl = flattened.url || (currentAttrs as any).url;
                if (imageUrl) supabase.from('tasks').update({ featured_image: imageUrl }).eq('id', draftId).then(() => {});
            }
            editor.chain().setNodeMarkup(targetPos, undefined, { ...currentAttrs, ...flattened }).run();
        }
    }, [editor, draftId]);

    const handleGenerateAsset = useCallback(async (assetId: string) => {
        if (!draftId) return;
        const asset = assets.find(a => a.id === assetId);
        if (!asset) return;

        setStatus(ProcessingStatus.GENERATING_IMAGES);
        setStatusMessage(`Orquestando renderizado: ${assetId.slice(-4)}`);
        setSelectedAssetId(assetId);

        try {
            const paragraphs = content ? content.split(/\n\n/) : ["Editorial focus"];
            const res = await executeImagePipelineAction({
                paragraphs,
                instructions: asset.prompt || "Professional editorial design",
                language: 'es',
                taskId: draftId,
                projectId: projectId || undefined,
                portadaPreset: activeProject?.settings?.images?.portada_preset,
                bodyPresets: activeProject?.settings?.images?.body_presets,
                masterPrompt: activeProject?.settings?.images?.master_prompt
            });

            if (res.success && res.assets && res.assets.length > 0) {
                const finalImg = res.assets[0];
                updateAssetAttributes(assetId, {
                    url: finalImg.url,
                    status: 'final',
                    storagePath: finalImg.storagePath,
                });
            } else {
                throw new Error(res.error || "Fallo en la generación remota");
            }

            await loadTaskImages(draftId);
            setStatus(ProcessingStatus.COMPLETED);
        } catch (e: any) {
            setError(e.message);
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, assets, content, activeProject, loadTaskImages, updateAssetAttributes, projectId]);

    const handleDeleteAsset = useCallback(async (id: string, storagePath?: string) => {
        if (!draftId) return;
        if (!window.confirm("¿Eliminar permanentemente?")) return;
        setStatus(ProcessingStatus.SAVING);
        try {
            if (storagePath) await deleteImageAction(id, storagePath);
            if (editor) {
                const { doc } = editor.state;
                doc.descendants((node: any, pos: number) => {
                    if ((node.type.name === 'nousAsset' || node.type.name === 'imageSlot') && node.attrs.id === id) {
                        editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
                    }
                });
            }
            await loadTaskImages(draftId);
            setStatus(ProcessingStatus.COMPLETED);
        } catch (e: any) {
            setError(e.message);
            setStatus(ProcessingStatus.ERROR);
        }
    }, [draftId, editor, loadTaskImages]);

    return {
        state: { status, statusMessage, error, assets, selectedAssetId, activeProject, draftId },
        actions: { setStatus, setStatusMessage, setError, setSelectedAssetId, updateAssetAttributes, 
                   applyBlueprint: (id: string) => BlueprintService.applyBlueprint(editor, id), 
                   handleGenerateAsset, handleDeleteAsset,
                   handleDownload: (url: string, title?: string) => saveAs(url, `${title || 'asset'}.jpg`),
                   handleRefresh: async () => { if (draftId) await loadTaskImages(draftId); } }
    };
}
