import { NextResponse } from 'next/server';
import { GoogleContentService } from '@/lib/services/googleContent';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { action, title, content, data, type } = await req.json();
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (action === 'create_doc') {
            const url = await GoogleContentService.createDoc(title || 'Untitled Doc', content || '', supabase);
            return NextResponse.json({ url });
        }

        if (action === 'create_sheet') {
            const url = await GoogleContentService.createSheet(title || 'Untitled Sheet', data || [], supabase);
            return NextResponse.json({ url });
        }

        if (action === 'create_slides') {
            const url = await GoogleContentService.createPresentation(title || 'Untitled Presentation', data || [], supabase);
            return NextResponse.json({ url });
        }

        // Fallback to fetch (original logic) can be here or separate
        // For now, let's keep fetch separate or merge?
        // Let's create a new route /api/google/export instead to happen cleaner.
        // But for now I'll use this file since I overwrote it.

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: any) {
        console.error('Google Export Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to export' }, { status: 500 });
    }
}
