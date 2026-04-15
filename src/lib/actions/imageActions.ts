
'use server';

import { createClient } from '@supabase/supabase-js';

const DIMENSION_FLOOR = 200;
const DOWNSCALE_MULTIPLIER = 0.8;

export type OptimizationResult = {
    buffer: Buffer;
    finalQuality: number;
    finalWidth: number;
    finalHeight: number;
};

export async function binarySearchQuality(
    getSize: (q: number) => Promise<number>,
    min: number,
    max: number,
    limit: number
): Promise<number> {
    let low = min;
    let high = max;
    let optimal = min;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const size = await getSize(mid);

        if (size <= limit) {
            optimal = mid;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return optimal;
}

export async function optimizeImageWeight(
    baseImage: any,
    maxSizeBytes: number
): Promise<OptimizationResult> {
    let currentWidth = 0;
    let currentHeight = 0;
    
    const meta = await baseImage.metadata();
    currentWidth = meta.width || 0;
    currentHeight = meta.height || 0;

    while (true) {
        // Binary Search for optimal quality in [15, 85]
        const getSize = async (q: number) => {
            const buffer = await baseImage.webp({ quality: q }).toBuffer();
            return buffer.length;
        };

        const finalQuality = await binarySearchQuality(getSize, 15, 85, maxSizeBytes);
        const finalBuffer = await baseImage.webp({ quality: finalQuality }).toBuffer();

        // If it fits, or we've hit the floor, return
        if (finalBuffer.length <= maxSizeBytes || currentWidth <= DIMENSION_FLOOR || currentHeight <= DIMENSION_FLOOR) {
            return {
                buffer: finalBuffer,
                finalQuality,
                finalWidth: currentWidth,
                finalHeight: currentHeight
            };
        }

        // Emergency Downscaling
        currentWidth = Math.max(DIMENSION_FLOOR, Math.floor(currentWidth * DOWNSCALE_MULTIPLIER));
        currentHeight = Math.max(DIMENSION_FLOOR, Math.floor(currentHeight * DOWNSCALE_MULTIPLIER));
        
        baseImage = baseImage.resize(currentWidth, currentHeight, {
            fit: 'cover',
            position: 'center'
        });
    }
}


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
        
        let originalBuffer: Buffer;

        // Determine if URL is a Data URI (Base64 from Vertex AI) or a remote URL (Pollinations)
        if (params.url.startsWith('data:image')) {
            console.log("Processing Data URI (Base64) image payload...");
            const base64Data = params.url.split(',')[1];
            originalBuffer = Buffer.from(base64Data, 'base64');
        } else {
            console.log("Processing remote URL payload...");
            const response = await fetch(params.url);
            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[Image Fetch Error] Status: ${response.status}, Body:`, errorBody);
                throw new Error(`Image request failed: ${response.status} ${response.statusText}`);
            }
            originalBuffer = Buffer.from(await response.arrayBuffer());
        }

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

        // 4. Conversion to WebP with Weight Optimization
        console.log(`Optimizing WebP to fit under ${maxKb}KB...`);
        const maxSizeBytes = maxKb * 1024;
        
        const { buffer: finalBuffer, finalQuality, finalWidth, finalHeight } = await optimizeImageWeight(
            mainImage,
            maxSizeBytes
        );

        if (finalBuffer.length > maxSizeBytes) {
            console.warn(`[Weight Budget Violation] Image still exceeds ${maxKb}KB after maximum optimization (Quality: ${finalQuality}, Dim: ${finalWidth}x${finalHeight}). Final size: ${Math.round(finalBuffer.length / 1024)}KB`);
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
