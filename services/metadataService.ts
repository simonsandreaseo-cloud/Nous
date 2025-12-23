import { supabase } from '../lib/supabase';
import { fetchSerpWithJina } from '../components/tools/SeoSuite/services/jinaService';
import { ExternalApiKeys, ProviderConfig } from '../components/tools/SeoSuite/types';
import { GoogleGenAI } from '@google/generative-ai';

export interface TaskMetadata {
    metaTitle?: string;
    h1?: string;
    metaDescription?: string;
    slug?: string;
    generatedAt?: string;
    serpProvider?: string;
}

export interface SerpSnippet {
    position: number;
    title: string;
    url: string;
    snippet: string;
}

export interface MetadataGenerationResult {
    metadata: TaskMetadata;
    serpSnippets: SerpSnippet[];
    success: boolean;
    error?: string;
}

/**
 * Fetches SERP snippets for a given query
 */
export const fetchSerpSnippets = async (
    query: string,
    countryCode: string = 'es',
    langCode: string = 'es',
    externalKeys: ExternalApiKeys,
    serpProvider: ProviderConfig['serp'] = 'SERPER'
): Promise<SerpSnippet[]> => {
    try {
        const serpResponse = await fetchSerpWithJina(
            query,
            countryCode,
            langCode,
            externalKeys,
            serpProvider
        );

        // Parse the markdown response to extract snippets
        const snippets: SerpSnippet[] = [];
        const lines = serpResponse.markdown.split('\n');

        let currentSnippet: Partial<SerpSnippet> = {};
        let position = 0;

        for (const line of lines) {
            // Match position and title (e.g., "### 1. Title Here")
            const titleMatch = line.match(/^###\s+(\d+)\.\s+(.+)$/);
            if (titleMatch) {
                // Save previous snippet if exists
                if (currentSnippet.title && currentSnippet.snippet) {
                    snippets.push(currentSnippet as SerpSnippet);
                }

                position = parseInt(titleMatch[1]);
                currentSnippet = {
                    position,
                    title: titleMatch[2].trim()
                };
                continue;
            }

            // Match URL
            const urlMatch = line.match(/^URL:\s+(.+)$/);
            if (urlMatch && currentSnippet.position) {
                currentSnippet.url = urlMatch[1].trim();
                continue;
            }

            // Match snippet
            const snippetMatch = line.match(/^Snippet:\s+(.+)$/);
            if (snippetMatch && currentSnippet.position) {
                currentSnippet.snippet = snippetMatch[1].trim();
            }
        }

        // Add last snippet
        if (currentSnippet.title && currentSnippet.snippet) {
            snippets.push(currentSnippet as SerpSnippet);
        }

        return snippets.slice(0, 10); // Return top 10 results
    } catch (error) {
        console.error('Error fetching SERP snippets:', error);
        throw new Error('No se pudieron obtener los resultados de búsqueda');
    }
};

/**
 * Generates metadata using AI based on SERP snippets
 */
export const generateMetadataFromSerp = async (
    title: string,
    serpSnippets: SerpSnippet[],
    geminiApiKeys: string[],
    targetKeyword?: string
): Promise<TaskMetadata> => {
    if (geminiApiKeys.length === 0) {
        throw new Error('Se requiere al menos una API Key de Gemini');
    }

    // Prepare SERP context for AI
    const serpContext = serpSnippets.map((snippet, idx) =>
        `${idx + 1}. **${snippet.title}**\n   URL: ${snippet.url}\n   Snippet: ${snippet.snippet}`
    ).join('\n\n');

    const prompt = `Eres un experto en SEO y redacción de contenidos. Tu tarea es generar metadatos optimizados para un artículo que SUPERE en ranking a los resultados actuales en Google.

**Título del Artículo:** ${title}
${targetKeyword ? `**Palabra Clave Objetivo:** ${targetKeyword}` : ''}

**Resultados Actuales en Google (SERP):**

${serpContext}

**Tu Tarea:**

Analiza los resultados actuales y genera metadatos que:
1. Sean más atractivos y persuasivos que los competidores
2. Incluyan la palabra clave de forma natural
3. Prometan más valor al usuario
4. Cumplan con las mejores prácticas de SEO

**Genera los siguientes campos:**

1. **Meta Title** (50-60 caracteres): Un título optimizado para SEO que sea más atractivo que los competidores
2. **H1** (40-70 caracteres): El encabezado principal del artículo, puede ser diferente al meta title
3. **Meta Description** (150-160 caracteres): Una descripción persuasiva que genere más clics que los competidores
4. **Slug** (3-6 palabras): URL amigable, corta y descriptiva (solo minúsculas, guiones, sin caracteres especiales)

**IMPORTANTE:** 
- Analiza qué están haciendo bien los competidores y mejóralo
- Identifica qué les falta a los competidores y agrégalo
- Usa números, power words, y promesas de valor cuando sea apropiado
- Asegúrate de que cada campo sea único y optimizado

Responde SOLO con un objeto JSON válido, sin markdown ni explicaciones adicionales:

{
  "metaTitle": "tu meta title aquí",
  "h1": "tu h1 aquí",
  "metaDescription": "tu meta description aquí",
  "slug": "tu-slug-aqui"
}`;

    // Try with key rotation
    for (const apiKey of geminiApiKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const model = ai.getGenerativeModel({
                model: 'gemini-2.0-flash-exp',
                generationConfig: {
                    temperature: 0.8,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            });

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Parse JSON response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('La IA no devolvió un JSON válido');
            }

            const metadata = JSON.parse(jsonMatch[0]);

            // Validate required fields
            if (!metadata.metaTitle || !metadata.h1 || !metadata.metaDescription || !metadata.slug) {
                throw new Error('La IA no generó todos los campos requeridos');
            }

            return {
                metaTitle: metadata.metaTitle,
                h1: metadata.h1,
                metaDescription: metadata.metaDescription,
                slug: metadata.slug,
                generatedAt: new Date().toISOString()
            };

        } catch (error: any) {
            console.warn(`Error with API key ${apiKey.substring(0, 8)}...:`, error);

            // If it's a rate limit error, try next key
            if (error.message?.includes('429') || error.message?.includes('quota')) {
                continue;
            }

            // For other errors, throw immediately
            throw error;
        }
    }

    throw new Error('Todas las API Keys de Gemini están agotadas o hay un error');
};

