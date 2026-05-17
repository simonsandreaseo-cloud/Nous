import { executeWithKeyRotation } from './ai-core';

export interface OptimizationRequest {
    currentContent: string;
    h1: string;
    missingLSI: string[];
    missingASK: string[];
}

export interface ParagraphEdit {
    originalTextExtract: string; 
    newOptimizedText: string;    
    addedKeywords: string[];     
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

    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ 
            model: currentModel,
            systemInstruction: systemPrompt
        });

        const response = await modelObj.generateContent(userPrompt);
        const resText = response.response.text();
        
        try {
            const cleanText = resText.replace(/```json/gi, '').replace(/```/g, '').trim();
            return JSON.parse(cleanText) as OptimizationResult;
        } catch (e) {
            console.error("Error parseando JSON del optimizador:", e, resText);
            throw new Error('El modelo no devolvió un JSON válido.');
        }
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, undefined, false, 'Batch SEO Optimization');
}

