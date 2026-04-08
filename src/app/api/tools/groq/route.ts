import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: Request) {
    try {
        const { prompt, systemPrompt, model, jsonResponse } = await req.json();

        const apiKey = 
            process.env.NEXT_PUBLIC_GROQ_API_KEYS?.split(',')[0] || 
            process.env.NEXT_PUBLIC_GROQ_API_KEY || 
            process.env.GROQ_API_KEYS?.split(',')[0] || 
            process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            return NextResponse.json({ error: "GROQ_API_KEY not configured on server" }, { status: 500 });
        }

        const groq = new Groq({ apiKey });

        console.log(`[GROQ-PROXY] Ejecutando: ${model}...`);
        
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt || "Eres un experto en SEO." },
                { role: "user", content: prompt }
            ],
            model: model || "llama-3.1-8b-instant",
            temperature: 0.2,
            max_tokens: 4096,
            response_format: jsonResponse ? { type: "json_object" } : undefined,
        });

        const result = completion.choices[0]?.message?.content || "";
        return NextResponse.json({ result, ok: true });

    } catch (error: any) {
        console.error("[GROQ-PROXY] Error:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
