import TurndownService from 'turndown';
import { marked } from 'marked';
import { executeWithKeyRotation } from './ai-core';
import type { MiniHumanizerParams } from './types';

// =========================================================================
// PROMPT EXACTO DE HUMANIZACIÓN UNIPROMPT (4 LEYES MORFOSINTÁCTICAS)
// =========================================================================

export const UNIPROMPT_HUMANIZER_PROMPT = `ROL: Eres un redactor humano experto en óptica y moda que escribe de forma directa, práctica y cercana, evitando por completo el estilo publicitario o enciclopédico de la IA. Tu misión es reescribir el texto que te entregaré cumpliendo estrictamente las 4 leyes morfosintácticas, léxicas y de puntuación de abajo, sin borrar datos técnicos, códigos de modelos, medidas, tablas ni subtítulos.

====================================================================
LEY 1: VOCABULARIO LLANO Y "LISTA BLANCA DE VERBOS" (CERO ESTILO REVISTA)
====================================================================
1. PROHIBICIÓN ABSOLUTA DE METÁFORAS Y CLICHÉS DE IA:
- Tienes estrictamente prohibido usar giros poéticos, de revista de lujo o de laboratorio como: "bajo la batuta de", "hacer honor a", "sello de distinción", "abandona la etiqueta de", "adopta un papel protagonista", "modas fugaces", "impronta de pasarela", "son fruto de", "dilatada trayectoria", "alberga en su interior", "brinda", "prescinde de... en favor de", "constituye una opción magnífica", "dota de", "resuelve tu estilismo", "pisada ligera", "consumo consciente", "trabajo meticuloso", "claridad impecable", "equilibrio absoluto", "dialogan con", "estabilidad dimensional", "estructura molecular", "contorno/curva craneal", "centro de gravedad", "vibraciones cotidianas", "claroscuro", "retrofuturista".
- Tradúcelo todo a explicaciones físicas y cotidianas:
  * ❌ MAL (IA): "Cada varilla alberga en su interior un alma metálica que brinda flexibilidad estructural."
  * ✅ BIEN (Humano): "Por dentro de cada patilla llevan una pieza de metal que las hace flexibles y resistentes."
  * ❌ MAL (IA): "Bajo la batuta de Miuccia Prada nacen monturas que abandonan la etiqueta de simple accesorio."
  * ✅ BIEN (Humano): "Miuccia Prada y Raf Simons diseñaron estas monturas con mucha personalidad para que destaquen con cualquier ropa."

2. LISTA BLANCA DE VERBOS (USA ESTOS VERBOS EN EL 85% DEL TEXTO):
- Prohibido usar verbos cultos de IA ("albergar", "brindar", "constituir", "dotar", "prescindir", "sintetizar", "reinterpretar", "reinventar", "exhibir", "atenuar", "neutralizar", "disipar", "confeccionar", "garantizar", "proporcionar", "optimizar").
- Usa en su lugar verbos físicos simples: "tener", "llevar", "hacer", "ser", "estar", "quedar", "ir", "ver", "mirar", "dar", "poner", "usar", "mezclar", "combinar", "medir", "pesar", "aguantar", "soportar", "frenar", "quitar", "evitar", "cuidar", "proteger", "adaptarse", "ajustarse".

3. CERO GERUNDIOS DE CIERRE Y ADJETIVO CORTO EN VEZ DE "-MENTE":
- Prohibido usar gerundios explicativos ("...cuidando cada detalle", "...alejándose de", "...logrando así", "...garantizando"). Cámbialos por "y + verbo en presente".
- Cambia los adverbios terminados en "-mente" por adjetivos cortos ("rápido", "fácil", "directo", "perfecto", "muy bien"). Máximo 1 adverbio en "-mente" en todo el artículo.

====================================================================
LEY 2: ARRANQUES DE ORACIÓN Y CERCANÍA EN 2.ª PERSONA (SIN LA PALABRA "TÚ")
====================================================================
1. PROHIBIDO EMPEZAR DOS ORACIONES SEGUIDAS CON "EL / LA / LOS / LAS / ESTE / ESTA + SUSTANTIVO":
- Como máximo 1 de cada 3 oraciones puede abrir con artículo o demostrativo + sustantivo ("El modelo...", "La montura...", "Los cristales...").
- Una vez presentado el modelo al inicio del párrafo, las demás oraciones DEBEN arrancar directamente con:
  a) Verbo conjugado en plural o singular con sujeto implícito: "Miden 54 mm en el lente...", "Llevan cristales oscuros...", "Tienen un puente de 16 mm...", "Aguantan muy bien el uso diario...", "Vienen en color negro o carey...".
  b) Ubicación física sencilla: "Por dentro llevan...", "En los costados tienen...", "En la parte de arriba...".
  c) Condicional o temporal dirigida al lector (5 a 7 veces en el texto): "Si tienes la cara redonda...", "Cuando caminas bajo el sol...", "Al probártelas notas...".

2. CERCANÍA EN 2.ª PERSONA EN EL 40% DE LAS FRASES (PROHIBIDO ESCRIBIR "TÚ"):
- Habla al lector usando "te", "tu", "tus" y verbos en 2.ª persona ("te quedan", "no te pesan en la cara", "las puedes llevar todo el día", "protegen tus ojos", "si buscas", "cuando miras"), en vez de hablar en 3.ª persona fría ("la usuaria", "el rostro", "la piel", "la cabeza").
- REGLA ESTRICTA: NUNCA escribas la palabra "tú" ("y tú llevas", "tú notas").
- PROHIBIDO invertir el orden poniendo el objeto al principio como un poema ("Varios acabados puedes elegir", "A la luz la bloquean las varillas"). Usa siempre orden directo: Verbo + Objeto.

====================================================================
LEY 3: MOLDES DE ORACIÓN Y PROHIBICIÓN DE LA "REGLA DE TRES"
====================================================================
1. PROHIBIDO CERRAR PÁRRAFOS CON LISTAS DE 3 VERBOS (TRICOLON):
- Nunca termines un párrafo con la estructura típica de IA "Verbo 1, Verbo 2 y Verbo 3" ("Pesan poco, no dejan marcas y se adaptan..."). Usa solo 2 acciones o únelas a la frase anterior.

2. ALTERNANCIA DE ORACIONES CORTAS Y ORACIONES LARGAS YUXTAPUESTAS:
- En cada párrafo, alterna alguna oración corta directa (de 8 a 12 palabras, sin comas) con oraciones compuestas largas (de 24 a 36 palabras) formadas por 2 o 3 cláusulas simples sobre el mismo rasgo unidas con coma, "porque", "pero", "por eso" (máx. 3 veces en el texto), ", además" o ", ahí es donde".
- Usa 3 o 4 veces en el artículo la estructura causativa con "hace que + subjuntivo" ("Este corte cuadrado hace que tus facciones se vean más definidas").
- Prohibido añadir frases cortas al final de un párrafo que repitan algo ya dicho en ese mismo párrafo.

====================================================================
LEY 4: COSTURA DE PUNTUACIÓN Y ASIMETRÍA HUMANA (EL SELLO 0% IA)
====================================================================
1. CERO CONECTORES DE INICIO DE ORACIÓN:
- Prohibido empezar una oración con "Además,", "Sin embargo,", "Asimismo,", "Por otro lado,", "En conclusión,", "De este modo,".

2. UNIÓN DE ORACIONES POR COMA (COMMA SPLICE - 8 A 10 VECES EN EL TEXTO):
- En 8 a 10 lugares del texto, en vez de separar con punto y seguido (".") dos oraciones cortas que hablan del mismo detalle (ej. las medidas y cómo quedan, o el material y el peso), únelas directamente con una coma (",") sin conjunción:
  * ✅ Ejemplo: "Tienen un calibre de 57 mm con puente de 16 mm, llevan lentes oscuras en gris pizarra que descansan la vista desde el primer minuto."
  * ✅ Ejemplo: "Las patillas son anchas y firmes, ahí es donde llevan el logo de Prada en esmalte."

3. SIN COMA TRAS "SI / CUANDO / AL" CORTOS Y SIN COMA TRAS "ADEMÁS" INTERNO:
- En todas las oraciones que abran con "Si...", "Cuando..." o "Al..." de menos de 8 palabras, NO pongas coma después de la condición:
  * ✅ Ejemplo: "Si buscas unas gafas cómodas para diario este modelo te va a servir mucho."
- Cuando uses "además" a mitad de oración tras una coma o punto y coma, NO pongas coma después de "además":
  * ✅ Ejemplo: "...suaviza las facciones de la cara, además el marco no pesa nada."

4. CONCORDANCIA POR SENTIDO MARCA -> PLURAL (3 VECES EN EL TEXTO):
- En 3 oraciones donde el sujeto inicial sea el nombre de la marca o "La marca / La firma" en singular, pon el verbo de la siguiente cláusula (tras una coma) en 3.ª persona plural (pensando en "ellos, los de la marca"):
  * ✅ Ejemplo: "Prada cuida mucho el acabado de estas monturas, usan acetato de algodón muy resistente."

FORMATO DE SALIDA:
Devuelve únicamente el texto completo reescrito cumpliendo las 4 leyes de principio a fin, sin introducciones ni notas.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]`;

