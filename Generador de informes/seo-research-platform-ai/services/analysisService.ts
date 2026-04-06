import { CSVRow, MetricSeries, ComparisonItem, SiteWideKPIs, ReportPayload, DashboardStats } from '../types';

export const runFullLocalAnalysis = (
    allDataP1: CSVRow[], 
    allDataP2: CSVRow[], 
    p1Name: string, 
    p2Name: string, 
    userContext: string,
    log: (msg: string) => void
): { reportPayload: ReportPayload; chartData: { topWinners: ComparisonItem[], topLosers: ComparisonItem[], dashboardStats: DashboardStats, chartLookup: Record<string, ComparisonItem> } } => {
    
    log("Phase A.1: Aggregating P1 Data...");
    const aggP1 = buildAggregationsInOnePass(allDataP1);
    log("Phase A.1: Aggregating P2 Data...");
    const aggP2 = buildAggregationsInOnePass(allDataP2);

    log("Phase A.2: Calculating Global Trends for Dashboard...");
    const dashboardStats = calculateDashboardStats(aggP1, aggP2, allDataP1, allDataP2, p1Name, p2Name);

    log("Phase 2: Comparing Page Movers...");
    const comparedPages = compareAggData(aggP1.pages, aggP2.pages);
    const topWinners = [...comparedPages].sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 25);
    const topLosers = [...comparedPages].sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 25);

    log("Phase 5: Analyzing Segments...");
    const comparedSegments = compareAggData(aggP1.segments, aggP2.segments);
    const topSegmentMovers = [...comparedSegments].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    log("Phase 9: Analyzing Visibility...");
    const topImpressionWinners = [...comparedPages].sort((a, b) => b.impressionsChange - a.impressionsChange).slice(0, 25);
    const topImpressionLosers = [...comparedPages].sort((a, b) => b.impressionsChange - b.impressionsChange).slice(0, 25);

    log("Phase 10: Analyzing Countries...");
    const comparedCountries = compareAggData(aggP1.countries, aggP2.countries);
    const topCountryMovers = [...comparedCountries].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    log("Phase 15: Comparing Keywords...");
    const comparedKeywords = compareAggData(aggP1.keywords, aggP2.keywords);

    // Build Chart Lookup - combine pages and keywords for easy lookup by ReportView
    const chartLookup: Record<string, ComparisonItem> = {};
    [...comparedPages, ...comparedKeywords].forEach(item => {
        // Normalize key to lowercase for loose matching
        chartLookup[item.name.toLowerCase()] = item;
    });

    log("Phase A.2: Running Detection Engine...");
    const detections = runDetectionsInOnePass(
        allDataP2,
        comparedKeywords,
        dashboardStats.kpis,
        topWinners,
        topLosers,
        topImpressionWinners,
        topImpressionLosers
    );

    log("Phase 3: Building Intelligence Dossier...");

    const reportPayload: ReportPayload = {
        period1Name: p1Name,
        period2Name: p2Name,
        userContext: userContext,
        metricsSummary: { ...dashboardStats.kpis, topMoversImpact: detections.outlierAnalysis.topMoversImpact },
        segmentAnalysis: topSegmentMovers.map(s => ({
            segment: s.name,
            clicksChange: s.clicksChange,
            impressionsChange: s.impressionsChange,
            keywordCountChange: s.keywordCountChange
        })),
        visibilityAnalysis: {
            winners: topImpressionWinners.map(w => ({ url: w.name, impressionsChange: w.impressionsChange, clicksChange: w.clicksChange })).slice(0, 10),
            losers: topImpressionLosers.map(l => ({ url: l.name, impressionsChange: l.impressionsChange, clicksChange: l.clicksChange })).slice(0, 10)
        },
        countryAnalysis: topCountryMovers,
        outlierAnalysis: detections.outlierAnalysis,
        strikingDistanceOpportunities: detections.strikingDistanceCandidates.map(c => ({
            page: c.page, keyword: c.keyword, impressions: c.impressions, avgPosition: parseFloat(c.avgPosition.toFixed(1))
        })),
        keywordCannibalizationAlerts: detections.cannibalizationAlerts,
        ctrAnalysis: {
            redFlags: detections.ctrAnalysis.redFlags.map(c => ({
                page: c.page, keyword: c.keyword, impressions: c.impressions, ctr: parseFloat(c.ctr.toFixed(1)), avgPosition: parseFloat(c.avgPosition.toFixed(1))
            })),
            opportunities: detections.ctrAnalysis.opportunities.map(c => ({
                page: c.page, keyword: c.keyword, impressions: c.impressions, ctr: parseFloat(c.ctr.toFixed(1)), avgPosition: parseFloat(c.avgPosition.toFixed(1))
            }))
        },
        ghostKeywordAlerts: detections.ghostKeywordAlerts.map(c => ({
            page: c.page, keyword: c.keyword, impressions: c.impressions, clicks: c.clicks, avgPosition: parseFloat(c.avgPosition.toFixed(1))
        })),
        keywordDecayAlerts: detections.keywordDecayAlerts.map(k => ({
            keyword: k.name, positionP1: parseFloat(k.positionP1.toFixed(1)), positionP2: parseFloat(k.positionP2.toFixed(1)), positionChange: parseFloat(k.positionChange.toFixed(1)), impressionsP2: k.impressionsP2
        })),
        newKeywordDiscovery: detections.newKeywordDiscovery.map(k => ({
            keyword: k.name, impressionsP2: k.impressionsP2, avgPositionP2: parseFloat(k.positionP2.toFixed(1))
        })),
        page1LoserAlerts: detections.page1LoserAlerts.map(k => ({
            keyword: k.name, positionP1: parseFloat(k.positionP1.toFixed(1)), positionP2: parseFloat(k.positionP2.toFixed(1)), impressionsP1: k.impressionsP1
        })),
        topWinners: topWinners.map(w => ({
            url: w.name, clicksChange: w.clicksChange, positionChange: w.positionChange, keywordCountChange: w.keywordCountChange
        })).slice(0, 10),
        topLosers: topLosers.map(l => ({
            url: l.name, clicksChange: l.clicksChange, positionChange: l.positionChange, keywordCountChange: l.keywordCountChange
        })).slice(0, 10)
    };

    return {
        reportPayload,
        chartData: { topWinners, topLosers, dashboardStats, chartLookup }
    };
};

