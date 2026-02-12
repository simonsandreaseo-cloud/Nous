import { NextResponse } from 'next/server';
import { GoogleContentService } from '@/lib/services/googleContent';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { url, type } = await req.json();
        const authHeader = req.headers.get('Authorization');

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        if (!authHeader) {
            return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
        }

        // Initialize Supabase with the user's token
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('Auth Error:', authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let content;
        if (type === 'sheet') {
            content = await GoogleContentService.getSheetValues(url, undefined, supabase);
        } else {
            // Default to doc
            content = await GoogleContentService.getDocContent(url, supabase);
        }

        return NextResponse.json({ content });

    } catch (error: any) {
        console.error('Google Fetch Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch content' }, { status: 500 });
    }
}
