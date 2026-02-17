export interface KeywordMetrics {
    keyword: string;
    search_volume: number;
    competition: number;
    competition_level: string;
    cpc: number;
    monthly_searches: any[];
}

export class DataForSeoService {
    private static readonly BASE_URL = 'https://api.dataforseo.com/v3';

    /**
     * Fetches search volume and difficulty for a list of keywords.
     * Uses the Search Volume Live endpoint.
     */
    static async getKeywordsMetrics(keywords: string[], locationCode: number = 2724, languageCode: string = 'es'): Promise<KeywordMetrics[]> {
        const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

        const response = await fetch(`${this.BASE_URL}/keywords_data/google/search_volume/live`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keywords,
                location_code: locationCode,
                language_code: languageCode
            }])
        });

        const result = await response.json();

        if (!result.tasks || result.tasks[0].status_code !== 20000) {
            throw new Error(`DataForSEO Error: ${result.tasks?.[0]?.status_message || 'Unknown error'}`);
        }

        return result.tasks[0].result.map((item: any) => ({
            keyword: item.keyword,
            search_volume: item.search_volume || 0,
            competition: item.competition || 0,
            competition_level: item.competition_level || 'LOW',
            cpc: item.cpc || 0,
            monthly_searches: item.monthly_searches || []
        }));
    }

    /**
     * Fetches keyword suggestions based on a seed keyword.
     */
    static async getKeywordSuggestions(keyword: string, locationCode: number = 2724, languageCode: string = 'es'): Promise<any[]> {
        const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

        const response = await fetch(`${this.BASE_URL}/keywords_data/google/keyword_suggestions/live`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keyword,
                location_code: locationCode,
                language_code: languageCode,
                include_seed: true,
                limit: 20
            }])
        });

        const result = await response.json();
        return result.tasks?.[0]?.result || [];
    }

    /**
     * Fetches keywords for a specific URL or Domain.
     * Uses the Google Ads Keywords For Site Live endpoint.
     */
    static async getKeywordsForSite(target: string, targetType: 'site' | 'page' = 'page', locationCode: number = 2724, languageCode: string = 'es'): Promise<any[]> {
        const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

        const response = await fetch(`${this.BASE_URL}/keywords_data/google_ads/keywords_for_site/live`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                target,
                target_type: targetType,
                location_code: locationCode,
                language_code: languageCode,
                include_adult_keywords: false,
                sort_by: "relevance"
            }])
        });

        const result = await response.json();

        if (!result.tasks || result.tasks[0].status_code !== 20000) {
            console.error("DataForSEO Error Response:", JSON.stringify(result));
            throw new Error(`DataForSEO Error: ${result.tasks?.[0]?.status_message || 'Unknown error'}`);
        }

        return result.tasks[0].result || [];
    }

    /**
     * Fetches ranked keywords for a specific URL or Domain using DataForSEO Labs.
     * This provides ACTUAL organic ranking data, not just Ads data.
     */
    static async getRankedKeywords(target: string, targetType: 'site' | 'page' = 'page', locationCode: number = 2840, languageCode: string = 'es', limit: number = 100): Promise<any[]> {
        const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

        const response = await fetch(`${this.BASE_URL}/dataforseo_labs/google/ranked_keywords/live`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                target,
                target_type: targetType,
                location_code: locationCode,
                language_code: languageCode,
                limit: limit,
                order_by: ["keyword_data.keyword_info.search_volume,desc"],
                ignore_synonyms: true
            }])
        });

        const result = await response.json();

        if (!result.tasks || result.tasks[0].status_code !== 20000) {
            console.error("DataForSEO Labs Error Response:", JSON.stringify(result));
            throw new Error(`DataForSEO Error: ${result.tasks?.[0]?.status_message || 'Unknown error'}`);
        }

        // Labs API returns a different structure. Items are in tasks[0].result[0].items
        const items = result.tasks[0]?.result?.[0]?.items || [];

        // Map to a cleaner format
        return items.map((item: any) => ({
            keyword: item.keyword_data?.keyword,
            rank: item.ranked_serp_element?.serp_item?.rank_group,
            search_volume: item.keyword_data?.keyword_info?.search_volume,
            cpc: item.keyword_data?.keyword_info?.cpc,
            competition: item.keyword_data?.keyword_info?.competition_level,
            url: item.ranked_serp_element?.serp_item?.url
        }));
    }

    /**
     * Fetches the actual Google SERP (Top results) for a keyword.
     * Essential for "New Content" to know who to emulate.
     */
    static async getSerpForKeyword(keyword: string, locationCode: number = 2724, languageCode: string = 'es'): Promise<any[]> {
        const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');

        const response = await fetch(`${this.BASE_URL}/serp/google/organic/live/advanced`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keyword,
                location_code: locationCode,
                language_code: languageCode,
                device: "desktop",
                os: "windows",
                depth: 10 // Top 10 is enough for competitive analysis
            }])
        });

        const result = await response.json();

        if (!result.tasks || result.tasks[0].status_code !== 20000) {
            console.error("DataForSEO SERP Error:", JSON.stringify(result));
            throw new Error(`DataForSEO Error: ${result.tasks?.[0]?.status_message || 'Unknown error'}`);
        }

        const items = result.tasks[0]?.result?.[0]?.items || [];

        // Filter only organic results
        return items
            .filter((item: any) => item.type === 'organic')
            .map((item: any) => ({
                rank: item.rank_group,
                title: item.title,
                url: item.url,
                breadcrumb: item.breadcrumb,
                description: item.description
            }));
    }
}
