import { ArticleConfig, ContentItem } from "./types";

export const buildPrompt = (config: ArticleConfig): string => {
    const { 
        topic, metaTitle, keywords, tone, wordCount, refUrls, refContent, 
        csvData, outlineStructure, approvedLinks, projectName, niche, 
        questions, lsiKeywords, contextInstructions, 
        isStrictMode, strictFrequency, architectureInstructions 
    } = config;

    let linkingInstructions = "";
    if (approvedLinks && approvedLinks.length > 0) {
        const formatList = (items: ContentItem[]) => items.map(i => `- Tema/Producto: "${i.title}${i.category ? ` (${i.category})` : ''}" | URL: ${i.url}`).join('\n');
        
        const products = approvedLinks.filter(l => l.type === 'product');
        const collections = approvedLinks.filter(l => l.type === 'collection');
        const others = approvedLinks.filter(l => l.type !== 'product' && l.type !== 'collection');
        
        linkingInstructions = `
### ESTRATEGIA DE ENLAZADO INTERNO (OBLIGATORIO)
**INSTRUCCIÓN CRÍTICA DE SEO:** Debes integrar tantos enlaces de esta lista como sea posible de forma NATURAL dentro del cuerpo del texto. 
**PROHIBIDO INVENTAR URLs.** Solo usa estas URLs.
**REGLA DE SEGURIDAD:** No uses enlaces que empiecen por "#". Si no encuentras un enlace en la lista, NO crees el enlace.

**ANCHOR TEXT SEMÁNTICO (CRÍTICO):** NO uses el "Tema/Producto" de forma literal y robótica. Construye frases semánticas naturales alrededor del tema y enlaza la palabra o frase que mejor fluya en el contexto. (Ejemplo MAL: "Mira este [Lente Ray-Ban Aviator](url)". Ejemplo BIEN: "Para los amantes del estilo clásico, [estos icónicos modelos de aviador](url) son la opción perfecta.")

${collections.length > 0 ? `COLECCIONES RELEVANTES (Prioridad Alta):\n${formatList(collections)}\n` : ''}
${products.length > 0 ? `PRODUCTOS RELEVANTES:\n${formatList(products)}\n` : ''}
${others.length > 0 ? `OTROS ENLACES DE CALIDAD (BLOG/ESTRATEGIA):\n${formatList(others)}\n` : ''}
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
    }    const formatRules = `
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
Rol: Redactor SEO Senior para el proyecto "${projectName || 'General'}" (Nicho: ${niche || 'General'}).
Objetivo: Crear un artículo que domine la SERP.

DATOS TÉCNICOS:
- Meta Title (HTML Head): ${metaTitle || topic}
- H1 (Header Principal): ${topic}
- Keywords Short Tail: ${keywords}
- Tono: ${tone || 'Profesional'}
- Extensión Objetivo: ${wordCount || '1500'}
- Idioma: ${config.language ? (config.language === 'en' ? 'Inglés' : config.language === 'es' ? 'Español de España (Neutro, profesional)' : config.language) : 'Español de España (Neutro, profesional)'}.

${contextInstructions ? `### INSTRUCCIONES DE CONTEXTO GLOBAL (MUY IMPORTANTE):\n${contextInstructions}\n` : ''}

${linkingInstructions}

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
1. **RESPUESTA DIRECTA Y RAZONAMIENTO (ANTI-LEAKAGE):**
    - Si necesitas razonar o planificar antes de generar el texto, DEBES hacerlo EXCLUSIVAMENTE dentro de etiquetas <thinking> ... </thinking>.
    - Después de pensar, tu respuesta final DEBE comenzar directamente con la primera etiqueta HTML (e.g. <h1>) y terminar con la etiqueta de cierre.
    - Queda estrictamente prohibido incluir prefacios, comentarios sobre la tarea o cualquier texto fuera del bloque de <thinking> o del HTML final.
    - RETORNA SOLO EL CONTENIDO DENTRO DEL BODY. No incluyas <head>, <html>, ni markdown (\`\`\`).
2. **NEGRILLAS:** Usa negrillas de forma natural para resaltar términos clave. (Serán optimizadas después).
3. **LISTAS/TABLAS:** Usa etiquetas HTML estándar.
4. **ENLACES HTML:** Usa <a href="..." target="_blank">Anchor</a>.
    - **REGLA DE VIDA O MUERTE:** La lista de "ESTRATEGIA DE ENLAZADO INTERNO" contiene los enlaces que DEBEN aparecer en el artículo. 
    - Siempre que el "Anchor ideal" o un concepto muy similar aparezca en el texto, conviértelo en el enlace correspondiente.
    - **NUNCA REPITAS UN ENLACE.** Cada enlace debe insertarse UNA SOLA VEZ en todo el artículo.
    - Si un enlace es muy importante pero no encaja, fuerza una mención natural al final de un párrafo (ej: "Puedes ver más en nuestra colección de [Título](URL)").
    - NO uses Markdown para enlaces, usa solo HTML.
    - **PROHIBIDO colocar enlaces dentro de etiquetas de encabezado (H1-H6).** Los enlaces solo deben integrarse en el cuerpo de los párrafos o listas.
4. **IMÁGENES Y MULTIMEDIA:**
     - NO insertes marcadores de imagen ni etiquetas <img>. 
     - El diseño visual y la ubicación de los activos se gestionan mediante un sistema de planificación semántica externo. Concentrate exclusivamente en el flujo y la calidad del texto.


${refUrls ? `### COMPETENCIA DIRECTA (REFERENCIAS RAÍZ):\n${refUrls}` : ''}
${refContent ? `### INTELIGENCIA COMPETITIVA (SNIPPETS DE CONTENIDO):\n${refContent}` : ''}

    ${outlineInstruction}
    
    ${architectureInstructions ? `### REGLAS DE ARQUITECTURA Y ESTILO DEL PROYECTO:\n${architectureInstructions}\n` : ''}
    
    ${config.extractorInstructions ? `### PAUTAS DE EXTRACCIÓN DE DATOS (NOUS EXTRACTOR):\n${config.extractorInstructions}\n` : ''}

    RECUERDA: Inserta los enlaces internos de la estrategia de forma prioritaria.
    
    COMIENZA LA REDACCIÓN AHORA:

    METADATOS JSON (FINAL):
    Al terminar el artículo, añade EXACTAMENTE esta cadena separatoria: "<!-- METADATA_START -->"
    Seguido inmediatamente de un objeto JSON válido con este formato:
    {
      "title": "${metaTitle || topic}",
      "description": "Meta Description Generada",
      "slug": "slug-generado",
      "excerpt": "Breve extracto del artículo para blog (2 frases)"
    }
    `;
};
