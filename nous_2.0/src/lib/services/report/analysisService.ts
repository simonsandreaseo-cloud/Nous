import { MetricSeries, ComparisonItem, SiteWideKPIs, ReportPayload, DashboardStats, GscRow, SeoStatus } from '@/types/report';

export const runFullAnalysis = (
    p1Data: { pages: GscRow[], queries: GscRow[], joint: GscRow[] },
    p2Data: { pages: GscRow[], queries: GscRow[], joint: GscRow[] },
    p1Name: string,
    p2Name: string,
    userContext: string,
    segmentRules?: { name: string, regex: string }[]
) => {

    // 1. Aggregations (Separate for Fidelity)
    const aggP1 = {
        pages: aggregateByDimension(p1Data.pages, 'page'),
        segments: aggregateBySegment(p1Data.pages),
        countries: aggregateByDimension(p1Data.pages, 'country'),
        queries: aggregateByDimension(p1Data.queries, 'keyword')
    };

    const aggP2 = {
        pages: aggregateByDimension(p2Data.pages, 'page'),
        segments: aggregateBySegment(p2Data.pages),
        countries: aggregateByDimension(p2Data.pages, 'country'),
        queries: aggregateByDimension(p2Data.queries, 'keyword')
    };

    // 2. Global Dashboard Stats (Using Pages Data as primary source for Site Total)
    const dashboardStats = calculateDashboardStats(p1Data.pages, p2Data.pages, aggP2, p1Name, p2Name);

    // 3. Comparisons
    const comparedPages = compareSeries(aggP1.pages, aggP2.pages);
    const topWinners = [...comparedPages].sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 25);
    const topLosers = [...comparedPages].sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 25);

    const comparedSegments = compareSeries(aggP1.segments, aggP2.segments);
    const topSegmentMovers = [...comparedSegments].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    const comparedCountries = compareSeries(aggP1.countries, aggP2.countries);
    const topCountryMovers = [...comparedCountries].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    const topImpressionWinners = [...comparedPages].sort((a, b) => b.impressionsChange - a.impressionsChange).slice(0, 25);
    const topImpressionLosers = [...comparedPages].sort((a, b) => b.impressionsChange - b.impressionsChange).slice(0, 25);

    const comparedKeywords = compareSeries(aggP1.queries, aggP2.queries);

    // 4. Detections (Using Joint Data for specific page-keyword relationships like Cannibalization/CTR)
    const detections = runDetections(
        p2Data.joint, // Use joint dataset for granular analysis
        comparedKeywords,
        dashboardStats.kpis,
        topWinners,
        topLosers
    );

    // --- NEW: SEO STATUS SECTION LOGIC ---

    // Keyword Distribution Buckets
    console.log(`[ANALYSIS] Aggregated Queries: P1=${aggP1.queries.length}, P2=${aggP2.queries.length}`);
    const kP1 = countKeywordsByBucket(aggP1.queries);
    const kP2 = countKeywordsByBucket(aggP2.queries);
    console.log(`[ANALYSIS] Buckets P2: Top3=${kP2.top3}, Top10=${kP2.top10}, Total=${kP2.total}`);

    // Category Distribution (Using AI Regex)
    const catDist = segmentRules ? calculateCategoryDistribution(p2Data.pages, segmentRules) : [];

    // New Keywords Metrics (Total Stats)
    const newKwsMetrics = calculateNewKeywordMetrics(aggP1.queries, aggP2.queries);

    const seoStatus: SeoStatus = {
        overview: dashboardStats.kpis,
        top3: { count: kP2.top3, share: kP2.total > 0 ? (kP2.top3 / kP2.total) * 100 : 0, change: kP2.top3 - kP1.top3 },
        top10: { count: kP2.top10, share: kP2.total > 0 ? (kP2.top10 / kP2.total) * 100 : 0, change: kP2.top10 - kP1.top10 },
        top20: { count: kP2.top20, share: kP2.total > 0 ? (kP2.top20 / kP2.total) * 100 : 0, change: kP2.top20 - kP1.top20 },
        newKeywords: newKwsMetrics,
        categoryDistribution: catDist,
        monthlyTrend: {
            p1: dashboardStats.dailyTrendP1,
            p2: dashboardStats.dailyTrendP2
        }
    };

    // 5. Build Report Payload
    const reportPayload: ReportPayload = {
        period1Name: p1Name,
        period2Name: p2Name,
        userContext: userContext,
        seoStatus: seoStatus, // NEW
        metricsSummary: { ...dashboardStats.kpis, topMoversImpact: detections.outlierAnalysis.topMoversImpact },
        segmentAnalysis: topSegmentMovers.map(s => {
            const segmentRows = p2Data.pages.filter(r => extractSegment(r.page || '') === s.name);
            const topUrls = segmentRows
                .sort((a, b) => b.clicks - a.clicks)
                .slice(0, 5)
                .map(r => ({ url: r.page, clicks: r.clicks }));

            return {
                segment: s.name,
                changes: { clicks: s.clicksChange, impressions: s.impressionsChange },
                topUrls
            };
        }),
        visibilityAnalysis: {
            winners: topImpressionWinners.map((w: any) => ({ url: w.name, change: w.impressionsChange })).slice(0, 10),
            losers: topImpressionLosers.map((l: any) => ({ url: l.name, change: l.impressionsChange })).slice(0, 10)
        },
        countryAnalysis: topCountryMovers,
        outlierAnalysis: detections.outlierAnalysis,
        strikingDistanceOpportunities: detections.strikingDistanceCandidates,
        keywordCannibalizationAlerts: detections.cannibalizationAlerts,
        ctrAnalysis: detections.ctrAnalysis,
        ghostKeywordAlerts: detections.ghostKeywordAlerts,
        keywordDecayAlerts: detections.keywordDecayAlerts,
        newKeywordDiscovery: detections.newKeywordDiscovery,
        page1LoserAlerts: detections.page1LoserAlerts,
        topWinners: topWinners.slice(0, 10),
        topLosers: topLosers.slice(0, 10)
    };

    // Chart Data for UI
    const chartData = {
        dashboardStats,
        topWinners,
        topLosers,
        seoStatus // Include for client-side rendering
    };

    return { reportPayload, chartData };
};

