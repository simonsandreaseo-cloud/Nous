import { supabase } from '@/lib/supabase';
import type { Project, CustomWidget } from '@/types/project';

export interface PatcherResult {
    originalUrl: string;
    patchedUrl: string;
    text: string;
    pos: number;
    success: boolean;
    error?: string;
    isModified: boolean;
}

export interface PatcherResponse {
    success: boolean;
    results: PatcherResult[];
    error?: string;
}

export class LinkPatcherService {
    /**
     * Normalizes a URL based on Regex rules.
     * Pure logic, can be used in simulation or direct execution.
     */
    static patchUrl(url: string, rules: { regex: string; replacement: string }[]): string {
        if (!rules || rules.length === 0) return url;
        let currentUrl = url;
        rules.forEach(rule => {
            try {
                if (!rule.regex) return;
                const regex = new RegExp(rule.regex, 'g');
                currentUrl = currentUrl.replace(regex, rule.replacement || "");
            } catch (e) {
                console.error('[LinkPatcherService] Regex error:', e);
            }
        });
        return currentUrl;
    }

    /**
     * Finds active patchers configured for a specific process.
     */
    static getPatchersForProcess(project: Project | null, processName: 'internal_linking' | 'translator' | 'writer'): CustomWidget[] {
        if (!project) return [];
        return (project.custom_widgets || []).filter(w => 
            w.is_active && 
            w.type === 'link_patcher' && 
            w.config?.integrations?.[processName] === true
        );
    }

    /**
     * Finds active patchers configured for a specific extractor widget.
     */
    static getPatchersForExtractor(project: Project | null, extractorWidgetId: string): CustomWidget[] {
        if (!project) return [];
        return (project.custom_widgets || []).filter(w => 
            w.is_active && 
            w.type === 'link_patcher' && 
            w.config?.integrations?.extractor?.enabled === true &&
            w.config?.integrations?.extractor?.target_extractor_id === extractorWidgetId
        );
    }

    /**
     * Patches a URL based on any active patchers for a specific process.
     */
    static patchUrlForProcess(url: string, project: Project | null, processName: 'internal_linking' | 'translator' | 'writer'): string {
        const patchers = this.getPatchersForProcess(project, processName);
        let patchedUrl = url;
        patchers.forEach(p => {
            patchedUrl = this.patchUrl(patchedUrl, p.config?.rules || []);
        });
        return patchedUrl;
    }

