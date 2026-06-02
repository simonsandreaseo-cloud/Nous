import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const normalizeUrl = (url: string): string => {
    if (!url) return '';
    return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('?')[0].split('#')[0];
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let jobId = null;
    let projectId = null;

    try {
        const body = await req.json();
        projectId = body.project_id;

        if (!projectId) throw new Error('Missing project_id');

        // 1. Create a tracking Job
        const { data: job, error: jobErr } = await supabaseAdmin
            .from('gsc_sync_jobs')
            .insert({ project_id: projectId, status: 'fetching_urls' })
            .select('id')
            .single()
        
        if (jobErr) throw jobErr;
        jobId = job.id;

        // Background execution
        // We use an async IIFE to allow the Edge Function to respond early (although Deno standard serve requires returning a response,
        // responding immediately and running async can work in standard Edge Functions depending on timeout, but let's just await it for safety since Vercel might kill connections. Actually, Deno Deploy usually allows the isolate to live while promises are pending, up to the execution timeout).
        // To be safe, we will just process it directly and rely on Supabase's generous edge function timeout.

        // 2. Get Project and User info
        const { data: project, error: projError } = await supabaseAdmin
            .from('projects')
            .select('user_id, gsc_site_url, domain, google_connection_id')
            .eq('id', projectId)
            .single()

        if (projError || !project) throw new Error('Project not found')
        if (!project.gsc_site_url) throw new Error('Project lacks GSC Site URL')
        if (!project.google_connection_id) throw new Error('Project lacks a selected Google Connection')

        const { data: tokens, error: tokenError } = await supabaseAdmin
            .from('user_google_connections')
            .select('refresh_token')
            .eq('id', project.google_connection_id)
            .single()

        if (tokenError || !tokens?.refresh_token) {
            throw new Error('Project owner has not connected Search Console')
        }

        // 3. Authenticate with Google
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId || '',
                client_secret: clientSecret || '',
                refresh_token: tokens.refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        if (!tokenResponse.ok) {
            const err = await tokenResponse.json()
            throw new Error(`Failed to refresh token: ${err.error_description || err.error}`)
        }

        const { access_token } = await tokenResponse.json()

        // 4. Fetch URLs from GSC
        let endDate = new Date();
        let startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        
        const endDateStr = endDate.toISOString().split('T')[0];
        const startDateStr = startDate.toISOString().split('T')[0];

        let siteUrl = project.gsc_site_url;
        if (siteUrl.startsWith('http') && !siteUrl.endsWith('/')) siteUrl += '/';

        let startRowPage = 0;
        const uniqueUrls = new Map<string, any>();

        while (true) {
            const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    startDate: startDateStr,
                    endDate: endDateStr,
                    dimensions: ['page'],
                    rowLimit: 5000,
                    startRow: startRowPage
                })
            })

            if (!res.ok) {
                const txt = await res.text()
                throw new Error(`GSC API Error: ${txt}`)
            }

            const data = await res.json()
            if (!data.rows || data.rows.length === 0) break;

            for (const row of data.rows) {
                const rawUrl = row.keys[0];
                const normUrl = normalizeUrl(rawUrl);
                let derivedTitle = rawUrl.replace(/\/$/, '').split('/').pop()?.replace(/-/g, ' ') || 'Página Indexada';
                if (derivedTitle.length < 3) derivedTitle = "Home";

                uniqueUrls.set(normUrl, {
                    project_id: projectId,
                    url: rawUrl,
                    status: 'indexed',
                    updated_at: new Date().toISOString()
                });
            }

            startRowPage += 5000;
            if (data.rows.length < 5000) break;
        }

        const urlsArray = Array.from(uniqueUrls.values());
        
        // 5. Update Tracking Job total_urls
        await supabaseAdmin.from('gsc_sync_jobs').update({
            status: 'processing',
            total_urls: urlsArray.length
        }).eq('id', jobId)

        // 6. Upsert Data in Chunks
        const CHUNK_SIZE = 400;
        let processedCount = 0;

        for (let i = 0; i < urlsArray.length; i += CHUNK_SIZE) {
            const chunk = urlsArray.slice(i, i + CHUNK_SIZE);
            
            // Upsert to project_urls
            const pagesToUpsert = chunk.map(u => ({
                project_id: u.project_id,
                url: u.url,
                status: u.status,
                updated_at: u.updated_at
            }));

            const { error: upsertErr } = await supabaseAdmin
                .from('project_urls')
                .upsert(pagesToUpsert, { onConflict: 'project_id,url' })
            
            if (upsertErr) console.error("Error upserting chunk", upsertErr)

            // For metrics we need the IDs (ignoring this for simplicity to avoid 2 extra queries, 
            // since they just needed the base URLs for internal linking. But we can fetch them if needed).

            processedCount += chunk.length;
            
            // Update tracking progress
            await supabaseAdmin.from('gsc_sync_jobs').update({
                processed_urls: processedCount
            }).eq('id', jobId)
        }

        // 7. Finish
        await supabaseAdmin.from('gsc_sync_jobs').update({
            status: 'completed'
        }).eq('id', jobId)

        return new Response(
            JSON.stringify({ success: true, jobId, message: 'Sync completed' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error("GSC Sync Error:", error);
        if (jobId) {
            await supabaseAdmin.from('gsc_sync_jobs').update({
                status: 'error',
                error_message: error.message
            }).eq('id', jobId)
        }

        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
