export interface CSVRow {
    page: string;
    keyword: string;
    date: Date;
    country: string;
    segment: string;
    clicks: number;
    impressions: number;
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
    dailySeriesClicksP1: number[];
    dailySeriesPositionP1: number[];
    
    clicksP2: number;
    impressionsP2: number;
    positionP2: number;
    keywordCountP2: number;
    dailySeriesClicksP2: number[];
    dailySeriesPositionP2: number[];

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
    avgPosP1: number;
    avgPosP2: number;
    avgPosChange: number;
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
}

export interface LogEntry {
    message: string;
    type: 'info' | 'warn' | 'error';
    timestamp: string;
}

export interface ChartData {
    topWinners: ComparisonItem[];
    topLosers: ComparisonItem[];
    dashboardStats: DashboardStats;
    chartLookup: Record<string, ComparisonItem>;
}