'use server';

import { createClient } from '@supabase/supabase-js';
import { PostProcessingService } from '@/lib/services/images/PostProcessingService';
import { VisualEngine } from '@/lib/services/writer/VisualEngine';

/**
 * Server Action: Executes the full image generation pipeline.
 * Decouples Sharp and DB Admin logic from the client.
 */
export async function executeImagePipelineAction(params: {
    paragraphs: string[];
    instructions: string;
    language: 'es' | 'en';
    masterPrompt?: string;
    portadaPreset?: any;
    bodyPresets?: any[];
    taskId: string;
    projectId?: string;
}) {
    try {
        const result = await VisualEngine.executeFullPipeline(params.paragraphs, {
            instructions: params.instructions,
            language: params.language,
            masterPrompt: params.masterPrompt,
            portadaPreset: params.portadaPreset,
            bodyPresets: params.bodyPresets,
            taskId: params.taskId,
            projectId: params.projectId,
            onStatusChange: () => {}, // Status handled by caller via promise state
        });

        return { success: true, assets: result.assets };
    } catch (error: any) {
        console.error("[Action] Pipeline Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action: Regenerates a single image asset.
 */
export async function regenerateImageAction(params: {
    asset: any;
    taskId: string;
    options: any;
    refinement?: string;
}) {
    try {
        const result = await VisualEngine.regenerateImage(
            params.asset, 
            params.taskId, 
            params.options, 
            params.refinement
        );
        return { success: true, asset: result };
    } catch (error: any) {
        console.error("[Action] Regeneration Error:", error);
        return { success: false, error: error.message };
    }
}

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY. This action must run on the server.');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Server Action to download an image from a URL, apply an optional watermark, 
 * and upload it to Supabase Storage using the PostProcessingService.
 */
export async function uploadGeneratedImage(params: {
    url: string;
    taskId: string;
    imageId: string;
    prompt: string;
    altText: string;
    title: string;
    type: 'featured' | 'inline';
    width?: number;
    height?: number;
    paragraphIndex?: number;
    logoUrl?: string;
    projectId?: string;
}) {
    try {
        console.log(`Starting server-side upload for task ${params.taskId}, image ${params.imageId}`);
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch Project Settings for Weight Limit
        let maxKb = 300;

        if (params.projectId) {
            const { data: project } = await supabaseAdmin
                .from('projects')
                .select('settings')
                .eq('id', params.projectId)
                .single();
            
            if (project?.settings?.images) {
                maxKb = project.settings.images.max_kb || 300;
            }
        }

        // 2. Process and Upload via Service
        const processingParams: any = {
            url: params.url,
            fileName: `${params.taskId}/${params.imageId}.webp`,
            width: params.width,
            height: params.height,
            bucket: 'content-images',
        };

        const result = maxKb 
            ? await (PostProcessingService as any).optimizeToLimit(processingParams, maxKb)
            : await (PostProcessingService as any).processAndUpload(processingParams);

        if (!result.success) throw new Error(result.error || "Processing failed");

        // 3. Save Record in DB
        const { error: dbError } = await supabaseAdmin
            .from('task_images')
            .insert({
                task_id: params.taskId,
                storage_path: result.storage_path,
                url: result.url,
                prompt: params.prompt,
                alt_text: params.altText,
                title: params.title,
                type: params.type,
                paragraph_index: params.paragraphIndex
            });

        if (dbError) throw dbError;

        return {
            success: true,
            publicUrl: result.url,
            storagePath: result.storage_path
        };

    } catch (error: any) {
        console.error('Error in uploadGeneratedImage (Server):', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action to upload a manual image (Base64) to Supabase Storage.
 */
export async function uploadManualImage(params: {
    base64: string;
    fileType: string;
    taskId: string;
    fileName: string;
    altText?: string;
    type?: 'featured' | 'inline';
}) {
    try {
        const imageBuffer = Buffer.from(params.base64.split(',')[1], 'base64');
        const fileExt = params.fileType.split('/')[1] || 'jpg';
        const imageId = Math.random().toString(36).substr(2, 9);
        const storagePath = `generations/${params.taskId}/${imageId}.${fileExt}`;

        const supabaseAdmin = getSupabaseAdmin();

        // 1. Upload to Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('content-images')
            .upload(storagePath, imageBuffer, {
                contentType: params.fileType,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('content-images')
            .getPublicUrl(storagePath);

        // 3. Save Record in DB
        const { error: dbError } = await supabaseAdmin
            .from('task_images')
            .insert({
                task_id: params.taskId,
                storage_path: storagePath,
                url: publicUrl,
                prompt: 'Carga manual',
                alt_text: params.altText || params.fileName,
                title: params.fileName,
                type: params.type || 'inline'
            });

        if (dbError) throw dbError;

        return { success: true, publicUrl, storagePath, id: imageId };
    } catch (error: any) {
        console.error('Error in uploadManualImage:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Server Action to delete an image record and its associated storage file.
 */
export async function deleteImageAction(imageId: string, storagePath: string) {
    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Delete from Storage
        const { error: storageError } = await supabaseAdmin.storage
            .from('content-images')
            .remove([storagePath]);

        if (storageError) console.warn('Storage deletion error (continuing):', storageError);

        // 2. Delete from DB
        const { error: dbError } = await supabaseAdmin
            .from('task_images')
            .delete()
            .eq('id', imageId);

        if (dbError) throw dbError;

        return { success: true };
    } catch (error: any) {
        console.error('Error in deleteImageAction:', error);
        return { success: false, error: error.message };
    }
}
