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
        
        // Match both Markdown [text](url) and HTML <a href="url">
        // Regression notice: this is a simple regex approach, may need DOM parsing for complex cases
        
        // 1. Markdown Links
        patchedContent = patchedContent.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, (match, text, url) => {
            let pUrl = url;
            patchers.forEach(p => pUrl = this.patchUrl(pUrl, p.config?.rules || []));
            return `[${text}](${pUrl})`;
        });

        // 2. HTML Links
        patchedContent = patchedContent.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^\1]+?)\1/gi, (match, quote, url) => {
            let pUrl = url;
            patchers.forEach(p => pUrl = this.patchUrl(pUrl, p.config?.rules || []));
            return match.replace(url, pUrl);
        });

        return patchedContent;
    }

    /**
     * Executes the patcher on the editor content.
     * This is designed to be called from the UI.
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
            const links: { url: string; text: string; pos: number; node: any }[] = [];

            // 1. Collect all links from the editor
            editor.state.doc.descendants((node: any, pos: number) => {
                const linkMark = node.marks.find((m: any) => m.type.name === 'link');
                if (linkMark) {
                    links.push({
                        url: linkMark.attrs.href,
                        originalUrl: linkMark.attrs['data-original-url'],
                        text: node.text || "",
                        pos: pos,
                        node: node
                    });
                }
                return true;
            });

            // 2. Process each link
            for (const link of links) {
                const patchedUrl = this.patchUrl(link.url, rules);
                const isModified = patchedUrl !== link.url;

                results.push({
                    originalUrl: link.url,
                    patchedUrl: patchedUrl,
                    text: link.text,
                    pos: link.pos,
                    success: true,
                    isModified: isModified
                });

                // 3. Apply changes if requested
                if (mode === 'apply' && isModified) {
                    // We use the editor's command to update the link
                    editor.chain().focus()
                        .setTextSelection({ from: link.pos, to: link.pos + link.text.length })
                        .extendMarkRange('link')
                        .setLink({ 
                            href: patchedUrl, 
                            // PERSISTENCE: Keep the original URL if it already exists, otherwise set current
                            'data-original-url': link.originalUrl || link.url 
                        } as any)
                        .run();
                }
            }

            return { success: true, results };
        } catch (e: any) {
            console.error('[LinkPatcherService] Execution error:', e);
            return { success: false, results: [], error: e.message };
        }
    }
}
