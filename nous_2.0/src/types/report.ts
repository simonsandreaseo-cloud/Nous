export interface GscRow {
    page?: string;
    keyword?: string; // or query
    date: Date; // standard Date object
    country: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

export interface MetricSeries {
    name: string;
    clicks: number;
    impressions: number;
    position: number;
    keywordCount: number;
    dailySeriesClicks: number[];
    dailySeriesPosition: number[];
}

export interface ComparisonItem extends MetricSeries {
    clicksP1: number;
    impressionsP1: number;
    positionP1: number;
    keywordCountP1: number;
    clicksP2: number;
    impressionsP2: number;
    positionP2: number;
    keywordCountP2: number;

    clicksChange: number;
    impressionsChange: number;
    positionChange: number;
    keywordCountChange: number;
}

export interface SiteWideKPIs {
    clicksP1: number;
    clicksP2: number;
    impressionsP1: number;
    impressionsP2: number;
    totalClicksChange: number;
    totalImpressionsChange: number;
    ctrP1: number;
    ctrP2: number;
    ctrChange: number;
}

export interface SeoStatus {
    overview: SiteWideKPIs;
    top3: { count: number, share: number, change: number };
    top10: { count: number, share: number, change: number };
    top20: { count: number, share: number, change: number };
    newKeywords: {
        total: number;
        clicks: number;
        impressions: number;
        avgPos: number;
    };
    categoryDistribution: { category: string, clicks: number, share: number }[];
    monthlyTrend: {
        p1: number[],
        p2: number[]
    };
}

export interface DashboardStats {
    kpis: SiteWideKPIs;
    datasetStats: {
        totalClicks: number;
        totalImpressions: number;
        totalDays: number;
    };
    segmentStats: { name: string; clicks: number; impressions: number }[];
    dailyTrendP1: number[];
    dailyTrendP2: number[];
    period1Label: string;
    period2Label: string;
}

export interface ReportPayload {
    period1Name: string;
    period2Name: string;
    userContext: string;
    metricsSummary: any;
    segmentAnalysis: any[];
    visibilityAnalysis: { winners: any[], losers: any[] };
    countryAnalysis: any[];
    outlierAnalysis: any;
    strikingDistanceOpportunities: any[];
    keywordCannibalizationAlerts: any[];
    ctrAnalysis: { redFlags: any[], opportunities: any[] };
    ghostKeywordAlerts: any[];
    keywordDecayAlerts: any[];
    newKeywordDiscovery: any[];
    page1LoserAlerts: any[];
    topWinners: any[];
    topLosers: any[];
    seoStatus: SeoStatus; // New consolidated section
    aiTrafficAnalysis?: {
        sources: { source: string, sessions: number, estimatedImpressions: number }[];
        topPages: { page: string, source: string, sessions: number }[];
        totalSessions: number;
        totalEstimatedImpressions: number;
    };
}