    /**
     * Finds and patches all links within an HTML or Markdown string.
     */
    static patchHtmlForProcess(content: string, project: Project | null, processName: 'internal_linking' | 'translator' | 'writer'): string {
        if (!content || !project) return content;
        const patchers = this.getPatchersForProcess(project, processName);
        if (patchers.length === 0) return content;

        let patchedContent = content;
        
        // 1. Markdown Links (Regex seguro por su linealidad)
        patchedContent = patchedContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, text, url) => {
            let pUrl = url;
            patchers.forEach(p => pUrl = this.patchUrl(pUrl, p.config?.rules || []));
            return `[${text}](${pUrl})`;
        });

        // 2. HTML Links (DOMParser en Cliente para máxima seguridad, Regex Blindado en Servidor/Edge)
        if (typeof DOMParser !== 'undefined') {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(patchedContent, 'text/html');
                const links = doc.querySelectorAll('a');
                let hasChanges = false;
                
                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href && /^https?:\/\//i.test(href)) {
                        let pUrl = href;
                        patchers.forEach(p => pUrl = this.patchUrl(pUrl, p.config?.rules || []));
                        if (pUrl !== href) {
                            link.setAttribute('href', pUrl);
                            const origUrl = link.getAttribute('data-original-url');
                            if (!origUrl) {
                                link.setAttribute('data-original-url', href);
                            }
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    patchedContent = doc.body.innerHTML;
                }
            } catch (e) {
                console.error('[LinkPatcherService] DOMParser parsing error, falling back to Regex:', e);
                patchedContent = this.patchHtmlUsingRegex(patchedContent, patchers);
            }
        } else {
            patchedContent = this.patchHtmlUsingRegex(patchedContent, patchers);
        }

        return patchedContent;
    }

    /**
     * Resilient Regex HTML patching fallback for Server-side environments (Node.js/Edge) where DOMParser is undefined.
     * Prevents truncation and replacement collisions by matching full href attributes with quotation backreferences.
     */
    private static patchHtmlUsingRegex(content: string, patchers: CustomWidget[]): string {
        return content.replace(/<a\s+([^>]*?\s+)?href=(["'])(https?:\/\/[^\2]+?)\2/gi, (match, before, quote, url) => {
            let pUrl = url;
            patchers.forEach(p => pUrl = this.patchUrl(pUrl, p.config?.rules || []));
            const hrefAttr = `href=${quote}${url}${quote}`;
            const patchedHrefAttr = `href=${quote}${pUrl}${quote}`;
            return match.replace(hrefAttr, patchedHrefAttr);
        });
    }

    /**
     * Executes the patcher on the editor content.
     * Enhanced to support both text links (<a>) and image tags (<img>) or custom assets.
     */
    static async processEditorLinks(
        editor: any, 
        widget: CustomWidget,
        mode: 'simulate' | 'apply' = 'simulate'
    ): Promise<PatcherResponse> {
        if (!editor || !widget || widget.type !== 'link_patcher') {
            return { success: false, results: [], error: 'Invalid config' };
        }

        const rules = widget.config?.rules || [];
        const results: PatcherResult[] = [];

        try {
            // Get current editor HTML content (captures raw HTML, custom tags and standard node elements)
            const html = editor.getHTML();
            if (!html) {
                return { success: true, results: [] };
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const urlTargets: { element: Element; attr: string; originalUrl: string; label: string }[] = [];

            // 1. Gather all standard links (<a> tags)
            const links = Array.from(doc.querySelectorAll('a'));
            links.forEach(el => {
                const href = el.getAttribute('href');
                if (href && href.startsWith('http')) {
                    urlTargets.push({ 
                        element: el, 
                        attr: 'href', 
                        originalUrl: href,
                        label: el.textContent || 'Enlace'
                    });
                }
            });

            // 2. Gather all image elements (<img> tags)
            const imgs = Array.from(doc.querySelectorAll('img'));
            imgs.forEach(el => {
                const src = el.getAttribute('src');
                if (src && src.startsWith('http')) {
                    const alt = el.getAttribute('alt') || '';
                    urlTargets.push({ 
                        element: el, 
                        attr: 'src', 
                        originalUrl: src,
                        label: `Imagen: ${alt ? (alt.length > 25 ? alt.substring(0, 22) + '...' : alt) : 'Sin alt'}`
                    });
                }
            });

            // 3. Gather all custom nous assets
            const customAssets = Array.from(doc.querySelectorAll('nous-asset, [data-nous-asset]'));
            customAssets.forEach(el => {
                const url = el.getAttribute('url') || el.getAttribute('src');
                if (url && url.startsWith('http')) {
                    urlTargets.push({ 
                        element: el, 
                        attr: el.hasAttribute('url') ? 'url' : 'src', 
                        originalUrl: url,
                        label: `Nous Asset: ${el.getAttribute('id') || 'no-id'}`
                    });
                }
            });

            let hasChanges = false;

            urlTargets.forEach((target, index) => {
                const patchedUrl = this.patchUrl(target.originalUrl, rules);
                const isModified = patchedUrl !== target.originalUrl;

                results.push({
                    originalUrl: target.originalUrl,
                    patchedUrl: patchedUrl,
                    text: target.label,
                    pos: index,
                    success: true,
                    isModified: isModified
                });

                if (isModified) {
                    hasChanges = true;
                    target.element.setAttribute(target.attr, patchedUrl);
                    // Also store the original URL for safety inside custom attributes if it is a link
                    if (target.attr === 'href' && !target.element.getAttribute('data-original-url')) {
                        target.element.setAttribute('data-original-url', target.originalUrl);
                    }
                }
            });

            if (mode === 'apply' && hasChanges) {
                // Update Tiptap content seamlessly in a single shot
                editor.commands.setContent(doc.body.innerHTML, false);
            }

            return { success: true, results };
        } catch (e: any) {
            console.error('[LinkPatcherService] Execution error:', e);
            return { success: false, results: [], error: e.message };
        }
    }
}