/**
 * Complete workflow: Fetch SERP + Generate Metadata
 */
export const generateMetadataWithSerp = async (
    title: string,
    targetKeyword?: string,
    countryCode: string = 'es',
    langCode: string = 'es',
    serpProvider: ProviderConfig['serp'] = 'SERPER'
): Promise<MetadataGenerationResult> => {
    try {
        // Get user's API keys
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            throw new Error('Usuario no autenticado');
        }

        const { data: apiKeys, error: keysError } = await supabase
            .from('user_api_keys')
            .select('*')
            .eq('user_id', user.id);

        if (keysError) throw keysError;
        if (!apiKeys || apiKeys.length === 0) {
            throw new Error('No se encontraron API Keys. Por favor, configura tus API Keys en el dashboard.');
        }

        // Organize keys by provider
        const geminiKeys = apiKeys.filter(k => k.provider === 'gemini').map(k => k.key_value);
        const externalKeys: ExternalApiKeys = {
            jina: apiKeys.find(k => k.provider === 'jina')?.key_value,
            firecrawl: apiKeys.find(k => k.provider === 'firecrawl')?.key_value,
            tavily: apiKeys.find(k => k.provider === 'tavily')?.key_value,
            serper: apiKeys.find(k => k.provider === 'serper')?.key_value,
            unstructured: apiKeys.find(k => k.provider === 'unstructured')?.key_value,
            voyage: apiKeys.find(k => k.provider === 'voyage')?.key_value,
        };

        if (geminiKeys.length === 0) {
            throw new Error('Se requiere al menos una API Key de Gemini para generar metadatos');
        }

        // Check if SERP provider key is available
        if (serpProvider === 'SERPER' && !externalKeys.serper) {
            throw new Error('Se requiere una API Key de Serper para usar este proveedor');
        }
        if (serpProvider === 'TAVILY' && !externalKeys.tavily) {
            throw new Error('Se requiere una API Key de Tavily para usar este proveedor');
        }

        // Step 1: Fetch SERP snippets
        const query = targetKeyword || title;
        const serpSnippets = await fetchSerpSnippets(
            query,
            countryCode,
            langCode,
            externalKeys,
            serpProvider
        );

        if (serpSnippets.length === 0) {
            throw new Error('No se encontraron resultados en el SERP');
        }

        // Step 2: Generate metadata with AI
        const metadata = await generateMetadataFromSerp(
            title,
            serpSnippets,
            geminiKeys,
            targetKeyword
        );

        metadata.serpProvider = serpProvider;

        return {
            metadata,
            serpSnippets,
            success: true
        };

    } catch (error: any) {
        console.error('Error in generateMetadataWithSerp:', error);
        return {
            metadata: {},
            serpSnippets: [],
            success: false,
            error: error.message || 'Error desconocido al generar metadatos'
        };
    }
};

/**
 * Saves metadata to a task
 */
export const saveMetadataToTask = async (
    taskId: string | number,
    metadata: TaskMetadata
): Promise<void> => {
    try {
        const { error } = await supabase
            .from('tasks')
            .update({ metadata })
            .eq('id', taskId);

        if (error) throw error;
    } catch (error) {
        console.error('Error saving metadata:', error);
        throw new Error('Error al guardar los metadatos');
    }
};
