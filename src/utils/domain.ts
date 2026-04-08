/**
 * Extracts a clean project name from a domain.
 * e.g., "apple.com" -> "Apple"
 * e.g., "my-awesome-site.co.uk" -> "My Awesome Site"
 */
export function getProjectNameFromDomain(domain: string): string {
    if (!domain) return "";
    
    // Remove protocol and www
    let name = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "");
    
    // Remove TLD (.com, .org, .co.uk, etc.)
    name = name.replace(/\.[a-z]{2,}(?:\.[a-z]{2,})?$/i, "");
    
    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]/g, " ");
    
    // Capitalize each word
    return name
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Returns a high-quality favicon URL from Google S2 service.
 */
export function getFaviconUrl(domain: string): string {
    if (!domain) return "";
    const cleanDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split('/')[0];
    return `https://www.google.com/s2/favicons?sz=128&domain=${cleanDomain}`;
}

/**
 * Normalizes and fixes common URL malformations, such as duplicated domains.
 * e.g., "https://domain.comdomain.com/path" -> "https://domain.com/path"
 */
export function sanitizeUrl(url: string): string {
    if (!url) return "";
    try {
        let clean = url.trim();
        
        // Error común: dominios pegados sin protocolo
        // e.g., "opticabassol.comwww.opticabassol.com/path"
        
        // 1. Asegurar protocolo para que el constructor URL no falle
        if (!clean.startsWith('http')) {
            clean = 'https://' + clean;
        }
        
        const u = new URL(clean);
        let hostname = u.hostname.toLowerCase();
        
        // 2. Limpieza agresiva de duplicidad en el hostname
        // Buscamos patrones donde el dominio base se repite
        const parts = hostname.split('.');
        if (parts.length >= 4) {
            // Caso: www.dominio.comwww.dominio.com o dominio.comwww.dominio.com
            // Intentamos encontrar la raíz (ej: opticabassol)
            const domainRoot = parts.find(p => p.length > 4 && p !== 'www' && p !== 'com' && p !== 'es');
            if (domainRoot) {
                const firstOccur = hostname.indexOf(domainRoot);
                const secondOccur = hostname.indexOf(domainRoot, firstOccur + domainRoot.length);
                
                if (secondOccur !== -1) {
                    // Hay una repetición. Tomamos desde el inicio hasta justo antes de la repetición
                    // Pero ojo, queremos mantener el TLD correcto.
                    // Lo más seguro es reconstruir basándonos en la primera ocurrencia completa del dominio
                    const tld = parts[parts.length - 1]; // com, es, etc.
                    const fullPattern = `${domainRoot}.${tld}`;
                    if (hostname.split(fullPattern).length > 2) {
                         hostname = hostname.substring(0, hostname.indexOf(fullPattern) + fullPattern.length);
                    }
                }
            }
        }

        // 3. Fallback al método de simetría (por si acaso)
        const mid = Math.floor(hostname.length / 2);
        const firstHalf = hostname.substring(0, mid);
        const secondHalf = hostname.substring(mid);
        if (firstHalf === secondHalf && hostname.length > 0) {
            hostname = firstHalf;
        }
        
        // 4. Normalizar a https://www. si es necesario o mantener el original limpio
        if (!hostname.startsWith('www.') && hostname.split('.').length === 2) {
            hostname = 'www.' + hostname;
        }
        
        return `https://${hostname}${u.pathname}${u.search}${u.hash}`.replace(/\/+$/, '');
    } catch (e) {
        return url;
    }
}
