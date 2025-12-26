
export interface HeliosChartDataPoint {
    label: string;
    value: number;
    category?: string;
}

export interface HeliosChartConfig {
    id: string;
    title: string;
    type: 'bar' | 'line' | 'pie' | 'area' | 'composed';
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