// --- Helpers ---

// New helper for Keyword bucket counting
function countKeywordsByBucket(queries: MetricSeries[]) {
    let top3 = 0, top10 = 0, top20 = 0, total = 0;
    queries.forEach(q => {
        total++;
        // Position 0 means unranked or no data, so we must exclude it.
        if (q.position > 0 && q.position <= 3) top3++;
        if (q.position > 0 && q.position <= 10) top10++;
        if (q.position > 0 && q.position <= 20) top20++;
    });
    // Log sample to debug if all are 0 or > 20
    if (queries.length > 0) {
        console.log(`[ANALYSIS] Sample Keyword Positions (First 5):`, queries.slice(0, 5).map(q => `${q.name}=${q.position.toFixed(1)}`));
    }
    return { top3, top10, top20, total };
}

// New helper for Category Distribution
function calculateCategoryDistribution(rows: GscRow[], rules: { name: string, regex: string }[]) {
    const map = new Map<string, number>();
    const totalClicks = rows.reduce((acc, r) => acc + r.clicks, 0);

    rows.forEach(row => {
        if (!row.page) return;
        let category = "General";

        // Find first matching rule
        for (const rule of rules) {
            try {
                if (new RegExp(rule.regex).test(row.page)) {
                    category = rule.name;
                    break;
                }
            } catch (e) {
                // Invalid regex, skip
            }
        }

        map.set(category, (map.get(category) || 0) + row.clicks);
    });

    return Array.from(map.entries())
        .map(([category, clicks]) => ({
            category,
            clicks,
            share: totalClicks > 0 ? (clicks / totalClicks) * 100 : 0
        }))
        .sort((a, b) => b.clicks - a.clicks); // Sort by traffic
}

// New helper for New Keyword metrics
function calculateNewKeywordMetrics(p1: MetricSeries[], p2: MetricSeries[]) {
    const p1Map = new Set(p1.map(q => q.name));
    const newKws = p2.filter(q => !p1Map.has(q.name));

    const totalClicks = newKws.reduce((acc, q) => acc + q.clicks, 0);
    const totalImp = newKws.reduce((acc, q) => acc + q.impressions, 0);
    const avgPos = newKws.length > 0
        ? newKws.reduce((acc, q) => acc + q.position, 0) / newKws.length
        : 0;

    return {
        total: newKws.length,
        clicks: totalClicks,
        impressions: totalImp,
        avgPos
    };
}

