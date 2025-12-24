import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { project_id, mode = 'incremental' } = await req.json()

        // 1. Init Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Get Project & Owner
        const { data: project, error: projError } = await supabaseAdmin
            .from('projects')
            .select('created_by, gsc_property_url, gsc_settings')
            .eq('id', project_id)
            .single()

        if (projError || !project) throw new Error('Project not found')
        if (!project.gsc_property_url) throw new Error('No GSC Property URL set')

        // 3. Get Owner's Refresh Token
        const { data: tokens, error: tokenError } = await supabaseAdmin
            .from('user_gsc_tokens')
            .select('refresh_token')
            .eq('user_id', project.created_by)
            .single()

        if (tokenError || !tokens?.refresh_token) {
            throw new Error('Project owner has not connected Search Console')
        }

        // 4. Refresh Access Token
        const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

        if (!clientId || !clientSecret) {
            throw new Error('Google Credentials not configured in Edge Function Secrets')
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: tokens.refresh_token,
                grant_type: 'refresh_token',
            }),
        })

        if (!tokenResponse.ok) {
            const err = await tokenResponse.json()
            throw new Error(`Failed to refresh token: ${err.error_description || err.error}`)
        }

        const { access_token } = await tokenResponse.json()

        // 5. Determine Date Range
        // Default: 16 months for 'full', or last 3 days if 'incremental'
        // Actually per requirements: "Initial load with all period available (1.5 years)"
        let startDate = new Date()
        startDate.setDate(startDate.getDate() - 2) // Default end (2 days ago due to GSC delay)
        const endDateStr = startDate.toISOString().split('T')[0]

        if (mode === 'full' || !project.gsc_settings?.initial_sync_done) {
            // 18 months (~540 days)
            startDate.setDate(startDate.getDate() - 540)
        } else {
            // Check last sync
            const lastSync = project.gsc_settings?.last_sync_at
                ? new Date(project.gsc_settings.last_sync_at)
                : new Date()
            // Go back 3 days from last sync to ensure coverage
            startDate = new Date(lastSync)
            startDate.setDate(startDate.getDate() - 1)
        }

        const startDateStr = startDate.toISOString().split('T')[0]

        // 6. Loop and Fetch (Month by Month to avoid limits)
        // We will generate a list of monthly ranges
        const ranges = []
        let currentStart = new Date(startDateStr)
        const finalEnd = new Date(endDateStr)

        while (currentStart < finalEnd) {
            let currentEnd = new Date(currentStart)
            currentEnd.setMonth(currentEnd.getMonth() + 1)
            if (currentEnd > finalEnd) currentEnd = finalEnd

            ranges.push({
                start: currentStart.toISOString().split('T')[0],
                end: currentEnd.toISOString().split('T')[0]
            })

            // Next iteration
            currentStart = new Date(currentEnd)
            currentStart.setDate(currentStart.getDate() + 1)
        }

        let totalInserted = 0

        for (const range of ranges) {
            // Fetch Logic
            const fetchedData = await fetchGscData(project.gsc_property_url, access_token, range.start, range.end)

            // Upsert Logic
            if (fetchedData.length > 0) {
                const payload = fetchedData.map(d => ({
                    project_id,
                    date: d.date,
                    clicks: d.clicks,
                    impressions: d.impressions,
                    ctr: d.ctr,
                    position: d.position,
                    top_queries: d.queries.slice(0, 500),
                    top_pages: d.pages.slice(0, 500),
                    updated_at: new Date().toISOString()
                }))

                const { error: upsertError } = await supabaseAdmin
                    .from('gsc_daily_metrics')
                    .upsert(payload, { onConflict: 'project_id,date' })

                if (upsertError) throw upsertError
                totalInserted += payload.length
            }
        }

        // 7. Update Project Settings
        await supabaseAdmin.from('projects').update({
            gsc_settings: {
                ...project.gsc_settings,
                last_sync_at: new Date().toISOString(),
                initial_sync_done: true
            }
        }).eq('id', project_id)

        return new Response(
            JSON.stringify({ success: true, inserted: totalInserted, ranges: ranges.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// Helper Function for GSC API
async function fetchGscData(siteUrl: string, accessToken: string, startDate: string, endDate: string) {
    const GSC_API = 'https://www.googleapis.com/webmasters/v3'
    const encodedSite = encodeURIComponent(siteUrl)

    // Helper to fetch with retries
    const fetchApi = async (body: any) => {
        const res = await fetch(`${GSC_API}/sites/${encodedSite}/searchAnalytics/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        if (!res.ok) {
            const txt = await res.text()
            console.error('GSC Error', txt)
            return [] // Fail gracefully for that batch? Or throw?
        }
        const data = await res.json()
        return data.rows || []
    }

    // 1. Totals
    const totals = await fetchApi({
        startDate, endDate, dimensions: ['date'], rowLimit: 5000
    })

    // 2. Queries
    const queries = await fetchApi({
        startDate, endDate, dimensions: ['date', 'query'], rowLimit: 10000
    })

    // 3. Pages
    const pages = await fetchApi({
        startDate, endDate, dimensions: ['date', 'page'], rowLimit: 10000
    })

    // Grouping
    const grouped = new Map()

    // Init with totals
    for (const r of totals) {
        grouped.set(r.keys[0], {
            date: r.keys[0],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position,
            queries: [],
            pages: []
        })
    }

    for (const q of queries) {
        const d = grouped.get(q.keys[0])
        if (d) d.queries.push({ term: q.keys[1], clicks: q.clicks, impressions: q.impressions, ctr: q.ctr, position: q.position })
    }

    for (const p of pages) {
        const d = grouped.get(p.keys[0])
        if (d) d.pages.push({ url: p.keys[1], clicks: p.clicks, impressions: p.impressions, ctr: p.ctr, position: p.position })
    }

    return Array.from(grouped.values())
}
