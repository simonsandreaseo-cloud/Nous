import { CSVRow, FilterOptions, AggregatedMetrics } from '../types';

type DateString = string; // YYYY-MM-DD
type EntityKey = string; // URL, Keyword, or Country Name

export class DataManager {
    // Raw Data Stores
    private pages: CSVRow[] = [];
    private queries: CSVRow[] = [];
    private countries: CSVRow[] = [];

    // optimized Indices (O(1) Access)
    // 1. Time-based Indices
    private pagesByDate: Map<DateString, CSVRow[]> = new Map();
    private queriesByDate: Map<DateString, CSVRow[]> = new Map();
    private countriesByDate: Map<DateString, CSVRow[]> = new Map();

    // 2. Entity-based Indices
    private pagesByUrl: Map<EntityKey, CSVRow[]> = new Map();
    private queriesByKeyword: Map<EntityKey, CSVRow[]> = new Map();
    private countriesByName: Map<EntityKey, CSVRow[]> = new Map();

    // Metadata
    private minDate: number = Infinity;
    private maxDate: number = -Infinity;

    constructor() { }

    /**
     * Main entry point to ingest and index data.
     * This turns flat CSV arrays into an optimized Graph-like structure.
     */
    public initialize(pages: CSVRow[], queries: CSVRow[], countries: CSVRow[]) {
        this.reset();

        this.pages = pages;
        this.queries = queries;
        this.countries = countries;

        this.buildIndices(this.pages, this.pagesByDate, this.pagesByUrl, 'page');
        this.buildIndices(this.queries, this.queriesByDate, this.queriesByKeyword, 'keyword');
        this.buildIndices(this.countries, this.countriesByDate, this.countriesByName, 'country');

        this.calculateGlobalTimeRange();

        console.log(`[DataManager] Indexing Complete. 
        - Pages: ${this.pagesByUrl.size} unique URLs
        - Keywords: ${this.queriesByKeyword.size} unique Terms
        - Time Range: ${new Date(this.minDate).toISOString()} to ${new Date(this.maxDate).toISOString()}`);
    }

    private reset() {
        this.pagesByDate.clear();
        this.queriesByDate.clear();
        this.countriesByDate.clear();
        this.pagesByUrl.clear();
        this.queriesByKeyword.clear();
        this.countriesByName.clear();
        this.minDate = Infinity;
        this.maxDate = -Infinity;
    }

    /**
     * Generic Index Builder
     */
    private buildIndices(
        data: CSVRow[],
        dateIndex: Map<DateString, CSVRow[]>,
        entityIndex: Map<EntityKey, CSVRow[]>,
        entityField: 'page' | 'keyword' | 'country'
    ) {
        for (const row of data) {
            // 1. Time Indexing
            const dateStr = row.date.toISOString().split('T')[0];
            if (!dateIndex.has(dateStr)) {
                dateIndex.set(dateStr, []);
            }
            dateIndex.get(dateStr)!.push(row);

            // 2. Entity Indexing
            let key = '';
            if (entityField === 'page') key = row.page || 'unknown';
            else if (entityField === 'keyword') key = row.keyword || 'unknown';
            else if (entityField === 'country') key = row.country || 'unknown';

            // Normalize key for loose matching
            key = key.toLowerCase().trim();

            if (!entityIndex.has(key)) {
                entityIndex.set(key, []);
            }
            entityIndex.get(key)!.push(row);

            // Track Time Bounds
            const time = row.date.getTime();
            if (time < this.minDate) this.minDate = time;
            if (time > this.maxDate) this.maxDate = time;
        }
    }

    private calculateGlobalTimeRange() {
        if (this.minDate === Infinity) this.minDate = 0;
        if (this.maxDate === -Infinity) this.maxDate = 0;
    }

    // --- Accessors ---

    public getGlobalDateRange() {
        return { min: new Date(this.minDate), max: new Date(this.maxDate) };
    }

    public getUniqueUrlsCount(): number {
        return this.pagesByUrl.size;
    }

    public getUniqueKeywordsCount(): number {
        return this.queriesByKeyword.size;
    }

    /**
     * Helper to generate date keys between range
     */
    private getDateKeys(start: Date, end: Date): string[] {
        const keys: string[] = [];
        const current = new Date(start);
        current.setHours(0, 0, 0, 0);

        // Safety cap to prevent infinite loops if dates are wild
        const endTs = end.getTime();
        const maxDays = 365 * 5;
        let days = 0;

        while (current.getTime() <= endTs && days < maxDays) {
            keys.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
            days++;
        }
        return keys;
    }

