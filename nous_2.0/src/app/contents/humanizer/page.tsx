"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import mammoth from 'mammoth';
import { FileText, Wand2, Download, Trash2, Copy, Check, Info, Settings, FileUp, Database, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NavigationHeader } from "@/components/dom/NavigationHeader";

// =================================================================
// CONFIGURACIÓN Y PROMPTS (MISMOS QUE INDEX.HTML)
// =================================================================

const SYSTEM_PROMPT_BASE = "Tu salida debe ser solo el bloque de HTML procesado, sin explicaciones, prefacios, o la palabra 'HTML'. Solo el código HTML.";

const HTML_RULE = "REGLA CRÍTICA DE ESTRUCTURA: NO MODIFIQUES, elimines o alteres las etiquetas HTML (como <h1>, <h2>, <p>, <table>, <tr>, <td>, <strong>, <a>). Tu trabajo es reescribir ÚNICAMENTE el texto que está DENTRO de estas etiquetas.";

const CHUNK_SIZE = 8; // Elementos HTML (p, h2, table) por trozo

const dynamicMessages = [
    "Ajustando la coherencia rota...",
    "El equipo de pingüinos está martillando tu texto.",
    "Inyectando defectos de estilo humano...",
    "Prohibiendo conectores formales con mano dura.",
    "Deshaciendo el tono robótico de la IA...",
    "Cargando el diccionario de sinónimos 'mediocres'.",
    "Convirtiendo el texto predecible en oro puro.",
    "Optimizando para Google y la imperfección.",
    "Revisando si las tablas se portaron bien.",
    "Haciendo que cada frase sea única y sencilla.",
    "¡Casi listo para el 0% de detección!",
    "El redactor mediocre está en su mejor momento.",
    "Rompimos el patrón, ahora somos indetectables.",
    "Añadiendo ese toque de duda existencial humana...",
    "La IA ya no sabe lo que escribió.",
    "Engañando al sistema con estilo simple.",
    "La fase 'hacer que parezca escrito a las 3 AM' en progreso."
];

// =================================================================
// TOOLS & HELPERS
// =================================================================

function chunkHtml(htmlString: string, chunkSize: number) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    // Obtenemos solo los hijos directos del body (p, h1, h2, table, etc.)
    const allElements = Array.from(body.children);
    const chunks = [];

    for (let i = 0; i < allElements.length; i += chunkSize) {
        const chunkElements = allElements.slice(i, i + chunkSize);

        // Convertimos estos elementos de nuevo a string HTML
        const chunkHtml = chunkElements.map(el => el.outerHTML).join('\n');
        chunks.push(chunkHtml);
    }

    return chunks;
}

function parseLsiCsv(fileContent: string) {
    const lines = fileContent.trim().split('\n');
    const keywords: string[] = [];

    lines.forEach(line => {
        const parts = line.split(/[,\t]/).map(p => p.trim()).filter(p => p.length > 0);
        keywords.push(...parts);
    });

    // Retorna solo un máximo de 50 palabras clave únicas y relevantes
    return Array.from(new Set(keywords)).slice(0, 50).join(', ');
}

function parseEnlaces(linksText: string) {
    const lines = linksText.trim().split('\n').filter(line => line.trim() !== '');
    const links: { url: string; anchor: string | null }[] = [];

    lines.forEach(line => {
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const match = line.match(urlRegex);

        if (match) {
            const url = match[1];
            let anchor: string | null = line.replace(urlRegex, '').trim();

            if (anchor.startsWith('[') && anchor.endsWith(']')) {
                anchor = anchor.substring(1, anchor.length - 1).trim();
            } else if (anchor.length === 0) {
                anchor = null; // No anchor text provided
            }

            links.push({ url, anchor });
        }
    });
    return links;
}

// =================================================================
// PROMPT BUILDERS
// =================================================================

