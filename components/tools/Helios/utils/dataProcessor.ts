
export interface GSCRow {
    query: string;
    page: string;
    clicks: number;
    impressions: number;
    position: number;
    ctr: number;
}

// --- MODULE 1: OPPORTUNITIES ---

export const findStrikingDistanceOpportunities = (rows: GSCRow[]): GSCRow[] => {
    if (!rows || rows.length === 0) return [];

    // Filter for keywords in position 11 to 20 (The "Striking Distance")
    return rows.filter(row => {
        return row.position >= 10.5 && row.position <= 20.5 && row.impressions > 50;
    }).sort((a, b) => b.impressions - a.impressions);
};

export const calculateGrowthPotential = (row: GSCRow, averageCTRTop3 = 0.3): number => {
    const potentialClicks = row.impressions * averageCTRTop3;
    return potentialClicks - row.clicks;
};

// --- MODULE 2: STATUS & ANOMALIES (Detección de Caídas) ---

export interface AnomalyResult {
    type: 'CRITICAL_DROP' | 'CTR_ISSUE' | 'DEMAND_DROP' | 'RANKING_DROP';
    severity: 'high' | 'medium' | 'low';
    metric: string;
    change: number;
    diagnosis: string;
}

/**
 * Compares two data points (e.g., this month vs last month) to diagnose drops.
 */
export const diagnoseTrafficDrop = (
    currentClicks: number, pastClicks: number,
    currentImpressions: number, pastImpressions: number,
    currentPosition: number, pastPosition: number
): AnomalyResult | null => {

    const clickChange = (currentClicks - pastClicks) / (pastClicks || 1);
    const impChange = (currentImpressions - pastImpressions) / (pastImpressions || 1);

    // Threshold: -20% drop
    if (clickChange < -0.20) {
        // Scenario 1: Impressions stable, Clicks down -> CTR Issue (Bad Title/Description or SERP feature lost)
        if (impChange > -0.05) {
            return {
                type: 'CTR_ISSUE',
                severity: 'high',
                metric: 'CTR',
                change: clickChange,
                diagnosis: 'Traffic dropped but demand (impressions) is stable. You likely lost CTR due to a better competitor title or a new SERP feature (Ad/AI snippet).'
            };
        }

        // Scenario 2: Impressions down -> Demand Drop or Ranking Drop
        // Check Position
        const posChange = currentPosition - pastPosition; // Positive means rank got worse (higher number)
        if (posChange > 3) {
            return {
                type: 'RANKING_DROP',
                severity: 'high',
                metric: 'Position',
                change: posChange,
                diagnosis: `You lost rankings (moved down ${posChange.toFixed(1)} positions). This caused the traffic drop.`
            };
        } else {
            return {
                type: 'DEMAND_DROP',
                severity: 'medium',
                metric: 'Impressions',
                change: impChange,
                diagnosis: 'Market demand dropped (fewer people searching), but your rankings are stable. Seasonal or trend issue.'
            };
        }
    }

    return null;
};

// --- MODULE 3: CANNIBALIZATION ---

export interface CannibalizationGroup {
    query: string;
    urls: string[];
    conflict: string;
}

/**
 * Detects if multiple URLs are answering the same query and fighting for position.
 */
export const detectCannibalization = (rows: GSCRow[]): CannibalizationGroup[] => {
    const queryMap = new Map<string, GSCRow[]>();

    // Group by Query
    rows.forEach(row => {
        if (!queryMap.has(row.query)) {
            queryMap.set(row.query, []);
        }
        queryMap.get(row.query)?.push(row);
    });

    const issues: CannibalizationGroup[] = [];

    queryMap.forEach((groupRows, query) => {
        // We only care if meaningful traffic is split (e.g. at least 2 URLs with > 10 clicks)
        const activeUrls = groupRows.filter(r => r.clicks > 5);

        if (activeUrls.length > 1) {
            // Check if positions are close (fighting)
            // e.g. URL A is pos 5, URL B is pos 6
            const sorted = activeUrls.sort((a, b) => a.position - b.position);
            const posDiff = Math.abs(sorted[0].position - sorted[1].position);

            if (posDiff < 5) {
                issues.push({
                    query: query,
                    urls: activeUrls.map(u => u.page),
                    conflict: `Severe conflict between ${activeUrls[0].page} (Pos ${activeUrls[0].position.toFixed(1)}) and ${activeUrls[1].page} (Pos ${activeUrls[1].position.toFixed(1)}). Google is confused.`
                });
            }
        }
    });

    return issues;
};

// --- MODULE 4: EXPECTED CTR (Visual Curve Analysis) ---

/**
 * Basic logarithmic regression model for CTR curve.
 * Expected CTR ~ 30% for Pos 1, decreasing rapidly.
 */
export const getExpectedCTR = (position: number): number => {
    if (position < 1) return 0;
    // Simple power law approximation: CTR = 0.35 * pos^(-0.8)
    // Pos 1 = 35%, Pos 10 = 5%
    return 0.35 * Math.pow(position, -0.85);
};

