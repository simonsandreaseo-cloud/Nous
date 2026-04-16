/**
 * PatcherMaster v3.0
 * Senior engine for URL transformation, CDN mapping, and "Screaming HTML" generation.
 * Ensures asset portability and professional delivery across all platforms.
 */

export interface PatcherRule {
    pattern: string;     // Regex pattern
    replacement: string; // Replacement string with $1, $2, etc.
    targetType: 'featured' | 'inline' | 'all'; // Which images this rule applies to
}

export class PatcherMaster {
    private rules: PatcherRule[] = [];
    private supabaseHost?: string;
    private customDomain?: string;

    constructor(rules: PatcherRule[] = [], supabaseHost?: string, customDomain?: string) {
        this.rules = rules;
        this.supabaseHost = supabaseHost;
        this.customDomain = customDomain;
    }

    /**
     * Transforms a raw storage URL into a professional delivery URL.
     */
    transform(url: string, type: 'featured' | 'inline' = 'inline'): string {
        if (!url) return "";
        let patchedUrl = url;

        // 1. Automatic Native Substitution (Nous Storage -> Custom CDN)
        if (this.supabaseHost && this.customDomain && patchedUrl.includes(this.supabaseHost)) {
            const supabasePath = `/storage/v1/object/public`;
            patchedUrl = patchedUrl.replace(
                `https://${this.supabaseHost}${supabasePath}`, 
                `https://${this.customDomain}`
            );
        }

        // 2. Custom Regex Rules
        const applicableRules = this.rules.filter(rule => 
            rule.targetType === 'all' || rule.targetType === type
        );

        for (const rule of applicableRules) {
            try {
                const regex = new RegExp(rule.pattern, 'g');
                if (regex.test(patchedUrl)) {
                    patchedUrl = patchedUrl.replace(regex, rule.replacement);
                }
            } catch (e) {
                console.error("[PatcherMaster] Invalid Regex Pattern:", rule.pattern, e);
            }
        }

        return patchedUrl;
    }

    /**
     * Helper for quick transformations.
     */
    static quickPatch(url: string, type: 'featured' | 'inline' = 'inline', rules: PatcherRule[] = []): string {
        const master = new PatcherMaster(rules);
        return master.transform(url, type);
    }

    /**
     * Generates standard "Screaming HTML" styles based on design attributes.
     */
    static getScreamingStyles(align: string, wrapping: string, width: string = '100%'): string {
        const styles: Record<string, string> = {};

        styles['width'] = width;
        styles['max-width'] = '100%';

        if (align === 'center') {
            styles['display'] = 'block';
            styles['margin-left'] = 'auto';
            styles['margin-right'] = 'auto';
        } else if (align === 'full') {
            styles['width'] = '100%';
            styles['display'] = 'block';
            styles['clear'] = 'both';
        } else if (align === 'left' || align === 'right') {
            styles['float'] = align;
            styles['margin'] = align === 'left' ? '0 1.5rem 1rem 0' : '0 0 1rem 1.5rem';
        }

        if (wrapping === 'break') {
            styles['display'] = 'block';
            styles['clear'] = 'both';
        } else if (wrapping === 'inline') {
            styles['display'] = 'inline-block';
            styles['vertical-align'] = 'middle';
            styles['margin'] = '0 0.5rem';
        }

        return Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';');
    }
}