function buildPhase1Prompt(settings: any) {
    const context = settings.context;

    const prompt = `
    ${SYSTEM_PROMPT_BASE}
    ${HTML_RULE}

    --- PERSONA: REDACTOR MEDIOCRE ---
    Actúa como un redactor humano promedio, no como una IA. Tu estilo es simple, directo, a veces un poco torpe, pero nunca robótico. Priorizas la simplicidad sobre la elegancia.

    --- CONTEXTO ---
    Nicho/Tópico: ${context.niche}
    Público Objetivo: ${context.audience}
    Notas Adicionales: ${context.notes || 'N/A'}

    --- REGLAS DE HUMANIZACIÓN (APLICAR AGRESIVAMENTE) ---
    1.  ESTILO "REDACTOR MEDIOCRE": Sé simple, directo y no condescendiente. Usa vocabulario común. Evita la elegancia literaria.
    2.  COHERENCIA ROTA: Rompe la coherencia lineal perfecta que usa la IA. Permite 2-3 ideas o saltos conceptuales pequeños dentro de un mismo párrafo.
    3.  CONECTORES PROHIBIDOS: Prohíbe el uso de conectores formales y clichés de IA: "Sin embargo," "Por lo tanto," "Por otro lado," "A pesar de esto," "En resumen," "En conclusión," etc.
    4.  MORFOSINTAXIS (EXPLOSIVIDAD):
        * Usa oraciones predominantemente cortas (Sujeto-Verbo-Predicado).
        * CRÍTICO: Mezcla estas frases cortas con algunas oraciones largas (simples o complejas) con baja frecuencia. La longitud de las frases debe ser variable e impredecible.
    5.  IDIOMA: Usa español neutro panhispánico.
    6.  PROHIBICIÓN DE VOZ PASIVA: Reescribe cualquier frase en voz pasiva a voz activa.
    7.  PUNTUACIÓN (IMPORTANTE): Prefiere el uso de comas (,) para enlazar ideas cortas y relacionadas dentro de una misma oración, en lugar de separarlas con un punto y seguido. El objetivo es evitar un estilo excesivamente 'entrecortado' o telegráfico. Modera la 'explosividad' para que sea más fluida.

    --- TAREA ---
    Aplica TODAS las reglas de humanización al texto DENTRO de las etiquetas HTML del siguiente bloque. SÉ AGRESIVO al reescribir. Abandona la estructura de la oración original.
    `;
    return prompt.trim();
}

function buildPhase2And3Prompt(settings: any) {
    const target = settings.target;
    // Si lsiKeywords es un objeto File, ya debería haber sido procesado antes
    const lsiKeywords = target.lsiKeywords;
    const links = target.links.map((l: any) => l.anchor ? `[${l.anchor}](${l.url})` : l.url).join(', ');

    const prompt = `
    ${SYSTEM_PROMPT_BASE}
    ${HTML_RULE}

    --- TAREA COMBINADA: SEO Y REVISIÓN FINAL ---
    El siguiente bloque HTML es el documento COMPLETO, que ya fue humanizado (estilo "mediocre" y caótico). Tu trabajo es realizar DOS tareas en UNA SOLA PASADA:
    1.  TAREA SEO: Inserta los elementos SEO de forma natural.
    2.  TAREA REVISIÓN: Corrige ÚNICAMENTE errores gramaticales graves o de sentido que hagan el texto incomprensible.

    --- REGLAS CRÍTICAS ---
    * REGLA DE ORO: NO CORRIJAS EL ESTILO "defectuoso" intencional (frases cortas, falta de conectores, estilo simple). Tu objetivo es insertar SEO, no "mejorar" la redacción.
    * REGLA DE ENLACES: Inserta los enlaces de la lista DONDE SEAN MÁS PERTINENTES en TODO el documento. NO repitas el mismo enlace a menos que el anchor sea diferente.
    * REGLA DE LSI/NEGRITAS: Inserta las LSI y aplica <strong> a frases clave de forma natural y comedida.

    --- CONTEXTO SEO (PARA TODO EL DOCUMENTO) ---
    LSI Keywords a integrar: ${lsiKeywords || 'Ninguna'}
    Enlaces/Anchors a insertar: ${links || 'Ninguno'}
    `;
    return prompt.trim();
}