// =========================================================================
// TIPOS Y UTILIDADES
// =========================================================================

export interface UnipromptHumanizerOptions {
    modelName?: string;
    provider?: 'google-ai-studio' | 'vertex-ai' | 'auto';
    reasoning?: string;
    onStatus?: (msg: string) => void;
    onChunk?: (html: string) => void;
    onProgress?: (percent: number) => void;
    onLog?: (msg: string) => void;
    customParams?: MiniHumanizerParams;
    chunkWordLimit?: number; // Por defecto: 2500 palabras
}

function parseModelAndProvider(modelName: string, provider?: 'google-ai-studio' | 'vertex-ai' | 'auto') {
    let resolvedModel = modelName;
    let resolvedProvider = provider || 'auto';

    if (modelName.endsWith('-vertex')) {
        resolvedModel = modelName.slice(0, -7);
        resolvedProvider = 'vertex-ai';
    } else if (modelName.endsWith('-gas')) {
        resolvedModel = modelName.slice(0, -4);
        resolvedProvider = 'google-ai-studio';
    }

    return { resolvedModel, resolvedProvider };
}

function cleanMarkdownFences(raw: string): string {
    let cleaned = raw.trim();
    const mdBlockMatch = cleaned.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
    if (mdBlockMatch && mdBlockMatch[1]) {
        cleaned = mdBlockMatch[1].trim();
    } else {
        cleaned = cleaned.replace(/^```(?:markdown|md)?\n?/i, '').replace(/\n?```$/g, '').trim();
    }
    return cleaned;
}

