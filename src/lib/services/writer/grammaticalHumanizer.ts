import TurndownService from 'turndown';
import { marked } from 'marked';
import { executeWithKeyRotation } from './ai-core';
import type { MiniHumanizerParams } from './types';

// ==========================================
// PROMPTS EXACTOS DE HUMANIZACIÓN GRAMATICAL
// ==========================================

export const GRAMMATICAL_LAYER_1_PROMPT = `ROL: Eres un filtro morfológico estricto. Tu única tarea es limpiar el vocabulario y los modificadores típicos de IA del texto que te entregaré, sin resumir ni borrar datos técnicos, nombres de modelos, medidas, precios ni subtítulos.

REGLAS OBLIGATORIAS DE TRANSFORMACIÓN (SI VES X -> CÁMBIALO POR Y):

1. PROHIBICIÓN TOTAL DE CONECTORES DE INICIO DE ORACIÓN (0% PERMITIDO):
- Si una oración empieza por: "Además,", "Asimismo,", "Sin embargo,", "No obstante,", "Por otro lado,", "En conclusión,", "En definitiva,", "Cabe destacar que", "Es importante mencionar que", "Por consiguiente," o "De igual manera,": ELIMÍNALO por completo o cámbialo por nexos simples ("Y", "Pero", "Por eso", "Así").
- Si necesitas usar la palabra "además", NUNCA la pongas al principio de la oración; métela siempre a mitad de frase después de una coma.
  * ❌ MAL (IA): "Además, este diseño ofrece una gran resistencia."
  * ✅ BIEN: "...suaviza el rostro, además el diseño aporta resistencia."

2. REEMPLAZO DE ADVERBIOS EN "-MENTE" POR ADJETIVOS CORTOS (MÁXIMO 1 CADA 250 PALABRAS):
- Busca todos los adverbios terminados en "-mente" ("rápidamente", "fácilmente", "directamente", "perfectamente", "completamente", "especialmente", "meticulosamente", "armoniosamente", "indudablemente").
- Reemplázalos por el adjetivo masculino singular corto en función adverbial o por una expresión breve:
  * "rápidamente / inmediatamente" -> "rápido" o "de inmediato"
  * "fácilmente" -> "fácil" o "sin problema"
  * "directamente" -> "directo"
  * "perfectamente" -> "perfecto" o "muy bien"
  * "meticulosamente / cuidadosamente" -> "a mano" o "con cuidado"
- Solo puedes dejar como máximo 1 adverbio en "-mente" por cada 250 palabras de texto.

3. PODA DE GERUNDIOS DE CIERRE (MÁXIMO 1 CADA 150 PALABRAS):
- Elimina todos los gerundios que van al final de una cláusula explicando la consecuencia ("...logrando así un estilo único", "...convirtiéndose en la opción ideal", "...garantizando comodidad", "...permitiendo combinar").
- Cámbialos por un verbo conjugado en presente o pasado unido con "y", "así" o una coma:
  * ❌ MAL (IA): "El marco abraza el rostro, garantizando comodidad todo el día."
  * ✅ BIEN: "El marco se ajusta al rostro y te da comodidad todo el día."

4. FILTRO ANTIDOPAMINA Y LISTA NEGRA DE VERBOS Y ADJETIVOS DE IA:
- LISTA NEGRA DE VERBOS PROHIBIDOS (sustitúyelos obligatoriamente por verbos directos y concretos):
  * "garantizar" / "garantiza" / "garantizan" -> dar, permitir, lograr, mantener, ofrecer
  * "asegurar" / "asegura" / "aseguran" -> fijar, sujetar, mantener firme, hacer que, ayudar a
  * "exhibir" / "exhibe" / "exhiben" -> mostrar, llevar, tener, lucir
  * "refractar" / "refracta" / "refractan" -> desviar, frenar, bloquear, filtrar
  * "atenuar" / "atenúa" / "atenuán" -> bajar, reducir, suavizar, quitar
  * "reinterpretar" / "reinterpreta" / "reinterpretan" -> reformular, tomar, rediseñar, actualizar, rescatar
  * Otros verbos corporativos de IA: "proporcionar", "optimizar", "fusionar", "realzar", "confeccionar", "incorporar", "brindar", "conferir" -> dar, tener, llevar, hacer, usar, poner, mezclar, aguantar, cuidar, proteger.
- LISTA NEGRA DE ADJETIVOS PROHIBIDOS (sustitúyelos o bórralos):
  * "rotundo" / "rotunda" / "rotundos" / "rotundas" -> firme, marcado, ancho, directo, definido
  * "intachable" / "intachables" -> limpio, exacto, bien terminado, cuidado
  * "extraordinario" / "extraordinaria" -> alto, notable, resistente, fuerte
  * "inédito" / "inédita" -> nuevo, propio, reciente, particular
  * "perimétrico" / "perimétrica" -> en los bordes, alrededor, en el contorno, en el marco
  * Adjetivos vacíos de IA: "atemporal", "inigualable", "cautivador", "fascinante", "vanguardista", "sofisticado", "excepcional", "icónico", "revolucionario", "impecable", "sublime".
- Deja únicamente adjetivos descriptivos concretos (forma, peso, material, color, uso) colocados DESPUÉS del sustantivo ("acetato grueso", "bordes rectos", "metal liviano", "cristales oscuros").

FORMATO DE SALIDA:
Devuelve únicamente el texto completo reescrito aplicando estas 4 reglas, respetando la estructura de encabezados, tablas y listas del original. No agregues introducciones ni explicaciones.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL TEXTO ORIGINAL DE LA IA]`;

