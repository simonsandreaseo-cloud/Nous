import { supabase } from '@/lib/supabase';
import { GscRow } from '@/types/report';

// This is a client-side friendly mock of server actions for the Desktop App.
// Server actions are unsupported in static export (Tauri).
// We implement local logic where possible (Supabase) and stub external API calls.

export async function generateReportAction(
    projectId: string,
    userContext: string,
    customRules?: { name: string, regex: string }[],
    dateRange?: { start: string, end: string }
) {
    console.error("generateReportAction: Not supported in Desktop App without local backend.");
    return {
        success: false,
        error: "La generación de informes GSC requiere un backend Node.js. En la versión de escritorio, esta función está deshabilitada temporalmente.",
        html: "",
        chartData: null,
        payload: null as any
    };
}

export async function generateReportFromCsvAction(
    p1Rows: GscRow[],
    p2Rows: GscRow[],
    labels: { p1: string, p2: string },
    userContext: string
) {
    console.error("generateReportFromCsvAction: Not fully implemented in Desktop.");
    return {
        success: false,
        error: "Análisis CSV no disponible en modo escritorio.",
        html: "",
        chartData: null,
        payload: null as any
    };
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
    console.warn("analyzeStructureAction: Stubbed for desktop");
    return {
        success: false,
        error: "Análisis de estructura requiere backend GSC.",
        proposedRules: [],
        uncategorizedSample: [],
        totalUrls: 0
    };
}

export async function generateAiContentAction(prompt: string, context: string) {
    console.warn("generateAiContentAction: Stubbed for desktop");
    return { success: false, error: "Generación IA requiere backend.", html: "" };
}

// ... (imports remain)

// ... (other functions remain)

export async function exportToGoogleAction(
    type: 'docs' | 'slides',
    title: string,
    content: string | string[],
    accessToken: string
) {
    console.warn("exportToGoogleAction: Stubbed for desktop");
    return { success: false, error: "Exportación a Google requiere backend.", url: "" };
}

export async function calculateCustomChartDataAction(
    projectId: string,
    dateRange: { start: string, end: string },
    items: string[],
    type: 'page' | 'query'
) {
    try {
        // Stub implementation - return empty or mocked data
        console.warn("calculateCustomChartDataAction: Stubbed for desktop");
        return { success: false, error: "Datos de gráficos no disponibles sin GSC backend.", config: null };
    } catch (e: any) {
        return { success: false, error: e.message, config: null }; // Add config here too
    }
}
// ... (rest remains)

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
    console.warn("generateInsightDataAction: Stubbed for desktop");
    return { success: false, error: "Deep Dive Analysis no disponible sin GSC backend.", data: null };
}
