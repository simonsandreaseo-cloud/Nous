import { aiRouter } from '../ai/router';
import { PatcherRule } from './asset-patcher';

export interface AnalysisRequest {
    featuredUrls: string[];
    inlineUrls: string[];
    customDomain?: string;
}

export interface AnalysisResponse {
    globalRules: PatcherRule[];
    featuredRules: PatcherRule[];
    inlineRules: PatcherRule[];
    explanation: string;
}

export class PatcherAnalysisService {
    /**
     * Analyzes a sample of URLs and uses AI to generate the optimal regex rules.
     */
    static async analyzeAndGenerateRules(request: AnalysisRequest): Promise<AnalysisResponse> {
        const { featuredUrls, inlineUrls, customDomain } = request;

        const systemPrompt = `You are a Senior DevOps and Infrastructure Engineer specializing in CDN and URL routing.
Your task is to analyze a set of image URLs and identify the common patterns to create a transformation map.

The goal is to transform these URLs into a clean, custom domain format.

INPUT DATA:
- Featured Image URLs: ${JSON.stringify(featuredUrls)}
- Inline Image URLs: ${JSON.stringify(inlineUrls)}
- Target Custom Domain: ${customDomain || 'Not provided (focus on pattern extraction)'}

RULES FOR GENERATION:
1. Identify the common base path (e.g., the Supabase storage path or a specific CDN folder).
2. Create a Regular Expression (Regex) that captures the unique part of the filename/path.
3. Provide a replacement string that maps the captured group to the new destination.
4. Segment the rules:
   - Global: Applies to all images.
   - Featured: Only for the featured images pattern.
   - Inline: Only for the inline images pattern.

OUTPUT FORMAT:
You MUST respond EXCLUSIVELY in JSON format:
{
  "globalRules": [{ "pattern": "...", "replacement": "...", "targetType": "all" }],
  "featuredRules": [{ "pattern": "...", "replacement": "...", "targetType": "featured" }],
  "inlineRules": [{ "pattern": "...", "replacement": "...", "targetType": "inline" }],
  "explanation": "Short technical explanation of the patterns found"
}`;

        const prompt = `Please analyze the provided URLs and generate the optimal regex rules for the Patcher Master.`;

        try {
            const response = await aiRouter.generate({
                prompt,
                systemPrompt,
                jsonMode: true,
                model: 'gemini-2.0-flash'
            });

            if (!response.text) throw new Error("AI returned empty response");

            const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson) as AnalysisResponse;
        } catch (error: any) {
            console.error("[PatcherAnalysisService] Error:", error);
            throw new Error("Failed to analyze URL patterns: " + error.message);
        }
    }
}