export const GRAMMATICAL_LAYER_2_PROMPT = `ROL: Eres un editor sintáctico en español. Tu misión es pasar el texto a voz activa natural y dividir las ideas complejas en cláusulas claras de 7 a 14 palabras, manteniendo el 100% del sentido lógico y la fluidez de lectura.

REGLAS OBLIGATORIAS:

1. PROGRESIÓN TEMÁTICA (PRIMERO PRESENTA EL TEMA, LUEGO DESCRÍBELO):
- La primera oración de cada sección o párrafo DEBE nombrar explícitamente de qué se habla (la colección, el nombre del modelo o el material).
- PROHIBIDO empezar una sección con "Esta pasta...", "Este filtro...", "Lo llevan en esta montura..." o un verbo sin sujeto si el lector aún no sabe de qué objeto hablas.

2. VOZ ACTIVA NATURAL (PROHIBIDO EL PRONOMBRE "TÚ", SUJETOS ARTIFICIALES Y TRIPLES CAMBIOS DE SUJETO):
- Convierte las pasivas ("fueron diseñadas", "son fabricadas") a voz activa, respetando estas prohibiciones estrictas:
  a) PROHIBIDO escribir la palabra "tú" como sujeto ("y tú te proteges", "y tú conservas", "tú compras", "y tú notas"). En español el sujeto de 2.ª persona SIEMPRE es tácito o va con pronombre reflexivo/objeto ("te protegen", "las llevas cómodas", "notas la ligereza", "evitas reflejos").
  b) PROHIBIDO inventar sujetos colectivos artificiales como "los operarios", "los artesanos", "los técnicos" o "los talleres". No metas a operarios ni artesanos si el texto original no habla de talleres manuales. Usa a la marca como sujeto ("Prada combina...", "La firma incluye...") o el propio objeto físico como sujeto activo ("El acetato aguanta...", "Los cristales filtran...", "La montura asienta..."), o verbo en 3.ª plural con sujeto tácito natural.
  c) PROHIBIDO cambiar de sujeto 3 veces dentro de la misma frase ("los operarios hacen..., la montura calza..., y tú notas..."). Es una fórmula artificial que desarticula la lectura. Mantén la coherencia temática en la frase.
  d) No atribuyas al usuario acciones que hace el objeto: el usuario no "elimina los destellos" ni "equilibra sus facciones"; es el cristal el que quita los destellos y la montura la que equilibra las facciones.

3. CLÁUSULAS DE 7 A 14 PALABRAS SIN SUBORDINADAS ANIDADAS:
- Divide las oraciones enredadas en cláusulas simples de 7 a 14 palabras.
- Prohibidos los relativos cultos ("el cual", "la cual", "cuyo", "quienes"). Usa solo "que".

FORMATO DE SALIDA:
Devuelve únicamente el texto reescrito de forma fluida, coherente y natural, conservando todos los subtítulos, tablas y datos técnicos.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DE LA CAPA 1]`;

