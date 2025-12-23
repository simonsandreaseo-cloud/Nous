import { CSVRow, MetricSeries, ComparisonItem, SiteWideKPIs, ReportPayload, DashboardStats, UrlLossDiagnosis, KeywordCause, StrategicOverview, CannibalizationChartData, TopicCluster, AnomalyPoint } from '../types';

interface AnalysisContext {
    pagesP1: CSVRow[];
    pagesP2: CSVRow[];
    queriesP1: CSVRow[];
    queriesP2: CSVRow[];
    countriesP1: CSVRow[];
    countriesP2: CSVRow[];
}

export const runFullLocalAnalysis = (
    ctx: AnalysisContext,
    p1Name: string,
    p2Name: string,
    userContext: string,
    log: (msg: string) => void
): { reportPayload: ReportPayload; chartData: { topWinners: ComparisonItem[], topLosers: ComparisonItem[], dashboardStats: DashboardStats, chartLookup: Record<string, ComparisonItem>, cannibalizationLookup: Record<string, CannibalizationChartData> } } => {

    // 1. Calculate Aggregations
    log("├── Fase 1/7: Agregación de Datos...");
    log("│   ├── Procesando Segmentos (Motor de Rutas)...");
    const aggPagesP1 = buildAggregations(ctx.pagesP1, 'page');
    const aggPagesP2 = buildAggregations(ctx.pagesP2, 'page');
    const aggSegmentsP2 = buildAggregations(ctx.pagesP2, 'segment');

    // 2. Dashboard & KPI Stats
    log("│   └── Calculando KPIs Globales y Detectando Anomalías...");
    const dashboardStats = calculateDashboardStats(aggPagesP1, aggPagesP2, aggSegmentsP2, ctx.pagesP1, ctx.pagesP2, p1Name, p2Name);

    // 3. Page Analysis
    log("├── Fase 2/7: Análisis Diferencial (Periodo vs Periodo)...");
    const comparedPages = compareAggData(aggPagesP1.main, aggPagesP2.main);
    const topWinners = [...comparedPages].sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 25);
    const topLosers = [...comparedPages].sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 25);

    // --- PHASE 2: Deep Dive Forensic Analysis ---
    log("│   └── 🕵️ Ejecutando Análisis Forense de Caídas (Deep Dive)...");
    const lossCauseAnalysis = analyzeLossCauses(topLosers.slice(0, 5), ctx.queriesP1, ctx.queriesP2);

    // --- NEW: Concentration Analysis (Threshold Based) ---
    // Clics: Only URLs with > 1.5% of total traffic
    // Impressions: Only URLs with > 1.0% of total visibility
    const clickConcentration = calculateConcentration(comparedPages, 'clicksP2', 1.5);
    const impressionConcentration = calculateConcentration(comparedPages, 'impressionsP2', 1.0);

    // 4. Segment Analysis
    const aggSegmentsP1 = buildAggregations(ctx.pagesP1, 'segment');
    const comparedSegments = compareAggData(aggSegmentsP1.main, aggSegmentsP2.main);
    const topSegmentMovers = [...comparedSegments].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    const topImpressionWinners = [...comparedPages].sort((a, b) => b.impressionsChange - a.impressionsChange).slice(0, 25);
    const topImpressionLosers = [...comparedPages].sort((a, b) => a.impressionsChange - b.impressionsChange).slice(0, 25);

    // 5. Country & Keyword Analysis
    log("├── Fase 3/7: Análisis Dimensional (Geografía y Keywords)...");
    const aggCountriesP1 = buildAggregations(ctx.countriesP1, 'country');
    const aggCountriesP2 = buildAggregations(ctx.countriesP2, 'country');
    const topCountryMovers = [...compareAggData(aggCountriesP1.main, aggCountriesP2.main)].sort((a, b) => Math.abs(b.clicksChange) - Math.abs(a.clicksChange)).slice(0, 10);

    const aggKeywordsP1 = buildAggregations(ctx.queriesP1, 'keyword');
    const aggKeywordsP2 = buildAggregations(ctx.queriesP2, 'keyword');
    const comparedKeywords = compareAggData(aggKeywordsP1.main, aggKeywordsP2.main);

    // --- PHASE 3: Strategic Intelligence ---
    log("├── Fase 4/7: Generando Matriz Estratégica...");
    const strategicOverview = generateStrategicOverview(comparedKeywords);

    // 8. Chart Lookup Integration
    log("├── Fase 5/7: Indexación de Gráficos Disponibles...");
    const chartLookup: Record<string, ComparisonItem> = {};
    const addToLookup = (items: ComparisonItem[]) => {
        items.forEach(item => {
            if (item.name) {
                // Normalize keys aggressively for lookup
                const key = item.name.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                chartLookup[key] = item;
                // Also store raw just in case
                chartLookup[item.name.toLowerCase().trim()] = item;
            }
        });
    };
    addToLookup(comparedPages);
    addToLookup(comparedKeywords);
    addToLookup(topCountryMovers);
    addToLookup(comparedSegments);

    // Pass keys to AI so it knows what charts exist
    const availableChartKeys = Object.keys(chartLookup).slice(0, 500);

    // 9. Detection Engine
    log("├── Fase 6/7: Motor de Detección y Gráficos de Conflicto...");
    const detections = runDetectionsInOnePass(
        ctx.queriesP2,
        comparedKeywords,
        dashboardStats.kpis,
        topWinners,
        topLosers
    );

    // --- PHASE 3: Cannibalization Charts ---
    const cannibalizationLookup = generateCannibalizationCharts(detections.cannibalizationAlerts.slice(0, 3), ctx.queriesP2, dashboardStats.datesP2);

    // --- PHASE 4: CLUSTERING (ENHANCED) ---
    log("├── Fase 7/7: Clustering Semántico de Oportunidades...");

    // 4.1 Clustering
    const opportunityKeywords = [
        ...detections.strikingDistanceCandidates,
        ...detections.newKeywordDiscovery
    ].map(k => ({
        keyword: k.keyword || k.name,
        impressions: k.impressions || k.impressionsP2,
        position: k.avgPosition || k.positionP2,
        clicks: k.clicks || k.clicksP2 || 0
    }));

    const topicClusters = generateKeywordClusters(opportunityKeywords);
    log(`│   └── Detectados ${topicClusters.length} clusters temáticos de alto potencial.`);

    log("└── Dossier de Inteligencia Finalizado.");

    const reportPayload: ReportPayload = {
        period1Name: p1Name,
        period2Name: p2Name,
        userContext: userContext,
        metricsSummary: { ...dashboardStats.kpis, topMoversImpact: detections.outlierAnalysis.topMoversImpact },
        concentrationAnalysis: {
            clickConcentration,
            impressionConcentration
        },
        // Phase 2 Payload
        lossCauseAnalysis,
        // Phase 3 Payload
        strategicOverview,
        // Phase 4 Payload
        topicClusters,
        anomaliesFound: dashboardStats.anomalies, // Send anomalies to AI

        segmentAnalysis: topSegmentMovers.map(s => ({
            segment: s.name,
            clicksChange: s.clicksChange,
            impressionsChange: s.impressionsChange,
        })),
        visibilityAnalysis: {
            winners: topImpressionWinners.map(w => ({ url: w.name, impressionsChange: w.impressionsChange, clicksChange: w.clicksChange })).slice(0, 10),
            losers: topImpressionLosers.map(l => ({ url: l.name, impressionsChange: l.impressionsChange, clicksChange: l.clicksChange })).slice(0, 10)
        },
        countryAnalysis: topCountryMovers,
        outlierAnalysis: detections.outlierAnalysis,
        strikingDistanceOpportunities: detections.strikingDistanceCandidates.map(c => ({
            page: c.page,
            keyword: c.keyword,
            impressions: c.impressions,
            clicks: c.clicks,
            ctr: parseFloat(c.ctr.toFixed(2)),
            avgPosition: parseFloat(c.avgPosition.toFixed(1))
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
            keyword: k.name,
            impressionsP2: k.impressionsP2,
            clicksP2: k.clicksP2,
            ctrP2: k.impressionsP2 > 0 ? parseFloat(((k.clicksP2 / k.impressionsP2) * 100).toFixed(2)) : 0,
            avgPositionP2: parseFloat(k.positionP2.toFixed(1))
        })),
        page1LoserAlerts: detections.page1LoserAlerts.map(k => ({
            keyword: k.name, positionP1: parseFloat(k.positionP1.toFixed(1)), positionP2: parseFloat(k.positionP2.toFixed(1)), impressionsP1: k.impressionsP1
        })),
        topWinners: topWinners.map(w => ({
            url: w.name, clicksChange: w.clicksChange, positionChange: w.positionChange
        })).slice(0, 10),
        topLosers: topLosers.map(l => ({
            url: l.name, clicksChange: l.clicksChange, positionChange: l.positionChange
        })).slice(0, 10),
        availableChartKeys
    };

    return {
        reportPayload,
        chartData: { topWinners, topLosers, dashboardStats, chartLookup, cannibalizationLookup }
    };
};

