import dotenv from 'dotenv';
import { aiRouter } from '../lib/ai/router';
import { fetchSerperSearch } from '../lib/services/serper';

dotenv.config();

async function debugSEO(keyword: string) {
    console.log(`\n=== INICIANDO DEBbug SEO PARA: "${keyword}" ===\n`);

    // 1. Serper
    console.log("1. Buscando en Serper...");
    const rawResults = await fetchSerperSearch(keyword);
    console.log(`   - Encontrados: ${rawResults.length} resultados.`);

    if (rawResults.length === 0) {
        console.error("   - ERROR: No hay resultados de Serper.");
        return;
    }

    // 2. Filtro IA (Groq)
    console.log("\n2. Ejecutando Filtro Inteligente (Groq)...");
    const queriesArray = [keyword];
    const qualityPrompt = `Eres un curador de contenido experto. Tu objetivo es filtrar los mejores resultados de búsqueda para investigar el tema: "${keyword}".
    
Contexto de búsqueda (Ángulos analizados):
${queriesArray.map(q => "- " + q).join('\n')}

Resultados encontrados:
${rawResults.slice(0, 15).map((r, i) => `[${i}] Título: ${r.title} | Snippet: ${r.snippet}`).join('\n')}

REGLAS DE SELECCIÓN:
1. Selecciona artículos, landing pages, o guías que aporten valor real a estos ángulos.
2. DESCARTA resultados que sean solo listados de búsqueda de otras webs, homepages genéricas sin info, o errores de carga.
3. Prioriza calidad y profundidad sobre cantidad, pero intenta seleccionar entre 5 y 10 fuentes si son relevantes.
4. Si hay pocos resultados, sé un poco más flexible con la relevancia estructural si el snippet parece prometedor.

Retorna ÚNICAMENTE un array JSON de índices seleccionados: [0, 2, 5, ...]`;

    try {
        const response = await aiRouter.generate({
            prompt: qualityPrompt,
            model: "llama-3.1-8b-instant",
            systemPrompt: "Eres un experto en curación de contenido.",
            jsonMode: true
        });

        console.log("   - Respuesta bruta de Groq:", response.text);
        const validIndices = JSON.parse(response.text.match(/\[.*\]/s)?.[0] || "[]");
        console.log(`   - Índices seleccionados: ${validIndices.join(", ")}`);

        const filteredResults = rawResults.filter((_, i) => validIndices.includes(i));
        console.log(`   - Total final tras filtro: ${filteredResults.length} fuentes.`);

        // 3. Jina & AI Cleaning
        console.log("\n3. Iniciando Extracción y Limpieza (Jina + Gemini)...");
        for (const comp of filteredResults.slice(0, 5)) {
            console.log(`\n--- PROCESANDO: ${comp.title.substring(0, 40)} ---`);
            console.log(`   URL: ${comp.url}`);
            
            try {
                // Simulación de Jina (Llamada al servicio real)
                const jinaUrl = `https://r.jina.ai/${comp.url}`;
                console.log(`   - Pidiendo a Jina: ${jinaUrl}...`);
                const jinaRes = await fetch(jinaUrl, {
                    headers: { 
                        "X-Return-Format": "markdown"
                    }
                });
                
                const content = await jinaRes.text();
                const wordCount = content.split(/\s+/).length;
                console.log(`   - Extracción Jina OK: ${wordCount} palabras.`);

                if (wordCount < 100) {
                    console.warn(`   - AVISO: Contenido muy corto (${wordCount} pal.).`);
                    continue;
                }

                console.log(`   - Limpiando con Groq (Llama 8B)...`);
                const cleanRes = await aiRouter.generate({
                    model: "llama-3.1-8b-instant",
                    prompt: `Eres un experto en limpieza de datos. Toma el siguiente contenido bruto y devuelve SOLO el artículo limpio en Markdown:\n\n${content.substring(0, 20000)}`,
                    systemPrompt: "Extraes el contenido principal eliminando basura."
                });

                const cleanWordCount = cleanRes.text.split(/\s+/).length;
                console.log(`   - Limpieza OK: ${cleanWordCount} palabras finales.`);

            } catch (err: any) {
                console.error(`   - ERROR en fuente: ${err.message}`);
            }
        }

    } catch (err: any) {
        console.error("   - ERROR GLOBAL:", err.message);
    }
}

const target = process.argv[2] || "Mejores estrategias de inversión 2026";
debugSEO(target);
