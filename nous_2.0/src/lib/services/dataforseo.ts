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
}