// --- HELPER: Detect Anomalies for Dashboard ---
function detectTimeSeriesAnomalies(dates: string[], values: number[]): AnomalyPoint[] {
    if (values.length < 7) return [];

    const anomalies: AnomalyPoint[] = [];
    const mean = values.reduce((a, b) => a + b, 0) / values.length;

    // Standard Deviation
    if (values.length < 2) return [];

    const sqDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSqDiff);

    // Threshold: 2.5 Standard Deviations
    const THRESHOLD = 2.5;

    values.forEach((val, idx) => {
        const dev = (val - mean) / stdDev;
        if (Math.abs(dev) > THRESHOLD) {
            anomalies.push({
                date: dates[idx],
                value: val,
                type: val > mean ? 'spike' : 'drop',
                deviation: parseFloat(dev.toFixed(1))
            });
        }
    });

    return anomalies;
}


function generateKeywordClusters(items: { keyword: string, impressions: number, position: number, clicks: number }[]): TopicCluster[] {
    const stopWords = new Set(['de', 'el', 'la', 'en', 'para', 'con', 'las', 'los', 'del', 'que', 'una', 'un', 'y', 'a', 'o', 'como', 'mas', 'por', 'sus', 'es', 'mis', 'tus', 'que', 'en', 'los']);
    const clusters: Map<string, { count: number, impressions: number, clicks: number, keywords: string[], posSum: number }> = new Map();

    // 1. Tokenize and Count
    items.forEach(item => {
        if (!item.keyword) return;
        const words = item.keyword.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

        for (const w of words) {
            if (!clusters.has(w)) clusters.set(w, { count: 0, impressions: 0, clicks: 0, keywords: [], posSum: 0 });
            const c = clusters.get(w)!;
            c.count++;
            c.impressions += item.impressions;
            c.clicks += item.clicks;
            c.posSum += item.position;
            c.keywords.push(item.keyword);
        }
    });

    // 2. Filter and Format with Enhanced Metrics
    const results: TopicCluster[] = [];

    // Only keep clusters with at least 3 keywords
    for (const [name, data] of clusters.entries()) {
        if (data.count >= 3) {
            const uniqueKws = Array.from(new Set(data.keywords));
            if (uniqueKws.length < 3) continue;

            const avgPosition = data.posSum / data.count;
            const avgCtr = data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0;
            const difficultyScore = Math.max(0, 100 - (avgPosition * 2));
            const opportunityScore = (data.impressions / 1000) * (difficultyScore / 10);

            results.push({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                keywords: uniqueKws.slice(0, 10),
                totalImpressions: data.impressions,
                avgPosition: avgPosition,
                avgCtr: avgCtr,
                difficultyScore,
                opportunityScore
            });
        }
    }

    return results.sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 6);
}


