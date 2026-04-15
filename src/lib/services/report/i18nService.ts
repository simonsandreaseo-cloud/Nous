import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';
import { executeTranslation } from '../writer/ai-core';

export class I18nService {

    /**
     * Main entry point for text translation.
     * Uses an AI-driven cascade with fallback to original text.
     */
    static async translateText(
        text: string, 
        targetLanguage: string, 
        sourceLanguage: string = 'English',
        projectId?: string
    ): Promise<string> {
        try {
            return await executeTranslation(text, targetLanguage, sourceLanguage);
        } catch (error: any) {
            await this.logTranslationError(error, { text, targetLanguage, sourceLanguage, projectId });
            return text; // Fallback: return original text
        }
    }

    /**
     * Logs translation failures for auditing and improvement.
     */
    static async logTranslationError(error: any, context: { text: string, targetLanguage: string, sourceLanguage: string, projectId?: string }) {
        console.error(`[I18nService] Translation Error: ${error.message}`, { ...context });
        
        try {
            await supabase.from('translation_errors').insert({
                error_message: error.message,
                input_text: context.text.substring(0, 1000),
                target_lang: context.targetLanguage,
                source_lang: context.sourceLanguage,
                project_id: context.projectId,
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.warn('[I18nService] Could not write to translation_errors table');
        }
    }

    /**
     * Detects language from a URL based on project settings
     */
    static detectLanguage(url: string, settings: Project['i18n_settings']): string | null {
        if (!settings || !settings.languages || settings.languages.length === 0) return null;

        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        const path = urlObj.pathname;
        const hostname = urlObj.hostname;

        let detected: string | null = null;

        // 1. Advanced Regex Extraction (Always priority)
        if (settings.extraction_regex) {
            try {
                const regex = new RegExp(settings.extraction_regex, 'i');
                const match = path.match(regex);
                if (match && (match[1] || match[0])) {
                    detected = (match[1] || match[0]).toLowerCase();
                }
            } catch (e) {
                console.error('[I18nService] Regex Error:', e);
            }
        }

        // 2. Fallback to Predefined Patterns if no custom regex or not found
        if (!detected) {
            if (settings.pattern === 'subdirectory') {
                const match = path.match(/^\/([a-z]{2}(?:-[a-z]{2})?)(\/|$)/i);
                if (match) detected = match[1].toLowerCase();
            } else if (settings.pattern === 'subdomain') {
                const parts = hostname.split('.');
                if (parts.length > 2) detected = parts[0].toLowerCase();
            } else if (settings.pattern === 'prefix') {
                detected = path.split('/')[1]?.toLowerCase();
            }
        }

        // 3. Locale Mapping (Normalize codes)
        if (detected && settings.locale_mapping && settings.locale_mapping[detected]) {
            detected = settings.locale_mapping[detected];
        }

        // 4. Default Language Fallback
        if (!detected || !settings.languages.includes(detected)) {
            console.warn(`[I18nService] Language detection fallback to default: ${settings.default_language}`);
            return settings.default_language || null;
        }

        return detected;
    }

    /**
     * Extracts a "Generic Slug" for semantic matching
     */
    static getGenericSlug(url: string, settings: Project['i18n_settings']): string {
        const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
        let path = urlObj.pathname.toLowerCase().replace(/\/$/, ''); // Remove trailing slash
        
        const detectedLang = this.detectLanguage(url, settings);
        
        // If we have a special pattern, we try to strip the language segment
        if (detectedLang && (settings?.pattern === 'subdirectory' || settings?.pattern === 'prefix' || settings?.extraction_regex)) {
            // Find the segment that corresponds to the language
            const segments = path.split('/').filter(s => s !== '');
            if (segments.length > 0) {
                // If the first segment is the detected language (even with mapping, we check the raw segment)
                // A better way: if custom regex, use it to strip
                if (settings.extraction_regex) {
                    try {
                        const regex = new RegExp(settings.extraction_regex, 'i');
                        path = path.replace(regex, '/');
                    } catch {}
                } else if (path.startsWith(`/${detectedLang}`)) {
                    path = path.substring(detectedLang.length + 1);
                }
            }
        }

        return path.replace(/^\/+/, '') || '/';
    }

    /**
     * Pushes a URL to the scraping queue
     */
    static async queueForScraping(urlId: string, projectId: string) {
        const { error } = await supabase
            .from('url_scraping_queue')
            .upsert({ 
                url_id: urlId, 
                project_id: projectId,
                status: 'pending',
                updated_at: new Date().toISOString()
            });
        
        if (error) console.error('[I18nService] Error queuing URL:', error);
    }
}
