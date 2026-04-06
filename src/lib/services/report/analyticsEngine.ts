
import { GscRow } from '@/types/report';

export class AnalyticsEngine {
    /**
     * Calculates the distribution of keywords by position (Top 3, 10, 20, 100).
     * This runs on the server to ensure accuracy over large datasets.
     */
    static calculateKeywordDistribution(queries: { position: number }[]) {
        const distribution = {
            top3: 0,
            top10: 0,
            top20: 0,
            top100: 0
        };

        if (!queries || queries.length === 0) return distribution;

        queries.forEach(q => {
            const pos = q.position;
            if (pos <= 3) distribution.top3++;
            if (pos <= 10) distribution.top10++;
            if (pos <= 20) distribution.top20++;
            if (pos <= 100) distribution.top100++;
        });

        // Note: Top 10 includes Top 3. Top 20 includes Top 10. 
        // If we want exclusive buckets (4-10), we would subtract. 
        // Standard SEO reports usually show cumulative "Top X" counts.

        return distribution;
    }

    /**
     * Aggregates metrics for a specific subset of data defined by a filter function.
     * Useful for custom charts (e.g., "Brand Keywords" or specific URL patterns).
     */
    static aggregateMetrics(rows: GscRow[], filterFn: (row: GscRow) => boolean) {
        const result = {
            clicks: 0,
            impressions: 0,
            ctr: 0,
            position: 0,
            count: 0
        };

        const filtered = rows.filter(filterFn);
        if (filtered.length === 0) return result;

        let totalPosition = 0;
        const totalCtr = 0; // Weighted average would be better, but simple avg for pos is standard GSC approximation

        filtered.forEach(r => {
            result.clicks += r.clicks;
            result.impressions += r.impressions;
            totalPosition += r.position * r.impressions; // Weighted by impressions for accurate average
            // CTR is derived from Clicks / Impressions for accuracy
        });

        result.count = filtered.length;
        result.position = result.impressions > 0 ? totalPosition / result.impressions : 0;
        result.ctr = result.impressions > 0 ? (result.clicks / result.impressions) * 100 : 0;

        return result;
    }

    /**
     * Advanced: Groups data by strict regex pattern on Keys (Query or Page)
     */
    static groupDataByPattern(rows: GscRow[], key: 'query' | 'page', patterns: { name: string, regex: string }[]) {
        const groups: Record<string, { clicks: number, impressions: number, count: number }> = {};

        // Initialize groups
        patterns.forEach(p => groups[p.name] = { clicks: 0, impressions: 0, count: 0 });
        groups['Other'] = { clicks: 0, impressions: 0, count: 0 };

        rows.forEach(row => {
            const val = key === 'query' ? row.keyword : row.page;
            if (!val) return;

            let matched = false;
            for (const p of patterns) {
                if (new RegExp(p.regex, 'i').test(val)) {
                    groups[p.name].clicks += row.clicks;
                    groups[p.name].impressions += row.impressions;
                    groups[p.name].count++;
                    matched = true;
                    break; // Assign to first match
                }
            }

            if (!matched) {
                groups['Other'].clicks += row.clicks;
                groups['Other'].impressions += row.impressions;
                groups['Other'].count++;
            }
        });

        return Object.entries(groups).map(([name, metrics]) => ({
            name,
            ...metrics
        }));
    }
}
