import { PatcherMaster, PatcherRule } from '../images/PatcherMaster';

/**
 * NousAssetPatcher v3.0 (Powered by PatcherMaster)
 * 
 * Orchestrates the final HTML transformation for production export.
 */

export interface PatcherSettings {
    useNousDimensions: boolean;
    hideFeatured: boolean;
    hideAllImages: boolean;
    rules: PatcherRule[];
    assetsMap: Record<string, string>; // Mapping of ID -> Final URL if manual override
    supabaseHost?: string; 
    customDomain?: string;
}

export class NousAssetPatcher {
    /**
     * Patches the HTML applying all active rules and Screaming HTML logic.
     */
    static patch(html: string, settings: PatcherSettings): string {
        if (typeof window === 'undefined' || !html) return html;

        const master = new PatcherMaster(settings.rules, settings.supabaseHost, settings.customDomain);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Find assets and slots
        const elements = Array.from(doc.querySelectorAll('nous-asset, [data-nous-asset], div[data-type="imageSlot"]'));

        elements.forEach(element => {
            const isSlot = element.getAttribute('data-type') === 'imageSlot';
            const id = element.getAttribute('id') || element.getAttribute('data-id');
            const role = element.getAttribute('data-role') || element.getAttribute('type') || 'feature';
            
            // 1. CLEANUP SLOTS: We don't want placeholders in the production export.
            if (isSlot) {
                element.remove();
                return;
            }

            // 2. MASKING RULES
            if (role === 'hero' && settings.hideFeatured) {
                element.remove();
                return;
            }

            if (settings.hideAllImages) {
                const comment = doc.createComment(` [Nous Asset Masked: ${id || 'no-id'}] `);
                element.parentNode?.replaceChild(comment, element);
                return;
            }

            // 3. URL TRANSFORMATION
            let rawUrl = element.getAttribute('url') || element.getAttribute('src') || '';
            let finalUrl = master.transform(rawUrl, role === 'hero' ? 'featured' : 'inline');

            // Manual override priority
            if (id && settings.assetsMap[id]) {
                finalUrl = settings.assetsMap[id];
            }

            // 4. BUILD FINAL SCREAMING HTML
            const width = element.getAttribute('width') || element.getAttribute('data-width') || '100%';
            const align = element.getAttribute('align') || element.getAttribute('data-align') || 'center';
            const wrapping = element.getAttribute('wrapping') || element.getAttribute('data-wrapping') || 'break';
            const alt = element.getAttribute('alt') || '';
            const title = element.getAttribute('title') || '';

            const figure = doc.createElement('figure');
            figure.setAttribute('style', PatcherMaster.getScreamingStyles(align, wrapping, width));
            figure.setAttribute('data-nous-asset-exported', 'true');
            if (id) figure.setAttribute('data-id', id);

            const img = doc.createElement('img');
            img.setAttribute('src', finalUrl);
            img.setAttribute('alt', alt);
            if (title) img.setAttribute('title', title);
            img.setAttribute('loading', 'lazy');
            img.setAttribute('style', 'width:100%; height:auto; display:block; border-radius:1.5rem;');
            
            // Physical dimensions for older CMS support
            if (settings.useNousDimensions && width.includes('px')) {
                img.setAttribute('width', width.replace('px', ''));
            }

            figure.appendChild(img);
            element.parentNode?.replaceChild(figure, element);
        });

        return doc.body.innerHTML;
    }
}
