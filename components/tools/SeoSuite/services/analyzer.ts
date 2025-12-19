
import { ComparisonRow, GlobalSiteStats, ModuleId } from "../types";

// Filter function signature
type ModuleFilter = (row: ComparisonRow, stats: GlobalSiteStats) => boolean;

/**
 * Returns the filtered data for a specific module based on its logic rules.
 */
export const analyzeModule = (moduleId: ModuleId, rows: ComparisonRow[], stats: GlobalSiteStats): ComparisonRow[] => {
    let filterFn: ModuleFilter;

    // Use a slightly more relaxed threshold (15% instead of 20%) and minimum 5 impressions
    // to ensure results for smaller sites.
    const significantImp = Math.max(5, stats.impressionThreshold * 0.15);

    switch (moduleId) {
        case 'GHOST_KEYWORDS':
            // Page 1 (Pos <= 10) AND High Impressions AND 0 Clicks
            filterFn = (row) => {
                const p = row.periodB;
                return p.position <= 10 && p.impressions > significantImp && p.clicks === 0;
            };
            break;

        case 'SEO_DECAY':
            // Lost significant position (> 5) compared to Period A
            filterFn = (row) => {
                return row.periodA.position > 0 && row.diffPos > 5 && row.periodA.impressions > significantImp;
            };
            break;

        case 'LOSERS_PAGE_1':
            // Was Page 1 (Pos <= 10) in A, now Page 2+ (Pos > 10) in B
            filterFn = (row) => {
                return row.periodA.position > 0 && row.periodA.position <= 10 && row.periodB.position > 10;
            };
            break;

        case 'CTR_RED_FLAGS':
            // Top 5 Position BUT CTR is very low
            filterFn = (row) => {
                const p = row.periodB;
                const isTop5 = p.position <= 5 && p.position > 0;
                const isHighVol = p.impressions > significantImp;
                const isLowCtr = p.ctr < 2; 
                return isTop5 && isHighVol && isLowCtr;
            };
            break;

        case 'LOST_KEYWORDS':
            // Existed in A (with clicks/imp), gone in B
            filterFn = (row) => row.isLost && row.periodA.impressions > significantImp;
            break;

        case 'STRIKING_DISTANCE':
            // Pos 11-30 with good volume. Easy wins.
            filterFn = (row) => {
                const p = row.periodB;
                return p.position > 10 && p.position <= 30 && p.impressions > significantImp;
            };
            break;
            
        case 'NEW_KEYWORDS':
            // Didn't exist in A, Strong in B
            filterFn = (row) => row.isNew && row.periodB.impressions > significantImp;
            break;

        case 'CTR_OPPORTUNITIES':
            // Page 2 (Pos > 10) BUT CTR is unexpectedly high
            filterFn = (row) => {
                const p = row.periodB;
                const isPage2 = p.position > 10;
                const isHighCtr = p.ctr > stats.avgCtr || p.ctr > 5;
                return isPage2 && isHighCtr && p.impressions > (significantImp / 2); 
            };
            break;

        default:
            return [];
    }

    return rows.filter(row => filterFn(row, stats)).sort((a, b) => b.periodB.impressions - a.periodB.impressions);
};
