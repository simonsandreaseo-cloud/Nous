import { supabase } from '@/lib/supabase';
import { GscRow } from '@/types/report';
import { GscService } from '@/lib/services/gsc'; // Correct client-side GSC service
import { SegmentationService } from '@/lib/services/report/segmentationService';
import { runFullAnalysis } from '@/lib/services/report/analysisService';
import { getRelevantSections, generateHTMLReport } from '@/lib/services/report/geminiService';
import { getGeminiKey } from '@/lib/ai/config';
import { subDays, format } from 'date-fns';

/**
 * Generates a full Deep SEO Report by fetching data from GSC, 
 * running local heuristic analysis, and using Gemini for narrative.
 */
export async function generateReportAction(
    projectId: string,
    userContext: string,
    customRules?: { name: string, regex: string }[],
    dateRange?: { start: string, end: string }
) {
    try {
        console.log(`[REPORT-ACTION] Starting generation for project: ${projectId}`);
        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error("Gemini API Key missing.");

        // 1. Get Project & Token Info
        const { data: project, error: pError } = await supabase
            .from('projects')
            .select('gsc_site_url, domain')
            .eq('id', projectId)
            .single();

        if (pError || !project) throw new Error("Proyecto no encontrado.");
        if (!project.gsc_site_url) throw new Error("El proyecto no tiene una URL de GSC vinculada.");

        const siteUrl = project.gsc_site_url;

        // 2. Define Time Periods (P1 vs P2)
        let p2End = dateRange?.end ? new Date(dateRange.end) : subDays(new Date(), 3);
        let p2Start = dateRange?.start ? new Date(dateRange.start) : subDays(p2End, 30);

        // Calculate P1 (Previous period of same length)
        const diffDays = Math.floor((p2End.getTime() - p2Start.getTime()) / (1000 * 60 * 60 * 24));
        let p1End = subDays(p2Start, 1);
        let p1Start = subDays(p1End, diffDays);

        const d = (date: Date) => format(date, 'yyyy-MM-dd');

        console.log(`[REPORT-ACTION] Periods: P1(${d(p1Start)} to ${d(p1End)}) vs P2(${d(p2Start)} to ${d(p2End)})`);

        // 3. Fetch Data from GSC (Parallelized for speed)
        const fetchPeriod = async (start: string, end: string) => {
            const [pages, queries, joint] = await Promise.all([
                GscService.getSearchAnalytics(siteUrl, start, end, ['page']),
                GscService.getSearchAnalytics(siteUrl, start, end, ['query']),
                GscService.getSearchAnalytics(siteUrl, start, end, ['page', 'query'])
            ]);
            // Map rows back to normalized GscRow format
            const map = (rows: any[]): GscRow[] => rows.map(r => ({
                clicks: r.clicks,
                impressions: r.impressions,
                ctr: r.ctr,
                position: r.position,
                page: r.keys[0],
                keyword: r.keys[1] || r.keys[0], // Depending on dimension
                country: 'Unknown', // Required by GscRow interface
                date: new Date()
            }));

            return { pages: map(pages), queries: map(queries), joint: map(joint) };
        };

        const [p1Data, p2Data] = await Promise.all([
            fetchPeriod(d(p1Start), d(p1End)),
            fetchPeriod(d(p2Start), d(p2End))
        ]);

        // 4. Run Analysis Engine (Local/Client)
        console.log("[REPORT-ACTION] Running Analysis Engine...");
        const { reportPayload, chartData } = runFullAnalysis(
            p1Data,
            p2Data,
            `${d(p1Start)} - ${d(p1End)}`,
            `${d(p2Start)} - ${d(p2End)}`,
            userContext,
            customRules
        );

        // 5. Generate AI Narrative (Gemini)
        console.log("[REPORT-ACTION] Generating AI Narrative...");
        const sections = await getRelevantSections(reportPayload, geminiKey);
        const html = await generateHTMLReport(reportPayload, sections, geminiKey);

        return {
            success: true,
            html,
            chartData,
            payload: reportPayload
        };

    } catch (e: any) {
        console.error("[REPORT-ACTION] Fatal Error:", e);
        return {
            success: false,
            error: e.message || "Error desconocido al generar el informe.",
            html: "",
            chartData: null,
            payload: null as any
        };
    }
}

export async function generateReportFromCsvAction(
    p1Rows: GscRow[],
    p2Rows: GscRow[],
    labels: { p1: string, p2: string },
    userContext: string
) {
    try {
        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error("Gemini API Key missing.");

        // Organize data for analysis engine
        // CSV usually is page-level or query-level, we'll try to treat it as pages
        const wrap = (rows: GscRow[]) => ({ pages: rows, queries: rows, joint: rows });

        const { reportPayload, chartData } = runFullAnalysis(
            wrap(p1Rows),
            wrap(p2Rows),
            labels.p1,
            labels.p2,
            userContext
        );

        const sections = await getRelevantSections(reportPayload, geminiKey);
        const html = await generateHTMLReport(reportPayload, sections, geminiKey);

        return {
            success: true,
            html,
            chartData,
            payload: reportPayload
        };
    } catch (e: any) {
        return {
            success: false,
            error: e.message,
            html: "",
            chartData: null,
            payload: null as any
        };
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
        return { success: false, error: e.message, reports: [] };
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
        return { success: false, error: e.message, report: null };
    }
}

