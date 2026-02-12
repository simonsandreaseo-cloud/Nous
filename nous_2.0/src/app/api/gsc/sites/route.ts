import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        // 2. Get the refresh token (from projects or central table)
        // We look for any project that has a token or look in user_gsc_tokens
        const { data: tokenData } = await supabase
            .from('user_gsc_tokens')
            .select('refresh_token')
            .eq('user_id', user.id)
            .single();

        if (!tokenData?.refresh_token) {
            return NextResponse.json({ error: 'GSC no vinculado' }, { status: 404 });
        }

        // 3. Auth with Google
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({ refresh_token: tokenData.refresh_token });

        const searchconsole = google.searchconsole({ version: 'v1', auth });

        // 4. List sites
        const res = await searchconsole.sites.list();
        const sites = res.data.siteEntry || [];

        return NextResponse.json({
            success: true,
            sites: sites.map(s => ({
                url: s.siteUrl,
                permission: s.permissionLevel
            }))
        });

    } catch (err: any) {
        console.error('Error listing GSC sites:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
