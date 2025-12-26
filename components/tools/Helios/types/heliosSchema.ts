
export interface HeliosChartDataPoint {
    label: string;
    value: number;
    category?: string;
    yAxisID?: 'y' | 'y1'; // Support dual axis
}

export interface HeliosChartConfig {
    id: string;
    title: string;
    type: 'bar' | 'line' | 'pie' | 'area' | 'composed' | 'table';
    data: HeliosChartDataPoint[];
    xAxisLabel?: string;
    yAxisLabel?: string;
    description?: string; // Analysis of the chart
    colorScheme?: 'brand' | 'alert' | 'success' | 'neutral';
}

export interface HeliosOpportunityItem {
    keyword: string;
    currentPosition: number;
    impressionVolume: number;
    url: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    actionableInsight: string; // "Optimize H1", "Internal Link", etc.
}

export interface HeliosSection {
    id: string;
    title: string;
    summary: string; // High level textual summary for this section
    content: string; // Detailed markdown content if needed
    charts: HeliosChartConfig[];
    opportunities?: HeliosOpportunityItem[];
}

export interface HeliosReport {
    title: string;
    executiveSummary: string;
    sections: HeliosSection[];
    meta: {
        generatedAt: string;
        model: string;
        mode: 'helios-v1';
    };
}

export interface HeliosConfig {
    reportType: 'standard' | 'deep_dive' | 'quick_audit' | 'pitch'; // Added pitch
    modules: {
        executive_summary: boolean;
        traffic_anomalies: boolean;
        striking_distance: boolean;
        task_impact: boolean; // Custom modules
        content_performance: boolean; // Custom modules
        concentration: boolean; // NEW
        new_keywords: boolean; // NEW
        segment_analysis: boolean; // NEW
        cannibalization: boolean; // NEW Phase 6
        keyword_decay: boolean; // NEW Phase 6
        strategic_overview: boolean; // NEW Phase 6
        ctr_opportunities: boolean; // NEW Phase 6
        technical_health: boolean;
    };
    taskImpact: {
        include_completed: boolean;
        months_lookback: number;
        selectedTaskIds?: number[]; // NEW: Specific tasks
    };
    contentPerformance: {
        min_traffic: number;
        compare_period: boolean;
        mode: 'top_gainers' | 'top_losers' | 'specific_urls' | 'items';
        selectedTaskIds?: number[]; // NEW: Specific items derived from tasks
        selectedMonth?: string; // NEW: Month filter
    };
}
