import { NextResponse } from 'next/server';
import { generateArticleJSON } from '@/lib/actions/aiActions';

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s/60s limit

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, model, hierarchy } = body;

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        const result = await generateArticleJSON(model, prompt, hierarchy);
        
        return NextResponse.json({ text: result });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