// --- REST OF HELPERS ---

function generateStrategicOverview(keywords: ComparisonItem[]): StrategicOverview {
    const defend = [];
    const attack = [];
    const expand = [];
    const prune = [];

    for (const k of keywords) {
        if (!k.name) continue;
        const pos = k.positionP2;
        const imp = k.impressionsP2;
        const clicks = k.clicksP2;

        if (pos <= 3 && clicks > 10) {
            defend.push({ keyword: k.name, clicks, position: parseFloat(pos.toFixed(1)) });
        } else if (pos > 3 && pos <= 10 && imp > 500) {
            attack.push({ keyword: k.name, impressions: imp, position: parseFloat(pos.toFixed(1)) });
        } else if (pos > 10 && pos <= 20 && imp > 500) {
            expand.push({ keyword: k.name, impressions: imp, position: parseFloat(pos.toFixed(1)) });
        } else if (k.positionChange > 5 && k.clicksChange < -5) {
            prune.push({ keyword: k.name, position: parseFloat(pos.toFixed(1)), status: 'Decaying' });
        }
    }

    return {
        defend: defend.sort((a, b) => b.clicks - a.clicks).slice(0, 10),
        attack: attack.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        expand: expand.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        prune: prune.slice(0, 10)
    };
}

function generateCannibalizationCharts(
    alerts: any[],
    queriesP2: CSVRow[],
    datesLabels: string[]
): Record<string, CannibalizationChartData> {
    const lookup: Record<string, CannibalizationChartData> = {};

    for (const alert of alerts) {
        const keyword = alert.keyword;
        // Normalize keyword for lookup
        const key = keyword.toLowerCase().trim();

        const topPages = alert.competingPages.slice(0, 3).map((p: any) => p.page);
        const relevantRows = queriesP2.filter(r => r.keyword === keyword && topPages.includes(r.page));

        const allDates = new Set<string>();
        relevantRows.forEach(r => allDates.add(r.date.toISOString().split('T')[0]));
        const sortedAllDates = Array.from(allDates).sort();

        const finalUrls = topPages.map((url: string) => {
            const dailyMap = new Map<string, number>();
            relevantRows.filter(r => r.page === url).forEach(r => dailyMap.set(r.date.toISOString().split('T')[0], r.position));
            return {
                url,
                dailyPositions: sortedAllDates.map(d => dailyMap.get(d) || NaN)
            };
        });

        lookup[key] = {
            keyword,
            urls: finalUrls,
            dates: sortedAllDates
        };
    }

    return lookup;
}

