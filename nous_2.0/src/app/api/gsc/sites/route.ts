import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    console.log("[DEBUG] API /api/gsc/sites called");
    try {
        // 1. Get token from header
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            console.error("[DEBUG] No token found in Authorization header");
            return NextResponse.json({ error: 'No se envió el token de sesión' }, { status: 401 });
        }

        // Create a dedicated server client for this request with the user's token
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const serverSupabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });

        console.log("[DEBUG] Validating Supabase token...");
        // Validate the token and get the user
        const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

        if (authError || !user) {
            console.error("[DEBUG] Auth verification failed:", authError?.message || "User not found");
            return NextResponse.json({
                error: 'Sesión inválida o expirada',
                details: authError?.message
            }, { status: 401 });
        }

        console.log("[DEBUG] User identified:", user.id);

        // 2. Get the refresh token
        // We use serverSupabase with the user's token, so RLS applies
        const { data: tokenData, error: dbError } = await serverSupabase
            .from('user_gsc_tokens')
            .select('refresh_token')
            .eq('user_id', user.id)
            .maybeSingle();

        if (dbError) {
            console.error("[DEBUG] Error fetching token from DB:", dbError);
            return NextResponse.json({ error: 'Error de base de datos' }, { status: 500 });
        }

        if (!tokenData?.refresh_token) {
            console.error("[DEBUG] No refresh token found for user in user_gsc_tokens");
            return NextResponse.json({ error: 'GSC no vinculado para este usuario' }, { status: 404 });
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
