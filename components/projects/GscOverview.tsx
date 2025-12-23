import React, { useEffect, useState, useRef } from 'react';
import Chart from 'chart.js/auto';
import { GscService } from '../../services/gscService';
import { ArrowUp, ArrowDown, Minus, MousePointer2, Eye, Activity, Hash, Loader2, Key, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Project } from '../../lib/task_manager';
import { GscSyncControl } from './GscSyncControl';

interface GscOverviewProps {
    project: Project;
}

interface GscData {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface ComparisonData {
    current: GscData;
    previous: GscData;
    rows: any[];
}

interface DataChange {
    term: string; // URL or Keyword
    metric: number;
    change: number;
    type: 'click' | 'impression';
}

interface PageMetric {
    url: string;
    clicks: { value: number; change: number; history: number[] };
    impressions: { value: number; change: number; history: number[] };
    position: { value: number; change: number; history: number[] };
    keywords: { value: number };
}

interface InsightsData {
    topGainers: {
        clicks: DataChange[];
        impressions: DataChange[];
    };
    topLosers: {
        clicks: DataChange[];
        impressions: DataChange[];
    };
    keywordGainers: {
        clicks: DataChange[];
        impressions: DataChange[];
    };
    keywordLosers: {
        clicks: DataChange[];
        impressions: DataChange[];
    };
    topPages: PageMetric[];
}


const Sparkline = ({ data, color = "#3b82f6", width = 60, height = 20, inverse = false }: { data: number[], color?: string, width?: number, height?: number, inverse?: boolean }) => {
    if (!data || data.length < 2) return <div style={{ width, height }} />;

    // For position (inverse), we want lower values higher up? 
    // Usually sparklines for position: 1 is top.
    // Standard svg coordinates: 0 is top. So raw value 1 maps to y=0? 
    // Let's settle: if inverse=true, MIN value is at y=0 (top), MAX at y=height (bottom).
    // if inverse=false, MAX value is at y=0 (top), MIN at y=height (bottom).
    // Wait, svg y=0 is top.
    // Normal graph: Max value -> y=0. Min value -> y=height.

    let min = Math.min(...data);
    let max = Math.max(...data);

    if (min === max) {
        // Flat line
        return (
            <svg width={width} height={height} className="overflow-visible">
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1.5" />
            </svg>
        );
    }

    const range = max - min;
    const step = width / (data.length - 1);

    const points = data.map((d, i) => {
        const x = i * step;
        let normalized = (d - min) / range;
        if (inverse) {
            // If inverse (position), 1 (small) is good (top). 100 (large) is bad (bottom).
            // normalized 0 (min) -> y=0. normalized 1 (max) -> y=height.
            // This corresponds to y = normalized * height.
        } else {
            // Normal (clicks): 100 (large) is good (top). 0 (small) is bad (bottom).
            // normalized 1 -> y=0. normalized 0 -> y=height.
            normalized = 1 - normalized;
        }
        const y = normalized * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export const GscOverview: React.FC<GscOverviewProps> = ({ project }) => {
    const { signInWithGoogle } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<ComparisonData | null>(null);
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (project.gsc_property_url) {
            fetchData();
        }
    }, [project.gsc_property_url]);

    useEffect(() => {
        if (data && chartRef.current) {
            renderChart();
        }
        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const end = new Date();
            end.setDate(end.getDate() - 2); // Align with GSC availability
            const start = new Date(end);
            start.setDate(end.getDate() - 28);

            const prevEnd = new Date(start);
            prevEnd.setDate(prevEnd.getDate() - 1);
            const prevStart = new Date(prevEnd);
            prevStart.setDate(prevEnd.getDate() - 28);

            const fmt = (d: Date) => {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // 1. Try Local Data First
            const localData = await GscService.getLocalAnalytics(project.id, fmt(prevStart), fmt(end));

            // If we have enough data (e.g., at least some rows for current period), use it.
            // Ideally we check if we have data for the requested dates, but for now existence is enough to prefer local.
            const hasLocalData = localData && localData.length > 0;

            if (hasLocalData) {
                // Process Local Data
                const currentPeriodRows = localData.filter((r: any) => r.date >= fmt(start) && r.date <= fmt(end));
                const prevPeriodRows = localData.filter((r: any) => r.date >= fmt(prevStart) && r.date <= fmt(prevEnd));

                const agg = (rows: any[]) => {
                    const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
                    const totalImp = rows.reduce((a, b) => a + b.impressions, 0);
                    const avgCtr = rows.length ? rows.reduce((a, b) => a + b.ctr, 0) / rows.length : 0;
                    const avgPos = rows.length ? rows.reduce((a, b) => a + b.position, 0) / rows.length : 0;
                    return { clicks: totalClicks, impressions: totalImp, ctr: avgCtr, position: avgPos };
                };

                // Map for chart (daily totals)
                const chartRows = currentPeriodRows.map((r: any) => ({
                    keys: [r.date],
                    clicks: r.clicks,
                    impressions: r.impressions,
                    ctr: r.ctr,
                    position: r.position
                }));

                setData({
                    current: agg(currentPeriodRows),
                    previous: agg(prevPeriodRows),
                    rows: chartRows
                });

                // Process Insights from Local JSONB
                processLocalInsights(localData, fmt, end);

            } else {
                // Fallback to Live API
                await fetchLiveApiData(fmt, start, end, prevStart, prevEnd);
            }

        } catch (err: any) {
            console.error("GSC Overview Error", err);
            setError(err.message || 'Error loading GSC data');
        } finally {
            setLoading(false);
        }
    };

    const fetchLiveApiData = async (fmt: any, start: Date, end: Date, prevStart: Date, prevEnd: Date) => {
        const [currentRows, prevRows] = await Promise.all([
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['date']),
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['date'])
        ]);

        const agg = (rows: any[]) => {
            const totalClicks = rows.reduce((a, b) => a + b.clicks, 0);
            const totalImp = rows.reduce((a, b) => a + b.impressions, 0);
            const avgCtr = rows.length ? rows.reduce((a, b) => a + b.ctr, 0) / rows.length : 0;
            const avgPos = rows.length ? rows.reduce((a, b) => a + b.position, 0) / rows.length : 0;
            return { clicks: totalClicks, impressions: totalImp, ctr: avgCtr * 100, position: avgPos };
        };

        setData({
            current: agg(currentRows),
            previous: agg(prevRows),
            rows: currentRows
        });

        await fetchInsights(fmt);
    };

    const processLocalInsights = (allRows: any[], fmt: any, endDate: Date) => {
        // Define Insight Periods (Last 3 days vs Previous 3 days)
        // Note: endDate is "yesterday" or "2 days ago" usually.
        const endStr = fmt(endDate);
        const start = new Date(endDate);
        start.setDate(start.getDate() - 2); // 3 days inclusive
        const startStr = fmt(start);

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevEndStr = fmt(prevEnd);

        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevStart.getDate() - 2);
        const prevStartStr = fmt(prevStart);

        const currRows = allRows.filter((r: any) => r.date >= startStr && r.date <= endStr);
        const prevRows = allRows.filter((r: any) => r.date >= prevStartStr && r.date <= prevEndStr);

        // Helper to aggregate JSONB arrays
        // type: 'top_queries' | 'top_pages'
        // return: [{ keys: [term], clicks, impressions }]
        const aggregateJsonb = (rows: any[], field: 'top_queries' | 'top_pages', keyName: 'term' | 'url') => {
            const map = new Map<string, { clicks: number, imp: number }>();
            rows.forEach(day => {
                const items = day[field] || [];
                items.forEach((item: any) => {
                    const k = item[keyName];
                    const e = map.get(k) || { clicks: 0, imp: 0 };
                    e.clicks += item.clicks;
                    e.imp += item.impressions;
                    map.set(k, e);
                });
            });
            return Array.from(map.entries()).map(([k, v]) => ({
                keys: [k],
                clicks: v.clicks,
                impressions: v.imp
            }));
        };

        const currQueries = aggregateJsonb(currRows, 'top_queries', 'term');
        const prevQueries = aggregateJsonb(prevRows, 'top_queries', 'term');

        // Page Daily for sparklines (need last 9 days)
        // We can just use the daily 'top_pages' for this.
        // It's a bit complex to reconstruct the exact daily history for sparklines from 'top_pages' if a page drops out of top.
        // But we can try.
        const sparklineStart = new Date(endDate);
        sparklineStart.setDate(d => d.getDate() - 9);
        const sparklineStartStr = fmt(sparklineStart);
        const sparklineRows = allRows.filter(r => r.date >= sparklineStartStr && r.date <= endStr);

        // Flatten sparkline data
        const pageDaily: any[] = [];
        sparklineRows.forEach(day => {
            (day.top_pages || []).forEach((p: any) => {
                pageDaily.push({
                    keys: [day.date, p.url],
                    clicks: p.clicks,
                    impressions: p.impressions,
                    position: p.position
                });
            });
        });

        // Current Period Pages (for top pages list)
        const pageKeywordsMock: any[] = []; // We don't store keywords-per-page in the simple sync, so we explicitly set to 0.

        // Re-use logic:
        const kwChanges = processChanges(currQueries, prevQueries, 'query');

        // For pages, we aggregate again
        const currPageMetrics = aggregateJsonb(currRows, 'top_pages', 'url'); // returns {keys, clicks, imp}
        // Need position? aggregateJsonb above didn't sum position.
        // Let's refine aggregation for pages if we want full metrics

        const getPageMetricsInPeriod = (rows: any[]) => {
            const map = new Map<string, { clicks: number, imp: number, posSum: number, count: number }>();
            rows.forEach(r => {
                (r.top_pages || []).forEach((p: any) => {
                    const u = p.url;
                    const e = map.get(u) || { clicks: 0, imp: 0, posSum: 0, count: 0 };
                    e.clicks += p.clicks;
                    e.imp += p.impressions;
                    e.posSum += p.position; // approximating avg position
                    e.count += 1;
                    map.set(u, e);
                });
            });
            return map;
        };

        const currPageMap = getPageMetricsInPeriod(currRows);
        const prevPageMap = getPageMetricsInPeriod(prevRows);

        // ... Convert maps to format for existing logic or just implement simplify here ...
        // To save time, I'll adapt to the existing `insights` structure manually here for the "Local" path

        // ... (This logic duplication is getting heavy. Better to extract the "Processing" logic to a pure function 
        // that takes raw inputs, but inputs differ.)

        // Let's reconstruct inputs for `processChanges` and `finalTopPages` logic.
        // We already have `currQueries` and `prevQueries` in the format `processChanges` expects (array with keys, clicks, imp).

        // Page Metrics for Top Pages
        const topPagesList = Array.from(currPageMap.keys()).sort((a, b) => {
            const dA = currPageMap.get(a)!;
            const dB = currPageMap.get(b)!;
            return (dB.clicks - dA.clicks) || (dB.imp - dA.imp);
        }).slice(0, 10);

        const finalTopPages: PageMetric[] = topPagesList.map(url => {
            const curr = currPageMap.get(url)!;
            const prev = prevPageMap.get(url) || { clicks: 0, imp: 0, posSum: 0, count: 0 };

            // History
            const history = pageDaily
                .filter(r => r.keys[1] === url)
                .sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());

            return {
                url,
                clicks: { value: curr.clicks, change: curr.clicks - prev.clicks, history: history.map(h => h.clicks) },
                impressions: { value: curr.imp, change: curr.imp - prev.imp, history: history.map(h => h.impressions) },
                position: {
                    value: curr.count ? curr.posSum / curr.count : 0,
                    change: (curr.count ? curr.posSum / curr.count : 0) - (prev.count ? prev.posSum / prev.count : 0),
                    history: history.map(h => h.position)
                },
                keywords: { value: 0 } // No KW count in sync
            };
        });

