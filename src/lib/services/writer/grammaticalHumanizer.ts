import TurndownService from 'turndown';
import { marked } from 'marked';
import { executeWithKeyRotation } from './ai-core';
import type { MiniHumanizerParams } from './types';

// =========================================================================
// PROMPTS EXACTOS DE HUMANIZACIÓN GRAMATICAL (ORDEN INVERTIDO + LISTA BLANCA)
// =========================================================================

export const GRAMMATICAL_INVERTED_LAYER_1_PROMPT = `ROL: Eres un redactor sintáctico. Tu tarea es organizar las oraciones del texto siguiendo estas reglas de estructura y sujetos, manteniendo todos los datos técnicos, medidas, modelos, tablas y subtítulos.

REGLAS ESTRICTAS DE ESTRUCTURA ORACIONAL:

1. ALTERNANCIA DE CÓMO EMPIEZAN LAS ORACIONES (PROHIBIDO EMPEZAR TODAS CON "EL / LA / LOS / LAS"):
- La primera oración de cada apartado debe nombrar el modelo o tema claramente.
- Las siguientes oraciones del párrafo NO pueden empezar todas con "El frontal...", "La montura...", "Los cristales...", "Las varillas...". Alterna los inicios así:
  * Arranque directo con verbo en plural o singular (sujeto implícito): "Miden 54 mm de ancho...", "Llevan cristales oscuros...", "Tienen un puente de 16 mm...", "Combinan el color negro con...", "Aguantan el uso de todos los días...".
  * Arranque por ubicación física: "Por dentro llevan...", "En los costados tienen...", "En la parte de arriba...".
  * Arranque condicional o temporal dirigido al lector (4 a 6 veces en el texto): "Si tienes la cara redonda...", "Cuando caminas bajo el sol...", "Al probártelas notas...".

2. HABLA AL LECTOR CON "TE / TU / TUS" EN EL 40% DE LAS FRASES (PROHIBIDO ESCRIBIR LA PALABRA "TÚ"):
- Incluye al lector de forma natural ("te quedan bien", "no te pesan en la cara", "protegen tus ojos", "las puedes usar todo el día", "tu nariz", "tu rostro").
- PROHIBIDO escribir la palabra "tú" ("y tú descubres", "tú llevas").
- PROHIBIDO poner el objeto directo al principio invirtiendo el orden normal (NUNCA escribas cosas raras como "Varios acabados puedes elegir aquí" o "Decenas de fases supervisan los maestros"). Usa siempre orden normal: Verbo + Objeto.

3. COMBINACIÓN NATURAL DE MOLDES EN CADA PÁRRAFO:
- Combina oraciones cortas de 1 sola idea (8 a 13 palabras) con oraciones compuestas largas (22 a 35 palabras) donde unas 2 o 3 ideas relacionadas sobre la misma parte de la gafa usando ",", "porque", "por eso", "pero", "además" o "lo que hace que".
- PROHIBIDO añadir frases cortas al final de un párrafo que repitan lo que ya se dijo antes.
- PROHIBIDO cerrar los párrafos con listas de 3 verbos ("Pesan poco, no dejan marcas y se adaptan...").

FORMATO DE SALIDA:
Devuelve únicamente el texto reestructurado, sin introducciones ni notas.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]`;

