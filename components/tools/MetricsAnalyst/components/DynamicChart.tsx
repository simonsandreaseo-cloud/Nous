import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { DynamicChartConfig, ChartData, ComparisonItem } from '../types';

interface DynamicChartProps {
    config: DynamicChartConfig;
    chartData: ChartData;
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ config, chartData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !chartData) return;

        // Cleanup
        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // DATA PREPARATION LOGIC
        // We need to extract the correct series based on the filter and config.
        // This is a simplified "Smart" extraction.

        let labels: string[] = [];
        let datasets: any[] = [];

        // BASE DATASET: Default to site-wide Dashboard Stats P2 OR aggregation
        // If filter is present, we try to create an aggregation on the fly or find a specific URL.

        // 1. Determine Data Source
        let sourceSeries: { dates: string[], values: Record<string, number[]> } = { dates: [], values: {} };

        // For now, simpler implementation: Use Dashboard Main Trend if no specific filter
        // Or Top Winner/Loser if filtered by URL

        if (config.filter?.urlIncludes) {
            // Find specific URL data
            const lookupKey = config.filter.urlIncludes.toLowerCase().trim().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
            const item = chartData.chartLookup[lookupKey] ||
                chartData.chartLookup['https://' + lookupKey] ||
                chartData.topWinners.find(w => w.name.includes(lookupKey)) ||
                chartData.topLosers.find(w => w.name.includes(lookupKey));

            if (item) {
                // Use P2 data for trends mostly
                labels = item.dailySeriesClicksP2.map((_, i) => `Day ${i + 1}`); // We might need actual dates passed down
                // Note: We need actual dates in the ChartData structure globally to be perfect, 
                // but for now let's use the indices or dashboard dates if available.
                if (chartData.dashboardStats?.datesP2) {
                    labels = chartData.dashboardStats.datesP2;
                }

                sourceSeries.values['clicks'] = item.dailySeriesClicksP2;
                sourceSeries.values['impressions'] = item.dailySeriesImpressionsP2;
                sourceSeries.values['position'] = item.dailySeriesPositionP2;
            }
        } else {
            // Use Site Wide P2
            if (chartData.dashboardStats) {
                labels = chartData.dashboardStats.datesP2;
                sourceSeries.values['clicks'] = chartData.dashboardStats.dailyClicks;
                sourceSeries.values['impressions'] = chartData.dashboardStats.dailyImpressions;
                sourceSeries.values['position'] = chartData.dashboardStats.dailyPosition;
            }
        }

        // 2. Build Datasets
        datasets = config.metrics.map(metric => {
            const rawData = sourceSeries.values[metric.dataKey] || [];

            return {
                label: metric.label,
                data: rawData,
                borderColor: metric.color || '#6366f1',
                backgroundColor: (metric.color || '#6366f1') + '20', // Add transparency
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4
            };
        });

        chartInstance.current = new Chart(ctx, {
            type: config.type === 'line' ? 'line' : 'bar', // Support Map later
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { usePointStyle: true, boxWidth: 6 }
                    },
                    title: {
                        display: true,
                        text: config.title,
                        font: { size: 14, weight: 'bold' }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                    y: {
                        display: true,
                        grid: { color: '#f1f5f9' },
                        reverse: datasets.some(d => d.label.toLowerCase().includes('posic')) // Reverse for position
                    }
                }
            }
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        }

    }, [config, chartData]);

    return (
        <div className="w-full h-full min-h-[300px] bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <canvas ref={canvasRef} />
        </div>
    );
};
