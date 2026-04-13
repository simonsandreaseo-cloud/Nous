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
        const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

        if (authError || !user) {
            console.error("[DEBUG] Auth verification failed:", authError?.message || "User not found");
            return NextResponse.json({
                error: 'Sesión inválida o expirada',
                details: authError?.message
            }, { status: 401 });
        }

        console.log("[DEBUG] User identified:", user.id);
        const { searchParams } = new URL(req.url);
        const connectionId = searchParams.get('connectionId');

        // 2. Get the refresh token
        let query = serverSupabase
            .from('user_google_connections')
            .select('refresh_token')
            .eq('user_id', user.id);
        
        if (connectionId) {
            query = query.eq('id', connectionId);
        }

        const { data: tokenData, error: dbError } = await query.maybeSingle();

        if (dbError) {
            console.error("[DEBUG] Error fetching token from DB:", dbError);
            return NextResponse.json({ error: 'Error de base de datos' }, { status: 500 });
        }

        let refreshToken = tokenData?.refresh_token;

        if (!refreshToken) {
            // Fallback for one session to legacy table
            const { data: legacyData } = await serverSupabase
                .from('user_gsc_tokens')
                .select('refresh_token')
                .eq('user_id', user.id)
                .maybeSingle();
            
            refreshToken = legacyData?.refresh_token;
        }

        if (!refreshToken) {
            console.error("[DEBUG] No refresh token found for user");
            return NextResponse.json({ error: 'GSC no vinculado para este usuario' }, { status: 404 });
        }

        // 3. Auth with Google
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({ refresh_token: refreshToken });

        const searchconsole = google.searchconsole({ version: 'v1', auth });

        // 4. List sites
        const res = await searchconsole.sites.list();
        const sites = res.data.siteEntry || [];

        return NextResponse.json({
            success: true,
            sites: sites.map(s => ({
                url: s.siteUrl,
                permission: s.permissionLevel,
                accountEmail: refreshToken ? 'Sincronizado' : 'Desconocido'
            }))
        });

    } catch (error: any) {
        console.error("[API-GSC-SITES] Error fatal:", error);
        return NextResponse.json({ 
            error: 'Error interno del servidor', 
            details: error.message 
        }, { status: 500 });
    }
}
