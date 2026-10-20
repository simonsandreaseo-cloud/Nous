import TurndownService from 'turndown';
import { marked } from 'marked';
import { executeWithKeyRotation } from './ai-core';
import type { MiniHumanizerParams } from './types';

// ==========================================
// PROMPTS EXACTOS DE HUMANIZACIÓN GRAMATICAL
// ==========================================

export const GRAMMATICAL_LAYER_1_PROMPT = `ROL: Eres un editor de estilo natural en español. Tu tarea es limpiar el vocabulario robótico, la jerga técnica exagerada y las listas simétricas de 3 elementos del texto de entrada, conservando todos los datos técnicos, códigos de modelo, medidas y subtítulos.

REGLAS OBLIGATORIAS DE TRANSFORMACIÓN:

1. TRADUCCIÓN DE "JERGA DE INGENIERÍA/FOLLETO" A ESPAÑOL NATURAL DE ÓPTICA:
- Prohibido usar lenguaje de laboratorio o literario pedante: "dialogan con", "estabilidad dimensional", "estructura molecular", "contorno craneal", "centro de gravedad", "aflojamiento espontáneo", "vibraciones cotidianas", "claroscuro", "retrofuturista", "escultórico/a", "perimétrico/a", "plastificantes fósiles", "lujo responsable", "superan con creces".
- Tradúcelo a palabras cotidianas y directas:
  * "según el contorno craneal" -> "a la forma de tu cabeza"
  * "estabilidad dimensional / no venza hacia adelante" -> "no se deforma / no se te caen hacia adelante"
  * "aflojamiento espontáneo por vibraciones" -> "que los tornillos se aflojen con el uso"
  * "dialogan con la sastrería" -> "combinan con el estilo de ropa de la marca"

2. DESTRUCCIÓN DEL "TRICOLON DE IA" (PROHIBIDO CERRAR PÁRRAFOS CON "VERBO 1, VERBO 2 Y VERBO 3"):
- La IA siempre termina los párrafos con una lista de 3 verbos ("Pesan poco, no dejan marcas y se adaptan...", "Soportan el uso, mantienen el brillo y no pierden...").
- Tienes ESTRICTAMENTE PROHIBIDO hacer listas de 3 verbos seguidos. Deja solo 2 acciones unidas con "y" o "pero", o intégralas en la frase anterior.

3. CERO CONECTORES DE INICIO Y RECORTE DE "-MENTE" Y GERUNDIOS:
- Elimina cualquier conector al inicio de oración ("Además,", "Sin embargo,", "Asimismo,", "Por otro lado,", "En conclusión,").
- Cambia los adverbios en "-mente" por adjetivos cortos ("rápido", "fácil", "directo", "perfecto", "muy bien"). Máximo 1 adverbio en "-mente" cada 300 palabras.
- Elimina los gerundios explicativos de cierre de frase.

FORMATO DE SALIDA:
Devuelve únicamente el texto completo reescrito aplicando estas reglas, sin comentarios ni introducciones.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]`;

