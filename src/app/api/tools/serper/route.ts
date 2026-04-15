import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { q, gl = "es", hl = "es", num = 20 } = await req.json();

        if (!q) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const apiKey = process.env.SERPER_API_KEY || process.env.NEXT_PUBLIC_SERPER_API_KEY;

        if (!apiKey) {
            console.error("[SERPER-PROXY] No API Key found in environment variables.");
            return NextResponse.json({ error: "Serper API Key not configured on server" }, { status: 500 });
        }

        console.log(`[SERPER-PROXY] Searching: ${q}`);

        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ q, gl, hl, num }),
            signal: AbortSignal.timeout(30000)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[SERPER-PROXY] Serper API Error (${response.status}):`, errorText);
            return NextResponse.json({ 
                error: `Serper API Error: ${response.status}`,
                details: errorText 
            }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({
            organic: data.organic || [],
            peopleAlsoAsk: data.peopleAlsoAsk || []
        });

    } catch (error: any) {
        const errorDetails = {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            cause: error.cause
        };
        console.error("[SERPER-PROXY] Critical error details:", errorDetails);
        return NextResponse.json({ 
            error: "Internal Server Error during Serper Search", 
            message: error.message,
            details: errorDetails
        }, { status: 500 });
    }
}