function analyzeLossCauses(loserUrls: ComparisonItem[], queriesP1: CSVRow[], queriesP2: CSVRow[]): UrlLossDiagnosis[] {
    const diagnosisResults: UrlLossDiagnosis[] = [];

    for (const urlItem of loserUrls) {
        if (Math.abs(urlItem.clicksChange) < 10) continue;
        const targetUrl = urlItem.name;
        const qP1 = queriesP1.filter(r => r.page === targetUrl);
        const qP2 = queriesP2.filter(r => r.page === targetUrl);
        const kwMap = new Map<string, { clicksP1: number, impP1: number, posSumP1: number, countP1: number, clicksP2: number, impP2: number, posSumP2: number, countP2: number }>();

        qP1.forEach(r => {
            const k = r.keyword || 'unknown';
            if (!kwMap.has(k)) kwMap.set(k, { clicksP1: 0, impP1: 0, posSumP1: 0, countP1: 0, clicksP2: 0, impP2: 0, posSumP2: 0, countP2: 0 });
            const entry = kwMap.get(k)!;
            entry.clicksP1 += r.clicks;
            entry.impP1 += r.impressions;
            entry.posSumP1 += r.position;
            entry.countP1++;
        });

        qP2.forEach(r => {
            const k = r.keyword || 'unknown';
            if (!kwMap.has(k)) kwMap.set(k, { clicksP1: 0, impP1: 0, posSumP1: 0, countP1: 0, clicksP2: 0, impP2: 0, posSumP2: 0, countP2: 0 });
            const entry = kwMap.get(k)!;
            entry.clicksP2 += r.clicks;
            entry.impP2 += r.impressions;
            entry.posSumP2 += r.position;
            entry.countP2++;
        });

        const culprits: KeywordCause[] = [];
        for (const [keyword, m] of kwMap.entries()) {
            const clicksChange = m.clicksP2 - m.clicksP1;
            if (clicksChange < 0) {
                const posP1 = m.countP1 > 0 ? m.posSumP1 / m.countP1 : 0;
                const posP2 = m.countP2 > 0 ? m.posSumP2 / m.countP2 : 0;
                culprits.push({
                    keyword: keyword,
                    clicksChange: clicksChange,
                    impressionsChange: m.impP2 - m.impP1,
                    positionP1: posP1,
                    positionP2: posP2,
                    positionChange: posP2 - posP1
                });
            }
        }
        const topCulprits = culprits.sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 5);
        if (topCulprits.length > 0) {
            diagnosisResults.push({ url: targetUrl, totalLoss: urlItem.clicksChange, culprits: topCulprits });
        }
    }
    return diagnosisResults;
}