async function executeUnipromptStepWithRetry(
    operation: (client: any, currentModel: string) => Promise<string>,
    onStatus: (msg: string) => void,
    stepLabel: string,
    modelName: string = 'gemma-4-31b-it',
    provider?: 'google-ai-studio' | 'vertex-ai' | 'auto',
    reasoning?: string
): Promise<string> {
    const { resolvedModel, resolvedProvider } = parseModelAndProvider(modelName, provider);
    const STEP_TIMEOUT = 240000; // 4 minutos por chunk de hasta 2500 palabras
    const MAX_RETRIES = 12;
    let baseDelayMs = 4000;
    const MAX_DELAY_MS = 60000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await executeWithKeyRotation(
                operation,
                resolvedModel,
                undefined,
                undefined,
                undefined,
                true,
                stepLabel,
                STEP_TIMEOUT,
                resolvedProvider === 'auto' ? undefined : resolvedProvider,
                reasoning
            );
        } catch (e: any) {
            const errorMsg = e.message ? e.message.toLowerCase() : String(e).toLowerCase();
            const isRateLimit = e.status === 429 || errorMsg.includes('429') || errorMsg.includes('resource exhausted') || errorMsg.includes('quota') || errorMsg.includes('rate limit');

            if (isRateLimit && attempt < MAX_RETRIES) {
                const sleepTime = Math.min(baseDelayMs, MAX_DELAY_MS) + (Math.random() * 1000);
                onStatus(`[${stepLabel}] Límite 429 detectado. Reintentando en ${(sleepTime / 1000).toFixed(1)}s (Intento ${attempt}/${MAX_RETRIES})...`);
                await new Promise((resolve) => setTimeout(resolve, sleepTime));
                baseDelayMs *= 1.8;
                continue;
            }
            throw e;
        }
    }
    throw new Error(`[${stepLabel}] Falló tras ${MAX_RETRIES} intentos.`);
}

/**
 * Divide el texto Markdown en secciones semánticas respetando encabezados H2 / H3
 * sin exceder el límite especificado en palabras (2500 palabras por chunk).
 */
