import { executeWithKeyRotation } from './ai-core';
import { safeJsonExtract } from '@/utils/json';

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
            return safeJsonExtract<OptimizationResult>(resText, {} as OptimizationResult);
        } catch (e) {
            console.error("Error parseando JSON del optimizador:", e, resText);
            throw new Error('El modelo no devolvió un JSON válido.');
        }
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, undefined, false, 'Batch SEO Optimization');
}

export interface MetadataRequest {
    currentContent: string;
    keyword: string;
    existingH1?: string;
    existingTitle?: string;
    existingSlug?: string;
    existingDesc?: string;
    existingExcerpt?: string;
}

export interface MetadataResult {
    h1: string;
    title: string;
    slug: string;
    description: string;
    excerpt: string;
}

export async function generateMissingMetadata(req: MetadataRequest): Promise<MetadataResult> {
    const systemPrompt = `Eres un experto estratega SEO (Senior) y Copywriter.
Tu objetivo es analizar un artículo y generar o completar los metadatos de SEO que falten.
Se te proporcionará el contenido del artículo, la keyword principal y los metadatos actuales (si existen).
Debes completar o mejorar los campos vacíos de forma que sean altamente persuasivos para los buscadores (Google CTR) y mantengan la relevancia de la palabra clave.

DEBES devolver estrictamente un JSON válido con la siguiente estructura y NADA MÁS:
{
  "h1": "Título principal del artículo (entre 50 y 70 caracteres)",
  "title": "Título SEO para Google (con Keyword principal, entre 50 y 60 caracteres, persuasivo)",
  "slug": "Slug/URL limpio en minúsculas, separado por guiones, amigable para SEO (ej: guia-seo-tiptap)",
  "description": "Meta descripción persuasiva y con llamada a la acción (con la keyword principal, entre 120 y 155 caracteres)",
  "excerpt": "Extracto o resumen profesional del contenido (máximo 40 palabras, estilo gancho/lead)"
}

Reglas CRÍTICAS:
1. Si un metadato actual ya existe y es de buena calidad, puedes conservarlo o refinarlo ligeramente si mejora significativamente el SEO.
2. Si un metadato está vacío o es un placeholder, devuélvelo completado con la mayor calidad.
3. El output DEBE ser un JSON parseable, sin markdown blocks (sin \`\`\`json).`;

    const userPrompt = `
Keyword principal: ${req.keyword}
Metadatos actuales proporcionados:
- H1: ${req.existingH1 || 'Vacío'}
- SEO Title: ${req.existingTitle || 'Vacío'}
- Slug: ${req.existingSlug || 'Vacío'}
- Meta Descripción: ${req.existingDesc || 'Vacío'}
- Extracto: ${req.existingExcerpt || 'Vacío'}

A continuación el contenido del artículo (en HTML):
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
            return safeJsonExtract<MetadataResult>(resText, {} as MetadataResult);
        } catch (e) {
            console.error("Error parseando JSON del completador de metadatos:", e, resText);
            throw new Error('El modelo no devolvió un JSON de metadatos válido.');
        }
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, undefined, false, 'SEO Metadata Generation');
}

export interface ImageAuditItem {
    src: string;
    alt: string;
    title: string;
}

export interface ImageOptimizationResult {
    src: string;
    alt: string;
    title: string;
}

export async function optimizeImageAltAndTitles(
    currentContent: string, 
    keyword: string, 
    images: ImageAuditItem[]
): Promise<ImageOptimizationResult[]> {
    const systemPrompt = `Eres un experto editor SEO y accesibilidad web.
Tu tarea es analizar un artículo escrito en HTML y su lista de imágenes para generar etiquetas 'alt' (texto alternativo de accesibilidad) y 'title' (títulos descriptivos de imagen) optimizados para SEO.

Se te pasará el HTML del artículo y la lista de imágenes con sus URLs (src) y sus textos actuales (alt y title) si los tienen.
Debes examinar el contexto donde se encuentra cada imagen en el HTML (los párrafos anteriores, posteriores o el encabezado más cercano) para deducir qué representa la imagen o qué rol cumple, y asignarle un texto alt y title altamente optimizados.

Reglas de Optimización SEO y Accesibilidad:
1. El 'alt' debe describir con precisión lo que muestra la imagen o su contexto temático de forma natural, incorporando keywords LSI o variaciones de la keyword principal de forma no forzada (sin Keyword Stuffing). Debe ser útil para lectores de pantalla.
2. El 'title' debe ser una etiqueta descriptiva complementaria corta, legible y atractiva.
3. El formato de respuesta DEBE ser estrictamente un array JSON de objetos con la estructura exacta:
[
  {
    "src": "URL exacta de la imagen proporcionada",
    "alt": "Texto alt optimizado",
    "title": "Texto title optimizado"
  }
]
4. El output DEBE ser un JSON parseable, sin markdown blocks (sin \`\`\`json).`;

    const userPrompt = `
Keyword principal: ${keyword}

Lista de imágenes a optimizar:
${images.map((img: any, idx: number) => `
Imagen #${idx + 1}:
- URL (src): ${img.src}
- Alt actual: ${img.alt || 'Vacío'}
- Title actual: ${img.title || 'Vacío'}
`).join('\n')}

A continuación el contenido del artículo (en HTML):
---
${currentContent}
---

Procesa la solicitud y devuelve únicamente el array JSON requerido.`;

    return executeWithKeyRotation(async (ai, currentModel) => {
        const modelObj = ai.getGenerativeModel({ 
            model: currentModel,
            systemInstruction: systemPrompt
        });

        const response = await modelObj.generateContent(userPrompt);
        const resText = response.response.text();
        
        try {
            return safeJsonExtract<ImageOptimizationResult[]>(resText, []);
        } catch (e) {
            console.error("Error parseando JSON de optimización de imágenes:", e, resText);
            throw new Error('El modelo no devolvió un JSON de optimización de imágenes válido.');
        }
    }, 'gemini-3.1-flash-lite-preview', undefined, undefined, undefined, false, 'SEO Image Optimization');
}

