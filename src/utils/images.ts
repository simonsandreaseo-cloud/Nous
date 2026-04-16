/**
 * Utility to generate optimized thumbnail URLs using Supabase Image Transformation.
 * Requires Supabase Pro or higher, or a compatible proxy.
 * If transformation is not available, returns the original URL.
 */
export function getThumbnailUrl(url: string | null | undefined, width = 200, quality = 70): string {
    if (!url) return '';
    
    // Check if it's a Supabase URL
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
        // Syntax for Supabase Image Transformation:
        // Render endpoint is /render/image/public/ instead of /object/public/
        return url.replace('/object/public/', '/render/image/public/') + `?width=${width}&quality=${quality}&format=webp`;
    }
    
    // For external URLs (like Pollinations), we just return the original 
    // unless we implement a proxy later.
    return url;
}