function calculateDashboardStats(aggP1: any, aggP2: any, dataP1: CSVRow[], dataP2: CSVRow[], p1Label: string, p2Label: string): DashboardStats {
    // 1. Calculate Site KPIs by summing raw rows (Most accurate)
    const sum = (data: CSVRow[]) => data.reduce((acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        posSum: acc.posSum + row.position,
        count: acc.count + 1
    }), { clicks: 0, impressions: 0, posSum: 0, count: 0 });

    const s1 = sum(dataP1);
    const s2 = sum(dataP2);

    const kpis: SiteWideKPIs = {
        clicksP1: s1.clicks,
        clicksP2: s2.clicks,
        impressionsP1: s1.impressions,
        impressionsP2: s2.impressions,
        totalClicksChange: s2.clicks - s1.clicks,
        totalImpressionsChange: s2.impressions - s1.impressions,
        ctrP1: s1.impressions > 0 ? (s1.clicks / s1.impressions) * 100 : 0,
        ctrP2: s2.impressions > 0 ? (s2.clicks / s2.impressions) * 100 : 0,
        ctrChange: 0, // calculated below
        avgPosP1: s1.count > 0 ? s1.posSum / s1.count : 0,
        avgPosP2: s2.count > 0 ? s2.posSum / s2.count : 0,
        avgPosChange: 0
    };
    kpis.ctrChange = kpis.ctrP2 - kpis.ctrP1;
    kpis.avgPosChange = kpis.avgPosP2 - kpis.avgPosP1;

    // Dataset Stats (Total observed in CSV)
    const datasetStats = {
        totalClicks: s1.clicks + s2.clicks,
        totalImpressions: s1.impressions + s2.impressions,
        totalDays: (new Set(dataP1.map(r => r.date.getTime())).size + new Set(dataP2.map(r => r.date.getTime())).size)
    };

    // 2. Segment Stats for Pie Charts (Use P2)
    const segmentStats = aggP2.segments.map((s: MetricSeries) => ({
        name: s.name,
        clicks: s.clicks,
        impressions: s.impressions
    })).sort((a: any, b: any) => b.clicks - a.clicks);

    // 3. Global Daily Trend (Aligning P1 and P2 by day index 0..N)
    const getDailyTotal = (data: CSVRow[]) => {
        const dailyMap = new Map<string, number>();
        data.forEach(row => {
            const d = row.date.toISOString().split('T')[0];
            dailyMap.set(d, (dailyMap.get(d) || 0) + row.clicks);
        });
        // Sort dates and return values array
        return Array.from(dailyMap.keys()).sort().map(d => dailyMap.get(d) || 0);
    };

    const dailyTrendP1 = getDailyTotal(dataP1);
    const dailyTrendP2 = getDailyTotal(dataP2);

    return { kpis, datasetStats, segmentStats, dailyTrendP1, dailyTrendP2, period1Label: p1Label, period2Label: p2Label };
}