function calculateConcentration(items: ComparisonItem[], metricKey: 'clicksP2' | 'impressionsP2', minPercentageThreshold: number) {
    // 1. Calculate Total Metric
    const totalMetric = items.reduce((sum, item) => sum + item[metricKey], 0);

    // 2. Filter items that contribute more than X% INDIVIDUALLY
    const concentrationItems = items
        .filter(item => {
            const percentage = (item[metricKey] / totalMetric) * 100;
            return percentage >= minPercentageThreshold;
        })
        .map(item => ({
            url: item.name,
            value: item[metricKey],
            percentageOfTotal: (item[metricKey] / totalMetric) * 100
        }))
        .sort((a, b) => b.value - a.value);

    // 3. Calculate accumulated percentage of just these items
    const accumulated = concentrationItems.reduce((acc, item) => acc + item.value, 0);

    return {
        items: concentrationItems,
        percentage: totalMetric > 0 ? (accumulated / totalMetric) * 100 : 0,
        totalMetric,
        threshold: minPercentageThreshold
    };
}

function calculateDashboardStats(
    aggP1: any,
    aggP2: any,
    aggSegmentsP2: any,
    dataP1: CSVRow[],
    dataP2: CSVRow[],
    p1Label: string,
    p2Label: string
): DashboardStats {
    const sum = (data: CSVRow[]) => data.reduce((acc, row) => ({
        clicks: acc.clicks + row.clicks,
        impressions: acc.impressions + row.impressions,
        posSum: acc.posSum + row.position,
        count: acc.count + 1
    }), { clicks: 0, impressions: 0, posSum: 0, count: 0 });

    const s1 = sum(dataP1);
    const s2 = sum(dataP2);

    // Unique Keywords "Recuento Diferenciado"
    const uniqueKwP1 = new Set(dataP1.filter(r => r.keyword).map(r => r.keyword)).size;
    const uniqueKwP2 = new Set(dataP2.filter(r => r.keyword).map(r => r.keyword)).size;

    const kpis: SiteWideKPIs = {
        clicksP1: s1.clicks,
        clicksP2: s2.clicks,
        impressionsP1: s1.impressions,
        impressionsP2: s2.impressions,
        totalClicksChange: s2.clicks - s1.clicks, // Absolute Change
        totalImpressionsChange: s2.impressions - s1.impressions, // Absolute Change
        ctrP1: s1.impressions > 0 ? (s1.clicks / s1.impressions) * 100 : 0,
        ctrP2: s2.impressions > 0 ? (s2.clicks / s2.impressions) * 100 : 0,
        ctrChange: 0,
        avgPosP1: s1.count > 0 ? s1.posSum / s1.count : 0,
        avgPosP2: s2.count > 0 ? s2.posSum / s2.count : 0,
        avgPosChange: 0,
        uniqueKeywordsP1: uniqueKwP1,
        uniqueKeywordsP2: uniqueKwP2,
        uniqueKeywordsChange: uniqueKwP2 - uniqueKwP1
    };
    kpis.ctrChange = kpis.ctrP2 - kpis.ctrP1;
    kpis.avgPosChange = kpis.avgPosP2 - kpis.avgPosP1;

    const datasetStats = {
        totalClicks: s1.clicks + s2.clicks,
        totalImpressions: s1.impressions + s2.impressions,
        totalDays: (new Set(dataP1.map(r => r.date.getTime())).size + new Set(dataP2.map(r => r.date.getTime())).size)
    };

    const segmentStats = aggSegmentsP2.main.map((s: MetricSeries) => ({
        name: s.name,
        clicks: s.clicks,
        impressions: s.impressions
    })).sort((a: any, b: any) => b.clicks - a.clicks);

    const getDailyTotal = (data: CSVRow[]) => {
        const dailyMap = new Map<string, { clicks: number, impressions: number, posSum: number, count: number, keywords: Set<string> }>();

        data.forEach(row => {
            const d = row.date.toISOString().split('T')[0];
            if (!dailyMap.has(d)) {
                dailyMap.set(d, { clicks: 0, impressions: 0, posSum: 0, count: 0, keywords: new Set() });
            }
            const entry = dailyMap.get(d)!;
            entry.clicks += row.clicks;
            entry.impressions += row.impressions;
            entry.posSum += row.position;
            entry.count += 1;
            if (row.keyword) entry.keywords.add(row.keyword);
        });

        const sortedKeys = Array.from(dailyMap.keys()).sort();

        return {
            dates: sortedKeys,
            clicks: sortedKeys.map(d => dailyMap.get(d)!.clicks),
            impressions: sortedKeys.map(d => dailyMap.get(d)!.impressions),
            position: sortedKeys.map(d => {
                const e = dailyMap.get(d)!;
                return e.count > 0 ? e.posSum / e.count : 0;
            }),
            uniqueKeywords: sortedKeys.map(d => dailyMap.get(d)!.keywords.size)
        };
    };

    const d1 = getDailyTotal(dataP1);
    const d2 = getDailyTotal(dataP2);
    const datesP2Formatted = d2.dates.map(ds => {
        const d = new Date(ds);
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    });

    // Run Anomaly Detection on Period 2 (Active Period)
    const anomalies = detectTimeSeriesAnomalies(datesP2Formatted, d2.clicks);

    return {
        kpis,
        datasetStats,
        segmentStats,
        dailyTrendP1: d1.clicks,
        dailyTrendP2: d2.clicks,
        dailyClicks: d2.clicks,
        dailyImpressions: d2.impressions,
        dailyPosition: d2.position,
        dailyUniqueKeywords: d2.uniqueKeywords,
        datesP2: datesP2Formatted,
        period1Label: p1Label,
        period2Label: p2Label,
        anomalies
    };
}

