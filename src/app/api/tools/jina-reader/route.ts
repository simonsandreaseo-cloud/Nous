import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        console.log(`[JINA-READER-LEGACY] Redirecting to Supabase Edge Function: ${url.substring(0, 60)}...`);
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase.functions.invoke('nous-html-extractor', {
            body: { url }
        });

        if (error || !data?.ok) {
            console.error(`[JINA-READER-LEGACY] Edge Error:`, error || data?.error);
            return NextResponse.json({ 
                error: "EXTRACTION_ERROR", 
                message: data?.error || "La extracción vía Nous falló." 
            }, { status: 500 });
        }

        // Return same format as before for backward compatibility
        return NextResponse.json({
            ok: true,
            title: data.title || "Contenido Extraído",
            url: url,
            content: data.html, // Legacy field
            html: data.html,
            markdown: data.html // Fallback
        });

    } catch (error: any) {
        console.error("[JINA-READER-LEGACY] Critical error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