export const GRAMMATICAL_LAYER_2_PROMPT = `ROL: Eres un reestructurador sintáctico. Tu misión es romper la monotonía de cómo empiezan las oraciones y devolverle cercanía humana al texto sin perder coherencia ni inventar datos.

REGLAS OBLIGATORIAS:

1. PROHIBIDO QUE DOS ORACIONES SEGUIDAS EMPIECEN CON "EL / LA / LOS / LAS / ESTE / ESTA + SUSTANTIVO":
- En los textos de IA casi todas las oraciones abren igual ("El modelo tiene... La montura combina... Los cristales llevan... Las varillas miden...").
- REGLA ESTRICTA: Como máximo 1 de cada 3 oraciones puede empezar con "El / La / Los / Las / Este / Esta + Sustantivo".
- Las demás oraciones del párrafo DEBEN empezar directamente con:
  a) El verbo conjugado en 3.ª persona plural o singular con sujeto tácito: "Tienen un calibre de 54 mm...", "Llevan cristales oscuros...", "Miden 140 mm en la patilla...", "Vienen en color negro o carey...", "Combinan acetato grueso con...".
  b) Un complemento de lugar o parte: "En la parte de adentro traen...", "En la bisagra llevan...", "Por los lados se ve...".
  c) Una condición o acción del lector: "Si las miras de cerca...", "Cuando te las pones...", "Al caminar bajo el sol...".

2. CERCANÍA EN 2.ª PERSONA EN EL 40% DE LAS ORACIONES (PERO PROHIBIDO ESCRIBIR LA PALABRA "TÚ"):
- Habla directamente al lector usando pronombres y posesivos de segunda persona ("te", "tu", "tus") y verbos en 2.ª persona ("puedes", "quieres", "buscas", "notas", "ves", "llevas"), en lugar de hablar en 3.ª persona fría ("la usuaria", "las mejillas", "la piel", "los ojos").
  * ❌ MAL (Frío / IA): "Evitan marcas en la piel y descansan sobre los pómulos."
  * ✅ BIEN (Humano): "No te dejan marcas en la nariz y se apoyan suave en tus pómulos."
  * ❌ MAL (Frío / IA): "Permiten leer pantallas sin fatiga ocular."
  * ✅ BIEN (Humano): "Puedes mirar el móvil o conducir sin que te cansen la vista."
- REGLA DE ORO: NUNCA escribas el pronombre "tú" ("y tú llevas", "tú notas"). El sujeto de 2.ª persona siempre va implícito en el verbo o con "te/tu/tus".

3. VOZ ACTIVA (>92%) Y CERO PASIVAS CON "SER + PARTICIPIO":
- Prohibido usar "son fabricadas", "fue diseñado", "están elaboradas" o relativos cultos ("el cual", "la cual", "quienes", "cuyo"). Usa solo "que".

FORMATO DE SALIDA:
Devuelve únicamente el texto transformado, fluido y natural, conservando todos los subtítulos, tablas y datos técnicos.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DE LA CAPA 1]`;

export const GRAMMATICAL_LAYER_3_PROMPT = `ROL: Eres un editor de ritmo morfosintáctico. Tu tarea es variar la longitud y estructura de las oraciones de cada párrafo para que ningún párrafo tenga el mismo molde que el anterior.

REGLAS ESTRICTAS DE VARIEDAD SINTÁCTICA:

1. PROHIBIDO REPETIR LA MISMA FÓRMULA EN TODOS LOS PÁRRAFOS:
- Los conectores causales o adversativos como ", por eso...", ", así que..." o ", lo que hace que..." SOLO pueden usarse un MÁXIMO de 3 o 4 veces en todo el artículo. Tienes prohibido meter ", por eso..., pero..." en todos los párrafos.
- En el resto del artículo, une las ideas con variedad: usando "porque", "para que", ", además", ", ahí es donde", o simplemente pegando dos ideas relacionadas con una coma (yuxtaposición).

2. ALTERNANCIA DE LOS 6 MOLDES HUMANOS A LO LARGO DEL TEXTO:
Combina libremente estos 6 tipos de oraciones para que haya contraste real entre frases cortas (8-12 palabras) y frases largas fluidas (24-38 palabras):
- Tipo A (Yuxtapuesta fluida con coma): Une 2 o 3 cláusulas simples sobre el mismo rasgo separadas solo por coma. Ejemplo: "Tienen medidas estándar, traen 54 mm en el lente y se adaptan a casi cualquier cara, no te van a pesar nada aunque las uses todo el día."
- Tipo B (Oración corta directa de 1 sola cláusula): De 7 a 12 palabras sin comas. Ejemplo: "El calibre mide 53 mm con un puente de 20 mm." / "Llevan cristales oscuros que frenan el brillo del asfalto."
- Tipo C (Causativa con "hace que + subjuntivo" - máx. 4 en el texto): Ejemplo: "Este corte cuadrado hace que las facciones se vean más definidas."
- Tipo D (Condicional o temporal directa con "Si / Cuando / Al" - 4 a 6 en el texto): Ejemplo: "Si buscas unas gafas que combinen con todo este modelo te resuelve el día."
- Tipo E (Ubicación con ", ahí es donde" o "; además" - 3 a 4 en el texto): Ejemplo: "Las patillas son anchas y se van afinando en la punta, ahí es donde llevan el logo de la marca."
- Tipo F (Objeto adelantado natural SIN preposición "a" - 2 a 3 en el texto): Ejemplo: "Este detalle metálico lo meten directo en la bisagra." (Prohibido poner "A" al inicio como "A la luz la bloquean").

3. VARIACIÓN DE TAMAÑO DE PÁRRAFO:
- No hagas todos los párrafos de 3 oraciones. Deja algunos párrafos con 2 oraciones largas (de 28-35 palabras cada una) y otros con 3 o 4 oraciones combinando cortas y medias.

FORMATO DE SALIDA:
Devuelve únicamente el texto reescrito con ritmo variado y lectura 100% natural.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DE LA CAPA 2]`;