function buildAggregationsInOnePass(data: CSVRow[]) {
    const pageMap = new Map();
    const segmentMap = new Map();
    const countryMap = new Map();
    const keywordMap = new Map();

    const updateMap = (map: Map<string, any>, key: string, row: CSVRow) => {
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, {
                clicks: 0, impressions: 0, positionSum: 0, count: 0,
                dailyClicks: {}, dailyPosition: {}, keywords: new Set()
            });
        }
        const metrics = map.get(key);
        metrics.clicks += row.clicks;
        metrics.impressions += row.impressions;
        metrics.positionSum += row.position;
        metrics.count += 1;
        if (map !== keywordMap) metrics.keywords.add(row.keyword);

        const dateStr = row.date.toISOString().split('T')[0];
        if (!metrics.dailyClicks[dateStr]) metrics.dailyClicks[dateStr] = { clicks: 0 };
        metrics.dailyClicks[dateStr].clicks += row.clicks;

        if (!metrics.dailyPosition[dateStr]) metrics.dailyPosition[dateStr] = { positionSum: 0, count: 0 };
        metrics.dailyPosition[dateStr].positionSum += row.position;
        metrics.dailyPosition[dateStr].count += 1;
    };

    for (const row of data) {
        updateMap(pageMap, row.page, row);
        updateMap(segmentMap, row.segment, row);
        updateMap(countryMap, row.country, row);
        updateMap(keywordMap, row.keyword, row);
    }

    const processMap = (map: Map<string, any>): MetricSeries[] => {
        const results: MetricSeries[] = [];
        for (const [name, metrics] of map.entries()) {
            const allDays = new Set([...Object.keys(metrics.dailyClicks), ...Object.keys(metrics.dailyPosition)]);
            const sortedDays = [...allDays].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

            const dailySeriesClicks = sortedDays.map(date => metrics.dailyClicks[date]?.clicks || 0);
            const dailySeriesPosition = sortedDays.map(date => {
                const posData = metrics.dailyPosition[date];
                if (!posData || posData.count === 0) return 0;
                return (posData.positionSum / posData.count);
            });

            results.push({
                name,
                clicks: metrics.clicks,
                impressions: metrics.impressions,
                position: metrics.count > 0 ? metrics.positionSum / metrics.count : 0,
                keywordCount: metrics.keywords.size,
                dailySeriesClicks,
                dailySeriesPosition
            });
        }
        return results;
    };

    return {
        pages: processMap(pageMap),
        segments: processMap(segmentMap),
        countries: processMap(countryMap),
        keywords: processMap(keywordMap)
    };
}

