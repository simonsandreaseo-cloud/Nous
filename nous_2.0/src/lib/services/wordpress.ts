export interface WPPostParams {
    title: string;
    content: string;
    status?: 'publish' | 'draft' | 'pending';
    featured_image_url?: string;
    categories?: number[];
    tags?: string[];
    post_id?: number; // For updates
}

export interface WPResponse {
    success: boolean;
    post_id: number;
    url: string;
    edit_url: string;
}

export class WordPressService {
    /**
     * Publishes content to a WordPress site using the Nous Bridge plugin
     * 
     * @param siteUrl The target WordPress site URL (e.g., https://mysite.com)
     * @param token The secret token configured in the Nous Bridge plugin settings
     * @param params The post data
     */
    static async publishPost(
        siteUrl: string,
        token: string,
        params: WPPostParams
    ): Promise<WPResponse> {
        const cleanUrl = siteUrl.replace(/\/$/, '');
        const endpoint = `${cleanUrl}/wp-json/nous/v1/publish`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Nous-Token': token
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error de WordPress: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error('Error al publicar en WordPress:', error);
            throw error;
        }
    }

    /**
     * Validates if the Nous Bridge plugin is active and reachable
     */
    static async validateConnection(siteUrl: string, token: string): Promise<boolean> {
        // We can just try a dry-run or a specific check endpoint if we add one.
        // For now, this is a placeholder.
        return true;
    }
}
