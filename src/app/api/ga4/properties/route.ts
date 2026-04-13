import { NextResponse } from 'next/server';
import { AnalyticsService } from '@/lib/services/report/analyticsService';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    console.log("[DEBUG] API /api/ga4/properties called");
    try {
        // 1. Get token from header (Standard pattern in this app)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        if (!token) {
            console.error("[GA4-API] No token found in Authorization header");
            return NextResponse.json({ error: 'No se envió el token de sesión' }, { status: 401 });
        }

        // Create server client to validate user
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const serverSupabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false }
        });

        const { data: { user }, error: authError } = await serverSupabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Sesión inválida', details: authError?.message }, { status: 401 });
        }

        console.log("[GA4-API] User identified:", user.id);
        const { searchParams } = new URL(req.url);
        const connectionId = searchParams.get('connectionId');

        // 2. Fetch properties using the AnalyticsService (Node.js environment)
        const sites = await AnalyticsService.findProperties(user.id, connectionId || undefined);

        return NextResponse.json({
            success: true,
            sites: sites || []
        });

    } catch (err: unknown) {
        const error = err as Error;
        console.error('[GA4-API] Error listing properties:', error);
        return NextResponse.json({ error: error.message || 'Error desconocido' }, { status: 500 });
    }
}
