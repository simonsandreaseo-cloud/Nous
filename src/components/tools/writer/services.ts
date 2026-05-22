import { GoogleGenerativeAI as GoogleGenAI, Type } from "@google/genai";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export { Type };

import { 
    ArticleConfig, 
    SEOAnalysisResult, 
    DeepSEOAnalysisResult, 
    CompetitorDetail, 
    ContentItem,
    HumanizerConfig,
    VisualResource,
    ImageGenConfig,
    AIImageRequest
} from "@/lib/services/writer/types";

import { buildPrompt as libBuildPrompt } from "@/lib/services/writer/prompts";

export const buildPrompt = libBuildPrompt;

export { type ArticleConfig, type SEOAnalysisResult, type DeepSEOAnalysisResult, type CompetitorDetail, type ContentItem, type HumanizerConfig, type VisualResource, type ImageGenConfig, type AIImageRequest };


// --- Utility Bridges ---
import { 
    autoInterlinkAsync as libAutoInterlinkAsync,
    processHtmlLinks as libProcessHtmlLinks,
    cleanAndFormatHtml as libCleanAndFormatHtml,
    refineStyling as libRefineStyling
} from "@/lib/services/writer/html-processor";

import {
    categorizeUrl as libCategorizeUrl,
    extractDomain as libExtractDomain,
    extractTitleFromUrl as libExtractTitleFromUrl,
    parseCSV as libParseCSV,
    parseDocx as libParseDocx,
    parseHtml as libParseHtml
} from "@/lib/services/writer/data-parsers";

export const categorizeUrl = libCategorizeUrl;
export const extractDomain = libExtractDomain;
export const extractTitleFromUrl = libExtractTitleFromUrl;
export const parseCSV = libParseCSV;
export const parseDocx = libParseDocx;
export const parseHtml = libParseHtml;
export const autoInterlinkAsync = libAutoInterlinkAsync;
export const processHtmlLinks = libProcessHtmlLinks;
export const cleanAndFormatHtml = libCleanAndFormatHtml;
export const refineStyling = libRefineStyling;

// --- Local Helpers ---
const _parseJSON = (text: string) => {
    try {
        const data = JSON.parse(text);
        const safeData = data.map((item: any) => ({
            url: item.url || '',
            title: item.title || 'Item',
            type: item.type || categorizeUrl(item.url),
            search_index: (item.search_index || item.title || '').toLowerCase()
        }));
        return { data: safeData };
    } catch (e) {
        console.error("Invalid JSON", e);
        return { data: [] };
    }
};

import mammoth from 'mammoth';

const _parseDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return result.value;
};

const _parseHtml = async (file: File): Promise<string> => {
    return await file.text();
};

// --- Watermark Compositing (Client Side) ---
export const compositeWatermark = (base64Image: string, base64Watermark: string): Promise<string> => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const mainImg = new Image();
        const watermark = new Image();

        if (!ctx) { resolve(base64Image); return; }

        mainImg.onload = () => {
            canvas.width = mainImg.width;
            canvas.height = mainImg.height;
            ctx.drawImage(mainImg, 0, 0);

            watermark.onload = () => {
                const wmWidth = canvas.width * 0.15;
                const wmAspect = watermark.height / watermark.width;
                const wmHeight = wmWidth * wmAspect;

                const x = canvas.width - wmWidth - (canvas.width * 0.05);
                const y = canvas.height - wmHeight - (canvas.height * 0.05);

                ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;

                ctx.drawImage(watermark, x, y, wmWidth, wmHeight);
                resolve(canvas.toDataURL('image/jpeg', 0.9));
            };
            watermark.src = base64Watermark;
        };
        mainImg.src = base64Image;
    });
};

export function generateBriefingText(seoData: SEOAnalysisResult): string {
    const { top10Urls, lsiKeywords, frequentQuestions, competitors } = seoData;
    
    let brief = \`# Briefing Estratégico de Investigación SEO\\n\\n\`;
    
    if (top10Urls && top10Urls.length > 0) {
        brief += \`## Análisis de Competidores (Top 10)\\n\`;
        top10Urls.forEach((comp: any, i: number) => {
            brief += \`${i + 1}. [\${comp.title}](\${comp.url})\\n\`;
        });
        brief += \`\\n\`;
    }
    
    if (competitors && competitors.length > 0) {
        brief += \`## Inteligencia Competitiva (Snippets Seleccionados)\\n\`;
        competitors.slice(0, 5).forEach((comp, idx) => {
            if (comp.content) {
                const snippet = comp.content.substring(0, 800) + '...';
                brief += \`### [\${idx + 1}] \${comp.title}\\n\${snippet}\\n\\n\`;
            }
        });
        brief += \`\\n\`;
    }
    
    if (lsiKeywords && lsiKeywords.length > 0) {
        brief += \`## Palabras Clave LSI & Semánticas\\n\`;
        lsiKeywords.forEach((k: any) => {
            brief += \`- \${k.keyword}\\n\`;
        });
        brief += \`\\n\`;
    }
    
    if (frequentQuestions && frequentQuestions.length > 0) {
        brief += \`## Preguntas Frecuentes (PAA)\\n\`;
        frequentQuestions.forEach((q: string) => {
            brief += \`- \${q}\\n\`;
        });
        brief += \`\\n\`;
    }
    
    brief += \`\\n---\\n*Generado automáticamente por Nous Research Engine.*\`;
    return brief.trim();
}
