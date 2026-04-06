import { NextResponse } from 'next/server';
import { GscService } from '@/lib/services/report/gscService';

export async function POST(req: Request) {
    try {
        const { projectId } = await req.json();
        
        if (!projectId) {
            return NextResponse.json({ error: 'Falta projectId' }, { status: 400 });
        }

        const result = await GscService.fetchAndStoreIndexedUrls(projectId);
        
        return NextResponse.json({ 
            success: true, 
            count: result.count 
        });
    } catch (error: any) {
        console.error('[API-GSC-SYNC] Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Error al sincronizar GSC' 
        }, { status: 500 });
    }
}
