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
- "associated_url": Enlace principal manual (URL interlinking objetivo).
- "secondary_url": Enlace secundario manual (URL de apoyo).
- "refs": Referencias o URLs de competidores para scrapear/investigar.
- "status": Estado del contenido (e.g., 'idea', 'en_investigacion', 'por_redactar', 'en_redaccion', 'por_humanizar', 'por_corregir', 'por_revisar', 'por_maquetar', 'publicado'). Si no estás seguro, asigna null.
- "volume": Volumen de búsqueda mensual (generalmente un número).
- "target_word_count": Número de palabras ideal o extensión deseada del contenido (ej: 1500, 2000).
- "brief": Resumen, intención de búsqueda o notas adicionales.
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
        return NextResponse.json({ error: error.message || "Error interno al mapear columnas." }, { status: 500 });
    }
}