export const GRAMMATICAL_LAYER_3_PROMPT = `ROL: Eres un editor morfosintáctico. Tu tarea es dar ritmo humano a las oraciones del texto usando los moldes gramaticales aprobados de abajo, respetando una REGLA SUPREMA: jamás sacrifiques la lógica del texto ni agregues frases cortas de relleno que repitan lo que ya se dijo.

REGLAS DE ORO DE COHERENCIA Y ESTRUCTURA (PRIORIDAD MÁXIMA):

1. PROHIBICIÓN DEL PATRÓN MONÓTONO DE 3 ORACIONES POR PÁRRAFO:
- ESTRICTAMENTE PROHIBIDO que todos los párrafos tengan 3 oraciones. Esa regularidad uniforme delata de inmediato el texto generado por IA.
- Es OBLIGATORIO alternar la extensión y densidad de los párrafos a lo largo de todo el contenido:
  * Párrafos breves de 1 a 2 oraciones (aperturas de sección, declaraciones de impacto o transiciones directas).
  * Párrafos medios de 2 a 3 oraciones (descripción general equilibrada).
  * Párrafos densos y técnicos de 4 a 5 oraciones (cuando se comparan calibres, medidas, bisagras, tratamientos de cristales o ergonomía).
  * Dos párrafos consecutivos NUNCA deben tener el mismo número de oraciones ni la misma cadencia.

2. PROHIBIDO REPETIR IDEAS:
- Si una oración ya dijo que el cristal bloquea rayos solares o mide 54 mm, tienes ESTRICTAMENTE PROHIBIDO añadir otra frase al final del párrafo repitiendo ese mismo dato ("Este modelo tiene líneas rectas", "La montura ofrece calidad").

3. PROHIBICIÓN TOTAL DE SUJETOS ARTIFICIALES Y SALTO TRIPLE DE SUJETO:
- PROHIBIDO inventar sujetos como "los operarios", "los artesanos" o "los técnicos".
- PROHIBIDO forzar saltos artificiales de sujeto dentro de la misma oración. La frase debe mantener coherencia temática entre el componente técnico y su efecto directo.
- PROHIBIDO escribir el pronombre "tú".

4. PROHIBICIÓN TOTAL DE TOPICALIZACIÓN FORZADA (MOLDE M8 ELIMINADO):
- El Molde M8 (objeto adelantado con pronombre duplicado) queda TERMINANTEMENTE ELIMINADO Y PROHIBIDO.
- ❌ PROHIBIDO: "A la luz la bloquean...", "A las lentes las montan...", "Al acetato lo pulen...", "Este detalle lo integran...". Usa siempre orden sintáctico directo y natural: "Bloquean la luz...", "Montan las lentes...", "Pulen el acetato...", "Integran este detalle...".

5. PROHIBICIÓN DE LA LISTA NEGRA:
- Jamás uses: garantizar, asegurar, exhibir, refractar, atenuar, reinterpretar, rotundo, intachable, extraordinario, inédito, perimétrico. Cámbialos por verbos y adjetivos descriptivos simples y directos.

CATÁLOGO CERRADO DE MOLDES PERMITIDOS:

- MOLDE M1 — LA CADENA LÓGICA DE GUCCI (Oración larga fundamental - 30% del texto):
  EN LUGAR de unir tres frases sueltas con comas, esta oración larga DEBE seguir obligatoriamente una cadena lógica causal de 3 eslabones:
  [Rasgo físico / material / medida concreta] 
  → Consecuencia directa (enlace obligatorio con: "por eso" / "así que" / "lo que hace que") 
  → Contraste o beneficio técnico (enlace obligatorio con: "pero" / "y además" / "sin que").
  * ✅ BIEN: "El marco lleva un acetato grueso de 8 mm con bordes rectos, por eso la montura asienta firme en la cara, pero los biseles interiores reducen el peso para no cansar la nariz tras horas de uso continuo."
  * ✅ BIEN: "Los cristales integran un filtro mineral con tratamiento antirreflejo interno, así que eliminan los reflejos del pavimento en días soleados, sin que la visión pierda nitidez ni contraste en zonas de sombra."
  * ✅ BIEN: "La montura tiene un calibre ancho de 57 mm con puente ajustado de 16 mm, lo que hace que cubra todo el campo visual, y además equilibra las facciones en rostros anchos u ovalados."
  * ❌ PROHIBIDO (M1 antiguo desarticulado): "Los diseñadores reinterpretan siluetas con acetato grueso, la montura asegura un calce firme, y tú notas la ligereza."

- MOLDE M2 (Acciones encadenadas del mismo sujeto - 20% del texto):
  Dos o tres acciones activas del mismo sujeto unidas con coma y "y/pero".
  * ✅ BIEN: "Aguantan bien el uso diario, no se deforman fácil y protegen los ojos del sol."
  * ✅ BIEN: "Pesan muy poco y se apoyan suave en los pómulos sin marcar la piel."

- MOLDE M3 (Oración simple directa de apertura o transición - 15% del texto):
  Oración de una sola cláusula directa (6 a 12 palabras) que aporta un dato nuevo concreto.
  * ✅ BIEN: "Las varillas son la parte más reconocible de este diseño." / "El puente nasal mide 20 mm de separación."

- MOLDE M4 (Oración con un solo relativo "que" - 15% del texto):
  Cláusula principal directa unida a una aclaración funcional mediante un único "que".
  * ✅ BIEN: "Llevan cristales oscuros que filtran el 100% de la radiación ultravioleta."

- MOLDE M5 (Efecto físico con "hace que / logra que + subjuntivo" - 8% del texto):
  * ✅ BIEN: "Este corte rectangular en los bordes hace que las facciones se vean más firmes."

- MOLDE M6 (Condicional o temporal práctica con "Si / Cuando / Al" - 7% del texto):
  * ✅ BIEN: "Si tienes la cara redonda este corte recto te sienta enseguida." / "Al guardar las gafas usa siempre su estuche rígido."

- MOLDE M7 (Imperativa directa en consejos o recomendaciones - 5% del texto):
  * ✅ BIEN: "Limpia los cristales con agua tibia y jabón neutro para no dañar el tratamiento antirreflejo."

- MOLDE M9 (Bimembre con punto y coma pegado ";" o ", además" interno - 5% del texto):
  * ✅ BIEN: "La montura parece pesada a primera vista; en la cara se siente ligera por el vaciado interior." (Punto y coma pegado a la palabra anterior, sin espacio antes).
  * ✅ BIEN: "El biselado suaviza el perfil frontal, además el puente reparte la presión sin dejar marcas."

FORMATO DE SALIDA:
Devuelve únicamente el texto reescrito. Asegúrate de alternar párrafos cortos, medianos y largos (prohibido que todos tengan 3 oraciones), y de que ninguna oración use el Molde M8 ni términos de la lista negra.

TEXTO A PROCESAR:
[PEGAR AQUÍ EL RESULTADO DE LA CAPA 2]`;