export async function analyzeStructureAction(projectId: string) {
    try {
        console.log(`[REPORT-ACTION] Analyzing structure for: ${projectId}`);
        const geminiKey = getGeminiKey();
        if (!geminiKey) throw new Error("Gemini API Key missing.");

        const { data: project } = await supabase.from('projects').select('gsc_site_url').eq('id', projectId).single();
        if (!project?.gsc_site_url) throw new Error("Proyecto no vinculado a GSC.");

        // Fetch top urls from last 30 days
        const end = subDays(new Date(), 3);
        const start = subDays(end, 30);

        const rows = await GscService.getSearchAnalytics(
            project.gsc_site_url,
            format(start, 'yyyy-MM-dd'),
            format(end, 'yyyy-MM-dd'),
            ['page']
        );

        const urls = rows.map((r: any) => r.keys[0]);
        if (urls.length === 0) throw new Error("No se encontraron URLs en GSC para analizar.");

        const proposedRules = await SegmentationService.generateSegmentRules(urls, geminiKey);

        return {
            success: true,
            proposedRules,
            uncategorizedSample: urls.slice(0, 20),
            totalUrls: urls.length
        };

    } catch (e: any) {
        console.error("[REPORT-ACTION] Structure Analysis Error:", e);
        return {
            success: false,
            error: e.message,
            proposedRules: [],
            uncategorizedSample: [],
            totalUrls: 0
        };
    }
}

export async function generateAiContentAction(prompt: string, context: string) {
    try {
        const geminiKey = getGeminiKey();
        const { generateContent } = await import('@/lib/services/report/geminiService');
        const html = await generateContent(prompt, context, geminiKey);
        return { success: true, html };
    } catch (e: any) {
        return { success: false, error: e.message, html: "" };
    }
}

export async function exportToGoogleAction(
    type: 'docs' | 'slides',
    title: string,
    content: string | string[],
    accessToken: string
) {
    try {
        if (type === 'docs') {
            // 1. Create Document
            const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
            const doc = await createRes.json();
            if (!doc.documentId) throw new Error(doc.error?.message || "Error al crear el documento");

            // 2. Insert Content
            const plainText = (content as string).replace(/<[^>]+>/g, '\n');
            await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    requests: [{
                        insertText: {
                            location: { index: 1 },
                            text: plainText.substring(0, 10000)
                        }
                    }]
                })
            });

            return { success: true, url: `https://docs.google.com/document/d/${doc.documentId}/edit` };
        } else {
            // Slides creation using REST
            const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: title })
            });
            const pres = await createRes.json();
            if (!pres.presentationId) throw new Error("Error al crear la presentación");

            return { success: true, url: `https://docs.google.com/presentation/d/${pres.presentationId}/edit` };
        }
    } catch (e: any) {
        console.error("[EXPORT-ERROR]", e);
        return { success: false, error: "Error en la exportación: " + e.message };
    }
}

export async function calculateCustomChartDataAction(
    projectId: string,
    dateRange: { start: string, end: string },
    items: string[],
    type: 'page' | 'query'
) {
    try {
        // This is used for "Deep Dive" charts in the UI.
        // We can implement it using GscService directly.
        const { data: project } = await supabase.from('projects').select('gsc_site_url').eq('id', projectId).single();
        if (!project?.gsc_site_url) throw new Error("GSC not connected");

        const rows = await GscService.getSearchAnalytics(
            project.gsc_site_url,
            dateRange.start,
            dateRange.end,
            [type, 'date']
        );

        // Filter for specific items if provided
        const filtered = items.length > 0
            ? rows.filter((r: any) => items.includes(r.keys[0]))
            : rows;

        // Group by item to get total clicks per item
        const totalsMap = new Map<string, number>();
        filtered.forEach((r: any) => {
            const key = r.keys[0];
            totalsMap.set(key, (totalsMap.get(key) || 0) + r.clicks);
        });

        const labels = Array.from(totalsMap.keys());
        const data = Array.from(totalsMap.values());

        const config = {
            title: `Análisis de ${type === 'page' ? 'URLs' : 'Keywords'}`,
            type: 'bar',
            labels,
            data
        };

        return { success: true, config };
    } catch (e: any) {
        return { success: false, error: e.message, config: null };
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
        const { data: project } = await supabase.from('projects').select('gsc_site_url').eq('id', projectId).single();
        if (!project?.gsc_site_url) throw new Error("GSC not connected");

        const rows = await GscService.getSearchAnalytics(
            project.gsc_site_url,
            dateRange.start,
            dateRange.end,
            [type]
        );

        let data = rows.map((r: any) => ({
            name: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }));

        if (options.regexFilter) {
            const re = new RegExp(options.regexFilter, 'i');
            data = data.filter((d: any) => re.test(d.name));
        }

        if (items.length > 0) {
            data = data.filter((d: any) => items.includes(d.name));
        }

        data.sort((a: any, b: any) => b.clicks - a.clicks);
        if (options.limit) data = data.slice(0, options.limit);

        return { success: true, data };
    } catch (e: any) {
        return { success: false, error: e.message, data: null };
    }
}

