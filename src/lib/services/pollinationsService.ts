
import { supabase } from '@/lib/supabase';

/**
 * Service for generating images using Pollinations AI.
 */
export class PollinationsService {
  private static API_URL = 'https://gen.pollinations.ai/image/';
  private static API_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY;

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
    const url = new URL(this.API_URL + encodeURIComponent(prompt));
    
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
      if (value !== undefined) url.searchParams.append(key, value.toString());
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