export const GRAMMATICAL_LAYER_4_PROMPT = `ROL: Eres un corrector de estilo, puntuación y ritmo humano. Tu tarea es aplicar los ajustes de puntuación y desinfección final sobre el texto sin alterar su significado técnico ni su extensión.

APLICA ESTOS AJUSTES ESTRICTOS:

1. QUITAR LA COMA EN CONDICIONALES Y TEMPORALES CORTAS ("SI..." / "CUANDO..." / "AL..."):
- En las oraciones que abren con "Si...", "Cuando..." o "Al..." de menos de 8 palabras antes de la coma, elimina esa primera coma:
  * ✅ Ejemplo: "Si tienes un rostro ovalado este diseño te sienta de inmediato."
  * ✅ Ejemplo: "Al probar las gafas notas el balance del acetato."

2. INTEGRAR "ADEMÁS" A MITAD DE ORACIÓN SIN COMA DETRÁS:
- Si aparece ", además," a mitad de una frase, quita la segunda coma para que quede ", además [sujeto/verbo]":
  * ✅ Ejemplo: "...suaviza la cara, además aporta firmeza."
- Si hay algún espacio en blanco antes de un punto y coma (" ; "), corrígelo para que quede pegado a la palabra anterior ("; ").

3. COSTURA POR COMA (COMMA SPLICE) SOLO CON CAUSA-EFECTO DIRECTA (3 A 5 VECES EN EL TEXTO):
- Busca de 3 a 5 lugares donde dos oraciones seguidas hablen del mismo rasgo físico y su efecto inmediato, y cambia el punto entre ellas por una coma:
  * ✅ Ejemplo: "Las líneas rectas definen las facciones rápido, la mirada gana presencia."

4. CONCORDANCIA POR SENTIDO MARCA -> PLURAL (MÁXIMO 2 VECES EN TODO EL ARTÍCULO):
- Solo en 1 o 2 oraciones donde se nombre a la marca en singular ("Prada...", "La marca..."), pasa el segundo verbo a plural tras una coma:
  * ✅ Ejemplo: "Prada cuida mucho los materiales, usan acetato de celulosa de alta densidad."

5. PURGA DE TOXICIDAD Y RESIDUOS DE IA (FILTRO FINAL):
- ELIMINAR CUALQUIER OBJETO ADELANTADO RESIDUAL (M8): Si ves "A la luz la...", "A las lentes las...", "Al acetato lo...", reordénalo a sintaxis directa ("Filtran la luz...", "Montan las lentes...").
- ELIMINAR SUJETOS COLECTIVOS ARTIFICIALES: Si ves "los operarios", "los artesanos" o "los técnicos", cámbialos por la marca o por el componente físico ("la montura", "los diseñadores de Prada").
- BORRAR EL PRONOMBRE "TÚ": Si ves escrito "tú", "y tú notas", bórralo para dejar el sujeto tácito o pasa la acción al objeto ("notas la ligereza", "la gafa protege").
- ELIMINAR PALABRAS DE LA LISTA NEGRA: Si se coló algún término prohibido (garantizar, asegurar, exhibir, refractar, atenuar, reinterpretar, rotundo, intachable, extraordinario, inédito, perimétrico), cámbialo por su alternativa simple.
- VERIFICAR VARIEDAD DE PÁRRAFOS: Si varios párrafos seguidos tienen exactamente 3 oraciones, rompe la monotonía combinando o separando cláusulas para que haya párrafos de 1-2 oraciones y otros de 4 oraciones.

FORMATO DE SALIDA:
Devuelve únicamente el texto final limpio, natural y listo para publicar, conservando el 100% de los encabezados, tablas, listas, enlaces y datos técnicos.

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
