import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { taskId, status } = await req.json();
        const apiKey = process.env.CLICKUP_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'ClickUp API key not configured' }, { status: 401 });
        }

        const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
            method: 'PUT',
            headers: {
                'Authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();
        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
