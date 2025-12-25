
export type UsageMode = 'default' | 'pitch' | 'achievements';

export interface CSVRow {
    date: Date;
    clicks: number;
    impressions: number;
    position: number;
    // Optional fields depending on the CSV Source
    page?: string;
    keyword?: string;
    country?: string;
    segment?: string;
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
    dailySeriesImpressionsP2: number[];
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
    uniqueKeywordsP1: number;
    uniqueKeywordsP2: number;
    uniqueKeywordsChange: number;
}

export interface AnomalyPoint {
    date: string;
    value: number;
    type: 'spike' | 'drop';
    deviation: number; // How many std devs away
}

export interface Ga4Stats {
    sessions: number;
    activeUsers: number;
    newUsers: number;
    bounceRate: number;
    avgSessionDuration: number;
    aiSessions: number;
    topSources: { name: string; sessions: number }[];
}

export interface AiTrafficSource {
    source: string;
    sessionsP1: number;
    sessionsP2: number;
    sessionsChange: number;
    isAi: boolean; // Flag determined by service or heuristic
}

export interface AiTrafficAnalysis {
    overview: {
        totalAiSessionsP1: number;
        totalAiSessionsP2: number;
        totalChange: number;
        growthRate: number;
    };
    sources: AiTrafficSource[];
    dailyTrend: {
        dates: string[];
        aiSessions: number[];
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
    dailyClicks: number[];
    dailyImpressions: number[];
    dailyPosition: number[];
    dailyUniqueKeywords: number[];
    datesP2: string[]; // Added for specific chart labels
    period1Label: string;
    period2Label: string;
    anomalies: AnomalyPoint[]; // New field for UI
    ga4Stats?: Ga4Stats;
}

// Phase 2: Forensic Analysis Interfaces
export interface KeywordCause {
    keyword: string;
    clicksChange: number;
    impressionsChange: number;
    positionP1: number;
    positionP2: number;
    positionChange: number;
}

export interface UrlLossDiagnosis {
    url: string;
    totalLoss: number;
    culprits: KeywordCause[];
}

// Phase 3: Strategic Intelligence
export interface StrategicOverview {
    defend: { keyword: string, clicks: number, position: number }[]; // Pos 1-3
    attack: { keyword: string, impressions: number, position: number }[]; // Pos 4-10
    expand: { keyword: string, impressions: number, position: number }[]; // Pos 11-20
    prune: { keyword: string, position: number, status: string }[]; // Decaying or Cannibalized
}

export interface CannibalizationChartData {
    keyword: string;
    urls: {
        url: string;
        dailyPositions: number[]; // Can also be clicks, but position shows the "fight" better
    }[];
    dates: string[];
}

// Phase 4: Clustering & Opportunity (Enhanced)
export interface TopicCluster {
    name: string;
    keywords: string[];
    totalImpressions: number;
    avgPosition: number;
    avgCtr: number;
    difficultyScore: number; // 0-100 based on position
    opportunityScore: number; // Calculated heuristic
}

// Phase 5: Tactical Actions
export interface ContentBrief {
    title: string;
    targetKeyword: string;
    intent: string;
    structure: string[]; // H2s
    semanticKeywords: string[];
    audience: string;
}

export interface SnippetOptimization {
    originalTitle: string;
    originalDesc: string; // If inferred
    variations: {
        title: string;
        description: string;
        reasoning: string;
    }[];
}

export interface ReportPayload {
    projectName: string;
    period1Name: string;
    period2Name: string;
    userContext: string;
    dashboardStats?: DashboardStats;
    // Phase 3: Dedicated field for Agent Findings
    agentInvestigation?: string;
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
    // Phase 1 Additions: Concentration Analysis
    concentrationAnalysis: {
        clickConcentration: { items: any[], percentage: number, totalMetric: number, threshold: number };
        impressionConcentration: { items: any[], percentage: number, totalMetric: number, threshold: number };
    };
    // Phase 2 Additions: Deep Dive / Forensic Analysis
    lossCauseAnalysis: UrlLossDiagnosis[];
    // Phase 3 Additions: Strategy & Visuals
    strategicOverview: StrategicOverview;
    // Phase 4 Additions: Clusters
    topicClusters: TopicCluster[];
    anomaliesFound: AnomalyPoint[]; // Send to AI

    // Critical addition for the "Handshake"
    availableChartKeys: string[];
    // Phase 5: Task Performance Integration
    taskPerformanceAnalysis?: TaskPerformance[];
    // Phase 5.1: Content Analysis
    contentAnalysis?: {
        config: ContentAnalysisConfig;
        overview: any;
        items: any[];
    };
    // Phase 6: AI Traffic Analysis (GA4)
    aiTrafficAnalysis?: AiTrafficAnalysis;

    // --- NEW REFACTOR FIELDS ---
    sections?: ReportSection[]; // The new modular structure
    rawChartData?: ChartData; // Persisted for reconstruction
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
    // Phase 3: Specific charts for conflicts
    cannibalizationLookup: Record<string, CannibalizationChartData>;
    aiTrafficTrend?: { dates: string[], aiSessions: number[] };
}

export type FileType = 'pages' | 'queries' | 'countries';

// Phase 1.2: Filter Options for the Query Engine
export interface FilterOptions {
    startDate?: Date;
    endDate?: Date;
    urlIncludes?: string; // Partial match
    keywordIncludes?: string; // Partial match
    country?: string; // Exact match
    minClicks?: number;
    minImpressions?: number;
    limit?: number; // For rankings
}

export interface AggregatedMetrics {
    clicks: number;
    impressions: number;
    ctr: number;
    avgPosition: number;
    count: number;
}

// Added for Phase 5 Task Integration
export interface TaskPerformance {
    taskId: number;
    taskTitle: string;
    status: 'growth' | 'decay' | 'stable';
    metrics: {
        clicks: number;
        impressions: number;
        position: number;
        sessions?: number;
        bounceRate?: number;
        avgDuration?: number;
    };
    comparison: {
        clicksChange: number;
        impressionsChange: number;
        positionChange: number;
    };
    url: string;
}

export interface SectionConfig {
    id: string;
    title?: string;
    caseCount?: number;
}

// --- NEW REFACTOR TYPES ---

export type DynamicChartType = 'line' | 'bar' | 'scatter' | 'kpi-card';

export interface DynamicChartConfig {
    type: DynamicChartType;
    title: string;
    metrics: {
        label: string;
        dataKey: string; // e.g., 'clicks', 'impressions', 'position', 'ctr'
        color?: string;
    }[];
    xAxisKey?: string; // Default to dates
    filter?: {
        urlIncludes?: string;
        queryIncludes?: string;
        country?: string;
    }
}

export interface ReportSection {
    id: string;
    type: 'text' | 'chart' | 'hybrid' | 'kpi-grid';
    title?: string;
    content?: string; // HTML content for text/hybrid
    chartConfig?: DynamicChartConfig; // For charts
    kpiConfig?: {
        items: { label: string, value: string | number, trend?: number, prefix?: string, suffix?: string }[]
    }; // For KPI grids
    isEditable?: boolean; // Defaults to true
    order: number;
}

export interface TaskImpactConfig {
    enabled: boolean;
    startDate: string;
    endDate: string;
    selectedTaskIds: number[];
    measurementMode: 'start' | 'completion' | 'custom';
    customDate?: string;
    projectId?: number;
}

export interface ContentAnalysisConfig {
    enabled: boolean;
    mode: 'month' | 'items';
    selectedMonth?: string;
    selectedTaskIds: number[];
}