type AggregationKey = 'page' | 'keyword' | 'country' | 'segment';

function buildAggregations(data: CSVRow[], keyType: AggregationKey) {
    const mainMap = new Map();
    const updateMap = (map: Map<string, any>, key: string, row: CSVRow) => {
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, { clicks: 0, impressions: 0, positionSum: 0, count: 0, dailyClicks: {}, dailyPosition: {} });
        }
        const metrics = map.get(key);
        metrics.clicks += row.clicks;
        metrics.impressions += row.impressions;
        metrics.positionSum += row.position;
        metrics.count += 1;
        const dateStr = row.date.toISOString().split('T')[0];
        if (!metrics.dailyClicks[dateStr]) metrics.dailyClicks[dateStr] = { clicks: 0 };
        metrics.dailyClicks[dateStr].clicks += row.clicks;
        if (!metrics.dailyPosition[dateStr]) metrics.dailyPosition[dateStr] = { positionSum: 0, count: 0 };
        metrics.dailyPosition[dateStr].positionSum += row.position;
        metrics.dailyPosition[dateStr].count += 1;
    };

    for (const row of data) {
        let keyVal = '';
        if (keyType === 'page') keyVal = row.page || '';
        else if (keyType === 'keyword') keyVal = (row.keyword || '').toLowerCase().trim();
        else if (keyType === 'country') keyVal = row.country || '';
        else if (keyType === 'segment') keyVal = row.segment || '';
        if (keyVal) updateMap(mainMap, keyVal, row);
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
            results.push({ name, clicks: metrics.clicks, impressions: metrics.impressions, position: metrics.count > 0 ? metrics.positionSum / metrics.count : 0, keywordCount: 0, dailySeriesClicks, dailySeriesPosition });
        }
        return results;
    };
    return { main: processMap(mainMap) };
}