export const GRAMMATICAL_LAYER_4_PROMPT = `ROL: Eres un corrector de puntuación anti-detector. Tienes ESTRICTAMENTE PROHIBIDO cambiar el vocabulario o reescribir las frases. Solo debes aplicar estos 4 retoques de puntuación y concordancia sobre el texto de entrada:

1. QUITAR LA COMA TRAS "SI...", "CUANDO..." O "AL..." AL INICIO DE ORACIÓN:
- En todas las oraciones que empiecen con "Si...", "Cuando..." o "Al..." cuya primera parte tenga menos de 9 palabras, BORRA la coma intermedia:
  * Antes: "Si tienes la cara redonda, este modelo te favorece."
  * Después: "Si tienes la cara redonda este modelo te favorece."

2. QUITAR LA COMA DESPUÉS DE "ADEMÁS" A MITAD DE FRASE:
- Donde aparezca ", además," o "; además," en medio de una oración, borra la coma que va después de "además" para que quede ", además [sujeto/verbo]".

3. UNIR 5 PARES DE ORACIONES CON COMA (COMMA SPLICE):
- Elige entre 5 y 7 lugares del texto donde haya dos oraciones seguidas que hablen del mismo detalle (por ejemplo, las medidas en mm y cómo quedan en la cara, o el material y su resistencia) y cambia el punto (".") entre ellas por una coma (",") poniendo en minúscula la palabra siguiente.

4. CONCORDANCIA POR SENTIDO MARCA -> PLURAL (3 VECES EN EL TEXTO):
- En 3 oraciones donde el sujeto inicial sea "Prada", "La marca" o "La firma" en singular, cambia el verbo de la segunda cláusula a 3.ª persona plural:
  * Ejemplo: "Prada cuida mucho el acabado de esta línea, usan acetato italiano pulido en tambores de madera."

FORMATO DE SALIDA:
Devuelve únicamente el texto final con estos 4 ajustes aplicados.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DE LA CAPA 3]`;

// ==========================================
// TIPOS Y UTILIDADES
// ==========================================

