/**
 * DataForSEO API Integration Guide for Nous
 * 
 * This file serves as a manual for using the DataForSEO integration within Nous.
 * It covers the implemented services, available endpoints, and usage examples.
 */

import { GoogleAdsKeywordsForSiteLiveTaskInfo } from './types'; // We'll assume types are defined or inferred

/**
 * 1. Introduction
 * DataForSEO is a powerful SEO API provider. We use it to fetch real-world keyword data,
 * SERP analysis, and competitor intelligence.
 * 
 * 2. Authentication
 * Authentication is handled via Basic Auth using credentials from environment variables:
 * - DATAFORSEO_LOGIN
 * - DATAFORSEO_PASSWORD
 * 
 * 3. Implemented Services
 */

export class DataForSeoManual {
    /*
     * A. Domain/URL Keyword Extraction (The "Spy" Feature)
     * Endpoint: https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_site/live
     * 
     * Description:
     * Extracts keywords that a specific URL or Domain is ranking for (or is relevant to)
     * based on Google Ads data. This is crucial for:
     * - Analyzing competitor content.
     * - Finding "gap" keywords.
     * 
     * Usage:
     * DataForSeoService.getKeywordsForSite('https://competitor.com/blog/article', 'page')
     */
    
    /*
     * B. Keyword Metrics (Search Volume)
     * Endpoint: https://api.dataforseo.com/v3/keywords_data/google/search_volume/live
     * 
     * Description:
     * Gets search volume, CPC, and competition for specific keywords.
     * Used when we have a list of keywords and need to know "is this worth targeting?".
     * 
     * Usage:
     * DataForSeoService.getKeywordsMetrics(['seo tips', 'content marketing'])
     */

    /*
     * C. Keyword Suggestions
     * Endpoint: https://api.dataforseo.com/v3/keywords_data/google/keyword_suggestions/live
     * 
     * Description:
     * Generates new ideas based on a seed keyword.
     * 
     * Usage:
     * DataForSeoService.getKeywordSuggestions('marketing')
     */
}

/**
 * 4. Best Practices & Nous Specific Logic
 * 
 * - Semantic Filtering: Raw data from DataForSEO is often messy. We ALWAYS pass the result
 *   through an AI layer (Gemini) to categorize and filter keywords by relevance before
 *   showing them to the user.
 * 
 * - Live vs Standard: We prioritized "Live" endpoints for real-time user feedback,
 *   even though they are slightly more expensive.
 * 
 * - Metrics Storage: We only store high-level metrics in `project_urls` or `tasks`. 
 *   We avoid storing massive raw JSONs unless necessary (in `research_dossier`).
 */