function compareAggData(aggP1: MetricSeries[], aggP2: MetricSeries[]): ComparisonItem[] {
    const comparisonMap = new Map<string, Partial<ComparisonItem>>();
    aggP1.forEach(item => {
        comparisonMap.set(item.name, { name: item.name, clicksP1: item.clicks, impressionsP1: item.impressions, positionP1: item.position, dailySeriesClicksP1: item.dailySeriesClicks, dailySeriesPositionP1: item.dailySeriesPosition, clicksP2: 0, impressionsP2: 0, positionP2: 0, dailySeriesClicksP2: [], dailySeriesPositionP2: [] });
    });
    aggP2.forEach(item => {
        if (!comparisonMap.has(item.name)) {
            comparisonMap.set(item.name, { name: item.name, clicksP1: 0, impressionsP1: 0, positionP1: 0, dailySeriesClicksP1: [], dailySeriesPositionP1: [], clicksP2: 0, impressionsP2: 0, positionP2: 0, dailySeriesClicksP2: [], dailySeriesPositionP2: [] });
        }
        const existing = comparisonMap.get(item.name)!;
        existing.clicksP2 = item.clicks;
        existing.impressionsP2 = item.impressions;
        existing.positionP2 = item.position;
        existing.dailySeriesClicksP2 = item.dailySeriesClicks;
        existing.dailySeriesPositionP2 = item.dailySeriesPosition;
    });
    const results: ComparisonItem[] = [];
    for (const item of comparisonMap.values()) {
        const fullItem = item as ComparisonItem;
        fullItem.clicksChange = (fullItem.clicksP2 || 0) - (fullItem.clicksP1 || 0);
        fullItem.impressionsChange = (fullItem.impressionsP2 || 0) - (fullItem.impressionsP1 || 0);
        fullItem.positionChange = (fullItem.positionP2 || 0) - (fullItem.positionP1 || 0);
        results.push(fullItem);
    }
    return results;
}

