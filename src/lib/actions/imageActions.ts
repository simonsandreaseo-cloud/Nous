
'use server';

import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase Admin client only on server side
// This prevents environment variables from being mismanaged during client-side shim evaluation
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
 * and upload it to Supabase Storage.
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
    logoUrl?: string; // Optional watermark logo
    projectId?: string; // To fetch settings
}) {
    try {
        console.log(`Starting server-side upload for task ${params.taskId}, image ${params.imageId}`);
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch Project Settings for Weight Limit and Watermark Toggle
        let maxKb = 300;
        let watermarkEnabled = true;

        if (params.projectId) {
            const { data: project } = await supabaseAdmin
                .from('projects')
                .select('settings')
                .eq('id', params.projectId)
                .single();
            
            if (project?.settings?.images) {
                maxKb = project.settings.images.max_kb || 300;
                watermarkEnabled = project.settings.images.watermark_enabled ?? true;
            }
        }
        
        // 1. Download image from Pollinations
        const response = await fetch(params.url);
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Pollinations Error] Status: ${response.status}, Body:`, errorBody);
            throw new Error(`Pollinations request failed: ${response.status} ${response.statusText}`);
        }

        let originalBuffer = Buffer.from(await response.arrayBuffer());
        const sharp = (await import('sharp')).default;
        let mainImage = sharp(originalBuffer);

        // 2. Physical Resizing (if pixels provided)
        if (params.width && params.height) {
            console.log(`Resizing to physical target: ${params.width}x${params.height}`);
            mainImage = mainImage.resize(params.width, params.height, {
                fit: 'cover',
                position: 'center'
            });
        }

        // 3. Apply Watermark if enabled AND logoUrl is provided
        if (watermarkEnabled && params.logoUrl) {
            try {
                const logoResponse = await fetch(params.logoUrl);
                if (logoResponse.ok) {
                    const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
                    const watermarkWidth = 32;
                    
                    const watermark = await sharp(logoBuffer)
                        .resize({ width: watermarkWidth })
                        .png({ quality: 100, compressionLevel: 9 })
                        .toBuffer();
                    
                    const bgWidth = Math.floor(watermarkWidth * 2.2);
                    const bgBuffer = await sharp({
                        create: {
                            width: bgWidth,
                            height: bgWidth,
                            channels: 4,
                            background: { r: 0, g: 0, b: 0, alpha: 0.1 }
                        }
                    })
                    .composite([{ input: watermark, gravity: 'center', blend: 'over' }])
                    .png()
                    .toBuffer();

                    mainImage = mainImage.composite([{
                        input: bgBuffer,
                        gravity: 'southeast',
                        blend: 'over'
                    }]);
                    
                    console.log('Watermark applied successfully');
                }
            } catch (wError) {
                console.warn('Watermark failed, skipping:', wError);
            }
        }

        // 4. Conversion to WebP with Iterative Compression
        console.log(`Optimizing WebP to fit under ${maxKb}KB...`);
        let quality = 85;
        let finalBuffer = await mainImage.webp({ quality }).toBuffer();
        
        // Simple iterative loop to respect max weight
        // We use a small threshold (0.95) to ensure we stay safely below the limit
        const maxSizeBytes = maxKb * 1024;
        
        while (finalBuffer.length > maxSizeBytes && quality > 15) {
            quality -= 10;
            console.log(`Weight limit exceeded (${Math.round(finalBuffer.length / 1024)}KB). Retrying with quality ${quality}...`);
            finalBuffer = await mainImage.webp({ quality }).toBuffer();
        }

        const fileExt = 'webp';
        const fileName = `${params.taskId}/${params.imageId}.${fileExt}`;
        const filePath = `generations/${fileName}`;

        // 5. Upload to Supabase Storage
        const { error: uploadError } = await supabaseAdmin.storage
            .from('content-images')
            .upload(filePath, finalBuffer, {
                contentType: 'image/webp',
                upsert: true
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('content-images')
            .getPublicUrl(filePath);

        // 6. Save Record in DB
        const { error: dbError } = await supabaseAdmin
            .from('task_images')
            .insert({
                task_id: params.taskId,
                storage_path: filePath,
                url: publicUrl,
                prompt: params.prompt,
                alt_text: params.altText,
                title: params.title,
                type: params.type,
                paragraph_index: params.paragraphIndex
            });

        if (dbError) throw dbError;

        console.log(`Successfully processed and uploaded WebP (${Math.round(finalBuffer.length / 1024)}KB)`);

        return {
            success: true,
            publicUrl,
            storagePath: filePath
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
