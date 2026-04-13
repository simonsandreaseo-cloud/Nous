import { supabase } from '@/lib/supabase';
import type { NousExtractorRule, Project, CustomWidget } from '@/types/project';
import { LinkPatcherService } from './link-patcher';

export interface ExtractionResult {
    rule_id: string;
    value: string;
    formatted: string;
    success: boolean;
    error?: string;
}

export interface NousExtractorResponse {
    success: boolean;
    results: ExtractionResult[];
    error?: string;
}

export class NousExtractorService {
    /**
     * Executes the Nous extractors for a given URL against a set of rules.
     */
    static async extract(url: string, rules: NousExtractorRule[]): Promise<NousExtractorResponse> {
        if (!rules || rules.length === 0) return { success: true, results: [] };

        try {
            // Only send necessary data to the edge function
            const payload = {
                url,
                rules: rules.map(r => ({
                    id: r.id,
                    extraction_type: r.extraction_type,
                    extraction_value: r.extraction_value,
                    output_template: r.output_template,
                    clauses: r.clauses,
                    logic_operator: r.logic_operator
                }))
            };

            const { data, error } = await supabase.functions.invoke('logic-bridge-extractor', {
                body: payload
            });

            if (error) throw error;
            return data as NousExtractorResponse;
        } catch (e: any) {
            console.error('[NousExtractorService] Extraction error:', e);
            return { 
                success: false, 
                results: [], 
                error: e.message || 'Error desconocido al ejecutar el extractor' 
            };
        }
    }

    /**
     * Helper to filter active rules for a specific phase from a project.
     */
    static getActiveRulesForPhase(project: Project | null, phase: 'research' | 'planner' | 'writer'): (NousExtractorRule & { parent_widget_id?: string })[] {
        if (!project) return [];
        const results: (NousExtractorRule & { parent_widget_id?: string })[] = [];

        // 1. Get legacy rules (now rebranded)
        const legacyRules = (project.nous_extractors as NousExtractorRule[]) || [];
        legacyRules.forEach(r => {
            if (r.is_active && r.target_phases.includes(phase)) {
                results.push(r);
            }
        });

        // 2. Get rules from modular widgets
        const widgets = project.custom_widgets || [];
        widgets.forEach(widget => {
            if (widget.is_active && widget.type === 'nous_extractor') {
                const widgetRules = (widget.config?.rules || []) as NousExtractorRule[];
                widgetRules.forEach(r => {
                    if (r.is_active && r.target_phases.includes(phase)) {
                        results.push({ ...r, parent_widget_id: widget.id });
                    }
                });
            }
        });

        return results;
    }

    /**
     * Processes a list of links and extracts data using project rules.
     * Supports 'data-original-url' for identity persistence.
     */
    static async processLinks(links: any[], project: Project | null, phase: 'research' | 'planner' | 'writer'): Promise<any[]> {
        const rules = this.getActiveRulesForPhase(project, phase);
        if (rules.length === 0) return links;

        console.log(`[NousExtractorService] Processing ${links.length} links with ${rules.length} active rules for phase ${phase}`);

        const processedLinks = await Promise.all(links.map(async (link) => {
            // Priority: Check if the link has an 'originalUrl' attribute (from data-original-url in DOM)
            // or if it's a plain object with a 'url' property.
            // PATCHING BEFORE EXTRACTION:
            const urlToProcess = link.originalUrl || link.url;
            if (!urlToProcess) return link;

            let patchedUrl = urlToProcess;
            
            // For simplicity, we check if any rule that matches has a parent widget that has a linked patcher
            const matchingRules = rules.filter(rule => {
                try {
                    if (!rule.clauses || rule.clauses.length === 0) return true;
                    
                    const urlClauses = rule.clauses.filter(c => c.field === 'url');
                    if (urlClauses.length === 0) return true; 

                    return urlClauses.some(clause => {
                        const regexSource = clause.value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                        const regex = new RegExp(`^${regexSource}$`, 'i');
                        const regexPermissive = new RegExp(clause.value.replace(/\*/g, '.*'), 'i');
                        return regex.test(patchedUrl) || regexPermissive.test(patchedUrl);
                    });
                } catch (e) {
                    return false;
                }
            });

            if (matchingRules.length === 0) return link;

            // If we have matching rules, apply patching from any linked patchers
            const uniqueParentWidgetIds = Array.from(new Set(matchingRules.map(r => r.parent_widget_id).filter(Boolean)));
            
            uniqueParentWidgetIds.forEach(widgetId => {
                const linkedPatchers = LinkPatcherService.getPatchersForExtractor(project, widgetId!);
                linkedPatchers.forEach(patcher => {
                    patchedUrl = LinkPatcherService.patchUrl(patchedUrl, patcher.config?.rules || []);
                });
            });

            const extraction = await this.extract(patchedUrl, matchingRules);
            
            if (extraction.success && extraction.results.length > 0) {
                return {
                    ...link,
                    extracted_data: extraction.results,
                    shortcode: extraction.results[0].formatted 
                };
            }

            return link;
        }));

        return processedLinks;
    }

