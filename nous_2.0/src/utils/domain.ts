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
        // Handle cases where protocol is missing or malformed
        if (!clean.startsWith('http')) {
            clean = 'https://' + clean.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "www.");
        }
        
        const u = new URL(clean);
        let hostname = u.hostname;
        
        // Fix double domain in hostname
        // This commonly happens when concatenating domain + relative path where the path was already absolute or included the domain
        const mid = Math.floor(hostname.length / 2);
        const firstHalf = hostname.substring(0, mid);
        const secondHalf = hostname.substring(mid);
        
        if (firstHalf === secondHalf && hostname.length > 0) {
            hostname = firstHalf;
        }
        
        return `https://${hostname}${u.pathname}${u.search}${u.hash}`;
    } catch (e) {
        return url;
    }
}
