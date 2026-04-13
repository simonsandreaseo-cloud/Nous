import { supabase } from "@/lib/supabase";

/**
 * Extracción de contenido usando Supabase Edge Functions (sustituye a Jina Reader).
 */
export async function fetchJinaExtraction(url: string, _apiKey?: string): Promise<{ content: string; title: string; html: string }> {
  try {
    const cleanUrl = url.trim();
    
    console.log(`[Extractor Service] Extrayendo vía Supabase Edge (Nous-HTML): ${cleanUrl.substring(0, 55)}...`);

    const { data, error } = await supabase.functions.invoke('nous-html-extractor', {
        body: { url: cleanUrl }
    });

    if (error || !data?.ok) {
        console.error("[Extractor Service] Edge Function Error:", error || data?.error);
        throw new Error(data?.error || "Extraction failed from Supabase Edge");
    }

    // Retornamos el HTML como content para mantener compatibilidad con el sistema
    return {
      content: data.html || "",
      html: data.html || "",
      title: data.title || "Extraído vía Nous"
    };
  } catch (e: any) {
    console.warn(`[Extractor Service] Fallo en la extracción para ${url.substring(0, 30)}:`, e.message);
    throw e;
  }
}