    /**
     * Scans an HTML string, extracts information from all links, and injects the results back into the HTML.
     */
    static async applyExtractionToHtml(html: string, project: Project | null, phase: 'research' | 'planner' | 'writer'): Promise<string> {
        if (!html || !project) return html;
        const rules = this.getActiveRulesForPhase(project, phase);
        if (rules.length === 0) return html;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));

        if (links.length === 0) return html;

        for (const link of links) {
            const url = link.getAttribute('data-original-url') || link.getAttribute('href');
            if (!url) continue;

            // Find matching rules for this specific URL
            const matchingRules = rules.filter(rule => {
                try {
                    const urlClauses = rule.clauses.filter(c => c.field === 'url');
                    if (urlClauses.length === 0) return true;
                    return urlClauses.some(clause => {
                        const regexSource = clause.value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
                        const regex = new RegExp(`^${regexSource}$`, 'i');
                        return regex.test(url);
                    });
                } catch (_) { return false; }
            });

            if (matchingRules.length > 0) {
                // Apply patching before extraction
                let patchedUrl = url;
                const uniqueParentWidgetIds = Array.from(new Set(matchingRules.map(r => r.parent_widget_id).filter(Boolean)));
                uniqueParentWidgetIds.forEach(widgetId => {
                    const linkedPatchers = LinkPatcherService.getPatchersForExtractor(project, widgetId!);
                    linkedPatchers.forEach(patcher => {
                        patchedUrl = LinkPatcherService.patchUrl(patchedUrl, patcher.config?.rules || []);
                    });
                });

                const extraction = await this.extract(patchedUrl, matchingRules);
                if (extraction.success && extraction.results.length > 0) {
                    // Inclusion strategy: Append the formatted value after the link text
                    // or replace depending on what the user expects.
                    // Common pattern in this repo: Append [ID: xxx]
                    const result = extraction.results[0];
                    if (result.success) {
                        const placement = matchingRules[0].placement_mode || 'inline';
                        
                        if (placement === 'inline') {
                            const label = doc.createElement('span');
                            label.className = "text-[10px] font-black text-indigo-500 ml-1 bg-indigo-50 px-1 rounded";
                            label.textContent = result.formatted;
                            link.parentNode?.insertBefore(label, link.nextSibling);
                        } else if (placement === 'new_line') {
                            const br = doc.createElement('br');
                            const label = doc.createElement('span');
                            label.className = "text-[10px] font-black text-indigo-500 bg-indigo-50 px-1 rounded block mt-1";
                            label.textContent = result.formatted;
                            link.parentNode?.insertBefore(br, link.nextSibling);
                            link.parentNode?.insertBefore(label, br.nextSibling);
                        } else if (placement === 'new_paragraph') {
                            const parentP = link.closest('p, h1, h2, h3, h4, h5, h6, li');
                            const newP = doc.createElement('p');
                            newP.className = "my-4 font-mono text-[11px] font-black text-indigo-600 bg-indigo-50/50 p-2 rounded-xl text-center border border-indigo-100";
                            newP.textContent = result.formatted;
                            
                            if (parentP && parentP.parentNode) {
                                parentP.parentNode.insertBefore(newP, parentP.nextSibling);
                            } else {
                                link.parentNode?.insertBefore(newP, link.nextSibling);
                            }
                        }
                    }
                }
            }
        }

        return doc.body.innerHTML;
    }
}
