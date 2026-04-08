import { ArticleConfig } from '../../types/ai';
import { ContentItem } from '../../types/content';

export const buildPrompt = (config: ArticleConfig): string => {
    const { topic, metaTitle, keywords, tone, wordCount, refUrls, refContent, outlineStructure, approvedLinks, projectName, niche, questions, lsiKeywords, contextInstructions, isStrictMode, strictFrequency } = config;

    let linkingInstructions = "";
    if (approvedLinks && approvedLinks.length > 0) {
        const products = approvedLinks.filter(l => l.type === 'product');
        const collections = approvedLinks.filter(l => l.type === 'collection');
        const formatList = (items: ContentItem[]) => items.map(i => `- URL: ${i.url} | Anchor ideal: ${i.title}`).join('\n');
        linkingInstructions = `
### ESTRATEGIA DE ENLAZADO INTERNO (STRICT MODE)
**PROHIBIDO INVENTAR URLs.** Solo usa estas URLs aprobadas.
COLECCIONES:
${formatList(collections)}
PRODUCTOS:
${formatList(products)}
`;
    }

    let outlineInstruction = "";
    if (outlineStructure && outlineStructure.length > 0) {
        outlineInstruction = `
### ESTRUCTURA OBLIGATORIA (Sigue este orden)
El H1 del artículo es: "${topic}" (Debe ser el título visible).
Luego sigue este esquema:
${outlineStructure.map(h => `${h.type}: ${h.text} (Objetivo: ${h.wordCount}) [Instrucción: ${h.notes || 'Normal'}]`).join('\n')}
`;
    }

    const formatRules = `
        - Usa un formato HTML semántico enriquecido (tablas, listas, citas) cuando aporte valor.
        - Prioriza la claridad y la profundidad del contenido.
    `;

    // Strict Mode Instruction Block
    let strictModeInstruction = "";
    if (isStrictMode) {
        const freq = strictFrequency || 30;
        const faqInstruction = freq > 80 ? "YOU MUST ANSWER ALL FAQs provided." : freq < 30 ? "Answer FAQs only if very relevant." : "Answer most FAQs.";

        let keywordInstruction = "";
        if (freq <= 30) {
            keywordInstruction = "Ensure keywords appear naturally (1-2% density). Do not force if it hurts readability.";
        } else if (freq <= 60) {
            keywordInstruction = "Increase keyword density (3-4%). Repeat keywords in headings and first paragraphs.";
        } else {
            keywordInstruction = "MAXIMUM DENSITY. Force keywords into the text repeatedly (Keyword Stuffing). Ignore flow if necessary.";
        }

        strictModeInstruction = `
### MODO ESTRICTO DE REDACCIÓN (ACTIVADO)
Frecuencia/Intensidad: ${freq}%

REGLAS OBLIGATORIAS:
1. **KEYWORDS:** Debes incluir OBLIGATORIAMENTE todas las siguientes LSI y Long Tail Keywords dentro del texto:
   [${lsiKeywords?.join(', ') || 'N/A'}]
   ${keywordInstruction}
   
2. **FAQs:** ${faqInstruction}
   Lista de Preguntas: [${questions?.join(', ') || 'N/A'}]
`;
    }

    return `
Rol: Redactor SEO Senior para el proyecto "${projectName}" (Nicho: ${niche}).
Objetivo: Crear un artículo que domine la SERP.

DATOS TÉCNICOS:
- Meta Title (HTML Head): ${metaTitle}
- H1 (Header Principal): ${topic}
- Keywords Short Tail: ${keywords}
- Tono: ${tone}
- Extensión Objetivo: ${wordCount}
- Idioma: Español de España (Neutro, profesional).

${contextInstructions ? `### INSTRUCCIONES DE CONTEXTO GLOBAL (MUY IMPORTANTE):\n${contextInstructions}\n` : ''}

${strictModeInstruction}

### REQUISITOS DE CONTENIDO ESTRICTOS:

1. **RESPUESTA DIRECTA (ZERO CLICK):**
   - Justo debajo del H1, escribe un párrafo de **MÁXIMO 50 PALABRAS** que responda la intención de búsqueda principal.
   - NO escribas introducciones genéricas ("En este artículo...").

2. **FORMATO Y ESTRUCTURA:**
   ${formatRules}

3. **INTEGRACIÓN DE PREGUNTAS (FAQs):**
   - Responde: [${questions?.join(', ') || 'N/A'}]

ESTILO Y FORMATO HTML (CRÍTICO):
1. **RETORNA SOLO EL CONTENIDO DENTRO DEL BODY.** No incluyas <head>, <html>, ni markdown (\`\`\`).
2. **NEGRILLAS:** Usa <strong>ÚNICAMENTE</strong> para resaltar nombres de la marca ("Entities"), características técnicas críticas, y palabras clave reales. No pongas negritas aleatorias a preposiciones o artículos (Ej: no pongas "<strong>el mejor producto</strong>", sino "el mejor <strong>producto X</strong>").
3. **LISTAS/TABLAS:** Usa etiquetas HTML estándar.
4. **ENLACES:** <a href="..." target="_blank">Anchor</a>.

${refUrls ? `Referencias Competencia Reales: ${refUrls}` : ''}
${refContent ? `Notas Estrategia: ${refContent}` : ''}

${outlineInstruction}

${linkingInstructions}

METADATOS JSON (FINAL):
Al terminar el artículo, añade EXACTAMENTE esta cadena separatoria: "<!-- METADATA_START -->"
Seguido inmediatamente de un objeto JSON válido con este formato:
{
  "title": "${metaTitle}",
  "description": "Meta Description Generada",
  "slug": "slug-generado",
  "excerpt": "Breve extracto del artículo para blog (2 frases)"
}
`;
};