function compareAggData(aggP1: MetricSeries[], aggP2: MetricSeries[]): ComparisonItem[] {
    const comparisonMap = new Map<string, Partial<ComparisonItem>>();

    aggP1.forEach(item => {
        comparisonMap.set(item.name, {
            name: item.name,
            clicksP1: item.clicks,
            impressionsP1: item.impressions,
            positionP1: item.position,
            keywordCountP1: item.keywordCount,
            dailySeriesClicksP1: item.dailySeriesClicks,
            dailySeriesPositionP1: item.dailySeriesPosition,
            clicksP2: 0, impressionsP2: 0, positionP2: 0, keywordCountP2: 0,
            dailySeriesClicksP2: [], dailySeriesPositionP2: []
        });
    });

    aggP2.forEach(item => {
        if (!comparisonMap.has(item.name)) {
            comparisonMap.set(item.name, {
                name: item.name,
                clicksP1: 0, impressionsP1: 0, positionP1: 0, keywordCountP1: 0,
                dailySeriesClicksP1: [], dailySeriesPositionP1: [],
                clicksP2: 0, impressionsP2: 0, positionP2: 0, keywordCountP2: 0,
                dailySeriesClicksP2: [], dailySeriesPositionP2: []
            });
        }
        const existing = comparisonMap.get(item.name)!;
        existing.clicksP2 = item.clicks;
        existing.impressionsP2 = item.impressions;
        existing.positionP2 = item.position;
        existing.keywordCountP2 = item.keywordCount;
        existing.dailySeriesClicksP2 = item.dailySeriesClicks;
        existing.dailySeriesPositionP2 = item.dailySeriesPosition;
    });

    const results: ComparisonItem[] = [];
    for (const item of comparisonMap.values()) {
        const fullItem = item as ComparisonItem;
        fullItem.clicksChange = (fullItem.clicksP2 || 0) - (fullItem.clicksP1 || 0);
        fullItem.impressionsChange = (fullItem.impressionsP2 || 0) - (fullItem.impressionsP1 || 0);
        fullItem.positionChange = (fullItem.positionP2 || 0) - (fullItem.positionP1 || 0);
        fullItem.keywordCountChange = (fullItem.keywordCountP2 || 0) - (fullItem.keywordCountP1 || 0);
        results.push(fullItem);
    }
    return results;
}

