import { ImageAsset, LayoutRole } from '@/types/images';
import { SemanticAnchorManager } from '../images/SemanticAnchorManager';
import { PatcherMaster } from '../images/PatcherMaster';
import * as cheerio from 'cheerio';

/**
 * LayoutService
 * Handles the injection of visual assets into HTML content using Semantic Anchors.
 */
export class LayoutService {
    /**
     * Injects a list of assets into HTML content.
     */
    static async injectAssets(html: string, assets: ImageAsset[], patcherRules: any[] = []): Promise<string> {
        const $ = cheerio.load(html, null, false); // false = don't add html/head/body wrappers
        const patcher = new PatcherMaster(patcherRules);

        assets.forEach(asset => {
            const finalUrl = patcher.transform(asset.url || "", asset.role === 'hero' ? 'featured' : 'inline');
            const styles = PatcherMaster.getScreamingStyles(
                asset.design?.align || 'center', 
                asset.design?.wrapping || 'break', 
                asset.design?.width || '100%'
            );
            
            // Create Editorial Figure HTML string
            const figureHtml = `
            <figure style="${styles}" data-nous-asset="true" data-id="${asset.id}" data-role="${asset.role}" class="nous-asset-${asset.role}">
                <img src="${finalUrl}" alt="${asset.alt || ""}" title="${asset.title || ""}" loading="lazy" style="width:100%; height:auto; display:block; border-radius:1.5rem;">
            </figure>`;

            // Positioning Logic (Semantic vs Paragraph Index)
            let inserted = false;
            
            if (asset.positioning?.semanticAnchor) {
                const match = SemanticAnchorManager.findBestPosition($, asset.positioning.semanticAnchor);
                if (match.node) {
                    // We insert the figure after the block node containing the anchor
                    $(match.node).after(figureHtml);
                    inserted = true;
                }
            }

            // Fallback to paragraph index
            if (!inserted) {
                const paragraphs = $('p');
                const targetIdx = Math.min(asset.positioning?.paragraphIndex || 0, Math.max(0, paragraphs.length - 1));
                if (paragraphs.eq(targetIdx).length > 0) {
                    paragraphs.eq(targetIdx).after(figureHtml);
                } else {
                    // If no paragraphs exist, just append to the root
                    $.root().append(figureHtml);
                }
            }
        });

        return $.html();
    }
}

