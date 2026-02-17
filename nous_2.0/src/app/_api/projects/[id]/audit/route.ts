import { NextResponse } from 'next/server';
import { ProjectAuditorService } from '@/lib/services/projectAuditor';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const projectId = id;

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        console.log(`[API-Audit] Starting audit for project ${projectId}`);
        await ProjectAuditorService.auditProject(projectId);

        return NextResponse.json({
            success: true,
            message: 'Project audit completed successfully'
        });

    } catch (error: any) {
        console.error('[API-Audit Error]:', error);
        return NextResponse.json({
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}
