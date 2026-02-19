'use server';

import { GscService } from '@/lib/services/report/gscService';
import { runFullAnalysis } from '@/lib/services/report/analysisService';
import { getRelevantSections, generateHTMLReport } from '@/lib/services/report/geminiService';
import { SegmentationService } from '@/lib/services/report/segmentationService';
import { parseISO, subDays, format } from 'date-fns';
import { GscRow } from '@/types/report';
import { AnalyticsService } from '@/lib/services/report/analyticsService';
import { identifyAiTrafficSources, generateContent, generateInsightAnalysis } from '@/lib/services/report/geminiService';
import { supabase } from '@/lib/supabase';
import { AI_CONFIG, getGeminiKey } from '@/lib/ai/config';
import { GoogleExportService } from '@/lib/services/export/googleExportService';

export async function generateReportAction(
    projectId: string,
    userContext: string,
    customRules?: { name: string, regex: string }[], // New optional argument
    dateRange?: { start: string, end: string }
) {
    try {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("API Key de IA no configurada en el sistema");

        // 1. Determine Date Ranges
        const endP2 = dateRange?.end ? parseISO(dateRange.end) : new Date();
        const startP2 = dateRange?.start ? parseISO(dateRange.start) : subDays(endP2, 28);

        const duration = (endP2.getTime() - startP2.getTime());
        const endP1 = new Date(startP2.getTime() - 1);
        const startP1 = new Date(endP1.getTime() - duration);

        const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
        const labels = {
            p1: `${format(startP1, 'dd MMM')} - ${format(endP1, 'dd MMM')}`,
            p2: `${format(startP2, 'dd MMM')} - ${format(endP2, 'dd MMM')}`
        };

        // 2. Fetch Data
        const fullDataP1 = await GscService.fetchData(projectId, fmt(startP1), fmt(endP1));
        const fullDataP2 = await GscService.fetchData(projectId, fmt(startP2), fmt(endP2));

        const transform = (data: any) => ({
            pages: data.pageMetrics,
            queries: data.queryMetrics,
            joint: data.jointMetrics
        });

        const p2Data = transform(fullDataP2);

        // 3. AI Segmentation Step (Smart Analysis)
        let segmentRules: any[] = customRules || [];

        if (!customRules || customRules.length === 0) {
            const uniqueUrls = Array.from(new Set(p2Data.pages.map((r: any) => r.page).filter(Boolean))) as string[];
            if (uniqueUrls.length > 0) {
                try {
                    segmentRules = await SegmentationService.generateSegmentRules(uniqueUrls, apiKey);
                } catch (err) {
                    console.warn("Segmentation AI failed, using fallback", err);
                }
            }
        }

        // --- NEW: Google Analytics 4 Integration (AI Traffic) ---
        let aiTrafficAnalysis: any = undefined;
        try {
            // We need the project's user_id and domain to find the GA4 property
            const { data: project } = await supabase
                .from('projects')
                .select('user_id, domain, ga4_property_id, ga4_connected')
                .eq('id', projectId)
                .single();

            if (project) {
                // Use saved property ID if available and connected, otherwise try discovery
                let propertyId = project.ga4_property_id;
                if (!propertyId && project.domain) {
                    propertyId = await AnalyticsService.findPropertyId(project.domain, project.user_id);
                }

                if (propertyId) {
                    const startP2Str = format(startP2, 'yyyy-MM-dd');
                    const endP2Str = format(endP2, 'yyyy-MM-dd');

                    const sources = await AnalyticsService.fetchTrafficSources(propertyId, project.user_id, startP2Str, endP2Str);
                    const sourceNames = sources.map(s => s.source);

                    if (sourceNames.length > 0) {
                        const aiSourceNames = await identifyAiTrafficSources(sourceNames, apiKey);

                        if (aiSourceNames.length > 0) {
                            const pages = await AnalyticsService.fetchPagesBySource(propertyId, project.user_id, aiSourceNames, startP2Str, endP2Str);
                            const totalSessions = pages.reduce((acc, p) => acc + p.sessions, 0);

                            aiTrafficAnalysis = {
                                sources: sources.filter(s => aiSourceNames.includes(s.source)).map(s => ({
                                    ...s,
                                    estimatedImpressions: s.sessions * 4
                                })).sort((a, b) => b.sessions - a.sessions),
                                topPages: pages.sort((a, b) => b.sessions - a.sessions).slice(0, 15),
                                totalSessions,
                                totalEstimatedImpressions: totalSessions * 4
                            };
                        }
                    }
                }
            }
        } catch (gaError) {
            console.warn("GA4 Integration failed (Non-blocking):", gaError);
        }

        // 4. Run Analysis with Segmentation
        const analysis = runFullAnalysis(
            transform(fullDataP1),
            p2Data,
            labels.p1,
            labels.p2,
            userContext,
            segmentRules
        );

        if (aiTrafficAnalysis) {
            analysis.reportPayload.aiTrafficAnalysis = aiTrafficAnalysis;
        }

        // 5. Generate with AI
        const sections = await getRelevantSections(analysis.reportPayload, apiKey);
        // Ensure new sections are included if needed or handled by dynamic sectioning
        // The Prompt in 'geminiService' handles selection. We need to update Gemini Prompt later or assume it's general enough.
        // Actually, I should force 'ESTADO_SEO' section.
        if (!sections.includes('ESTADO_SEO')) sections.unshift('ESTADO_SEO');

        const html = await generateHTMLReport(analysis.reportPayload, sections, apiKey);

        return {
            success: true,
            html,
            chartData: analysis.chartData,
            payload: analysis.reportPayload
        };

    } catch (e: any) {
        console.error("Report Generation Error:", e);
        return { success: false, error: e.message };
    }
}