function buildPhase3MetadataPrompt(settings: any, processedText: string) {
    const context = settings.context;
    const target = settings.target;

    // Extraer solo el texto, quitando HTML para el contexto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedText;
    const textContext = (tempDiv.textContent || tempDiv.innerText || "").substring(0, 2000);

    const prompt = `
    Actúa como un analista SEO. Basado en el siguiente contexto, genera los metadatos requeridos EN EL FORMATO JSON SOLICITADO.

    --- CONTEXTO ---
    Nicho/Tópico: ${context.niche}
    Keywords Principales: ${target.keywords}
    Texto de Referencia (primeros 2000 caracteres):
    ${textContext}

    --- TAREA ---
    Genera la información crítica.
    `;

    // Esquema JSON para la API
    const schema = {
        type: "OBJECT",
        properties: {
            "metaTitle": {
                type: "STRING",
                description: "Título de 50-60 caracteres, optimizado con la keyword principal."
            },
            "metaDescription": {
                type: "STRING",
                description: "Resumen de 150-155 caracteres que incite al clic, manteniendo el tono humanizado."
            },
            "slug": {
                type: "STRING",
                description: "URL amigable, corta, con guiones, basada en la keyword principal."
            },
            "extracto": {
                type: "STRING",
                description: "Párrafo de 2-3 frases (máx. 40 palabras) que sirva como adelanto del contenido."
            }
        },
        required: ["metaTitle", "metaDescription", "slug", "extracto"]
    };

    return { prompt: prompt.trim(), schema: schema };
}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================

