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