export const GRAMMATICAL_INVERTED_LAYER_2_PROMPT = `ROL: Eres un traductor de lenguaje publicitario de IA a español llano, directo y cotidiano. Tu única misión es sustituir todas las palabras y giros de "revista de moda / folleto corporativo" por palabras sencillas y directas, SIN cambiar la estructura ni el orden de las oraciones del texto de entrada.

REGLAS OBLIGATORIAS DE REEMPLAZO LÉXICO (SI VES X -> CÁMBIALO POR Y):

1. PROHIBICIÓN ABSOLUTA DE METÁFORAS Y CLICHÉS DE REVISTA (CÁMBIALOS POR LENGUAJE DIRECTO):
- Prohibido usar giros literarios o de marketing como: "bajo la batuta de", "hacer honor a", "sello de distinción", "abandona la etiqueta de", "adopta un papel protagonista", "modas fugaces", "impronta de pasarela", "son fruto de", "dilatada trayectoria", "alberga en su interior", "brinda", "prescinde de... en favor de", "constituye una opción magnífica", "dota de", "resuelve tu estilismo", "pisada ligera", "consumo consciente", "trabajo meticuloso", "claridad impecable", "equilibrio absoluto".
- Cámbialos siempre por explicaciones simples y físicas:
  * "Bajo la batuta de X nacen..." -> "X diseñaron esta línea con..."
  * "Cada varilla alberga en su interior un alma metálica que brinda flexibilidad" -> "Por dentro de cada patilla llevan una pieza de metal que las hace flexibles y resistentes"
  * "Son fruto del trabajo meticuloso en talleres..." -> "Las hacen con mucho cuidado en talleres de Italia, por eso..."
  * "Constituye una opción magnífica para proyectar una imagen audaz" -> "Es una muy buena opción si quieres un diseño con fuerza que se vea natural"
  * "Prescinde de barnices químicos en favor del volteo" -> "No usan barnices químicos, prefieren pulir las gafas en tambores de madera"

2. LISTA BLANCA DE VERBOS PERMITIDOS (USA VERBOS SIMPLES EN EL 85% DEL TEXTO):
- Sustituye los verbos cultos de IA ("albergar", "brindar", "constituir", "dotar", "prescindir", "sintetizar", "reinterpretar", "reinventar", "trasladar la esencia", "exhibir", "atenuar", "neutralizar", "disipar", "confeccionar", "garantizar", "proporcionar") por verbos físicos cotidianos:
  -> USA: "tener", "llevar", "hacer", "ser", "estar", "quedar", "ir", "ver", "mirar", "dar", "poner", "usar", "mezclar", "combinar", "medir", "pesar", "aguantar", "soportar", "frenar", "quitar", "evitar", "cuidar", "proteger", "adaptarse", "ajustarse".

3. CERO GERUNDIOS Y CERO ADVERBIOS EN "-MENTE":
- Si quedó algún gerundio ("...cuidando cada milímetro", "...alejándose de", "...logrando", "...apoyando"), cámbialo por "y + verbo en presente" ("y cuidan", "y se alejan", "y así logras").
- Si hay adverbios en "-mente" ("rápidamente", "fácilmente", "directamente", "perfectamente"), cámbialos por adjetivos cortos ("rápido", "fácil", "directo", "perfecto", "muy bien").

4. VOCABULARIO ACCESIBLE:
- Cambia palabras rebuscadas por su equivalente común: "varillas" -> alterna con "patillas"; "gesticular" -> "hablar o sonreír"; "trajín diario" -> "uso diario"; "curva craneal" -> "forma de tu cabeza"; "radiación cenital" -> "sol desde arriba"; "achaflanados" -> "cortados en ángulo".

FORMATO DE SALIDA:
Devuelve únicamente el texto con el vocabulario aplanado y natural, respetando todos los datos técnicos, códigos y medidas.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DEL PASO 1]`;

export const GRAMMATICAL_INVERTED_LAYER_3_PROMPT = `ROL: Eres un corrector de puntuación anti-detector. Tienes ESTRICTAMENTE PROHIBIDO cambiar una sola palabra del vocabulario o volver a meter palabras cultas. Solo debes aplicar estos 5 retoques de puntuación y concordancia sobre el texto de entrada:

1. UNIR ORACIONES SEGUIDAS CON COMA (COMMA SPLICE - 8 A 10 VECES EN EL TEXTO):
- Busca entre 8 y 10 lugares donde haya dos oraciones seguidas que hablen del mismo modelo o del mismo detalle y cambia el punto (".") entre ellas por una simple coma (","), poniendo en minúscula la siguiente palabra.
  * Ejemplo: "El calibre mide 57 mm con un puente de 16 mm. Llevan lentes oscuras en gris pizarra que frenan el sol." -> "El calibre mide 57 mm con un puente de 16 mm, llevan lentes oscuras en gris pizarra que frenan el sol."

2. QUITAR LA COMA TRAS "SI...", "CUANDO..." O "AL..." AL INICIO DE ORACIÓN:
- En todas las oraciones que empiecen con "Si...", "Cuando..." o "Al..." cuya primera parte tenga menos de 9 palabras, BORRA la coma intermedia:
  * Ejemplo: "Si tienes la cara redonda este modelo te favorece enseguida."

3. METER "ADEMÁS" Y "AHÍ ES DONDE" DESPUÉS DE COMA (SIN COMA DETRÁS):
- Si aparece "además" a mitad de oración, asegúrate de que vaya precedido de coma o punto y coma y SIN coma después (", además llevan..." / "; además tienen...").
- En 2 lugares donde se describa una parte física (como las patillas o la bisagra), une la explicación con ", ahí es donde..." ("Las patillas son anchas, ahí es donde llevan el logo de Prada").

4. CONCORDANCIA POR SENTIDO MARCA -> PLURAL (3 VECES EN EL TEXTO):
- En 3 oraciones donde el sujeto inicial sea "Prada", "La marca" o "La firma" en singular, asegúrate de que el verbo de la siguiente cláusula (tras una coma) esté en 3.ª persona plural:
  * Ejemplo: "Prada cuida mucho el acabado de estas gafas, usan acetato grueso hecho con algodón."

5. REVISIÓN DE SEGURIDAD:
- Verifica que NO haya ningún espacio en blanco antes de punto y coma (escribe "; " y no " ; ").
- Verifica que NO aparezca la palabra "tú" escrita en ninguna parte.

FORMATO DE SALIDA:
Devuelve únicamente el texto final listo para publicar.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DEL PASO 2]`;

