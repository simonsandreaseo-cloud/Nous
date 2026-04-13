import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Readability } from "npm:@mozilla/readability";
import { JSDOM } from "npm:jsdom";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";

export interface ExtractedArticle {
  url: string;
  title: string;
  text: string;
  html: string;
  wordCount: number;
  headers: string[];
}

/**
 * Fetches, parses, and extracts article content from a single URL.
 */
export async function scrapeAndCleanUrl(url: string): Promise<ExtractedArticle | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(15000) // 15s timeout
    });
    
    if (!response.ok) {
      console.warn(`[ResearchEngine] HTTP ${response.status} for ${url}`);
      return null;
    }
    
    const htmlContent = await response.text();
    const doc = new JSDOM(htmlContent, { url });
    
    // Extract headers before Readability mutates the DOM
    const headerElements = Array.from(doc.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const headers = headerElements.map((el: any) => el.textContent?.trim() || '').filter(Boolean);

    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (!article) {
      console.warn(`[ResearchEngine] Readability failed to parse ${url}`);
      return null;
    }

    const textContent = article.textContent.trim();
    const wordCount = textContent.split(/\s+/).length;
    
    if (wordCount < 300) {
      console.log(`[ResearchEngine] Discarded ${url}: Only ${wordCount} words (< 300)`);
      return null;
    }

    return {
      url,
      title: article.title || '',
      text: textContent,
      html: article.content || '',
      wordCount,
      headers
    };
  } catch (error) {
    console.error(`[ResearchEngine] Failed to process ${url}:`, error);
    return null; // Handled gracefully
  }
}

/**
 * Processes a list of URLs in concurrent batches.
 */
export async function processUrls(urls: string[], batchSize = 10): Promise<ExtractedArticle[]> {
  const results: ExtractedArticle[] = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    console.log(`[ResearchEngine] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(urls.length / batchSize)}...`);
    
    const batchResults = await Promise.allSettled(
      batch.map(url => scrapeAndCleanUrl(url))
    );
    
    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value !== null) {
        results.push(result.value);
      }
    }
  }
  
  return results;
}

serve(async (req) => {
  // Manejo de pre-flight CORS
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { urls, contentType = "Blog / Artículo Informativo", searchIntent = "", targetH1 = "", isSingleExtraction = false } = body;
    
    if (!urls || !Array.isArray(urls)) {
      return new Response(JSON.stringify({ error: "Se requiere un array de 'urls'" }), { status: 400, headers: corsHeaders });
    }

    console.log(`[ResearchEngine] Ingesting ${urls.length} URLs...`);

    // 🚀 MODO DE EXTRACCIÓN SIMPLE (PARA FALLBACKS O URLs INDIVIDUALES)
    if (isSingleExtraction && urls.length > 0) {
        console.log(`[ResearchEngine] Ejecutando en modo Extracción Simple para ${urls[0]}`);
        const article = await scrapeAndCleanUrl(urls[0]);

        if (!article) {
           return new Response(JSON.stringify({ ok: false, success: false, error: "No se pudo extraer contenido o tiene menos de 300 palabras", stage: "single_extraction" }), { 
                status: 200, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
            });
        }
        
        return new Response(JSON.stringify({
            ok: true,
            success: true,
            html: article.html,
            text: article.text,
            wordCount: article.wordCount,
            headers: article.headers
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 🚀 FASE 1 & 2: EXTRACCIÓN Y FILTRADO (Batched)
    const validExtractedResults = await processUrls(urls, 10);
    console.log(`[ResearchEngine] Extracción completada. ${validExtractedResults.length} URLs superaron el filtro de pureza (>300 palabras).`);

    if (validExtractedResults.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Ninguna URL superó el filtro inicial de 300 palabras o hubo fallos al extraer.",
        discarded_count: urls.length,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 🚀 FASE 3: FILTRADO COGNITIVO MASIVO (GEMINI FLASH LITE)
    console.log(`[ResearchEngine] Iniciando Filtrado Cognitivo con Gemini para ${validExtractedResults.length} competidores...`);

    // Armamos el mega-prompt inyectando el Tipo de Contenido para el descarte contextual
    const competitorsPayload = validExtractedResults.map((r, i) => `
[COMPETIDOR ${i}]
URL: ${r.url}
TEXTO: ${r.text.substring(0, 40000)} // Limitamos un poco cada uno para no explotar la ventana
-----------------------------------`).join("\n");

    const geminiPrompt = `Eres el "Motor de Ingesta Cognitiva Nous". Tu objetivo es analizar el contenido de varios competidores y descartar los que no sirvan como referencia de calidad.

CONTEXTO DEL ARTÍCULO A ESCRIBIR:
- Tipo de Contenido: "${contentType}"
- H1 / Tema Principal: "${targetH1}"
- Intención de Búsqueda del Usuario: "${searchIntent}"

REGLA DE ORO DEL DESCARTE:
Debes analizar el texto de cada competidor y descartarlo SI Y SOLO SI:
1. No coincide con el "Tipo de Contenido" (Ej: Si vamos a escribir un "Blog", descarta todas las URLs que sean e-commerce, tiendas o landing pages transaccionales).
2. Es contenido genérico, autogenerado de baja calidad, o puro spam de palabras clave.
3. No responde a la Intención de Búsqueda.

No hay un límite de cuántos puedes aprobar. Si los 50 son excelentes y útiles, aprueba los 50. Si solo 2 sirven, aprueba 2.

COMPETIDORES A EVALUAR:
${competitorsPayload}

Responde ÚNICAMENTE con un JSON válido con la siguiente estructura exacta:
{
  "useful_urls": [
    { "url": "https://...", "reasoning": "Breve razón de por qué es excelente referencia" }
  ],
  "discarded_urls": [
    { "url": "https://...", "reasoning": "Breve razón del descarte (ej. Es un e-commerce)" }
  ]
}`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });

    if (!geminiResponse.ok) {
       console.error("[ResearchEngine] Error en Gemini:", await geminiResponse.text());
       throw new Error("El filtrado cognitivo de Gemini falló.");
    }

    const geminiData = await geminiResponse.json();
    const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const finalCognitiveFilter = JSON.parse(rawJsonText);

    // Cruzamos las URLs aprobadas por la IA con nuestro array de resultados profundos
    const finalSurvivors = validExtractedResults.filter(r => 
      finalCognitiveFilter.useful_urls && finalCognitiveFilter.useful_urls.some((u: any) => u.url === r.url)
    );

    console.log(`[ResearchEngine] Filtro Cognitivo completado. URLs finales ÚTILES: ${finalSurvivors.length}`);

    return new Response(JSON.stringify({
      success: true,
      total_initial: urls.length,
      surviving_pureza: validExtractedResults.length,
      final_useful_count: finalSurvivors.length,
      cognitive_report: finalCognitiveFilter,
      survivors: finalSurvivors.map(s => ({
        url: s.url,
        wordCount: s.wordCount,
        headers: s.headers,
        html: s.html
      })), 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[ResearchEngine] Error Crítico:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message, stage: "global_catch", stack: (error as Error).stack }), {
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
