import { ImageAsset, LayoutRole } from '@/types/images';
import { SemanticAnchorManager } from '../images/SemanticAnchorManager';
import { PatcherMaster } from '../images/PatcherMaster';
/**
 * LayoutService
 * Handles the injection of visual assets into HTML content using Semantic Anchors.
 */
export class LayoutService {
    /**
     * Injects a list of assets into HTML content.
     */
    static async injectAssets(html: string, assets: ImageAsset[], patcherRules: any[] = []): Promise<string> {
        const jsdom = await import('jsdom');
        const JSDOM = jsdom.JSDOM || jsdom.default.JSDOM;
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const patcher = new PatcherMaster(patcherRules);

        assets.forEach(asset => {
            const finalUrl = patcher.transform(asset.url || "", asset.role === 'hero' ? 'featured' : 'inline');
            const styles = PatcherMaster.getScreamingStyles(
                asset.design?.align || 'center', 
                asset.design?.wrapping || 'break', 
                asset.design?.width || '100%'
            );
            
            // Create Editorial Figure
            const figure = document.createElement('figure');
            figure.setAttribute('style', styles);
            figure.setAttribute('data-nous-asset', 'true');
            figure.setAttribute('data-id', asset.id);
            figure.setAttribute('data-role', asset.role);
            
            // Apply specific classes based on role for CSS targeting
            figure.classList.add(`nous-asset-${asset.role}`);

            const img = document.createElement('img');
            img.setAttribute('src', finalUrl);
            img.setAttribute('alt', asset.alt || "");
            img.setAttribute('title', asset.title || "");
            img.setAttribute('loading', 'lazy');
            img.setAttribute('style', 'width:100%; height:auto; display:block; border-radius:1.5rem;');
            figure.appendChild(img);

            // Positioning Logic (Semantic vs Paragraph Index)
            let inserted = false;
            
            if (asset.positioning?.semanticAnchor) {
                const match = SemanticAnchorManager.findBestPosition(document.body as HTMLElement, asset.positioning.semanticAnchor);
                if (match.node) {
                    const node = match.node;
                    if (node.parentElement) {
                        // We insert the figure after the text node containing the anchor
                        node.parentElement.insertBefore(figure, node.nextSibling);
                        inserted = true;
                    }
                }
            }

            // Fallback to paragraph index
            if (!inserted) {
                const paragraphs = document.querySelectorAll('p');
                const targetIdx = Math.min(asset.positioning?.paragraphIndex || 0, paragraphs.length - 1);
                if (paragraphs[targetIdx]) {
                    paragraphs[targetIdx].after(figure);
                } else {
                    document.body.appendChild(figure);
                }
            }
        });

        return dom.serialize()
            .replace(/<html><head><\/head><body>/g, '')
            .replace(/<\/body><\/html>/g, '');
    }
}

