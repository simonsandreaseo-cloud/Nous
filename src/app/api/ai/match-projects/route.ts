import { NextResponse } from 'next/server';
import { aiRouter } from '@/lib/ai/router';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { csvProjects, existingProjects } = body;

        if (!csvProjects || !Array.isArray(csvProjects)) {
            return NextResponse.json({ error: "Faltan los nombres de proyectos (csvProjects)." }, { status: 400 });
        }

        const promptText = `
Eres un asistente que empareja nombres de proyectos extraídos de un archivo Excel con los proyectos que ya existen en la base de datos del usuario.

PROYECTOS EXISTENTES DEL USUARIO:
${JSON.stringify(existingProjects, null, 2)}

NOMBRES DE PROYECTOS ENCONTRADOS EN EL EXCEL:
${JSON.stringify(csvProjects, null, 2)}

INSTRUCCIONES:
Devuelve ÚNICAMENTE un objeto JSON. Las claves (keys) deben ser EXACTAMENTE los nombres de proyecto encontrados en el Excel.
Para cada clave, el valor debe ser:
1. El ID (uuid) del proyecto existente, si crees que el nombre del Excel se refiere claramente a uno de los proyectos existentes. Sé tolerante con mayúsculas, minúsculas, espacios, y variaciones menores.
2. El string "NEW" si consideras que es un proyecto completamente distinto y no coincide con ninguno de los existentes.

Ejemplo de salida:
{
  "Clinica XYZ": "123e4567-e89b-12d3-a456-426614174000",
  "Nuevo Cliente": "NEW"
}
`;

        const response = await aiRouter.generate({
            prompt: promptText,
            model: "gemini-3.1-flash-lite-preview",
            systemPrompt: "Eres un ingeniero de datos experto. Devuelve estrictamente JSON validado.",
            jsonMode: true,
            label: "Emparejamiento de Proyectos",
            timeoutMs: 30000
        });

        let mapping = {};
        try {
            const raw = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            mapping = JSON.parse(raw);
        } catch (err) {
            console.error("Error parseando respuesta JSON de IA:", err, response.text);
            return NextResponse.json({ error: "La IA no devolvió un JSON válido.", raw: response.text }, { status: 500 });
        }

        return NextResponse.json({ mapping });

    } catch (error: any) {
        console.error("Error en match-projects API:", error);
        return NextResponse.json({ error: error.message || "Error interno al mapear proyectos." }, { status: 500 });
    }
}
