import { ImageAsset } from '@/types/images';
import { SemanticAnchorManager } from '../images/SemanticAnchorManager';
import { PatcherMaster } from '../images/PatcherMaster';
import { JSDOM } from 'jsdom';

/**
 * LayoutService
 * Handles the injection of visual assets into HTML content using Semantic Anchors.
 */
export class LayoutService {
    /**
     * Injects a list of assets into HTML content.
     */
    static injectAssets(html: string, assets: ImageAsset[], patcherRules: any[] = []): string {
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
                const match = SemanticAnchorManager.findBestPosition(document.body, asset.positioning.semanticAnchor);
                if (match.pos !== -1) {
                    // Find the actual node at that position and insert
                    const node = this.findNodeAtPos(document.body, match.pos);
                    if (node && node.parentElement) {
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

    private static findNodeAtPos(root: any, targetPos: number): any {
        let currentPos = 0;
        const walker = root.ownerDocument.createTreeWalker(root, 4); // SHOW_TEXT
        let node;
        while ((node = walker.nextNode())) {
            const len = node.textContent.length;
            if (currentPos + len >= targetPos) return node;
            currentPos += len;
        }
        return null;
    }
}