export interface GrammaticalHumanizerOptions {
    modelName?: string;
    provider?: 'google-ai-studio' | 'vertex-ai' | 'auto';
    reasoning?: string;
    onStatus?: (msg: string) => void;
    onChunk?: (html: string) => void;
    onProgress?: (percent: number) => void;
    onLog?: (msg: string) => void;
    customParams?: MiniHumanizerParams;
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

async function executeGrammaticalStepWithRetry(
    operation: (client: any, currentModel: string) => Promise<string>,
    onStatus: (msg: string) => void,
    stepLabel: string,
    modelName: string = 'gemma-4-31b-it',
    provider?: 'google-ai-studio' | 'vertex-ai' | 'auto',
    reasoning?: string
): Promise<string> {
    const { resolvedModel, resolvedProvider } = parseModelAndProvider(modelName, provider);
    const STEP_TIMEOUT = 180000;
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

// ==========================================
// PIPELINE PRINCIPAL: HUMANIZACIÓN GRAMATICAL
// ==========================================

export async function runGrammaticalHumanizerPipeline(
    content: string,
    options: GrammaticalHumanizerOptions = {}
): Promise<{ html: string; metadata?: any }> {
    const {
        modelName = 'gemma-4-31b-it',
        provider = 'auto',
        reasoning,
        onStatus,
        onChunk,
        onProgress,
        onLog,
        customParams
    } = options;

    const safeStatus = (msg: string) => {
        if (typeof onStatus === 'function') onStatus(msg);
        else console.log(`[GrammaticalHumanizer-Status] ${msg}`);
    };

    const safeLog = (msg: string) => {
        if (typeof onLog === 'function') onLog(msg);
        else console.log(`[GrammaticalHumanizer-Log] ${msg}`);
    };

    if (!content || !content.trim()) {
        return { html: content || '' };
    }

    const startTime = Date.now();
    safeStatus('Iniciando Humanización Gramatical (4 fases secuenciales)...');
    safeLog(`[Humanización Gramatical] Iniciando proceso sobre texto completo (${content.length} caracteres) con modelo ${modelName}...`);

    // Detectar si el contenido es HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(content);
    let currentText = content;

    if (isHtml) {
        try {
            const turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-'
            });
            currentText = turndownService.turndown(content);
        } catch (tdErr) {
            console.warn('[GrammaticalHumanizer] Error al convertir HTML a Markdown, se usará texto original:', tdErr);
            currentText = content;
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

    const { resolvedModel } = parseModelAndProvider(modelName, provider);

    const executeLayer = async (
        promptTemplate: string,
        placeholder: string,
        inputText: string,
        layerNumber: number,
        layerName: string,
        targetProgress: number
    ): Promise<string> => {
        safeStatus(`Capa ${layerNumber}/4: ${layerName}...`);
        safeLog(`=== [HUMANIZACIÓN GRAMATICAL] EJECUTANDO CAPA ${layerNumber}/4: ${layerName} ===`);

        const prompt = promptTemplate.replace(placeholder, inputText);

        const layerResult = await executeGrammaticalStepWithRetry(
            async (ai, currentModel) => {
                const genConfig = buildGenConfig();
                const model = ai.getGenerativeModel({
                    model: resolvedModel,
                    ...(genConfig ? { generationConfig: genConfig } : {})
                });

                const response = await model.generateContent(prompt);
                const raw = response.response.text();
                const cleaned = cleanMarkdownFences(raw);
                if (!cleaned) throw new Error(`El modelo devolvió una respuesta vacía en Capa ${layerNumber}.`);
                return cleaned;
            },
            safeStatus,
            `Capa ${layerNumber}: ${layerName}`,
            modelName,
            provider,
            reasoning
        );

        // Reportar progreso y actualización en vivo
        if (onProgress) onProgress(targetProgress);

        let previewHtml = layerResult;
        if (isHtml) {
            try {
                previewHtml = await marked.parse(layerResult);
            } catch (mErr) {
                previewHtml = layerResult;
            }
        }
        if (onChunk) onChunk(previewHtml);

        safeStatus(`✅ Capa ${layerNumber}/4 completada: ${layerName} (${targetProgress}%)`);
        safeLog(`=== [HUMANIZACIÓN GRAMATICAL] CAPA ${layerNumber}/4 COMPLETADA (${targetProgress}%) ===`);

        return layerResult;
    };

    // -------------------------------------------------------------
    // FASE 1: Desinfección Léxica y Morfológica (Progreso -> 25%)
    // -------------------------------------------------------------
    const textLayer1 = await executeLayer(
        GRAMMATICAL_LAYER_1_PROMPT,
        '[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]',
        currentText,
        1,
        'Desinfección Léxica y Morfológica',
        25
    );

    // -------------------------------------------------------------
    // FASE 2: Voz Activa Natural y Coherencia de Sujetos (Progreso -> 50%)
    // -------------------------------------------------------------
    const textLayer2 = await executeLayer(
        GRAMMATICAL_LAYER_2_PROMPT,
        '[PEGAR AQUÍ EL RESULTADO DE LA CAPA 1]',
        textLayer1,
        2,
        'Voz Activa Natural y Coherencia de Sujetos',
        50
    );

    // -------------------------------------------------------------
    // FASE 3: Moldes Oracionales con Coherencia Lógica (Progreso -> 75%)
    // -------------------------------------------------------------
    const textLayer3 = await executeLayer(
        GRAMMATICAL_LAYER_3_PROMPT,
        '[PEGAR AQUÍ EL RESULTADO DE LA CAPA 2]',
        textLayer2,
        3,
        'Moldes Oracionales con Coherencia Lógica',
        75
    );

    // -------------------------------------------------------------
    // FASE 4: Pulido de Puntuación sin Romper el Sentido (Progreso -> 100%)
    // -------------------------------------------------------------
    const textLayer4 = await executeLayer(
        GRAMMATICAL_LAYER_4_PROMPT,
        '[PEGAR AQUÍ EL RESULTADO DE LA CAPA 3]',
        textLayer3,
        4,
        'Pulido de Puntuación sin Romper el Sentido',
        100
    );

    // Conversión final
    let finalHtml = textLayer4;
    if (isHtml) {
        try {
            finalHtml = await marked.parse(textLayer4);
        } catch (mErr) {
            console.warn('[GrammaticalHumanizer] Error al convertir Markdown final a HTML:', mErr);
            finalHtml = textLayer4;
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    safeStatus(`✅ Humanización Gramatical completada con éxito en ${duration}s.`);
    safeLog(`[Humanización Gramatical] Finalizada en ${duration}s.`);

    return {
        html: finalHtml.trim(),
        metadata: {
            durationSeconds: parseFloat(duration),
            humanizerType: 'gramatical',
            phasesCompleted: 4
        }
    };
}
