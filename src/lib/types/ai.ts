import { ContentItem } from './content';

export interface ArticleConfig {
    projectName: string;
    niche: string;
    topic: string; // H1
    metaTitle: string; // SEO Title
    keywords: string;
    tone: string;
    wordCount: string;
    refUrls: string;
    refContent: string;
    csvData: any[];
    outlineStructure?: any[];
    approvedLinks?: ContentItem[];
    questions?: string[];
    lsiKeywords?: string[];

    contextInstructions?: string;
    isStrictMode?: boolean;
    strictFrequency?: number;
}

export interface ImageGenConfig {
    style: string;
    colors: string[];
    customDimensions: { w: string, h: string };
    count: string;
    userPrompt: string;
}

export interface AIImageRequest {
    id: string;
    type: 'featured' | 'body';
    context: string;
    prompt: string;
    alt: string;
    title: string;
    filename: string;
    placement: string;
    status: 'pending' | 'generating' | 'done' | 'error';
    imageUrl?: string;
    url?: string;
    userNotes?: string;
    aspectRatio?: string;
}

export interface SEOAnalysisResult {
    nicheDetected: string;
    keywordIdeas: { shortTail: string[]; midTail: string[]; };
    autocompleteLongTail: string[];
    frequentQuestions: string[];
    top10Urls: { title: string; url: string; }[];
    lsiKeywords: { keyword: string; count: string; }[];
    recommendedWords: string[];
    recommendedWordCount: string;
    recommendedSchemas: string[];
    suggestedInternalLinks?: ContentItem[];
    searchIntent?: string;
    keywordDifficulty?: string;
    searchVolume?: string;
    cannibalizationUrls?: string[];
    competitors?: CompetitorDetail[];
}

export interface CompetitorDetail {
    url: string;
    title: string;
    content?: string;
    extractedContent?: string;
    rankingKeywords?: { keyword: string; pos: number; vol: number; }[];
}

export interface DeepSEOAnalysisResult extends SEOAnalysisResult {
    competitors: CompetitorDetail[];
    longTailKeywords?: string[];
}

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