function runDetectionsInOnePass(
    queriesP2: CSVRow[],
    comparedKeywords: ComparisonItem[],
    siteWideKPIs: SiteWideKPIs,
    topWinners: ComparisonItem[],
    topLosers: ComparisonItem[]
) {
    const cannibalizationMap = new Map();
    const ctrMap = new Map();

    for (const row of queriesP2) {
        if (!row.keyword || !row.page) continue;
        const key = `${row.page}||${row.keyword}`;
        if (!ctrMap.has(key)) {
            ctrMap.set(key, { page: row.page, keyword: row.keyword, impressions: 0, clicks: 0, positionSum: 0, count: 0 });
        }
        const ctrItem = ctrMap.get(key);
        ctrItem.impressions += row.impressions;
        ctrItem.clicks += row.clicks;
        ctrItem.positionSum += row.position;
        ctrItem.count += 1;

        if (!cannibalizationMap.has(row.keyword)) {
            cannibalizationMap.set(row.keyword, { totalImpressions: 0, pages: {} });
        }
        const cannItem = cannibalizationMap.get(row.keyword);
        cannItem.totalImpressions += row.impressions;
        if (!cannItem.pages[row.page]) cannItem.pages[row.page] = { clicks: 0, impressions: 0 };
        cannItem.pages[row.page].impressions += row.impressions;
        cannItem.pages[row.page].clicks += row.clicks;
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

    const T = { GHOST_POS_MAX: 10, GHOST_CLICKS_MAX: 0, GHOST_IMP_MIN: 1000, RED_FLAG_POS: 5, RED_FLAG_CTR: 2, RED_FLAG_IMP: 1000, OPP_POS_MIN: 5, OPP_POS_MAX: 15, OPP_CTR: 10, OPP_IMP: 500 };
    aggregatedCTRItems.forEach(item => {
        if (item.avgPosition > 0 && item.avgPosition <= T.GHOST_POS_MAX && item.clicks <= T.GHOST_CLICKS_MAX && item.impressions >= T.GHOST_IMP_MIN) ghostKeywordAlerts.push(item);
        if (item.avgPosition < T.RED_FLAG_POS && item.ctr < T.RED_FLAG_CTR && item.impressions > T.RED_FLAG_IMP) ctrRedFlags.push(item);
        if (item.avgPosition > T.OPP_POS_MIN && item.avgPosition <= T.OPP_POS_MAX && item.ctr > T.OPP_CTR && item.impressions > T.OPP_IMP) ctrOpportunities.push(item);
    });

    const strikingDistanceCandidates = aggregatedCTRItems
        .filter(item => item.avgPosition > 10 && item.avgPosition <= 30 && item.impressions > 500)
        .sort((a, b) => b.impressions - a.impressions).slice(0, 30);

    const cannibalizationAlerts = [];
    for (const [keyword, data] of cannibalizationMap.entries()) {
        const competingPages = Object.entries(data.pages)
            .filter(([_, metrics]: any) => metrics.impressions > 10)
            .map(([page, metrics]: any) => ({ page, impressions: metrics.impressions, clicks: metrics.clicks }))
            .sort((a: any, b: any) => {
                if (b.clicks !== a.clicks) return b.clicks - a.clicks;
                return b.impressions - a.impressions;
            });
        if (competingPages.length >= 2) cannibalizationAlerts.push({ keyword, totalImpressions: data.totalImpressions, competingPages });
    }

    const keywordDecayAlerts = [];
    const newKeywordDiscovery = [];
    const page1LoserAlerts = [];
    for (const item of comparedKeywords) {
        if (!item.name) continue;
        if (item.positionChange > 5 && item.impressionsP2 > 500 && item.positionP1 > 0) keywordDecayAlerts.push(item);
        if (item.impressionsP1 === 0 && item.impressionsP2 > 50) newKeywordDiscovery.push(item);
        if (item.positionP1 > 0 && item.positionP1 <= 10 && item.positionP2 >= 10.1 && item.impressionsP1 > 100) page1LoserAlerts.push(item);
    }

    const outlierAnalysis: any = { topMoversImpact: 0 };
    const top20Winners = topWinners.slice(0, 20);
    const top20Losers = topLosers.slice(0, 20);
    outlierAnalysis.topMoversImpact = top20Winners.reduce((acc, i) => acc + i.clicksChange, 0) + top20Losers.reduce((acc, i) => acc + i.clicksChange, 0);
    if (topLosers.length > 1 && Math.abs(topLosers[0].clicksChange) > (Math.abs(topLosers[1].clicksChange) * 2.5)) {
        outlierAnalysis.clickLoser = { url: topLosers[0].name, change: topLosers[0].clicksChange };
    }

    return {
        outlierAnalysis,
        strikingDistanceCandidates,
        cannibalizationAlerts: cannibalizationAlerts.sort((a, b) => (b.totalImpressions as number) - (a.totalImpressions as number)).slice(0, 10),
        ctrAnalysis: { redFlags: ctrRedFlags.sort((a, b) => b.impressions - a.impressions).slice(0, 10), opportunities: ctrOpportunities.sort((a, b) => b.impressions - a.impressions).slice(0, 10) },
        ghostKeywordAlerts: ghostKeywordAlerts.sort((a, b) => b.impressions - a.impressions).slice(0, 10),
        keywordDecayAlerts: keywordDecayAlerts.sort((a, b) => b.positionChange - a.positionChange).slice(0, 10),
        newKeywordDiscovery: newKeywordDiscovery.sort((a, b) => b.impressionsP2 - a.impressionsP2).slice(0, 30),
        page1LoserAlerts: page1LoserAlerts.sort((a, b) => b.impressionsP1 - a.impressionsP1).slice(0, 10)
    };
}
