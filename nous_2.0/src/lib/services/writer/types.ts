import { SchemaType as Type } from "@google/generative-ai";

export { Type };

// --- Basic Types ---
export interface ContentItem {
    url: string;
    title: string;
    type: 'product' | 'collection' | 'blog' | 'static' | 'other';
    category?: string | null;
    search_index: string;
    score?: number;
    anchor_text?: string;
}

export interface ArticleConfig {
    projectName: string;
    niche: string;
    topic: string; // This is the H1
    metaTitle: string; // This is the SEO Title
    keywords: string;
    tone: string;
    wordCount: string;
    refUrls: string;
    refContent: string;
    csvData: any[]; // Full dataset
    outlineStructure?: any[]; // Passed from Strategy phase
    approvedLinks?: ContentItem[]; // New: List of approved links
    questions?: string[]; // New: Value SERP FAQs
    lsiKeywords?: string[]; // New: LSI and Autocomplete terms
    creativityLevel?: 'low' | 'medium' | 'high'; // New: Creativity level
    contextInstructions?: string; // New: Global Context Instructions
    architectureInstructions?: string; // New: Smart Architecture instructions
    architectureRules?: any[]; // New: Regex-based architecture rules
    isStrictMode?: boolean;
    strictFrequency?: number;
}

export interface VisualResource {
    brand: string;
    description: string;
    url: string;
    isImage: boolean;
}

export interface ImageGenConfig {
    style: string;
    colors: string[];
    customDimensions: { w: string, h: string }; // For featured only
    count: string; // 'auto' or '3', '5', etc.
    userPrompt: string;
}

export interface AIImageRequest {
    id: string;
    type: 'featured' | 'body';
    context: string; // Why this image exists
    prompt: string;
    alt: string;
    title: string;
    filename: string;
    placement: string; // e.g. "After H2 Intro"
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    url?: string; 
    userNotes?: string;
    aspectRatio?: string; // Only for featured
}

// --- SEO & Analysis ---
export interface SEOAnalysisResult {
    nicheDetected: string;
    keywordIdeas: {
        shortTail: string[];
        midTail: string[];
    };
    autocompleteLongTail?: string[];
    frequentQuestions?: string[];
    top10Urls?: { title: string; url: string; snippet?: string; }[];
    top20Urls?: { title: string; url: string; snippet?: string; }[];
    lsiKeywords?: { keyword: string; count: string; }[];
    recommendedWords?: string[];
    recommendedWordCount?: string;
    recommendedSchemas?: string[];
    suggestedInternalLinks?: ContentItem[];
    searchIntent?: string;
    keywordDifficulty?: string;
    searchVolume?: string;
    cannibalizationUrls?: string[];
    peopleAlsoAsk?: { question: string; snippet?: string; title?: string; link?: string; }[];
    competitors?: CompetitorDetail[];
}

export interface CompetitorDetail {
    url: string;
    title: string;
    content?: string;
    extractedContent?: string;
    rankingKeywords?: {
        keyword: string;
        pos: number;
        vol: number;
    }[];
    keywords?: string[]; // Simplified list for UI
    word_count?: number;
    h2_count?: number;
    domain_authority?: number;
    summary?: string;
    headers?: { tag: string; text: string; }[];
    isInvalid?: boolean;
}

export interface DeepSEOAnalysisResult extends SEOAnalysisResult {
    competitors: CompetitorDetail[];
    longTailKeywords?: string[];
    title: string;           // Article H1
    seo_title: string;       // SERP Title
    slug: string;            // URL Slug
    meta_description: string; // SERP Meta Description
    target_keyword: string;
    volume?: number;
    word_count?: number;
    research_dossier?: any;
    brief?: string;
    excerpt?: string;
    schemas?: any;
}

// --- Humanizer ---
export interface HumanizerConfig {
    niche: string;
    audience: string;
    keywords: string;
    notes?: string;
    lsiKeywords?: string[];
    links?: ContentItem[];
    isStrictMode?: boolean;
    strictFrequency?: number;
    questions?: string[];
}
