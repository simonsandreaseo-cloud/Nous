import { NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai/router';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { headers, sampleRows } = body;

        if (!headers || !Array.isArray(headers)) {
            return NextResponse.json({ error: "Faltan los encabezados (headers)." }, { status: 400 });
        }

        const schemaDictionary = `
ESQUEMA DE BASE DE DATOS (NOUS TASK TABLE):
- "title": El título o H1 del artículo.
- "target_keyword": La palabra clave principal a posicionar (Keyword SEO).
- "associated_url": URLs o enlaces de Interlinking (Enlazado interno) manual para añadir al contenido.
- "refs": Referencias o URLs de competidores para scrapear/investigar.
- "status": Estado del contenido (e.g., 'idea', 'en_investigacion', 'por_redactar', 'en_redaccion', 'por_humanizar', 'por_corregir', 'por_revisar', 'por_maquetar', 'publicado'). Si no estás seguro, asigna null.
- "volume": Volumen de búsqueda mensual (generalmente un número).
- "target_word_count": Número de palabras ideal o extensión deseada del contenido (ej: 1500, 2000).
- "brief": Resumen, intención de búsqueda o notas adicionales.
- "target_url_slug": El Slug o sufijo de la URL deseada.
- "content_type": El tipo de contenido (ej: Blog Post, Pilar Page, Landing Transaccional).
- "priority": Prioridad del contenido (ej: alta, media, baja).
- "viability": Nivel de viabilidad SEO (ej: alta, media, baja).
- "docs_url": Enlace o URL externa hacia Google Docs / Google Drive.
- "layout_status": Estado de maquetación (TRUE/FALSE, 1/0).
- "assigned_to": Miembro asignado (Suele ser un Nombre o un Correo electrónico).
- "lsi_keywords": Keywords secundarias o LSI separadas por comas.
- "seo_title": SEO Title específico (Meta Title) para Google.
- "meta_description": Meta Descripción específica para Google.
- "h1": Etiqueta H1 específica (si es diferente al título general).
- "excerpt": Extracto, resumen corto o excerpt.
- "language": Idioma del contenido (ej: es, en).
- "observaciones": Observaciones, enfoque particular, o directivas específicas para la IA.
- "project_name": Nombre del proyecto al que pertenece la fila (útil para archivos multi-proyecto).
- "scheduled_date": Fecha programada de publicación (YYYY-MM-DD o similar).

INSTRUCCIONES:
El usuario subió un archivo con los siguientes encabezados: ${JSON.stringify(headers)}
Y estas son las primeras filas de muestra para darte contexto sobre qué tipo de dato hay en cada columna:
${JSON.stringify(sampleRows, null, 2)}

Tu tarea es deducir qué encabezado de la tabla del usuario corresponde a cada campo de nuestra base de datos basándote TANTO en el nombre del encabezado como en su CONTENIDO REAL (si una columna se llama "Varios" pero tiene URLs, es una URL).

Devuelve UNICAMENTE un objeto JSON donde las CLAVES sean los nombres exactos de los encabezados del usuario, y los VALORES sean el nombre del campo en nuestro esquema. 
Si una columna del usuario no sirve o no se mapea a nada de nuestro esquema, su valor debe ser null.
Ejemplo de salida:
{
  "Palabra clave": "target_keyword",
  "URL_Target": "associated_url",
  "Mi Columna Rara": null
}
`;

        const response = await aiRouter.generate({
            prompt: schemaDictionary,
            model: "gemini-3.5-flash",
            systemPrompt: "Eres un ingeniero de datos experto mapeando esquemas de bases de datos desde CSVs caóticos. Devuelve estrictamente JSON validado.",
            jsonMode: true,
            label: "Mapeo Inteligente de Columnas Excel/CSV",
            timeoutMs: 60000
        });

        // Intentar parsear el JSON de la IA de forma segura
        let mapping = {};
        try {
            // Eliminar markdown ```json
            const raw = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            mapping = JSON.parse(raw);
        } catch (err) {
            console.error("Error parseando respuesta JSON de IA:", err, response.text);
            return NextResponse.json({ error: "La IA no devolvió un JSON válido.", raw: response.text }, { status: 500 });
        }

        return NextResponse.json({ mapping });

    } catch (error: any) {
        console.error("Error en map-columns API:", error);
        const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
        return NextResponse.json({ error: "Error interno: " + errorString }, { status: 500 });
    }
}