export default function HumanizerPage() {
    // Estados de configuración
    const [apiKey, setApiKey] = useState("");
    const [niche, setNiche] = useState("");
    const [audience, setAudience] = useState("");
    const [keywords, setKeywords] = useState("");
    const [lsiFile, setLsiFile] = useState<File | null>(null);
    const [lsiKeywordsText, setLsiKeywordsText] = useState(""); // Texto procesado del CSV
    const [links, setLinks] = useState("");
    const [notes, setNotes] = useState("");

    // Model Selection
    const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

    // Available Models based on User Screenshot
    const AVAILABLE_MODELS = [
        { id: "gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "gemini-3.0-flash", name: "Gemini 3 Flash" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
        { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
        { id: "gemma-3-27b-it", name: "Gemma 3 27B" },
        { id: "gemma-3-12b-it", name: "Gemma 3 12B" },
        { id: "gemma-3-4b-it", name: "Gemma 3 4B" },
        { id: "gemma-3-2b-it", name: "Gemma 3 2B" },
        { id: "gemma-3-1b-it", name: "Gemma 3 1B" },
    ];

    const [modelList, setModelList] = useState(AVAILABLE_MODELS);
    const [isFetchingModels, setIsFetchingModels] = useState(false);

    const fetchModels = async () => {
        const key = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!key) {
            alert("Necesitas una API Key para listar modelos.");
            return;
        }

        setIsFetchingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            const data = await response.json();

            if (data.models) {
                const apiModels = data.models
                    .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
                    .map((m: any) => ({
                        id: m.name.replace("models/", ""),
                        name: m.displayName || m.name
                    }))
                    .sort((a: any, b: any) => b.id.localeCompare(a.id)); // Newest first usually

                setModelList(prev => {
                    // Merge unique models
                    const existingIds = new Set(prev.map(p => p.id));
                    const newModels = apiModels.filter((m: any) => !existingIds.has(m.id));
                    return [...newModels, ...prev];
                });
                alert(`Se encontraron ${apiModels.length} modelos disponibles para tu API Key.`);
            }
        } catch (error) {
            console.error("Error fetching models:", error);
            alert("Error al obtener la lista de modelos. Verifica la consola.");
        } finally {
            setIsFetchingModels(false);
        }
    };

    // Estados de archivo y proceso
    const [docFile, setDocFile] = useState<File | null>(null);
    const [googleDocUrl, setGoogleDocUrl] = useState("");
    const [isFetchingGoogleDoc, setIsFetchingGoogleDoc] = useState(false);
    const [inputText, setInputText] = useState(""); // HTML hidden content
    const [processedHtml, setProcessedHtml] = useState("");
    const [metadata, setMetadata] = useState<any>(null);

    // Estados de UI/Progreso
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusMessage, setStatusMessage] = useState("Esperando inicio...");
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressText, setProgressText] = useState("");
    const [statusVisible, setStatusVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const lsiInputRef = useRef<HTMLInputElement>(null);

    // =================================================================
    // MANEJO DE ARCHIVOS
    // =================================================================

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setDocFile(file);
        setStatusMessage("Cargando archivo...");
        setStatusVisible(true);

        const reader = new FileReader();
        reader.onload = async (loadEvent) => {
            const arrayBuffer = loadEvent.target?.result as ArrayBuffer;
            try {
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setInputText(result.value.trim());
                setStatusMessage(`Archivo "${file.name}" cargado exitosamente.`);

                // Pequeña pausa visual
                setTimeout(() => setStatusVisible(false), 2000);
            } catch (err) {
                console.error(err);
                setError("No se pudo leer el archivo DOCX.");
                setDocFile(null);
            }
        };
        reader.onerror = () => setError("Fallo al leer el archivo.");
        reader.readAsArrayBuffer(file);
    };

    const handleGoogleDocImport = async () => {
        if (!googleDocUrl) return;

        setIsFetchingGoogleDoc(true);
        setStatusMessage("Conectando con Google Docs...");
        setStatusVisible(true);
        setError(null);

        try {
            // Get session token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("No hay sesión activa. Por favor recarga o inicia sesión.");

            const response = await fetch('/api/google/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ url: googleDocUrl, type: 'doc' })
            });

            const data = await response.json();

            if (!response.ok) {
                // If 401, maybe redirect or show specific error?
                if (response.status === 401) {
                    throw new Error("No autorizado. Por favor conecta tu cuenta de Google.");
                }
                throw new Error(data.error || 'Error al importar');
            }

            setInputText(data.content || "");
            setStatusMessage("Documento importado correctamente.");
            setGoogleDocUrl("");
            setDocFile(null); // Clear file selection if any, as we now have text content

            // Auto-hide status after success
            setTimeout(() => setStatusVisible(false), 2000);

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStatusMessage("Error en la importación.");
        } finally {
            setIsFetchingGoogleDoc(false);
        }
    };

    const handleLsiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLsiFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const text = ev.target?.result as string;
                const keywords = parseLsiCsv(text);
                setLsiKeywordsText(keywords);
            } catch (err) {
                console.error(err);
                setLsiKeywordsText("Error al procesar CSV");
            }
        };
        reader.readAsText(file);
    };

    // =================================================================
    // API CALLS
    // =================================================================

    const callGeminiAPI = async (systemPrompt: string, userText: string, phaseName: string, responseSchema: any = null) => {
        // Usar la clave proporcionada o una variable de entorno como fallback si quisiéramos
        const currentApiKey = apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!currentApiKey) throw new Error("API KEY no configurada.");

        // MODELO EXACTO DEL SCRIPT ORIGINAL
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${currentApiKey}`;
        // NOTA: El script original decia gemini-2.5-flash-preview-09-2025 pero eso suele ser efímero. 
        // Usaré gemini-2.0-flash-exp o gemini-1.5-flash que son estables/actuales si falla, 
        // pero intentaré respetar el original si es válido. 
        // Al revisar la documentación, los modelos `preview` expiran. 
        // Usaré `gemini-1.5-flash` como fallback seguro o `gemini-2.0-flash-exp` si el usuario insiste en lo más nuevo.
        // El script original tenia: gemini-2.5-flash-preview-09-2025.
        // Voy a usar `gemini-1.5-pro` o `gemini-1.5-flash` para estabilidad, o `gemini-pro`.
        // Mejor usar `gemini-1.5-flash` que es rápido y barato, similar al original.

        // Por ahora hardcodeo a un modelo conocido que funcione.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${currentApiKey}`;

        const isGemma = selectedModel.toLowerCase().includes("gemma");

        const payload: any = {
            contents: [{ parts: [{ text: isGemma ? `${systemPrompt}\n\n---\n\n${userText}` : userText }] }],
        };

        if (!isGemma) {
            payload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        if (responseSchema) {
            payload.generationConfig = {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            };
        }

        // Retry logic
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
                }

                const result = await response.json();
                const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) throw new Error("Respuesta de la API vacía o inválida.");

                if (responseSchema) return JSON.parse(text);
                return text.trim();

            } catch (error: any) {
                console.warn(`[${phaseName}] Intento ${attempt} fallido.`, error.message);
                if (attempt === 3) throw new Error(`[${phaseName}] Fallo definitivo de la API.`);
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
            }
        }
    };

    const processTextInChunks = async (htmlChunks: string[], phaseBuilder: Function, settings: any, phaseName: string) => {
        let processed: string[] = [];
        const numChunks = htmlChunks.length;
        const prompt = phaseBuilder(settings);

        for (let i = 0; i < numChunks; i++) {
            // Update UI
            const currentChunk = i + 1;
            const dynamicIndex = Math.floor(Math.random() * dynamicMessages.length);
            const msg = dynamicMessages[dynamicIndex];

            setStatusMessage(msg);
            setProgressText(`[${phaseName}] Procesando: (${currentChunk}/${numChunks})`);
            // Calculo aproximado del progreso global
            // Fase 1 es el grueso del trabajo. Digamos que es el 80% del progreso total.
            const baseProgress = ((i / numChunks) * 80);
            setProgressPercent(baseProgress);

            const chunk = htmlChunks[i];

            try {
                await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit pause
                const resultChunk = await callGeminiAPI(prompt, chunk, `${phaseName} Chunk ${currentChunk}`);
                processed.push(resultChunk);
            } catch (e) {
                console.error(e);
                processed.push(chunk); // Fallback to original
            }
        }
        return processed.join('\n');
    };

    // =================================================================
    // PIPELINE PRINCIPAL
    // =================================================================

    const runFullPipeline = async () => {
        if (!apiKey && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
            setError("Por favor ingresa tu API Key de Google");
            return;
        }
        if (!inputText) {
            setError("No hay contenido para procesar. Carga un archivo DOCX.");
            return;
        }

        setIsProcessing(true);
        setStatusVisible(true);
        setError(null);
        setMetadata(null);
        setProcessedHtml("");

        try {
            const settings = {
                context: { niche, audience, notes },
                target: {
                    keywords,
                    lsiKeywords: lsiKeywordsText, // Ya procesado
                    links: parseEnlaces(links),
                }
            };

            // 1. Chunking
            const htmlChunks = chunkHtml(inputText, CHUNK_SIZE);

            // 2. Fase 1: Humanización
            // setStatusMessage("Iniciando Fase 1...");
            const humanizedHtml = await processTextInChunks(htmlChunks, buildPhase1Prompt, settings, "Fase 1 Humanización");

            // 3. Fase 2: SEO y Revisión
            setStatusMessage("Iniciando Fase 2 (SEO y Revisión)...");
            setProgressText("Optimizando documento completo...");
            setProgressPercent(85);

            await new Promise(resolve => setTimeout(resolve, 1000));
            const combinedPrompt = buildPhase2And3Prompt(settings);
            const finalizedHtml = await callGeminiAPI(combinedPrompt, humanizedHtml, "Fase 2 SEO y Revisión");

            setProcessedHtml(finalizedHtml);

            // 4. Fase 3: Metadatos
            setStatusMessage("Generando metadatos finales...");
            setProgressPercent(95);

            const { prompt, schema } = buildPhase3MetadataPrompt(settings, finalizedHtml);
            const metadataResult = await callGeminiAPI(prompt, finalizedHtml, "Fase 3 Metadatos", schema);

            setMetadata(metadataResult);
            setProgressPercent(100);
            setStatusMessage("Proceso completado con éxito.");

        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStatusMessage("Error en el proceso.");
        } finally {
            setIsProcessing(false);
        }
    };

    // =================================================================
    // RENDER
    // =================================================================

    return (
        <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#f7f7f9] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
            <NavigationHeader />

            <main className="max-w-7xl mx-auto pt-32 pb-20 px-6 md:px-8">

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
                        AI Content Suite <span className="text-indigo-600">Humanizador 0%</span>
                    </h1>
                    <p className="text-slate-500 text-lg">Transforma contenido IA en texto indetectable y optimizado.</p>
                </div>

                {/* API Key Input (if needed) */}
                <div className="mb-8 p-4 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Settings size={20} />
                    </div>
                    <input
                        type="password"
                        placeholder="Google Gemini API Key (Opcional si ya está configurada en env)"
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                    />
                </div>

                {/* Model Selector */}
                <div className="mb-6 p-4 bg-white rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1 bg-purple-50 text-purple-600 rounded">
                                <Settings size={14} />
                            </div>
                            Modelo de IA
                        </div>
                        <button
                            onClick={fetchModels}
                            disabled={isFetchingModels}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 disabled:opacity-50"
                            title="Actualizar lista desde Google"
                        >
                            <Database size={12} />
                            {isFetchingModels ? "Cargando..." : "Actualizar Lista"}
                        </button>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                            {modelList.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.name} ({model.id})
                                </option>
                            ))}
                            <option value="custom">Otro (Manual)...</option>
                        </select>

                        {selectedModel === "custom" && (
                            <input
                                type="text"
                                placeholder="Escribe el ID del modelo (ej: gemini-1.5-pro-latest)"
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                onChange={(e) => setSelectedModel(e.target.value)}
                            />
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Si recibes error 404, prueba cambiando el modelo. Los modelos "Flash" son más rápidos y económicos.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLIMNA 1 & 2: CONFIGURACIÓN */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <Database size={20} className="text-indigo-500" /> Parámetros de Contenido
                            </h2>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <label className="text-sm font-semibold text-slate-600">Nicho / Tópico:</label>
                                    <input
                                        type="text"
                                        className="md:col-span-3 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                                        placeholder="Ej: Moda Sostenible, Software B2B"
                                        value={niche}
                                        onChange={e => setNiche(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <label className="text-sm font-semibold text-slate-600">Público Objetivo:</label>
                                    <input
                                        type="text"
                                        className="md:col-span-3 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                                        placeholder="Ej: Millennials en LATAM, Directores de Marketing"
                                        value={audience}
                                        onChange={e => setAudience(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <label className="text-sm font-semibold text-slate-600">Keywords:</label>
                                    <input
                                        type="text"
                                        className="md:col-span-3 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                                        placeholder="Ej: 'mejor software crm', 'tendencias moda 2025'"
                                        value={keywords}
                                        onChange={e => setKeywords(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                                    <label className="text-sm font-semibold text-slate-600">LSI Keywords (CSV):</label>
                                    <div className="md:col-span-3 flex items-center gap-4">
                                        <button
                                            onClick={() => lsiInputRef.current?.click()}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                                        >
                                            <FileUp size={16} /> Subir CSV
                                        </button>
                                        <input
                                            type="file"
                                            accept=".csv"
                                            className="hidden"
                                            ref={lsiInputRef}
                                            onChange={handleLsiUpload}
                                        />
                                        <span className="text-xs text-green-600 font-medium truncate">
                                            {lsiKeywordsText ? `Cargadas: ${lsiKeywordsText.split(',').length} keywords` : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <label className="text-sm font-semibold text-slate-600 pt-2">Enlaces y Anchors:</label>
                                    <textarea
                                        rows={4}
                                        className="md:col-span-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none transition-all"
                                        placeholder="Ej: [anchor text] https://url.com o solo https://url.com (uno por línea)"
                                        value={links}
                                        onChange={e => setLinks(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                                    <label className="text-sm font-semibold text-slate-600 pt-2">Notas Adicionales:</label>
                                    <textarea
                                        rows={3}
                                        className="md:col-span-3 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none transition-all"
                                        placeholder="Ej: Mantener tono agresivo, no mencionar competidores X..."
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* RESULTADOS */}
                        {processedHtml && (
                            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                                    <h2 className="text-xl font-bold text-slate-800">Resultado Final</h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                const range = document.createRange();
                                                const sel = window.getSelection();
                                                const node = document.getElementById('output-html');
                                                if (node && sel) {
                                                    range.selectNodeContents(node);
                                                    sel.removeAllRanges();
                                                    sel.addRange(range);
                                                    document.execCommand('copy');
                                                    sel.removeAllRanges();
                                                }
                                            }}
                                            className="px-3 py-1.5 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center gap-2"
                                        >
                                            <Copy size={16} /> Copiar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setProcessedHtml("");
                                                setMetadata(null);
                                                setInputText("");
                                                setDocFile(null);
                                            }}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-2"
                                        >
                                            <Trash2 size={16} /> Limpiar
                                        </button>
                                    </div>
                                </div>

                                <div className="prose prose-indigo max-w-none">
                                    <div
                                        id="output-html"
                                        dangerouslySetInnerHTML={{ __html: processedHtml }}
                                        className="
                                            min-h-[300px] p-6 bg-slate-50 rounded-xl border border-slate-200
                                            [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mt-8 [&_h1]:mb-6
                                            [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-3
                                            [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-slate-600 [&_h3]:mt-5 [&_h3]:mb-2
                                            [&_p]:mb-4 [&_p]:leading-relaxed
                                            [&_strong]:font-bold [&_strong]:text-slate-900
                                            [&_table]:w-full [&_table]:border-collapse [&_table]:my-6 [&_table]:block [&_table]:overflow-x-auto
                                            [&_th]:border [&_th]:border-slate-300 [&_th]:p-3 [&_th]:text-left [&_th]:bg-blue-50 [&_th]:font-bold
                                            [&_td]:border [&_td]:border-slate-300 [&_td]:p-3
                                        "
                                    />
                                </div>

                                {metadata && (
                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Meta Title</label>
                                            <p className="text-sm text-slate-800">{metadata.metaTitle}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Slug</label>
                                            <p className="text-sm font-mono text-indigo-600">{metadata.slug}</p>
                                        </div>
                                        <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Meta Description</label>
                                            <p className="text-sm text-slate-800">{metadata.metaDescription}</p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>

                    {/* COLUMNA 3: ACCIONES */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="sticky top-32 space-y-6">

                            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                    <FileText size={20} className="text-indigo-500" /> Archivo
                                </h2>

                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`
                                        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                        ${docFile ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'}
                                    `}
                                >
                                    <input
                                        type="file"
                                        accept=".docx"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleDocUpload}
                                    />
                                    <div className="flex flex-col items-center gap-3">
                                        <div className={`p-3 rounded-full ${docFile ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {docFile ? <Check size={24} /> : <FileUp size={24} />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-700">
                                                {docFile ? docFile.name : "Cargar Documento (.docx)"}
                                            </p>
                                            {!docFile && <p className="text-xs text-slate-400 mt-1">Click para buscar</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Google Docs Import */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                                        O importar desde Google Docs
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                <LinkIcon size={14} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Pega el enlace del documento..."
                                                value={googleDocUrl}
                                                onChange={(e) => setGoogleDocUrl(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-600 placeholder:font-normal"
                                            />
                                        </div>
                                        <button
                                            onClick={handleGoogleDocImport}
                                            disabled={!googleDocUrl || isFetchingGoogleDoc}
                                            className="px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Importar contenido"
                                        >
                                            {isFetchingGoogleDoc ? (
                                                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Download size={18} />
                                            )}
                                        </button>
                                    </div>
                                    {inputText && !docFile && !isFetchingGoogleDoc && (
                                        <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
                                            <Check size={12} /> Contenido importado ({inputText.length} caracteres)
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={runFullPipeline}
                                    disabled={(!docFile && !inputText) || isProcessing}
                                    className={`
                                        w-full mt-6 py-4 px-6 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                                        ${((!docFile && !inputText) || isProcessing)
                                            ? 'bg-slate-300 cursor-not-allowed text-slate-500 shadow-none'
                                            : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-500/30'
                                        }
                                    `}
                                >
                                    {isProcessing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Wand2 size={20} /> Humanizar Contenido
                                        </>
                                    )}
                                </button>
                            </section>

                            {/* Status Bar */}
                            {(statusVisible || isProcessing) && (
                                <section className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl border border-indigo-800 overflow-hidden relative">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-800">
                                        <div
                                            className="h-full bg-cyan-400 transition-all duration-500 ease-out"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2 relative z-10">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">Estado</span>
                                            <span className="text-xs font-mono text-cyan-400">{Math.round(progressPercent)}%</span>
                                        </div>
                                        <p className="font-medium text-lg leading-snug">{statusMessage}</p>
                                        <p className="text-xs text-indigo-300 mt-1 font-mono">{progressText}</p>
                                    </div>

                                    {/* Deco Background */}
                                    <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
                                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl" />
                                </section>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm flex items-start gap-3">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <p>{error}</p>
                                </div>
                            )}

                        </div>
                    </div>

                </div >
            </main >
        </div >
    );
}