// Aliases para retrocompatibilidad
export const GRAMMATICAL_LAYER_1_PROMPT = GRAMMATICAL_INVERTED_LAYER_1_PROMPT;
export const GRAMMATICAL_LAYER_2_PROMPT = GRAMMATICAL_INVERTED_LAYER_2_PROMPT;
export const GRAMMATICAL_LAYER_3_PROMPT = GRAMMATICAL_INVERTED_LAYER_3_PROMPT;

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
    safeStatus('Iniciando Humanización Gramatical (3 fases: Orden Invertido + Lista Blanca)...');
    safeLog(`[Humanización Gramatical Invertida] Iniciando proceso sobre texto completo (${content.length} caracteres) con modelo ${modelName}...`);

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
        safeStatus(`Paso ${layerNumber}/3: ${layerName}...`);
        safeLog(`=== [HUMANIZACIÓN GRAMATICAL INVERTIDA] EJECUTANDO PASO ${layerNumber}/3: ${layerName} ===`);

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

        safeStatus(`✅ Paso ${layerNumber}/3 completado: ${layerName} (${targetProgress}%)`);
        safeLog(`=== [HUMANIZACIÓN GRAMATICAL INVERTIDA] PASO ${layerNumber}/3 COMPLETADO (${targetProgress}%) ===`);

        return layerResult;
    };

    // -------------------------------------------------------------
    // PASO 1: Estructurador de Oraciones y Sujetos (Progreso -> 33%)
    // -------------------------------------------------------------
    const textLayer1 = await executeLayer(
        GRAMMATICAL_INVERTED_LAYER_1_PROMPT,
        '[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]',
        currentText,
        1,
        'Estructurador de Oraciones y Sujetos',
        33
    );

    // -------------------------------------------------------------
    // PASO 2: Aplanador Radical de Vocabulario - Lista Blanca (Progreso -> 66%)
    // -------------------------------------------------------------
    const textLayer2 = await executeLayer(
        GRAMMATICAL_INVERTED_LAYER_2_PROMPT,
        '[PEGAR AQUÍ EL RESULTADO DEL PASO 1]',
        textLayer1,
        2,
        'Aplanador Radical de Vocabulario (Lista Blanca de Verbos)',
        66
    );

    // -------------------------------------------------------------
    // PASO 3: Costura de Puntuación y Asimetría Humana (Progreso -> 100%)
    // -------------------------------------------------------------
    const textLayer3 = await executeLayer(
        GRAMMATICAL_INVERTED_LAYER_3_PROMPT,
        '[PEGAR AQUÍ EL RESULTADO DEL PASO 2]',
        textLayer2,
        3,
        'Costura de Puntuación y Asimetría Humana (Anti-Detector)',
        100
    );

    // Conversión final
    let finalHtml = textLayer3;
    if (isHtml) {
        try {
            finalHtml = await marked.parse(textLayer3);
        } catch (mErr) {
            console.warn('[GrammaticalHumanizer] Error al convertir Markdown final a HTML:', mErr);
            finalHtml = textLayer3;
        }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    safeStatus(`✅ Humanización Gramatical Invertida completada con éxito en ${duration}s.`);
    safeLog(`[Humanización Gramatical Invertida] Finalizada en ${duration}s.`);

    return {
        html: finalHtml.trim(),
        metadata: {
            durationSeconds: parseFloat(duration),
            humanizerType: 'gramatical-invertida',
            phasesCompleted: 3
        }
    };
}