        // Top Movers (Pages)
        // Convert map to array
        const pageChangesArr = Array.from(currPageMap.entries()).map(([url, m]) => {
            const prev = prevPageMap.get(url) || { clicks: 0, imp: 0 };
            return {
                term: url,
                metric: 0,
                change: 0,
                type: 'click' as const,
                clicksChange: m.clicks - prev.clicks,
                impChange: m.imp - prev.imp,
                clicks: m.clicks,
                impressions: m.imp
            };
        });
        Array.from(prevPageMap.entries()).forEach(([url, m]) => {
            if (!currPageMap.has(url)) {
                pageChangesArr.push({
                    term: url, metric: 0, change: 0, type: 'click',
                    clicksChange: -m.clicks, impChange: -m.imp, clicks: 0, impressions: 0
                });
            }
        });

        setInsights({
            topGainers: {
                clicks: pageChangesArr.sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 5).map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: pageChangesArr.sort((a, b) => b.impChange - a.impChange).slice(0, 5).map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            topLosers: {
                clicks: pageChangesArr.sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 5).map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: pageChangesArr.sort((a, b) => a.impChange - b.impChange).slice(0, 5).map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            keywordGainers: {
                clicks: kwChanges.clicksGain.map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: kwChanges.impGain.map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            keywordLosers: {
                clicks: kwChanges.clicksLoss.map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: kwChanges.impLoss.map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            topPages: finalTopPages
        });
    };

    // Helper processChanges (lifted from original or referenced if scope allows, but I need to ensure it's available)
    // It's defined inside fetchInsights in original code. I need to move it out or duplicate.
    // I'll define a simple version here.
    const processChanges = (curr: any[], prev: any[], key: 'query' | 'page') => {
        const map = new Map<string, { clicks: number, impressions: number }>();
        prev.forEach(r => map.set(r.keys[0], { clicks: r.clicks, impressions: r.impressions }));

        const changes = curr.map(r => {
            const p = map.get(r.keys[0]) || { clicks: 0, impressions: 0 };
            return {
                term: r.keys[0],
                clicks: r.clicks,
                impressions: r.impressions,
                clicksChange: r.clicks - p.clicks,
                impChange: r.impressions - p.impressions
            };
        });

        prev.forEach(r => {
            if (!curr.find(c => c.keys[0] === r.keys[0])) {
                changes.push({
                    term: r.keys[0],
                    clicks: 0, impressions: 0,
                    clicksChange: -r.clicks, impChange: -r.impressions
                });
            }
        });

        return {
            clicksGain: [...changes].sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 5),
            clicksLoss: [...changes].sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 5),
            impGain: [...changes].sort((a, b) => b.impChange - a.impChange).slice(0, 5),
            impLoss: [...changes].sort((a, b) => a.impChange - b.impChange).slice(0, 5),
        };
    };

    const fetchInsights = async (fmt: (d: Date) => string) => {
        // defined dates for 3-day windows
        const end = new Date();
        end.setDate(end.getDate() - 2); // 2 days lag usually
        const start = new Date(end);
        start.setDate(end.getDate() - 2); // 3 days inclusive

        const prevEnd = new Date(start);
        prevEnd.setDate(prevEnd.getDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 2);

        // Fetch query data
        const [currQueries, prevQueries, pageDaily, pageKeywords] = await Promise.all([
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['query']),
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(prevStart), fmt(prevEnd), ['query']),
            // 7 days for sparklines
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(new Date(new Date().setDate(new Date().getDate() - 9))), fmt(end), ['date', 'page']),
            GscService.getSearchAnalytics(project.gsc_property_url!, fmt(start), fmt(end), ['page', 'query'])
        ]);

        // Process Keywords Drops/Gains
        const processChanges = (curr: any[], prev: any[], key: 'query' | 'page') => {
            const map = new Map<string, { clicks: number, impressions: number }>();
            prev.forEach(r => map.set(r.keys[0], { clicks: r.clicks, impressions: r.impressions }));

            const changes = curr.map(r => {
                const p = map.get(r.keys[0]) || { clicks: 0, impressions: 0 };
                return {
                    term: r.keys[0],
                    clicks: r.clicks,
                    impressions: r.impressions,
                    clicksChange: r.clicks - p.clicks,
                    impChange: r.impressions - p.impressions
                };
            });

            // Also include items that dropped to 0 (in prev but not in curr)
            prev.forEach(r => {
                if (!curr.find(c => c.keys[0] === r.keys[0])) {
                    changes.push({
                        term: r.keys[0],
                        clicks: 0,
                        impressions: 0,
                        clicksChange: -r.clicks,
                        impChange: -r.impressions
                    });
                }
            });

            return {
                clicksGain: [...changes].sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 5),
                clicksLoss: [...changes].sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 5),
                impGain: [...changes].sort((a, b) => b.impChange - a.impChange).slice(0, 5),
                impLoss: [...changes].sort((a, b) => a.impChange - b.impChange).slice(0, 5),
            };
        };

        const kwChanges = processChanges(currQueries, prevQueries, 'query');

        // aggregate page daily for totals
        const pageTotalsStart = start.getTime();
        const pageTotalsEnd = end.getTime();
        const prevPageTotalsStart = prevStart.getTime();
        const prevPageTotalsEnd = prevEnd.getTime();

        // Helper to get totals per page in ranges
        const getPageMetricsInPeriod = (rows: any[], s: number, e: number) => {
            const map = new Map<string, { clicks: number, imp: number, posSum: number, count: number }>();
            rows.forEach(r => {
                const d = new Date(r.keys[0]).getTime();
                if (d >= s && d <= e) {
                    const u = r.keys[1];
                    const existing = map.get(u) || { clicks: 0, imp: 0, posSum: 0, count: 0 };
                    existing.clicks += r.clicks;
                    existing.imp += r.impressions;
                    existing.posSum += r.position;
                    existing.count += 1;
                    map.set(u, existing);
                }
            });
            return map;
        };

        const currPageMetrics = getPageMetricsInPeriod(pageDaily, pageTotalsStart, pageTotalsEnd);
        const prevPageMetrics = getPageMetricsInPeriod(pageDaily, prevPageTotalsStart, prevPageTotalsEnd);

        // Top Pages Processing
        const allPages = Array.from(currPageMetrics.keys());
        const topPagesList = allPages.sort((a, b) => {
            const dA = currPageMetrics.get(a)!;
            const dB = currPageMetrics.get(b)!;
            return (dB.clicks - dA.clicks) || (dB.imp - dA.imp);
        }).slice(0, 10);

        // Counts of keywords per page
        const kwCountMap = new Map<string, number>();
        pageKeywords.forEach(r => {
            const u = r.keys[0];
            kwCountMap.set(u, (kwCountMap.get(u) || 0) + 1);
        });

        const finalTopPages: PageMetric[] = topPagesList.map(url => {
            const curr = currPageMetrics.get(url)!;
            const prev = prevPageMetrics.get(url) || { clicks: 0, imp: 0, posSum: 0, count: 0 };

            // History for sparklines (sorted by date)
            const history = pageDaily
                .filter(r => r.keys[1] === url)
                .sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());

            return {
                url,
                clicks: {
                    value: curr.clicks,
                    change: curr.clicks - prev.clicks,
                    history: history.map(h => h.clicks)
                },
                impressions: {
                    value: curr.imp,
                    change: curr.imp - prev.imp,
                    history: history.map(h => h.impressions)
                },
                position: {
                    value: curr.count ? curr.posSum / curr.count : 0,
                    change: (curr.count ? curr.posSum / curr.count : 0) - (prev.count ? prev.posSum / prev.count : 0),
                    history: history.map(h => h.position)
                },
                keywords: {
                    value: kwCountMap.get(url) || 0
                }
            };
        });

        // Also get page drops/gains
        // We can do this from the aggregated 3 day chunks we just built, or fetch ['page'] specifically if daily isn't enough.
        // Actually daily gives us what we need assuming row limit didn't cut off small pages.
        // Let's assume daily is enough for top movers. 
        // We need to convert Map to Array for sorting
        const pageChangesArr = Array.from(currPageMetrics.entries()).map(([url, m]) => {
            const prev = prevPageMetrics.get(url) || { clicks: 0, imp: 0 };
            return {
                term: url,
                metric: 0, // unused here
                change: 0, // unused
                type: 'click' as const,
                clicksChange: m.clicks - prev.clicks,
                impChange: m.imp - prev.imp,
                clicks: m.clicks,
                impressions: m.imp
            };
        });
        // Add full drops
        Array.from(prevPageMetrics.entries()).forEach(([url, m]) => {
            if (!currPageMetrics.has(url)) {
                pageChangesArr.push({
                    term: url,
                    metric: 0,
                    change: 0,
                    type: 'click',
                    clicksChange: -m.clicks,
                    impChange: -m.imp,
                    clicks: 0,
                    impressions: 0
                });
            }
        });

        setInsights({
            topGainers: {
                clicks: pageChangesArr.sort((a, b) => b.clicksChange - a.clicksChange).slice(0, 5).map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: pageChangesArr.sort((a, b) => b.impChange - a.impChange).slice(0, 5).map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            topLosers: {
                clicks: pageChangesArr.sort((a, b) => a.clicksChange - b.clicksChange).slice(0, 5).map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: pageChangesArr.sort((a, b) => a.impChange - b.impChange).slice(0, 5).map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            keywordGainers: {
                clicks: kwChanges.clicksGain.map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: kwChanges.impGain.map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            keywordLosers: {
                clicks: kwChanges.clicksLoss.map(x => ({ term: x.term, metric: x.clicks, change: x.clicksChange, type: 'click' })),
                impressions: kwChanges.impLoss.map(x => ({ term: x.term, metric: x.impressions, change: x.impChange, type: 'impression' })),
            },
            topPages: finalTopPages
        });

    };

    const renderChart = () => {
        if (!chartRef.current || !data) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        // Sort by date
        const sortedRows = [...data.rows].sort((a, b) => new Date(a.keys[0]).getTime() - new Date(b.keys[0]).getTime());
        const labels = sortedRows.map(r => new Date(r.keys[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }));
        const clicks = sortedRows.map(r => r.clicks);
        const impressions = sortedRows.map(r => r.impressions);

        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Clics',
                        data: clicks,
                        borderColor: '#3b82f6', // blue-500
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    },
                    {
                        label: 'Impresiones',
                        data: impressions,
                        borderColor: '#8b5cf6', // violet-500
                        borderWidth: 2,
                        borderDash: [5, 5],
                        yAxisID: 'y1',
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 10, family: 'sans-serif' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#1e293b',
                        bodyColor: '#475569',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 10,
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 11 }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 8, font: { size: 10 }, color: '#94a3b8' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: '#f1f5f9' },
                        ticks: { font: { size: 10 }, color: '#94a3b8' }
                    },
                    y1: {
                        type: 'linear',
                        display: false,
                        position: 'right',
                        grid: { display: false }
                    }
                }
            }
        });
    };

    const MetricCard = ({ label, value, prevValue, format, icon: Icon, reverseColor = false }: any) => {
        const delta = value - prevValue;
        const pct = prevValue ? (delta / prevValue) * 100 : 0;

        let colorClass = 'text-slate-500';
        let IconComp = Minus;

        if (delta > 0) {
            colorClass = reverseColor ? 'text-rose-500' : 'text-emerald-500';
            IconComp = ArrowUp;
        } else if (delta < 0) {
            colorClass = reverseColor ? 'text-emerald-500' : 'text-rose-500';
            IconComp = ArrowDown;
        }

        return (
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                        <Icon size={18} />
                    </div>
                    <div className={`flex items-center text-xs font-bold ${colorClass}`}>
                        <IconComp size={12} className="mr-0.5" />
                        {Math.abs(pct).toFixed(1)}%
                    </div>
                </div>
                <div>
                    <div className="text-2xl font-bold text-slate-700">{format(value)}</div>
                    <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</div>
                </div>
            </div>
        );
    };

    if (!project.gsc_property_url) return null;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 bg-white rounded-2xl border border-brand-power/5 shadow-sm">
                <Loader2 className="animate-spin text-brand-accent mb-2" size={24} />
                <span className="ml-3 text-sm font-medium text-slate-500">Cargando datos de GSC...</span>
            </div>
        );
    }

    if (error) {
        const isAuthError = error.includes('No access token') || error.includes('sign in with Google') || error.includes('permissions') || error.includes('invalid authentication credentials') || error.includes('Expected OAuth 2');

        return (
            <div className="p-8 bg-white border border-brand-power/5 rounded-2xl shadow-sm flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                    <Key size={32} />
                </div>
                <h3 className="text-lg font-bold text-brand-power mb-2">
                    {isAuthError ? 'Conexión con Google Requerida' : 'Error de Conexión'}
                </h3>
                <p className="text-sm text-brand-power/50 mb-6 max-w-md">
                    {isAuthError
                        ? 'Para ver las métricas de Search Console, necesitamos que inicies sesión con tu cuenta de Google y concedas permisos de lectura.'
                        : error}
                </p>
                {isAuthError && (
                    <button
                        onClick={() => signInWithGoogle(window.location.href)}
                        className="flex items-center gap-2 px-6 py-3 bg-brand-power text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg"
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-4 h-4" alt="G" />
                        Conectar Google Search Console
                    </button>
                )}
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-brand-power">Rendimiento de Búsqueda</h2>
                    <p className="text-xs text-slate-400">Últimos 28 días vs periodo anterior</p>
                </div>
                <GscSyncControl project={project} onSyncComplete={fetchData} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    label="Clics Totales"
                    value={data.current.clicks}
                    prevValue={data.previous.clicks}
                    format={(v: number) => new Intl.NumberFormat('en-US').format(v)}
                    icon={MousePointer2}
                />
                <MetricCard
                    label="Impresiones"
                    value={data.current.impressions}
                    prevValue={data.previous.impressions}
                    format={(v: number) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(v)}
                    icon={Eye}
                />
                <MetricCard
                    label="CTR Promedio"
                    value={data.current.ctr}
                    prevValue={data.previous.ctr}
                    format={(v: number) => v.toFixed(1) + '%'}
                    icon={Activity}
                />
                <MetricCard
                    label="Posición Media"
                    value={data.current.position}
                    prevValue={data.previous.position}
                    format={(v: number) => v.toFixed(1)}
                    icon={Hash}
                    reverseColor={true} // Lower is better
                />
            </div>

            {insights && (
                <>
                    <div className="mt-8 mb-4">
                        <h2 className="text-lg font-bold text-brand-power">Alertas de Rendimiento (3 días)</h2>
                        <p className="text-xs text-slate-400">Comparativa últimos 3 días vs 3 días anteriores</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* URL Changes */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <TrendingDown className="text-rose-500" size={18} /> Caídas Relevantes (URLs)
                            </h3>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                {insights.topLosers.clicks.filter(x => Math.abs(x.change) > 0).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term.replace(/https?:\/\/[^\/]+/, '')}</span>
                                        <span className="text-rose-500 font-medium flex items-center gap-1">
                                            {item.change} clics
                                        </span>
                                    </div>
                                ))}
                                {insights.topLosers.impressions.filter(x => Math.abs(x.change) > 50).slice(0, 2).map((item, i) => (
                                    <div key={i + 'imp'} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term.replace(/https?:\/\/[^\/]+/, '')}</span>
                                        <span className="text-rose-500 font-medium flex items-center gap-1">
                                            {item.change} imp.
                                        </span>
                                    </div>
                                ))}
                                {insights.topLosers.clicks.length === 0 && <div className="text-xs text-slate-400 italic">Sin caídas significativas</div>}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <TrendingUp className="text-emerald-500" size={18} /> Subidas Relevantes (URLs)
                            </h3>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                {insights.topGainers.clicks.filter(x => x.change > 0).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term.replace(/https?:\/\/[^\/]+/, '')}</span>
                                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                                            +{item.change} clics
                                        </span>
                                    </div>
                                ))}
                                {insights.topGainers.impressions.filter(x => x.change > 50).slice(0, 2).map((item, i) => (
                                    <div key={i + 'imp'} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term.replace(/https?:\/\/[^\/]+/, '')}</span>
                                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                                            +{item.change} imp.
                                        </span>
                                    </div>
                                ))}
                                {insights.topGainers.clicks.length === 0 && <div className="text-xs text-slate-400 italic">Sin subidas significativas</div>}
                            </div>
                        </div>

                        {/* Keyword Changes */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <TrendingDown className="text-rose-500" size={18} /> Caídas Keywords
                            </h3>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                {insights.keywordLosers.clicks.filter(x => Math.abs(x.change) > 0).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term}</span>
                                        <span className="text-rose-500 font-medium flex items-center gap-1">
                                            {item.change} clics
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                                <TrendingUp className="text-emerald-500" size={18} /> Subidas Keywords
                            </h3>
                            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm space-y-3">
                                {insights.keywordGainers.clicks.filter(x => x.change > 0).slice(0, 3).map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm">
                                        <span className="truncate max-w-[60%] text-slate-600" title={item.term}>{item.term}</span>
                                        <span className="text-emerald-500 font-medium flex items-center gap-1">
                                            +{item.change} clics
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-brand-power mb-4">Top 10 Páginas (Rendimiento)</h2>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <th className="p-4">URL</th>
                                            <th className="p-4 text-center">Clics (3d)</th>
                                            <th className="p-4 text-center">Impr (3d)</th>
                                            <th className="p-4 text-center">Pos</th>
                                            <th className="p-4 text-center">KWs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {insights.topPages.map((page, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 max-w-[200px]">
                                                    <div className="truncate font-medium text-slate-700" title={page.url}>
                                                        {page.url.replace(/https?:\/\/[^\/]+/, '') || '/'}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-slate-700">{page.clicks.value}</span>
                                                        <span className={`text-[10px] ${page.clicks.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {page.clicks.change > 0 ? '+' : ''}{page.clicks.change}
                                                        </span>
                                                        <div className="mt-1">
                                                            <Sparkline data={page.clicks.history} color="#3b82f6" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-slate-700">{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(page.impressions.value)}</span>
                                                        <span className={`text-[10px] ${page.impressions.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {page.impressions.change > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { notation: 'compact' }).format(page.impressions.change)}
                                                        </span>
                                                        <div className="mt-1">
                                                            <Sparkline data={page.impressions.history} color="#8b5cf6" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex flex-col items-center">
                                                        <span className="font-bold text-slate-700">{page.position.value.toFixed(1)}</span>
                                                        <span className={`text-[10px] ${page.position.change <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                            {page.position.change > 0 ? '+' : ''}{page.position.change.toFixed(1)}
                                                        </span>
                                                        <div className="mt-1">
                                                            <Sparkline data={page.position.history} color="#fbbf24" inverse />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="font-bold text-slate-700">{page.keywords.value}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm h-80">
                <canvas ref={chartRef} />
            </div>
        </div>
    );
};
