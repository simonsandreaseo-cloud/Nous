/**
 * Senior Layout Engine - Unified Types
 * This file centralizes all visual asset definitions for the Nous ecosystem.
 */

export type AssetStatus = 'pending' | 'ghost' | 'final' | 'error';
export type LayoutRole = 'hero' | 'feature' | 'icon' | 'info';
export type AssetAlignment = 'left' | 'center' | 'right' | 'full';
export type AssetWrapping = 'inline' | 'wrap' | 'break' | 'behind' | 'front';
export type SupportedLanguage = 'en' | 'es';
export type InlineImageCount = 'auto' | number;

/**
 * ImageAsset: The atomic unit of visual design in Nous.
 * This is the SINGLE SOURCE OF TRUTH for all visual assets.
 */
export interface ImageAsset {
  // --- IDENTIFICATION ---
  id: string;               // Unique Tiptap Node ID
  status: AssetStatus;
  type: 'image' | 'slot';
  role: LayoutRole;
  
  // --- CONTENT ---
  url?: string;
  storagePath?: string;     // Internal path for Supabase/Cloudflare R2
  prompt: string;           // Final prompt (Gemini + Presets + Master)
  alt: string;              // Multilingual SEO alt text
  title: string;            // Editorial title
  rationale?: string;       // AI justification for this placement

  // --- DESIGN (Screaming HTML Portability) ---
  design: {
    width: string;          // Portable format: "100%", "400px"
    align: AssetAlignment;
    wrapping: AssetWrapping;
    aspectRatio: string;    // Ej: "16:9", "1:1"
    pixelDimensions?: {
      w: number;
      h: number;
    };
  };

  // --- EDITORIAL RESILIENCE ---
  positioning: {
    semanticAnchor?: string; // The phrase this asset is anchored to
    paragraphIndex: number;  // Fallback/Legacy index for sorting
    offset?: number;         // Character offset within the anchor
  };
}

export interface ImagePlan {
  featuredImage: Partial<ImageAsset>;
  inlineImages: Partial<ImageAsset>[];
}

export interface HeadlessLayoutResult {
    slots: ImageAsset[];
    generatedImages: ImageAsset[];
    status: 'success' | 'partial_success' | 'error';
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  READING_CONTENT = 'READING_CONTENT',
  ANALYZING_TEXT = 'ANALYZING_TEXT',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  REGENERATING = 'REGENERATING',
  SAVING = 'SAVING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}
