export const dynamic = 'force-dynamic';

import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/project';

export async function GET(req: Request) {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) return Response.json({ error: 'Missing projectId' }, { status: 400 });

    const { data: project } = await supabase
        .from('projects')
        .select('google_refresh_token, domain, gsc_site_url')
        .eq('id', projectId)
        .single();

    if (!project?.google_refresh_token) {
        return Response.json({ error: 'GSC not connected' }, { status: 401 });
    }

    oauth2Client.setCredentials({ refresh_token: project.google_refresh_token });

    const searchconsole = google.searchconsole({ version: 'v1', auth: oauth2Client });

    // Use gsc_site_url if available, else fallback to domain logic
    const siteUrl = project.gsc_site_url || (
        project.domain.startsWith('http') ? project.domain : `sc-domain:${project.domain}`
    );

    const res = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
            startDate: '2026-01-01',
            endDate: 'today',
            dimensions: ['date'],
            rowLimit: 10
        }
    });

    return Response.json(res.data);
}
