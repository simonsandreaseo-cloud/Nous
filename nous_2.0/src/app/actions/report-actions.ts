'use server';

import { GscService } from '@/lib/services/report/gscService';
import { runFullAnalysis } from '@/lib/services/report/analysisService';
import { getRelevantSections, generateHTMLReport } from '@/lib/services/report/geminiService';
import { SegmentationService } from '@/lib/services/report/segmentationService';
import { parseISO, subDays, format } from 'date-fns';
import { GscRow } from '@/types/report';
import { AnalyticsService } from '@/lib/services/report/analyticsService';
import { identifyAiTrafficSources, generateContent } from '@/lib/services/report/geminiService';
import { supabase } from '@/lib/supabase';
import { ApiKeyRotationService } from '@/lib/services/ai/apiKeyRotation';
import { GoogleExportService } from '@/lib/services/export/googleExportService';

export async function generateReportAction(
    projectId: string,
    userContext: string,
    customRules?: { name: string, regex: string }[], // New optional argument
    dateRange?: { start: string, end: string }
) {
    try {
        const apiKey = ApiKeyRotationService.getApiKey();
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
            const { data: project } = await supabase.from('projects').select('user_id, domain').eq('id', projectId).single();

            if (project) {
                const propertyId = await AnalyticsService.findPropertyId(project.domain, project.user_id);

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
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
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
        const apiKey = ApiKeyRotationService.getApiKey();
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
        const apiKey = ApiKeyRotationService.getApiKey();
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