function runDetectionsInOnePass(
    allDataP2: CSVRow[],
    comparedKeywords: ComparisonItem[],
    siteWideKPIs: SiteWideKPIs,
    topWinners: ComparisonItem[],
    topLosers: ComparisonItem[],
    topImpressionWinners: ComparisonItem[],
    topImpressionLosers: ComparisonItem[]
) {
    const cannibalizationMap = new Map();
    const ctrMap = new Map();

    // Single pass P2 for CTR and Cannibalization
    for (const row of allDataP2) {
        const key = `${row.page}||${row.keyword}`;
        if (!ctrMap.has(key)) {
            ctrMap.set(key, { page: row.page, keyword: row.keyword, impressions: 0, clicks: 0, positionSum: 0, count: 0 });
        }
        const ctrItem = ctrMap.get(key);
        ctrItem.impressions += row.impressions;
        ctrItem.clicks += row.clicks;
        ctrItem.positionSum += row.position;
        ctrItem.count += 1;

        const keyword = row.keyword;
        if (keyword) {
            if (!cannibalizationMap.has(keyword)) {
                cannibalizationMap.set(keyword, { totalImpressions: 0, pages: {} });
            }
            const cannItem = cannibalizationMap.get(keyword);
            cannItem.totalImpressions += row.impressions;
            if (!cannItem.pages[row.page]) cannItem.pages[row.page] = 0;
            cannItem.pages[row.page] += row.impressions;
        }
    }

    const ctrRedFlags: any[] = [];
    const ctrOpportunities: any[] = [];
    const ghostKeywordAlerts: any[] = [];
    const aggregatedCTRItems: any[] = [];

    for (const item of ctrMap.values()) {
        const avgPosition = item.count > 0 ? item.positionSum / item.count : 0;
        const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
        aggregatedCTRItems.push({ ...item, avgPosition, ctr });
    }

    // Thresholds
    const T = {
        GHOST_POS_MAX: 10, GHOST_CLICKS_MAX: 0, GHOST_IMP_MIN: 1000,
        RED_FLAG_POS: 5, RED_FLAG_CTR: 2, RED_FLAG_IMP: 1000,
        OPP_POS_MIN: 5, OPP_POS_MAX: 15, OPP_CTR: 10, OPP_IMP: 500
    };

    aggregatedCTRItems.forEach(item => {
        if (item.avgPosition > 0 && item.avgPosition <= T.GHOST_POS_MAX && item.clicks <= T.GHOST_CLICKS_MAX && item.impressions >= T.GHOST_IMP_MIN) {
            ghostKeywordAlerts.push(item);
        }
        if (item.avgPosition < T.RED_FLAG_POS && item.ctr < T.RED_FLAG_CTR && item.impressions > T.RED_FLAG_IMP) {
            ctrRedFlags.push(item);
        }
        if (item.avgPosition > T.OPP_POS_MIN && item.avgPosition <= T.OPP_POS_MAX && item.ctr > T.OPP_CTR && item.impressions > T.OPP_IMP) {
            ctrOpportunities.push(item);
        }
    });

    const strikingDistanceCandidates = aggregatedCTRItems
        .filter(item => item.avgPosition > 10 && item.avgPosition <= 30 && item.impressions > 500)
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 10);

    const cannibalizationAlerts = [];
    for (const [keyword, data] of cannibalizationMap.entries()) {
        const competingPages = Object.entries(data.pages)
            .filter(([_, imp]) => (imp as number) > 10)
            .map(([page, impressions]) => ({ page, impressions }));
        if (competingPages.length >= 2) {
            cannibalizationAlerts.push({ keyword, totalImpressions: data.totalImpressions, competingPages });
        }
    }

    const keywordDecayAlerts = [];
    const newKeywordDiscovery = [];
    const page1LoserAlerts = [];

    for (const item of comparedKeywords) {
        if (!item.name) continue;
        if (item.positionChange > 5 && item.impressionsP2 > 500 && item.positionP1 > 0) keywordDecayAlerts.push(item);
        if (item.impressionsP1 < 10 && item.impressionsP2 > 50) newKeywordDiscovery.push(item);
        if (item.positionP1 > 0 && item.positionP1 <= 10 && item.positionP2 >= 10.1 && item.impressionsP1 > 100) page1LoserAlerts.push(item);
    }

    const outlierAnalysis: any = { collectiveThreshold: 40, individualThreshold: 2.5, topMoversImpact: 0 };
    const top20Winners = topWinners.slice(0, 20);
    const top20Losers = topLosers.slice(0, 20);
    outlierAnalysis.topMoversImpact = top20Winners.reduce((acc, i) => acc + i.clicksChange, 0) + top20Losers.reduce((acc, i) => acc + i.clicksChange, 0);

    const top5ClickLosersImpact = top20Losers.slice(0, 5).reduce((acc, i) => acc + i.clicksChange, 0);
    if (siteWideKPIs.totalClicksChange < 0) {
        outlierAnalysis.top5ClickLosersPercentageOfChange = (top5ClickLosersImpact / siteWideKPIs.totalClicksChange) * 100;
    }

    if (topLosers.length > 1 && Math.abs(topLosers[0].clicksChange) > (Math.abs(topLosers[1].clicksChange) * 2.5)) {
        outlierAnalysis.clickLoser = { url: topLosers[0].name, change: topLosers[0].clicksChange };
    }

    return {
        outlierAnalysis,
        strikingDistanceCandidates,
        cannibalizationAlerts: cannibalizationAlerts.sort((a, b) => (b.totalImpressions as number) - (a.totalImpressions as number)).slice(0, 10),
        ctrAnalysis: {
            redFlags: ctrRedFlags.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
            opportunities: ctrOpportunities.sort((a, b) => b.impressions - a.impressions).slice(0, 10)
        },
        ghostKeywordAlerts: ghostKeywordAlerts.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        keywordDecayAlerts: keywordDecayAlerts.sort((a, b) => b.positionChange - a.positionChange).slice(0, 10),
        newKeywordDiscovery: newKeywordDiscovery.sort((a, b) => b.impressionsP2 - a.impressionsP2).slice(0, 10),
        page1LoserAlerts: page1LoserAlerts.sort((a, b) => b.impressionsP1 - a.impressionsP1).slice(0, 10)
    };
}