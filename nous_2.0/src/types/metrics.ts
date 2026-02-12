export interface GscDailyMetric {
    id: string;
    project_id: string;
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    top_queries?: Array<{
        term: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    }>;
    top_pages?: Array<{
        url: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
    }>;
}

export interface MetricSummary {
    totalClicks: number;
    totalImpressions: number;
    avgCtr: number;
    avgPosition: number;
}
