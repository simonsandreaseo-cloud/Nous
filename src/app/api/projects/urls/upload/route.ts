import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectId, urls } = body;

        if (!projectId || !urls || !Array.isArray(urls)) {
            return NextResponse.json({ success: false, error: 'Faltan parámetros requeridos o urls no es un array' }, { status: 400 });
        }

        if (urls.length === 0) {
            return NextResponse.json({ success: true, message: 'Nada que actualizar' });
        }

        // We fetch existing URLs for this project to do manual deduplication in case the unique constraint isn't perfect
        const { data: existingData, error: fetchError } = await supabaseAdmin
            .from('project_urls')
            .select('id, url')
            .eq('project_id', projectId);

        if (fetchError) throw fetchError;

        const existingMap = new Map((existingData || []).map(row => [row.url, row.id]));
        const toInsert: any[] = [];
        const toUpdate: any[] = [];

        // urls should be an array of objects: { url, title, category }
        for (const item of urls) {
            if (!item.url) continue;

            const existingId = existingMap.get(item.url);
            if (existingId) {
                // Prepare update
                toUpdate.push({
                    id: existingId,
                    project_id: projectId,
                    url: item.url,
                    title: item.title || null,
                    category: item.category || null,
                    type: 'manual_upload'
                });
            } else {
                // Prepare insert
                toInsert.push({
                    project_id: projectId,
                    url: item.url,
                    title: item.title || null,
                    category: item.category || null,
                    type: 'manual_upload'
                });
            }
        }

        // Perform inserts in chunks
        const chunkSize = 1000;
        let insertedCount = 0;
        let updatedCount = 0;

        for (let i = 0; i < toInsert.length; i += chunkSize) {
            const chunk = toInsert.slice(i, i + chunkSize);
            const { error: insertError } = await supabaseAdmin.from('project_urls').insert(chunk);
            if (insertError) throw insertError;
            insertedCount += chunk.length;
        }

        // Perform updates in chunks
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
            const chunk = toUpdate.slice(i, i + chunkSize);
            const { error: updateError } = await supabaseAdmin.from('project_urls').upsert(chunk, { onConflict: 'id' });
            if (updateError) throw updateError;
            updatedCount += chunk.length;
        }

        return NextResponse.json({ 
            success: true, 
            inserted: insertedCount,
            updated: updatedCount,
            total: urls.length 
        });

    } catch (error: any) {
        console.error('[Upload URLs API] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
