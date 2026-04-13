
/**
 * Types for the Image Generation module.
 */

export interface BlogPost {
  paragraphs: string[];
  rawText: string;
}

export type AspectRatio = '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | 'custom';
export type SupportedLanguage = 'en' | 'es';
export type InlineImageCount = 'auto' | number;

export interface CustomDimensions {
  width: number;
  height: number;
}

export interface ImagePlan {
  featuredImage: {
    prompt: string;
    filename: string;
    rationale: string;
    altText: string;
    title: string;
  };
  inlineImages: {
    paragraphIndex: number; 
    prompt: string;
    filename: string;
    rationale: string;
    altText: string;
    title: string;
  }[];
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  filename: string;
  type: 'featured' | 'inline';
  paragraphIndex?: number;
  altText: string;
  title: string;
  width?: number; // Target physical width
  height?: number; // Target physical height
  storage_path?: string;
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
