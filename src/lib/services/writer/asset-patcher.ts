/**
 * NousAssetPatcher v2.0
 * 
 * El "Maestro Sastre" del contenido de Nous.
 * Se encarga de transformar el HTML semántico de Nous en el HTML productivo
 * aplicando reglas de dimensiones, alineación y parches de URL.
 */

export interface PatcherRule {
    pattern: string;     // Regex pattern
    replacement: string; // Replacement string with $1, $2, etc.
}

export interface PatcherSettings {
    useNousDimensions: boolean;
    hideFeatured: boolean;
    hideAllImages: boolean;
    rules: PatcherRule[];
    assetsMap: Record<string, string>; // Mapping of ID -> Final URL if manual
}

export class NousAssetPatcher {
    /**
     * Procesa el HTML aplicando todas las reglas y máscaras habilitadas.
     */
    static patch(html: string, settings: PatcherSettings): string {
        if (typeof window === 'undefined' || !html) return html;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const assets = doc.querySelectorAll('nous-asset');

        assets.forEach(asset => {
            const id = asset.getAttribute('id');
            const type = asset.getAttribute('type');
            
            // 1. APLICAR MÁSCARAS (Switches)
            
            // Caso: Ocultar portada
            if (type === 'featured' && settings.hideFeatured) {
                asset.remove();
                return;
            }

            // Caso: Ocultar todas las imágenes (Carga manual en CMS)
            if (settings.hideAllImages) {
                const comment = doc.createComment(` [Nous Asset Mask: ${id || 'no-id'}] `);
                asset.parentNode?.replaceChild(comment, asset);
                return;
            }

            // 2. PROCESAR URL
            let finalUrl = asset.getAttribute('url') || '';
            const manualUrl = id ? settings.assetsMap[id] : null;

            if (manualUrl) {
                finalUrl = manualUrl;
            } else {
                // Aplicar reglas de Regex si existen
                settings.rules.forEach(rule => {
                    try {
                        const regex = new RegExp(rule.pattern, 'g');
                        finalUrl = finalUrl.replace(regex, rule.replacement);
                    } catch (e) {
                        console.error('Error applying patcher rule:', rule, e);
                    }
                });
            }

            // 3. CONSTRUIR HTML FINAL (Estructura Universal)
            const width = asset.getAttribute('width') || '100%';
            const height = asset.getAttribute('height') || 'auto';
            const align = asset.getAttribute('align') || 'center';
            const alt = asset.getAttribute('alt') || '';

            // Estructura sugerida por el Gentleman (CMS compatible)
            // <div class="container"><b><img ...></b></div>
            const container = doc.createElement('div');
            container.className = 'nous-patch-container';
            
            // Aplicar estilo de alineación
            const wrapperStyle = this.getWrapperStyle(align);
            Object.assign(container.style, wrapperStyle);

            const b = doc.createElement('b');
            const img = doc.createElement('img');
            
            img.setAttribute('src', finalUrl);
            img.setAttribute('alt', alt);
            img.setAttribute('loading', 'lazy');
            
            // Solo aplicamos dimensiones si el switch está ON
            if (settings.useNousDimensions) {
                if (width !== '100%') {
                    // Si es px, lo pasamos a atributo width puro para el CMS
                    const cleanWidth = width.replace('px', '');
                    img.setAttribute('width', cleanWidth);
                }
                if (height !== 'auto') {
                    const cleanHeight = height.replace('px', '');
                    img.setAttribute('height', cleanHeight);
                }
            }

            b.appendChild(img);
            container.appendChild(b);

            asset.parentNode?.replaceChild(container, asset);
        });

        return doc.body.innerHTML;
    }

    private static getWrapperStyle(align: string): Partial<CSSStyleDeclaration> {
        switch (align) {
            case 'left':
                return { float: 'left', margin: '0 2rem 2rem 0', display: 'inline-block' };
            case 'right':
                return { float: 'right', margin: '0 0 2rem 2rem', display: 'inline-block' };
            case 'center':
            default:
                return { display: 'block', margin: '2rem auto', textAlign: 'center' };
        }
    }
}