    // =================================================================================
    // PHASE 1.2 & 1.3: UNIFIED QUERY ENGINE & TOOLS API
    // =================================================================================

    /**
     * Core Query Method: Fetches rows based on filters.
     * Uses Time-Index for O(N_days) lookup efficiency instead of scanning full datasets.
     */
    public query(
        source: 'pages' | 'queries' | 'countries',
        filter: FilterOptions
    ): CSVRow[] {
        let rows: CSVRow[] = [];

        // 1. Time Filtering Strategy (Index Scan)
        const start = filter.startDate || new Date(this.minDate);
        const end = filter.endDate || new Date(this.maxDate);

        const dateKeys = this.getDateKeys(start, end);

        // Select Index
        const index = source === 'pages' ? this.pagesByDate :
            source === 'queries' ? this.queriesByDate :
                this.countriesByDate;

        // Gather candidate rows
        for (const key of dateKeys) {
            const dayRows = index.get(key);
            if (dayRows) {
                // Pushing references is fast
                for (let i = 0; i < dayRows.length; i++) {
                    rows.push(dayRows[i]);
                }
            }
        }

        // 2. Attribute Filtering (Scan reduced set)
        if (filter.urlIncludes || filter.keywordIncludes || filter.country) {
            const urlFilter = filter.urlIncludes ? filter.urlIncludes.toLowerCase() : null;
            const kwFilter = filter.keywordIncludes ? filter.keywordIncludes.toLowerCase() : null;
            const countryFilter = filter.country ? filter.country.toLowerCase() : null;

            rows = rows.filter(row => {
                if (urlFilter && (!row.page || !row.page.toLowerCase().includes(urlFilter))) return false;
                if (kwFilter && (!row.keyword || !row.keyword.toLowerCase().includes(kwFilter))) return false;
                if (countryFilter && (!row.country || row.country.toLowerCase() !== countryFilter)) return false;
                return true;
            });
        }

        // 3. Metric Filtering
        if (filter.minClicks !== undefined || filter.minImpressions !== undefined) {
            rows = rows.filter(row => {
                if (filter.minClicks !== undefined && row.clicks < filter.minClicks) return false;
                if (filter.minImpressions !== undefined && row.impressions < filter.minImpressions) return false;
                return true;
            });
        }

        return rows;
    }

    /**
     * Tool: Aggregates metrics for a set of rows.
     */
    public aggregate(rows: CSVRow[]): AggregatedMetrics {
        const total = rows.reduce((acc, row) => ({
            clicks: acc.clicks + row.clicks,
            impressions: acc.impressions + row.impressions,
            positionSum: acc.positionSum + row.position,
            count: acc.count + 1
        }), { clicks: 0, impressions: 0, positionSum: 0, count: 0 });

        return {
            clicks: total.clicks,
            impressions: total.impressions,
            ctr: total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0,
            avgPosition: total.count > 0 ? total.positionSum / total.count : 0,
            count: total.count
        };
    }

    /**
     * Tool: Gets the top X entities (URLs, Keywords) sorted by a metric.
     * Useful for: "What are the top 5 keywords for this URL?"
     */
    public getGroupedRanking(
        rows: CSVRow[],
        groupBy: 'page' | 'keyword' | 'country',
        metric: 'clicks' | 'impressions' = 'clicks',
        limit: number = 10
    ) {
        const map = new Map<string, { clicks: number, impressions: number, posSum: number, count: number }>();

        for (const row of rows) {
            let key = '';
            if (groupBy === 'page') key = row.page || '(not set)';
            else if (groupBy === 'keyword') key = row.keyword || '(not set)';
            else if (groupBy === 'country') key = row.country || '(not set)';

            if (!map.has(key)) map.set(key, { clicks: 0, impressions: 0, posSum: 0, count: 0 });
            const entry = map.get(key)!;
            entry.clicks += row.clicks;
            entry.impressions += row.impressions;
            entry.posSum += row.position;
            entry.count++;
        }

        const results = Array.from(map.entries()).map(([key, val]) => ({
            key,
            clicks: val.clicks,
            impressions: val.impressions,
            ctr: val.impressions > 0 ? (val.clicks / val.impressions) * 100 : 0,
            avgPosition: val.count > 0 ? val.posSum / val.count : 0
        }));

        return results.sort((a, b) => b[metric] - a[metric]).slice(0, limit);
    }
}
