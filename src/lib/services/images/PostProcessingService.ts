import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
    throw new Error("PostProcessingService is server-only and cannot be used in the client.");
}

export interface PostProcessingOptions {
    url?: string;
    buffer?: Buffer;
    width?: number;
    height?: number;
    maxKb?: number;
    watermarkEnabled?: boolean;
    logoUrl?: string;
    fileName: string;
    bucket: string;
}

export interface PostProcessingResult {
    success: boolean;
    url?: string;
    storage_path?: string;
    finalWidth?: number;
    finalHeight?: number;
    error?: string;
}

/**
 * PostProcessingService
 * Advanced image optimization engine using Sharp.
 */
export class PostProcessingService {
    private static readonly DIMENSION_FLOOR = 200;
    private static readonly DOWNSCALE_MULTIPLIER = 0.8;

    /**
     * Processes and uploads an image to Supabase Storage.
     */
    static async processAndUpload(options: PostProcessingOptions): Promise<PostProcessingResult> {
        try {
            const buffer = await this.getSourceBuffer(options);
            let image = sharp(buffer);

            // 1. Physical Resizing
            if (options.width && options.height) {
                image = image.resize(options.width, options.height, {
                    fit: 'cover',
                    position: 'center'
                });
            }

            // 2. Watermark
            if (options.watermarkEnabled && options.logoUrl) {
                image = await this.applyWatermark(image, options.logoUrl);
            }

            // 3. WebP Optimization
            const finalBuffer = await image.webp({ quality: 80 }).toBuffer();
            const meta = await image.metadata();

            // 4. Upload to Supabase
            return await this.uploadToSupabase(finalBuffer, options.fileName, options.bucket, meta);

        } catch (error: any) {
            console.error("[PostProcessing] Error:", error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Specialized pipeline that guarantees a maximum file size in KB.
     */
    static async optimizeToLimit(options: PostProcessingOptions, maxKb: number): Promise<PostProcessingResult> {
        try {
            const buffer = await this.getSourceBuffer(options);
            let mainImage = sharp(buffer);

            if (options.width && options.height) {
                mainImage = mainImage.resize(options.width, options.height, { fit: 'cover' });
            }

            if (options.watermarkEnabled && options.logoUrl) {
                mainImage = await this.applyWatermark(mainImage, options.logoUrl);
            }

            const maxSizeBytes = maxKb * 1024;
            let currentWidth = (await mainImage.metadata()).width || 1024;
            let currentHeight = (await mainImage.metadata()).height || 576;
            let workingImage = mainImage;

            while (true) {
                const getSize = async (q: number) => {
                    const b = await workingImage.clone().webp({ quality: q }).toBuffer();
                    return b.length;
                };

                const quality = await this.binarySearchQuality(getSize, 15, 85, maxSizeBytes);
                const finalBuffer = await workingImage.clone().webp({ quality }).toBuffer();

                if (finalBuffer.length <= maxSizeBytes || currentWidth <= this.DIMENSION_FLOOR) {
                    return await this.uploadToSupabase(finalBuffer, options.fileName, options.bucket, { width: currentWidth, height: currentHeight });
                }

                // Downscale and retry
                currentWidth = Math.max(this.DIMENSION_FLOOR, Math.floor(currentWidth * this.DOWNSCALE_MULTIPLIER));
                currentHeight = Math.max(this.DIMENSION_FLOOR, Math.floor(currentHeight * this.DOWNSCALE_MULTIPLIER));
                workingImage = workingImage.resize(currentWidth, currentHeight);
            }

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private static async getSourceBuffer(options: PostProcessingOptions): Promise<Buffer> {
        if (options.buffer) return options.buffer;
        if (!options.url) throw new Error("No source provided");

        if (options.url.startsWith('data:image')) {
            return Buffer.from(options.url.split(',')[1], 'base64');
        }

        const response = await fetch(options.url);
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        return Buffer.from(await response.arrayBuffer());
    }

    private static async applyWatermark(image: sharp.Sharp, logoUrl: string): Promise<sharp.Sharp> {
        try {
            const res = await fetch(logoUrl);
            if (!res.ok) return image;
            const logoBuffer = Buffer.from(await res.arrayBuffer());
            
            const watermark = await sharp(logoBuffer).resize({ width: 40 }).png().toBuffer();
            return image.composite([{ input: watermark, gravity: 'southeast', blend: 'over' }]);
        } catch {
            return image;
        }
    }

    private static async uploadToSupabase(buffer: Buffer, fileName: string, bucket: string, meta: any): Promise<PostProcessingResult> {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const path = `generations/${fileName}`;

        const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
            contentType: 'image/webp',
            upsert: true
        });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

        return {
            success: true,
            url: publicUrl,
            storage_path: path,
            finalWidth: meta.width,
            finalHeight: meta.height
        };
    }

    private static async binarySearchQuality(
        getSize: (q: number) => Promise<number>,
        min: number,
        max: number,
        limit: number
    ): Promise<number> {
        let low = min, high = max, optimal = min;
        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (await getSize(mid) <= limit) {
                optimal = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }
        return optimal;
    }
}