function calculateDashboardStats(p1: GscRow[], p2: GscRow[], aggP2: any, label1: string, label2: string): DashboardStats {
    const sum = (rows: GscRow[]) => rows.reduce((acc, r) => ({
        clicks: acc.clicks + r.clicks,
        impressions: acc.impressions + r.impressions,
        posSum: acc.posSum + (r.position * r.impressions), // Weighted Position
        count: acc.count + r.impressions // Use Impressions as weight count
    }), { clicks: 0, impressions: 0, posSum: 0, count: 0 });

    const s1 = sum(p1);
    const s2 = sum(p2);

    const kpis: SiteWideKPIs = {
        clicksP1: s1.clicks, clicksP2: s2.clicks,
        impressionsP1: s1.impressions, impressionsP2: s2.impressions,
        totalClicksChange: s2.clicks - s1.clicks,
        totalImpressionsChange: s2.impressions - s1.impressions,
        ctrP1: s1.impressions > 0 ? (s1.clicks / s1.impressions) * 100 : 0,
        ctrP2: s2.impressions > 0 ? (s2.clicks / s2.impressions) * 100 : 0,
        ctrChange: 0,
        avgPos: 0, // Placeholder
        avgPosP1: s1.count > 0 ? s1.posSum / s1.count : 0,
        avgPosP2: s2.count > 0 ? s2.posSum / s2.count : 0,
        avgPosChange: 0
    };
    kpis.ctrChange = kpis.ctrP2 - kpis.ctrP1;
    kpis.avgPosChange = kpis.avgPosP2 - kpis.avgPosP1;

    // Daily Trends
    const getDaily = (rows: GscRow[]) => {
        const map = new Map<string, number>();
        rows.forEach(r => {
            const d = r.date.toISOString().split('T')[0];
            map.set(d, (map.get(d) || 0) + r.clicks);
        });
        return Array.from(map.keys()).sort().map(k => map.get(k) || 0);
    };

    return {
        kpis,
        datasetStats: { totalClicks: s1.clicks + s2.clicks, totalImpressions: s1.impressions + s2.impressions, totalDays: 0 },
        dailyTrendP1: getDaily(p1),
        dailyTrendP2: getDaily(p2),
        period1Label: label1,
        period2Label: label2,
        segmentStats: aggP2.segments.map((s: any) => ({ name: s.name, clicks: s.clicks, impressions: s.impressions }))
    };
}

function aggregateByDimension(rows: GscRow[], keyField: 'page' | 'keyword' | 'country'): MetricSeries[] {
    const map = new Map<string, any>();

    rows.forEach(row => {
        // @ts-ignore
        const key = row[keyField] || 'Unknown';
        if (!map.has(key)) map.set(key, { clicks: 0, impressions: 0, posSum: 0, impSum: 0 });

        const entry = map.get(key);
        entry.clicks += row.clicks;
        entry.impressions += row.impressions;
        // Accurate Weighted Position (Weighted by Impressions)
        entry.posSum += (row.position * row.impressions);
        entry.impSum += row.impressions;
    });

    return Array.from(map.entries()).map(([name, data]) => ({
        name,
        clicks: data.clicks,
        impressions: data.impressions,
        position: data.impSum > 0 ? data.posSum / data.impSum : 0,
        keywordCount: 0,
        dailySeriesClicks: [],
        dailySeriesPosition: []
    }));
}

function aggregateBySegment(rows: GscRow[]): MetricSeries[] {
    const map = new Map<string, any>();

    rows.forEach(row => {
        if (!row.page) return;
        const segment = extractSegment(row.page);
        if (!map.has(segment)) map.set(segment, { clicks: 0, impressions: 0 });

        const entry = map.get(segment);
        entry.clicks += row.clicks;
        entry.impressions += row.impressions;
    });

    return Array.from(map.entries()).map(([name, data]) => ({
        name,
        clicks: data.clicks,
        impressions: data.impressions,
        position: 0,
        keywordCount: 0,
        dailySeriesClicks: [],
        dailySeriesPosition: []
    }));
}

