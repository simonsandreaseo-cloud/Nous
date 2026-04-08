
'use server';

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

// We use service role to bypass RLS in this controlled server-side environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

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
    paragraphIndex?: number;
    logoUrl?: string; // Optional watermark logo
}) {
    try {
        console.log(`Starting server-side upload for task ${params.taskId}, image ${params.imageId}`);
        
        // 1. Download image from Pollinations
        const response = await fetch(params.url);
        if (!response.ok) {
            throw new Error(`Pollinations request failed: ${response.status} ${response.statusText}`);
        }

        let imageBuffer = Buffer.from(await response.arrayBuffer());

        // 2. Apply Watermark if logoUrl is provided
        if (params.logoUrl) {
            try {
                console.log(`Applying watermark from: ${params.logoUrl}`);
                const logoResponse = await fetch(params.logoUrl);
                if (logoResponse.ok) {
                    const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
                    
                    const mainImage = sharp(imageBuffer);
                    const metadata = await mainImage.metadata();
                    
                    if (metadata.width && metadata.height) {
                        // Logo size: 15% of the main image width
                        const watermarkWidth = Math.floor(metadata.width * 0.15);
                        
                        // Process and resize logo
                        const watermark = await sharp(logoBuffer)
                            .resize({ width: watermarkWidth })
                            .composite([{
                                input: Buffer.from([255, 255, 255, 128]), // Adding some transparency if needed, or using linear
                                blend: 'dest-in' // This is more complex, let's keep it simple
                            }])
                            .toBuffer();
                        
                        // We'll use a simpler opacity approach with composite
                        // Note: sharp doesn't have a direct 'opacity' for composite without manual alpha channel manipulation
                        // But we can just use the logo as is, or assume it has alpha.
                        
                        imageBuffer = await mainImage
                            .composite([{
                                input: watermark,
                                gravity: 'southeast',
                                blend: 'over'
                            }])
                            .toBuffer();
                    }
                }
            } catch (watermarkError) {
                console.error('Watermark processing failed, continuing with original image:', watermarkError);
            }
        }

        const fileExt = 'jpg';
        const fileName = `${params.taskId}/${params.imageId}.${fileExt}`;
        const filePath = `generations/${fileName}`;

        // 3. Upload to Supabase Storage using Admin client
        const { error: uploadError } = await supabaseAdmin.storage
            .from('content-images')
            .upload(filePath, imageBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        // 4. Get Public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('content-images')
            .getPublicUrl(filePath);

        // 5. Save Record in DB using Admin client
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

        return {
            success: true,
            publicUrl,
            storagePath: filePath
        };

    } catch (error: any) {
        console.error('Error in uploadGeneratedImage (Server):', error);
        return {
            success: false,
            error: error.message || 'Error desconocido en el servidor'
        };
    }
}