export const findUnderperformingCTR = (rows: GSCRow[]): GSCRow[] => {
    return rows.filter(row => {
        if (row.position > 20) return false; // Too noisy
        if (row.impressions < 100) return false; // Not enough data

        const expected = getExpectedCTR(row.position);
        // Flag if actual CTR is 50% less than expected

        // --- MODULE 5: STRATEGIC OVERVIEW (Attack vs Defend) ---

        export interface StrategicMatrix {
            fortress: GSCRow[];     // Pos 1-3 (Protect)
            battleground: GSCRow[]; // Pos 4-10 (Push)
            opportunity: GSCRow[];  // Pos 11-20 (Striking Distance)
            neglected: GSCRow[];    // Pos 20+ (Ignore/Fix)
        }

        export const classifyKeywords = (rows: GSCRow[]): StrategicMatrix => {
            const matrix: StrategicMatrix = { fortress: [], battleground: [], opportunity: [], neglected: [] };

            rows.forEach(row => {
                if (row.position <= 3.5) matrix.fortress.push(row);
                else if (row.position <= 10.5) matrix.battleground.push(row);
                else if (row.position <= 20.5) matrix.opportunity.push(row);
                else matrix.neglected.push(row);
            });

            return matrix;
        };

        // --- MODULE 6: NEW KEYWORDS (Zero to Hero) ---

        export const findNewKeywords = (currentRows: GSCRow[], pastRows: GSCRow[]): GSCRow[] => {
            const pastQuerySet = new Set(pastRows.map(r => r.query));

            return currentRows.filter(row =>
                !pastQuerySet.has(row.query) && row.impressions > 10
            ).sort((a, b) => b.impressions - a.impressions);
        };

        // --- MODULE 7: CONCENTRATION RISK (Pareto) ---

        export const calculateConcentration = (rows: GSCRow[]) => {
            const totalClicks = rows.reduce((sum, r) => sum + r.clicks, 0);
            const sorted = [...rows].sort((a, b) => b.clicks - a.clicks);

            let currentSum = 0;
            let top10percentage = 0;

            for (let i = 0; i < Math.min(10, sorted.length); i++) {
                currentSum += sorted[i].clicks;
            }

            if (totalClicks > 0) top10percentage = (currentSum / totalClicks) * 100;

            return {
                riskLevel: top10percentage > 80 ? 'HIGH' : top10percentage > 50 ? 'MEDIUM' : 'LOW',
                top10Share: top10percentage,
                totalClicks
            };
        };

        // --- MODULE 8: SEGMENTS (Brand vs Non-Brand) ---

        export const analyzeSegments = (rows: GSCRow[], brandName: string) => {
            const brandRegex = new RegExp(brandName, 'i');

            const brand = rows.filter(r => brandRegex.test(r.query));
            const nonBrand = rows.filter(r => !brandRegex.test(r.query));

            const informational = rows.filter(r =>
                /^(qué|cómo|cuándo|dónde|por qué|guía|tutorial|significado|definición)/i.test(r.query)
            );

            const transactional = rows.filter(r =>
                /(precio|comprar|mejor|barato|contratar|oferta|descuento|tienda|venta)/i.test(r.query)
            );

            return { brand, nonBrand, informational, transactional };
        };

        // --- MODULE 9: TOPIC CLUSTERS (Simple N-Gram) ---

        export const clusterKeywords = (rows: GSCRow[]): Record<string, GSCRow[]> => {
            const clusters: Record<string, GSCRow[]> = {};

            rows.forEach(row => {
                const words = row.query.split(' ');
                let key = "other";
                const significant = words.filter(w => w.length > 3 && !['para', 'como', 'donde', 'que', 'los', 'las', 'una', 'con'].includes(w));
                if (significant.length > 0) {
                    key = significant[0];
                }

                if (!clusters[key]) clusters[key] = [];
                clusters[key].push(row);
            });

            const validClusters: Record<string, GSCRow[]> = {};
            Object.entries(clusters).forEach(([k, v]) => {
                if (v.length > 2) validClusters[k] = v;
            });

            return validClusters;
        };

        // --- MODULE 10: AI TRAFFIC (Source Medium) ---

        export const isAITraffic = (source: string, medium: string): boolean => {
            const combined = `${source} / ${medium}`.toLowerCase();
            // Comprehensive list of AI referrers
            return [
                'gpt', 'chatgpt', 'openai',
                'gemini', 'bard', 'google ai',
                'bing chat', 'copilot', 'bing', // Bing Chat often appears as organic bing but referrers might show copilot
                'perplexity',
                'claude', 'anthropic',
                'jasper', 'copy.ai',
                'you.com', 'youchat',
                'character.ai',
                'poe', 'quora poe'
            ].some(token => combined.includes(token));
        };