function splitMarkdownIntoSemanticChunks(markdown: string, maxWords: number = 2500): string[] {
    const wordCount = markdown.trim().split(/\s+/).length;
    if (wordCount <= maxWords) {
        return [markdown];
    }

    // Dividir por bloques de encabezados H2 (# o ##)
    const sections = markdown.split(/(?=\n#{1,2}\s+)/g);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
        const candidate = currentChunk ? `${currentChunk}\n\n${section}` : section;
        const candidateWords = candidate.trim().split(/\s+/).length;

        if (candidateWords <= maxWords || !currentChunk) {
            currentChunk = candidate;
        } else {
            chunks.push(currentChunk.trim());
            currentChunk = section;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [markdown];
}

// =========================================================================
// PIPELINE PRINCIPAL: HUMANIZACIÓN UNIPROMPT (1 SOLA PETICIÓN / HASTA 2500 PALABRAS)
// =========================================================================

export async function runUnipromptHumanizerPipeline(
    content: string,
    options: UnipromptHumanizerOptions = {}
): Promise<{ html: string; metadata?: any; usage?: any }> {
    const {
        modelName = 'gemma-4-31b-it',
        provider = 'auto',
        reasoning,
        onStatus,
        onChunk,
        onProgress,
        onLog,
        customParams,
        chunkWordLimit = 2500
    } = options;

    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[UnipromptHumanizer-Status] ${msg}`);
    };

    const safeLog = (msg: string) => {
        if (typeof onLog === 'function') onLog(msg);
        else console.log(`[UnipromptHumanizer-Log] ${msg}`);
    };

    if (!content || !content.trim()) {
        return { html: content || '' };
    }

    const startTime = Date.now();
    const totalWords = content.trim().split(/\s+/).length;
    safeStatus(`Iniciando Humanización Uniprompt (${totalWords} palabras)...`);
    safeLog(`[Humanización Uniprompt] Iniciando proceso sobre texto (${totalWords} palabras) con modelo ${modelName}...`);

    // Detectar si el contenido es HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    let currentMarkdown = content;

    if (isHtml) {
        try {
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-'
            });
            currentMarkdown = turndownService.turndown(content);
        } catch (tdErr) {
            console.warn('[UnipromptHumanizer] Error al convertir HTML a Markdown, se usará texto original:', tdErr);
            currentMarkdown = content;
        }
    }

    const buildGenConfig = () => {
        const config: Record<string, any> = {};
        if (customParams) {
            if (customParams.temperature !== undefined) config.temperature = customParams.temperature;
            if (customParams.topP !== undefined) config.topP = customParams.topP;
            if (customParams.topK !== undefined) config.topK = customParams.topK;
            if (customParams.presencePenalty !== undefined) config.presencePenalty = customParams.presencePenalty;
            if (customParams.frequencyPenalty !== undefined) config.frequencyPenalty = customParams.frequencyPenalty;
        }
        return Object.keys(config).length > 0 ? config : undefined;
    };

    // Fragmentación semántica hasta 2500 palabras por chunk
    const chunks = splitMarkdownIntoSemanticChunks(currentMarkdown, chunkWordLimit);
    safeLog(`[Humanización Uniprompt] Documento organizado en ${chunks.length} pase(s) de hasta ${chunkWordLimit} palabras.`);

    const processedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunkIndex = i + 1;
        const chunkText = chunks[i];
        const chunkWords = chunkText.trim().split(/\s+/).length;
        const progressStart = Math.round((i / chunks.length) * 100);
        const progressEnd = Math.round(((i + 1) / chunks.length) * 100);

        if (onProgress) onProgress(progressStart + 5);

        safeStatus(`Procesando pase ${chunkIndex}/${chunks.length} (${chunkWords} palabras, 4 Leyes en 1 Petición)...`);
        safeLog(`=== [HUMANIZACIÓN UNIPROMPT] EJECUTANDO PASE ${chunkIndex}/${chunks.length} (${chunkWords} palabras) ===`);

        const userPrompt = UNIPROMPT_HUMANIZER_PROMPT.replace('[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]', chunkText.trim());

        const chunkResult = await executeUnipromptStepWithRetry(
            async (client: any, currentModel: string) => {
                const genConfig = buildGenConfig();
                const reqPayload: any = {
                    contents: [{ role: 'user', parts: [{ text: userPrompt }] }]
                };
                if (genConfig) {
                    reqPayload.generationConfig = genConfig;
                }

                const response = await client.models.generateContent({
                    model: currentModel,
                    ...reqPayload
                });

                const rawText = response.text || '';
                return cleanMarkdownFences(rawText);
            },
            safeStatus,
            `Uniprompt Pase ${chunkIndex}/${chunks.length}`,
            modelName,
            provider,
            reasoning
        );

        processedChunks.push(chunkResult);

        // Previsualización progresiva
        let combinedProgressText = processedChunks.join('\n\n');
        if (isHtml) {
            try {
                combinedProgressText = await marked.parse(combinedProgressText);
            } catch (mErr) {
                // conservar texto
            }
        }
        if (onChunk) onChunk(combinedProgressText);
        if (onProgress) onProgress(progressEnd);

        safeStatus(`✅ Pase ${chunkIndex}/${chunks.length} completado (${progressEnd}%)`);
    }

    const unifiedMarkdown = processedChunks.join('\n\n');
    let finalHtml = unifiedMarkdown;

    if (isHtml) {
        try {
            finalHtml = await marked.parse(unifiedMarkdown);
        } catch (mErr) {
            console.warn('[UnipromptHumanizer] Error al convertir Markdown final a HTML:', mErr);
            finalHtml = unifiedMarkdown;
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    safeStatus(`✅ Humanización Uniprompt completada con éxito en ${duration}s (${chunks.length} pase(s)).`);
    safeLog(`[Humanización Uniprompt] Finalizada en ${duration}s.`);

    return {
        html: finalHtml.trim(),
        metadata: {
            durationSeconds: parseFloat(duration),
            humanizerType: 'uniprompt',
            chunksProcessed: chunks.length,
            chunkWordLimit
        }
    };
}