export async function generateReportFromCsvAction(
    p1Rows: GscRow[],
    p2Rows: GscRow[],
    labels: { p1: string, p2: string },
    userContext: string
) {
    try {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("API Key de IA no configurada");

        const transform = (rows: GscRow[]) => ({
            pages: rows,
            queries: rows,
            joint: rows
        });

        // Smart Segmentation for CSV too
        const uniqueUrls = Array.from(new Set(p2Rows.map(r => r.page).filter(Boolean))) as string[];
        let segmentRules: any[] = [];
        if (uniqueUrls.length > 0) {
            try {
                segmentRules = await SegmentationService.generateSegmentRules(uniqueUrls, apiKey);
            } catch (e) { console.warn("CSV Segmentation failed", e); }
        }

        const analysis = runFullAnalysis(
            transform(p1Rows),
            transform(p2Rows),
            labels.p1,
            labels.p2,
            userContext,
            segmentRules
        );

        const sections = await getRelevantSections(analysis.reportPayload, apiKey);
        if (!sections.includes('ESTADO_SEO')) sections.unshift('ESTADO_SEO');

        const html = await generateHTMLReport(analysis.reportPayload, sections, apiKey);

        return {
            success: true,
            html,
            chartData: analysis.chartData,
            payload: analysis.reportPayload
        };

    } catch (e: any) {
        console.error("CSV Report Error:", e);
        return { success: false, error: e.message };
    }
}