function compareSeries(p1: MetricSeries[], p2: MetricSeries[]): ComparisonItem[] {
    const map = new Map<string, any>();

    p1.forEach(i => map.set(i.name, { ...i, p1: true }));

    p2.forEach(i => {
        if (!map.has(i.name)) map.set(i.name, { name: i.name, clicks: 0, impressions: 0, position: 0 });
        const entry = map.get(i.name);
        entry.clicksP2 = i.clicks;
        entry.impressionsP2 = i.impressions;
        entry.positionP2 = i.position;
    });

    return Array.from(map.values()).map((item: any) => {
        const c1 = item.p1 ? item.clicks : 0;
        const i1 = item.p1 ? item.impressions : 0;
        const p1 = item.p1 ? item.position : 0;
        const k1 = 0;

        const c2 = item.clicksP2 || 0;
        const i2 = item.impressionsP2 || 0;
        const p2 = item.positionP2 || 0;
        const k2 = 0;

        // Ensure we satisfy ComparisonItem interface
        return {
            name: item.name,
            clicks: c2,
            impressions: i2,
            position: p2,
            keywordCount: k2,
            dailySeriesClicks: [],
            dailySeriesPosition: [],

            clicksP1: c1, clicksP2: c2, clicksChange: c2 - c1,
            impressionsP1: i1, impressionsP2: i2, impressionsChange: i2 - i1,
            positionP1: p1, positionP2: p2, positionChange: p2 - p1,
            keywordCountP1: k1, keywordCountP2: k2, keywordCountChange: k2 - k1
        };
    });
}

function runDetections(
    jointData: GscRow[],
    comparedKeywords: ComparisonItem[],
    kpis: SiteWideKPIs,
    topWinners: ComparisonItem[],
    topLosers: ComparisonItem[]
) {
    const cannibalizationMap = new Map();
    const ctrItems: any[] = [];

    jointData.forEach(row => {
        if (!row.keyword || !row.page) return;

        // Cannibalization (High Impressions per keyword across pages)
        if (!cannibalizationMap.has(row.keyword)) cannibalizationMap.set(row.keyword, { totalImp: 0, pages: {} });
        const canEntry = cannibalizationMap.get(row.keyword);
        canEntry.totalImp += row.impressions;
        if (!canEntry.pages[row.page]) canEntry.pages[row.page] = 0;
        canEntry.pages[row.page] += row.impressions;

        // CTR
        ctrItems.push({
            page: row.page,
            keyword: row.keyword,
            impressions: row.impressions,
            clicks: row.clicks,
            ctr: row.ctr,
            position: row.position
        });
    });

    // Process Cannibalization
    const cannibalizationAlerts = [];
    for (const [kw, data] of cannibalizationMap.entries()) {
        const competing = Object.entries(data.pages)
            .filter(([_, imp]) => (imp as number) > 50)
            .map(([page, imp]) => ({ page, impressions: imp }));

        if (competing.length > 1) {
            cannibalizationAlerts.push({ keyword: kw, competingPages: competing, totalImpressions: data.totalImp });
        }
    }

    // Process CTR
    const ctrRedFlags = ctrItems.filter(i => i.position < 5 && i.ctr < 1 && i.impressions > 500);
    const ctrOpportunities = ctrItems.filter(i => i.position > 5 && i.position < 15 && i.ctr > 5 && i.impressions > 200);

    const strikingDistanceCandidates = comparedKeywords
        .filter(k => k.positionP2 > 10 && k.positionP2 < 25 && k.impressionsP2 > 500)
        .map((k: ComparisonItem) => ({ keyword: k.name, impressions: k.impressionsP2, avgPosition: k.positionP2 }))
        .slice(0, 10);

    const ghostKeywordAlerts = comparedKeywords
        .filter(k => k.positionP2 < 10 && k.clicksP2 === 0 && k.impressionsP2 > 1000)
        .slice(0, 10);

    const keywordDecayAlerts = comparedKeywords
        .filter(k => k.positionChange > 5 && k.positionP1 < 10 && k.impressionsP2 > 100)
        .slice(0, 10);

    const newKeywordDiscovery = comparedKeywords
        .filter(k => k.impressionsP1 === 0 && k.impressionsP2 > 100)
        .slice(0, 10);

    const page1LoserAlerts = comparedKeywords
        .filter(k => k.positionP1 < 10 && k.positionP2 > 10 && k.impressionsP1 > 500)
        .slice(0, 10);

    return {
        cannibalizationAlerts: cannibalizationAlerts.slice(0, 10),
        ctrAnalysis: { redFlags: ctrRedFlags.slice(0, 10), opportunities: ctrOpportunities.slice(0, 10) },
        strikingDistanceCandidates,
        ghostKeywordAlerts,
        keywordDecayAlerts,
        newKeywordDiscovery,
        page1LoserAlerts,
        outlierAnalysis: { topMoversImpact: 0 }
    };
}

function extractSegment(urlString: string): string {
    try {
        if (!urlString) return '/';
        const url = new URL(urlString.startsWith('http') ? urlString : `https://${urlString}`);
        const parts = url.pathname.split('/').filter(Boolean);
        return parts.length > 0 ? `/${parts[0]}/` : '/';
    } catch { return '/'; }
}
