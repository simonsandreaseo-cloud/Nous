import { countOccurrences, getWordCount } from './seo-scoring';

export interface OptimizationRequest {
    currentContent: string;
    h1: string;
    missingLSI: string[];
    missingASK: string[];
    // We only need to optimize if the density is extremely low or high, 
    // but the main job is injecting missing elements gracefully.
}

export interface ParagraphEdit {
    originalTextExtract: string; // The exact text or a substantial portion to find in the editor
    newOptimizedText: string;    // The replacement text (HTML or plain text depending on input)
    addedKeywords: string[];     // Which keywords were solved in this edit
}

export interface OptimizationResult {
    nectarParagraph?: string; 
    paragraphEdits: ParagraphEdit[];
    externalLinks: { anchorText: string; url: string; }[];
}

export async function applyBatchOptimization(req: OptimizationRequest): Promise<OptimizationResult> {
    const systemPrompt = `Eres un experto editor SEO (Senior).
Tu objetivo es tomar un artículo y realizar inyecciones "quirúrgicas" de keywords LSI y ASK (Argot Técnico) que faltan, así como generar un "Néctar" (párrafo introductorio ultra denso).
DEBES devolver estrictamente un JSON válido con la siguiente estructura y NADA MÁS:
{
  "nectarParagraph": "string (máximo 40 palabras, 2 oraciones, responde directo a la intención de búsqueda)",
  "paragraphEdits": [
    {
      "originalTextExtract": "Un extracto exacto de 1 o 2 oraciones del texto original que vas a modificar para que podamos buscarlo y reemplazarlo",
      "newOptimizedText": "El texto modificado y mejorado que incluye las keywords nuevas insertadas de forma muy natural",
      "addedKeywords": ["keyword1", "keyword2"]
    }
  ],
  "externalLinks": [
    {
      "anchorText": "texto exacto donde irá el enlace",
      "url": "https://url-de-alta-autoridad.com"
    }
  ]
}

Reglas CRÍTICAS:
1. "originalTextExtract" DEBE existir idénticamente en el texto que te pasaré. Cópialo tal cual.
2. No reescribas todo el artículo, solo devuelve ediciones para los párrafos donde logres insertar las LSI y ASK faltantes.
3. El "nectarParagraph" debe ser directo, sin saludos ni rodeos.
4. Genera máximo 2 externalLinks a sitios de muy alta autoridad (Wikipedia, papers, sitios oficiales) relevantes al tema.
5. El output DEBE ser un JSON parseable, sin markdown blocks (sin \`\`\`json).`;

    const userPrompt = `
H1 del artículo: ${req.h1}
LSI Faltantes que debes intentar incluir: ${req.missingLSI.join(', ')}
ASK (Argot) Faltantes que debes intentar incluir: ${req.missingASK.join(', ')}

A continuación el contenido actual del artículo (en HTML):
---
${req.currentContent}
---

Procesa la solicitud y devuelve únicamente el JSON requerido.`;

    const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt: userPrompt,
            model: 'gemini-3.1-pro-preview', // Un modelo inteligente de reasoning (o Gemini)
            systemPrompt: systemPrompt,
            maxTokens: 4000,
            jsonMode: false
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error en la API de optimización');
    }

    const data = await response.json();
    let parsed: OptimizationResult;
    try {
        // En caso de que el modelo devuelva markdown a pesar de jsonMode
        const text = data.text.replace(/```json/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(text);
    } catch (e) {
        console.error("Error parseando JSON del optimizador:", e, data.text);
        throw new Error('El modelo no devolvió un JSON válido.');
    }

    return parsed;
}