export async function saveReportAction(
    userId: string,
    projectId: string | null,
    title: string,
    htmlContent: string,
    payload: any,
    periodLabel: string
) {
    try {
        if (!userId) throw new Error("User ID required");

        const { error } = await supabase.from('seo_reports').insert({
            user_id: userId,
            project_id: projectId,
            title,
            html_content: htmlContent,
            payload_json: payload,
            period_label: periodLabel,
            created_at: new Date().toISOString()
        });

        if (error) throw error;
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getSavedReportsAction(userId: string, projectId?: string) {
    try {
        if (!userId) throw new Error("User ID required");

        let query = supabase
            .from('seo_reports')
            .select('id, title, created_at, period_label, project_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (projectId) {
            query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return { success: true, reports: data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getReportByIdAction(reportId: string) {
    try {
        const { data, error } = await supabase
            .from('seo_reports')
            .select('*')
            .eq('id', reportId)
            .single();

        if (error) throw error;
        return { success: true, report: data };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function analyzeStructureAction(projectId: string) {
    console.log("[SERVER ACTION] analyzeStructureAction started for Project:", projectId);
    try {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("API Key de IA no configurada");

        // Fetch just the last 28 days to analyze structure
        const end = new Date();
        const start = subDays(end, 28);
        const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

        console.log(`[SERVER ACTION] Date Range: ${fmt(start)} to ${fmt(end)}`);

        const data = await GscService.fetchData(projectId, fmt(start), fmt(end));

        if (!data || !data.pageMetrics) {
            throw new Error("No data returned from GSC Service");
        }

        const urls = data.pageMetrics.map((r: any) => r.page).filter(Boolean);
        const uniqueUrls = Array.from(new Set(urls));
        console.log(`[SERVER ACTION] Unique URLs found: ${uniqueUrls.length}`);

        if (uniqueUrls.length === 0) {
            console.warn("[SERVER ACTION] No URLs found in GSC data.");
            console.log("[SERVER ACTION] analyzeStructureAction finished for Project:", projectId);
            return { success: true, proposedRules: [], uncategorizedSample: [], totalUrls: 0, warning: "No se encontraron URLs en el período seleccionado." };
        }

        const proposedRules = await SegmentationService.generateSegmentRules(uniqueUrls, apiKey);
        console.log(`[SERVER ACTION] Rules generated: ${proposedRules?.length || 0}`);

        // Also provide a sample of uncategorized URLs for the UI
        // We'll define 'uncategorized' as not matching any proposed rule
        const categorize = (url: string) => proposedRules.some(r => new RegExp(r.regex).test(url));
        const uncategorized = uniqueUrls.filter(u => !categorize(u)).slice(0, 50);

        console.log("[SERVER ACTION] analyzeStructureAction finished for Project:", projectId);
        return { success: true, proposedRules, uncategorizedSample: uncategorized, totalUrls: uniqueUrls.length };

    } catch (e: any) {
        console.error("Structure Analysis Error:", e);
        // Important: Return a serializable object, do not throw if possible to avoid 500 crash in UI
        console.log("[SERVER ACTION] analyzeStructureAction finished with error for Project:", projectId);
        return { success: false, error: e.message || "Unknown Server Error" };
    }
}

export async function generateAiContentAction(prompt: string, context: string) {
    try {
        const apiKey = getGeminiKey();
        if (!apiKey) throw new Error("API Key de IA no configurada");

        const html = await generateContent(prompt, context, apiKey);
        return { success: true, html };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function exportToGoogleAction(
    type: 'docs' | 'slides',
    title: string,
    content: string | string[], // HTML (Docs) or Array of HTML Strings (Slides)
    accessToken: string
) {
    try {
        const service = new GoogleExportService(accessToken);

        if (type === 'docs') {
            return await service.exportToDocs(title, content as string);
        } else {
            return await service.exportToSlides(title, content as string[]);
        }
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function calculateCustomChartDataAction(
    projectId: string,
    dateRange: { start: string, end: string },
    items: string[],
    type: 'page' | 'query'
) {
    try {
        const apiKey = getGeminiKey(); // Not strictly needed for GSC but good for consistancy if we add AI later

        // 1. Fetch Data for the Range
        const data = await GscService.fetchData(projectId, dateRange.start, dateRange.end);
        if (!data) throw new Error("No data found for this period");

        // 2. Filter Data
        const relevantRows = (type === 'page' ? data.pageMetrics : data.queryMetrics) as GscRow[];

        // Filter: Key matches one of the items (exact match or simple contains?)
        const filteredRows = relevantRows.filter(r => {
            const key = type === 'page' ? r.page : r.keyword;
            return key && items.includes(key);
        });

        if (filteredRows.length === 0) return { success: false, error: "No matching data found for these items." };

        // 3. Aggregate for Chart
        // Return a Daily Trend of Clicks for the group.
        const dailyMap = new Map<string, number>();
        filteredRows.forEach(r => {
            const d = r.date.toISOString().split('T')[0];
            dailyMap.set(d, (dailyMap.get(d) || 0) + r.clicks);
        });

        const labels = Array.from(dailyMap.keys()).sort();
        const values = labels.map(k => dailyMap.get(k) || 0);

        // Also calculate totals for a Summary/Bar view?
        const totalClicks = values.reduce((a, b) => a + b, 0);

        return {
            success: true,
            config: {
                type: 'line',
                labels,
                data: values,
                title: `Tendencia: ${items.length} ${type === 'page' ? 'URLs' : 'Queries'} (${totalClicks} Clicks)`,
                totalClicks
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function generateInsightDataAction(
    projectId: string,
    dateRange: { start: string, end: string },
    items: string[],
    type: 'page' | 'query',
    options: {
        comparison: 'none' | 'prev_period' | 'year';
        limit?: number;
        includeAI?: boolean;
        aiInstructions?: string;
        regexFilter?: string;
    }
) {
    try {
        const apiKey = getGeminiKey();

        // Helper to calculate previous range
        const getPreviousRange = (start: string, end: string, mode: string) => {
            const startDate = new Date(start);
            const endDate = new Date(end);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (mode === 'year') {
                startDate.setFullYear(startDate.getFullYear() - 1);
                endDate.setFullYear(endDate.getFullYear() - 1);
            } else {
                startDate.setDate(startDate.getDate() - diffDays - 1);
                endDate.setDate(endDate.getDate() - diffDays - 1);
            }
            return { start: startDate.toISOString().split('T')[0], end: endDate.toISOString().split('T')[0] };
        };

        // 1. Fetch Current Data
        const currentData = await GscService.fetchData(projectId, dateRange.start, dateRange.end);
        if (!currentData) throw new Error("No data found for this period");

        // 2. Fetch Comparison Data (if needed)
        let prevData: any = null;
        if (options.comparison !== 'none') {
            const prevRange = getPreviousRange(dateRange.start, dateRange.end, options.comparison);
            prevData = await GscService.fetchData(projectId, prevRange.start, prevRange.end);
        }

        // 3. Filter Data
        const filterRows = (rows: GscRow[]) => {
            let regex: RegExp | null = null;
            try {
                regex = options.regexFilter ? new RegExp(options.regexFilter, 'i') : null;
            } catch (e) {
                console.warn("[ACTION] Invalid Regex:", options.regexFilter);
            }

            return rows.filter(r => {
                const key = type === 'page' ? r.page : r.keyword;
                if (!key) return false;

                // Match against list items if they exist
                const matchesList = items.length > 0 ? items.some(i => key.includes(i)) : false;

                // Match against regex if it exists
                const matchesRegex = regex ? regex.test(key) : false;

                // Return true if it matches either (or just regex if items is empty)
                if (items.length > 0 && options.regexFilter) {
                    return matchesList || matchesRegex;
                }
                if (items.length > 0) return matchesList;
                if (options.regexFilter) return matchesRegex;

                return false;
            });
        };

        const currentRows = filterRows((type === 'page' ? currentData.pageMetrics : currentData.queryMetrics) as GscRow[]);
        const prevRows = prevData ? filterRows((type === 'page' ? prevData.pageMetrics : prevData.queryMetrics) as GscRow[]) : [];

        if (currentRows.length === 0) return { success: false, error: "No matching data found." };

        // 4. Aggregation Logic
        // We need:
        // A. Summary (Total Clicks, Imp, CTR, Pos)
        // B. Per-Item Metrics (for Bubble/Table) - Map by Key (URL or Query)

        const aggregate = (rows: GscRow[]) => {
            const map = new Map<string, { clicks: number, impressions: number, posSum: number, count: number }>();
            let totalClicks = 0;
            let totalImp = 0;
            const totalPosSum = 0; // Weighted? Or simple avg? Let's do simple avg of avgs for now or weighted by imp?
            // GSC "Avg Position" is tricky. Let's sum (position * impressions) then divide by total impressions for accurate weighted avg.
            let weightedPosSum = 0;

            rows.forEach(r => {
                const key = type === 'page' ? r.page : r.keyword;
                if (!key) return;

                const current = map.get(key) || { clicks: 0, impressions: 0, posSum: 0, count: 0 };
                map.set(key, {
                    clicks: current.clicks + r.clicks,
                    impressions: current.impressions + r.impressions,
                    posSum: current.posSum + (r.position * r.impressions), // Weighted
                    count: current.count + 1
                });

                totalClicks += r.clicks;
                totalImp += r.impressions;
                weightedPosSum += (r.position * r.impressions);
            });

            // Flatten Map
            const items = Array.from(map.entries()).map(([key, val]) => ({
                key,
                clicks: val.clicks,
                impressions: val.impressions,
                position: val.impressions > 0 ? val.posSum / val.impressions : 0,
                ctr: val.impressions > 0 ? (val.clicks / val.impressions) * 100 : 0
            }));

            return {
                items,
                totals: {
                    clicks: totalClicks,
                    impressions: totalImp,
                    position: totalImp > 0 ? weightedPosSum / totalImp : 0,
                    ctr: totalImp > 0 ? (totalClicks / totalImp) * 100 : 0,
                    count: items.length
                }
            };
        };

        // ... (previous aggregation logic) ...
        const currentAgg = aggregate(currentRows);
        const prevAgg = prevData ? aggregate(prevRows) : null;

        // 5. AI Analysis (Optional)
        let analysisText = "";
        if (options.includeAI) {
            try {
                // Construct a prompt context
                const context = `
                Analiza estos datos de SEO para un informe.
                Objetivo: ${options.aiInstructions || 'Resumir tendencias y oportunidades.'}
                
                Datos Generales (Periodo Actual):
                - Clicks: ${currentAgg.totals.clicks}
                - Impresiones: ${currentAgg.totals.impressions}
                - CTR: ${currentAgg.totals.ctr.toFixed(2)}%
                - Posición Promedio: ${currentAgg.totals.position.toFixed(1)}
                
                Comparación: ${options.comparison}
                ${prevAgg ? `Diferencia Clicks: ${currentAgg.totals.clicks - prevAgg.totals.clicks}` : ''}
                
                Top 5 ${type === 'page' ? 'URLs' : 'Keywords'}:
                ${currentAgg.items.slice(0, 5).map(i => `- ${i.key}: ${i.clicks} clicks, Pos ${i.position.toFixed(1)}`).join('\n')}
                `;

                // Call Gemini (Assumes a generic generation method exists, or use a specific one)
                // Using existing service method or a new one. Let's use a specialized one or generic.
                // Checking imports... assuming GeminiService is available.
                // We'll use a direct prompt if GeminiService exposes one, otherwise use a specific analysis method.
                // Since I can't check GeminiService right now easily without viewing, I'll assume 'generateText' or similar.
                // Let's use 'generateContent' from 'geminiService'.

                analysisText = await generateInsightAnalysis(context, apiKey);
            } catch (e) {
                console.error("AI Generation failed", e);
                analysisText = "No se pudo generar el análisis automáticamente.";
            }
        }

        // 6. Build Response
        // limit items for table/charts
        const limitedItems = currentAgg.items
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, options.limit || 50);

        return {
            success: true,
            data: {
                summary: {
                    current: currentAgg.totals,
                    previous: prevAgg?.totals || null,
                    comparison: options.comparison
                },
                analysis: analysisText,
                items: limitedItems.map(item => {
                    const prevItem = prevAgg?.items.find(p => p.key === item.key);
                    return {
                        ...item,
                        prevClicks: prevItem?.clicks || 0,
                        prevImpressions: prevItem?.impressions || 0,
                        changeClicks: prevItem ? item.clicks - prevItem.clicks : 0
                    };
                }),
                // Bubble Chart Data prep (x=Pos, y=Clicks, r=Imp)
                bubbleData: limitedItems.map(item => ({
                    x: Number(item.position.toFixed(1)), // Position (lower is better, but X axis usually goes 0->100)
                    y: item.clicks,
                    r: Math.min(Math.max(item.impressions / 100, 4), 30), // Scale radius
                    label: item.key
                }))
            }
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function fetchGa4PropertiesAction(userId: string) {
    try {
        console.log(`[REPORT-ACTION] Fetching GA4 properties for: ${userId}`);
        const sites = await AnalyticsService.findProperties(userId);
        return { success: true, sites };
    } catch (e: any) {
        console.error("[REPORT-ACTION] GA4 Sites Fetch Error:", e);
        return { success: false, error: e.message, sites: [] };
    }
}
