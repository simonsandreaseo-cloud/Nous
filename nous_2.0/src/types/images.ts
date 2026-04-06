export interface BlogPost {
    title?: string;
    paragraphs: string[];
    rawText?: string;
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
        paragraphIndex: number; // Index of the paragraph AFTER which to insert the image
        prompt: string;
        filename: string;
        rationale: string;
        altText: string;
        title: string;
    }[];
}

export interface GeneratedImage {
    id: string;
    url: string; // Base64 data URL
    prompt: string;
    filename: string;
    type: 'featured' | 'inline';
    paragraphIndex?: number;
    altText: string;
    title: string;
    rationale: string;
}

export enum ProcessingStatus {
    IDLE = 'IDLE',
    READING_DOC = 'READING_DOC',
    ANALYZING_TEXT = 'ANALYZING_TEXT',
    GENERATING_IMAGES = 'GENERATING_IMAGES',
    REGENERATING = 'REGENERATING',
    WATERMARKING = 'WATERMARKING',
    COMPLETED = 'COMPLETED',
    ERROR = 'ERROR',
}
