import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { action, description, taskId, projectName } = await req.json();
        const apiKey = process.env.TMETRIC_API_KEY;
        const workspaceId = process.env.TMETRIC_WORKSPACE_ID;

        if (!apiKey || !workspaceId) {
            return NextResponse.json({ error: 'TMetric credentials not configured' }, { status: 401 });
        }

        const baseUrl = `https://app.tmetric.com/api/v3/workspaces/${workspaceId}/timeentries`;

        if (action === 'start') {
            const response = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    description: description || 'Nous AI Task',
                    startTime: new Date().toISOString(),
                    // TMetric specific fields could go here (project id, etc)
                })
            });
            const data = await response.json();
            return NextResponse.json({ success: true, data });
        } else if (action === 'stop') {
            // Stopping usually requires finding the active entry first or using a specific stop endpoint
            // For simplicity in this initial integration, we'll assume a "latest" approach
            // or just provide the structure for the user to refine
            return NextResponse.json({ success: true, message: 'Timer stop trigger received (requires active entry ID)' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
