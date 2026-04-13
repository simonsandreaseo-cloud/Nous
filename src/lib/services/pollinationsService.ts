
import { supabase } from '@/lib/supabase';

/**
 * Service for generating images using Pollinations AI.
 */
export class PollinationsService {
  private static API_URL = 'https://gen.pollinations.ai/image/';
  private static API_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY;

  /**
   * Helper to convert pixel dimensions into descriptive aspect ratio keywords for AI prompts.
   */
  static getAspectRatioPrompt(width: number, height: number): string {
    const ratio = width / height;
    
    if (Math.abs(ratio - 1) < 0.1) return "square 1:1 format";
    if (Math.abs(ratio - (16/9)) < 0.1) return "cinematic 16:9 widescreen aspect ratio";
    if (Math.abs(ratio - (4/3)) < 0.1) return "classic 4:3 aspect ratio";
    if (Math.abs(ratio - (21/9)) < 0.1) return "ultrawide 21:9 anamorphic format";
    if (Math.abs(ratio - (9/16)) < 0.1) return "vertical 9:16 smartphone portrait ratio";
    
    // Fallback for custom ratios
    return `custom ${ratio.toFixed(2)} aspect ratio`;
  }

  /**
   * Normalizes requested dimensions for AI generation. 
   * AI works better with specific standard sizes (multiples of 64 or 128) 
   * and within a reasonable range (usually <= 1280px).
   */
  static getNormalizedDimensions(width: number, height: number): { width: number; height: number } {
    const maxDimension = 1280;
    let nWidth = width;
    let nHeight = height;

    // Scale down if too large
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      nWidth = Math.round(width * scale);
      nHeight = Math.round(height * scale);
    }

    // Snap to nearest multiple of 64 for optimal AI generation
    nWidth = Math.round(nWidth / 64) * 64;
    nHeight = Math.round(nHeight / 64) * 64;

    // Ensure they aren't 0
    return {
      width: Math.max(nWidth, 64),
      height: Math.max(nHeight, 64)
    };
  }

  /**
   * Generates an image URL from a prompt.
   * @param prompt The visual prompt for the image.
   * @param options Generation options.
   * @returns The generated image URL.
   */
  static generateImageUrl(prompt: string, options: {
    width?: number;
    height?: number;
    model?: string;
    seed?: number;
    nologo?: boolean;
    enhance?: boolean;
    aspect_ratio?: string;
  } = {}): string {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required for image generation');
    }

    // Determine finalized prompt with aspect ratio awareness if dimensions provided
    let finalPrompt = prompt;
    if (options.width && options.height) {
        const ar = this.getAspectRatioPrompt(options.width, options.height);
        finalPrompt = `${prompt}, ${ar}`;
    }

    const url = new URL(this.API_URL + encodeURIComponent(finalPrompt));
    
    // Add default options if not provided
    const params: any = {
      model: options.model || 'flux',
      width: options.width || 1024,
      height: options.height || 576,
      nologo: options.nologo !== false,
      seed: options.seed || Math.floor(Math.random() * 1000000),
      'key': this.API_KEY || ''
    };

    // Add optional params
    if (options.enhance) params.enhance = true;

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.append(key, value.toString());
    });

    return url.toString();
  }

  /**
   * Fetches the image from the generated URL and returns its data.
   * NOTE: This might fail from the client due to CORS. Use Server Actions instead.
   */
  static async downloadImage(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText || response.status}`);
    return await response.blob();
  }
}
