# Diseño Técnico: 14-data-driven-research-pipeline

## 1. Paquete `@nous/data-intelligence`

Este paquete encapsula la obtención y el análisis puramente matemático/estadístico de datos externos, preparándolos para el análisis semántico posterior.

### 1.1 `DataForSeoClient`

Clase encargada de interactuar con la API de DataForSEO. Se utilizan específicamente los endpoints asíncronos de Labs (`task_post` y `task_get`) para optimizar costos y evitar bloqueos en el worker, previniendo timeouts.

```typescript
// @nous/data-intelligence/src/clients/DataForSeoClient.ts
import axios, { AxiosInstance } from 'axios';

export interface DfsTaskPostResponse {
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
  }>;
}

export interface DfsTaskGetResponse {
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result: any[];
  }>;
}

export class DataForSeoClient {
  private client: AxiosInstance;

  constructor(apiKey: string, apiSecret: string) {
    this.client = axios.create({
      baseURL: 'https://api.dataforseo.com/v3/',
      auth: {
        username: apiKey,
        password: apiSecret
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Envía una tarea asíncrona de búsqueda de palabras clave relacionadas (Labs).
   */
  async postRelatedKeywordsTask(keyword: string, locationCode: number, languageCode: string): Promise<string> {
    const postData = [{
      keyword: keyword,
      location_code: locationCode,
      language_code: languageCode
    }];

    const response = await this.client.post<DfsTaskPostResponse>(
      'dataforseo_labs/google/related_keywords/task_post',
      postData
    );

    if (response.data.tasks[0].status_code !== 20000) {
      throw new Error(`DataForSEO task_post error: ${response.data.tasks[0].status_message}`);
    }

    return response.data.tasks[0].id;
  }

  /**
   * Recupera los resultados de una tarea de Labs enviada previamente.
   */
  async getTaskResult(taskId: string): Promise<any[]> {
    const response = await this.client.get<DfsTaskGetResponse>(
      `dataforseo_labs/google/related_keywords/task_get/${taskId}`
    );

    // 40602 indica que la tarea aún está en progreso (Task in progress)
    if (response.data.tasks[0].status_code === 40602) {
      return [];
    }

    if (response.data.tasks[0].status_code !== 20000) {
      throw new Error(`DataForSEO task_get error: ${response.data.tasks[0].status_message}`);
    }

    return response.data.tasks[0].result || [];
  }
}
```

### 1.2 `calculateTfIdf(texts)`

Función pura para el cálculo de Term Frequency-Inverse Document Frequency sobre un corpus de textos (generalmente contenido extraído de la competencia en las SERPs).

```typescript
// @nous/data-intelligence/src/utils/tfidf.ts

export interface TfIdfResult {
  term: string;
  score: number;
}

export function calculateTfIdf(texts: string[]): TfIdfResult[] {
  if (texts.length === 0) return [];

  const termDocumentFrequencies = new Map<string, number>();
  const documents: Map<string, number>[] = [];
  const totalDocuments = texts.length;

  // Stop words simplificado
  const stopWords = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'de', 'en', 'para', 'por', 'con', 'a', 'su', 'es', 'al', 'del']);

  // Fase 1: Tokenización y cálculo de TF local + DF global
  for (const text of texts) {
    const termFrequency = new Map<string, number>();
    const words = text.toLowerCase().match(/[\p{L}]+/gu) || []; // Mejor soporte Unicode para palabras
    
    let totalWordsInDoc = 0;
    for (const word of words) {
      if (stopWords.has(word) || word.length < 3) continue;
      termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
      totalWordsInDoc++;
    }

    const normalizedTermFrequency = new Map<string, number>();
    for (const [term, count] of termFrequency.entries()) {
      normalizedTermFrequency.set(term, count / totalWordsInDoc);
      termDocumentFrequencies.set(term, (termDocumentFrequencies.get(term) || 0) + 1);
    }
    
    documents.push(normalizedTermFrequency);
  }

  // Fase 2: Cálculo de IDF y TF-IDF total
  const globalScores = new Map<string, number>();
  
  for (const doc of documents) {
    for (const [term, tf] of doc.entries()) {
      const df = termDocumentFrequencies.get(term) || 1;
      const idf = Math.log(totalDocuments / df);
      const tfidf = tf * idf;
      
      globalScores.set(term, (globalScores.get(term) || 0) + tfidf);
    }
  }

  // Retornar términos ordenados por relevancia (mayor score TF-IDF)
  return Array.from(globalScores.entries())
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score);
}
```

## 2. Paquete `@nous/intelligence`

Este paquete abstrae el razonamiento semántico avanzado, utilizando LLMs para estructurar y depurar los datos obtenidos de la fase puramente analítica.

### 2.1 `KeywordAnalyzer`

Orquesta el flujo de keywords. Toma los datos crudos extraídos matemáticamente (TF-IDF) y aplica un filtrado semántico inteligente usando LLMs.

```typescript
// @nous/intelligence/src/agents/KeywordAnalyzer.ts
import { calculateTfIdf, TfIdfResult } from '@nous/data-intelligence';
import { LLMClient } from '../clients/LLMClient';

export class KeywordAnalyzer {
  private llm: LLMClient;

  constructor(llmClient: LLMClient) {
    this.llm = llmClient;
  }

  async analyzeAndFilter(texts: string[], targetTopic: string): Promise<string[]> {
    // 1. Cálculo matemático de relevancia pura en el corpus de competidores
    const rawKeywords: TfIdfResult[] = calculateTfIdf(texts);
    const topCandidates = rawKeywords.slice(0, 50).map(k => k.term);

    // 2. Depuración y enriquecimiento semántico vía LLM
    const prompt = `
      Actúa como un experto Analista SEO. Analiza el tema principal "${targetTopic}" y esta lista de términos extraídos de la competencia mediante TF-IDF:
      [${topCandidates.join(', ')}]
      
      Filtra y devuelve ÚNICAMENTE un array JSON válido de strings con las 15 palabras clave LSI (Latent Semantic Indexing) de mayor impacto semántico para estructurar el contenido. Prioriza términos relacionados y long-tails. No incluyas markdown, explicaciones ni texto adicional, solo el array JSON [ "kw1", "kw2" ].
    `;

    try {
      const response = await this.llm.generateText(prompt, { temperature: 0.1 });
      const cleanedResponse = response.replace(/```json\n|\n```|```/g, '').trim();
      const parsed = JSON.parse(cleanedResponse);
      return Array.isArray(parsed) ? parsed : topCandidates.slice(0, 15);
    } catch (e) {
      console.error('KeywordAnalyzer: Error parseando respuesta del LLM. Aplicando fallback estadístico.', e);
      return topCandidates.slice(0, 15); // Fallback: retornar puramente estadístico
    }
  }
}
```

### 2.2 `OutlineEngine`

Responsable de generar la estructura final del contenido. Emplea un sistema robusto de cascada (fallback) entre diferentes modelos LLM para garantizar su completitud.

```typescript
// @nous/intelligence/src/agents/OutlineEngine.ts
import { LLMClient } from '../clients/LLMClient';

export interface OutlineSection {
  title: string;
  intent: string;
  keywordsToInclude: string[];
}

export class OutlineEngine {
  private primaryModel = 'claude-3-5-sonnet';
  private fallbackModels = ['gemini-1.5-flash', 'gemma-2', 'llama-3'];
  private llmFactory: (model: string) => LLMClient;

  constructor(llmFactory: (model: string) => LLMClient) {
    this.llmFactory = llmFactory;
  }

  async generateOutline(topic: string, lsiKeywords: string[]): Promise<OutlineSection[]> {
    const prompt = `
      Crea un outline (estructura de encabezados H2 y H3) exhaustivo y optimizado para SEO sobre el tema "${topic}".
      Debes incluir de forma natural el siguiente contexto semántico y LSI keywords: ${lsiKeywords.join(', ')}.
      
      Devuelve ÚNICAMENTE un array JSON con la siguiente estructura exacta:
      [
        { "title": "Encabezado H2 o H3", "intent": "Qué intención de búsqueda o duda responde esta sección", "keywordsToInclude": ["keyword1", "keyword2"] }
      ]
      
      No incluyas texto adicional ni bloques markdown, únicamente el array JSON válido.
    `;

    // 1. Intento con el modelo de razonamiento principal
    try {
      const primaryClient = this.llmFactory(this.primaryModel);
      const response = await primaryClient.generateText(prompt);
      return this.parseOutlineResponse(response);
    } catch (error) {
      console.warn(`OutlineEngine: Error crítico en modelo principal (${this.primaryModel}). Iniciando cascada de fallback.`);
      
      // 2. Cascada de fallbacks sobre modelos más rápidos/resilientes
      for (const model of this.fallbackModels) {
        try {
          console.log(`OutlineEngine: Fallback en curso usando [${model}]...`);
          const fallbackClient = this.llmFactory(model);
          const response = await fallbackClient.generateText(prompt);
          return this.parseOutlineResponse(response);
        } catch (fallbackError) {
          console.warn(`OutlineEngine: Falló el modelo de fallback [${model}].`);
        }
      }
      
      throw new Error('Fallo crítico en OutlineEngine: Todos los modelos de fallback han fallado.');
    }
  }

  private parseOutlineResponse(response: string): OutlineSection[] {
    const cleaned = response.replace(/```json\n|\n```|```/g, '').trim();
    return JSON.parse(cleaned) as OutlineSection[];
  }
}
```

## 3. Worker de Investigación (`research-worker.ts`)

Las nuevas fases de (1) Data pura, (2) Semántica inteligente y (3) Generación del Outline se inyectan en el ciclo de vida del worker de BullMQ. Todo se persiste de forma integral en el `researchDossier` en Supabase.

```typescript
// src/workers/research-worker.ts
import { Job } from 'bullmq';
import { supabaseAdmin } from '../lib/supabase';
import { DataForSeoClient } from '@nous/data-intelligence/clients/DataForSeoClient';
import { KeywordAnalyzer } from '@nous/intelligence/agents/KeywordAnalyzer';
import { OutlineEngine } from '@nous/intelligence/agents/OutlineEngine';
import { llmFactory } from '../lib/llm';
import { fetchCompetitorTexts } from '../lib/scraper'; // Dependencia existente

export default async function researchWorkerHandler(job: Job) {
  const { taskId, keyword, locationCode, languageCode } = job.data;
  
  // El dossier concentrará el estado de la investigación para el Writing Worker
  const dossier: Record<string, any> = {};

  try {
    // ------------------------------------------------------------------------
    // FASE PREVIA: Strategy (Existente en worker actual)
    // ------------------------------------------------------------------------
    dossier.strategy = { /* Análisis de intención, search volume, etc. */ };
    await job.updateProgress(20);

    // Inicializar dependencias
    const dfsClient = new DataForSeoClient(process.env.DFS_LOGIN!, process.env.DFS_PASSWORD!);
    const keywordAnalyzer = new KeywordAnalyzer(llmFactory('claude-3-5-sonnet'));
    const outlineEngine = new OutlineEngine(llmFactory);

    // ------------------------------------------------------------------------
    // NUEVA FASE 1: Data Pipeline (DataForSEO)
    // ------------------------------------------------------------------------
    let relatedKeywords: string[] = [];
    try {
      // Usamos los endpoints de Labs (task_post -> polling task_get)
      const dfsTaskId = await dfsClient.postRelatedKeywordsTask(keyword, locationCode, languageCode);
      
      let dfsResult: any[] = [];
      let pollingAttempts = 0;
      
      // Polling para esperar la resolución del task en DFS
      while (dfsResult.length === 0 && pollingAttempts < 12) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5s
        dfsResult = await dfsClient.getTaskResult(dfsTaskId);
        pollingAttempts++;
      }
      
      // Extraemos las top keywords
      relatedKeywords = dfsResult.slice(0, 25).map(item => item.keyword);
      dossier.dataForSeo = { success: true, keywords: relatedKeywords };
      
    } catch (dfsError) {
      // Graceful Degradation: Capturamos fallos de API o timeouts
      console.error(`DataForSEO falló para taskId ${taskId}. Degradación elegante activada. Error:`, dfsError);
      dossier.dataForSeo = { success: false, error: dfsError.message, keywords: [] };
      // relatedKeywords queda vacío, pero el worker NO hace throw, continúa a Semantics.
    }
    await job.updateProgress(40);

    // ------------------------------------------------------------------------
    // NUEVA FASE 2: Semantics Pipeline (TF-IDF + LLM Keyword Analyzer)
    // ------------------------------------------------------------------------
    // 1. Obtener los textos planos de las SERPs cacheados en estrategia previa
    const competitorTexts = await fetchCompetitorTexts(keyword);
    
    // 2. Extraer y filtrar LSI keywords puras de los competidores
    const filteredLsi = await keywordAnalyzer.analyzeAndFilter(competitorTexts, keyword);
    
    // 3. Consolidar LSI locales (Competidores) con Data externa (DataForSEO) y deduplicar
    const finalLsiPool = Array.from(new Set([...relatedKeywords, ...filteredLsi]));
    
    dossier.semantics = {
      lsiKeywords: finalLsiPool,
      tfIdfProcessed: true,
      poolSize: finalLsiPool.length
    };
    await job.updateProgress(60);

    // ------------------------------------------------------------------------
    // NUEVA FASE 3: Outline Pipeline (Fallback cascada)
    // ------------------------------------------------------------------------
    // Le pasamos el pool consolidado de LSI para guiar la estructura
    const outline = await outlineEngine.generateOutline(keyword, finalLsiPool);
    dossier.outline = outline;
    await job.updateProgress(80);

    // ------------------------------------------------------------------------
    // FINALIZACIÓN: Persistencia de JSONB en Supabase
    // ------------------------------------------------------------------------
    // Todo el conocimiento extraído (Estrategia, LSI, Outline) va a researchDossier
    const { error: dbUpdateError } = await supabaseAdmin
      .from('task_details')
      .update({ 
        researchDossier: dossier, 
        status: 'research_completed' 
      })
      .eq('id', taskId);

    if (dbUpdateError) {
      throw new Error(`Fallo guardando researchDossier en Supabase: ${dbUpdateError.message}`);
    }

    await job.updateProgress(100);
    return { success: true, message: 'Data-driven pipeline completado', dossier };

  } catch (criticalError) {
    console.error(`Error no recuperable en researchWorker (Task ${taskId}):`, criticalError);
    
    // Dejamos constancia del estado de fallo junto al dossier parcialmente generado
    await supabaseAdmin
      .from('task_details')
      .update({ 
        status: 'research_failed', 
        error: criticalError.message, 
        researchDossier: dossier 
      })
      .eq('id', taskId);
      
    throw criticalError;
  }
}
```

### Justificación Técnica
- **DataForSEO Labs vs Live**: Se utilizan `task_post` y `task_get` para abaratar costos significativamente y porque un delay de ~10-15s en el worker de BullMQ es completamente aceptable.
- **Graceful Degradation en DFS**: Una de las directivas principales es que el worker no debe frenar la investigación total si una fuente de datos externa falla. La degradación controlada (`try/catch` de DFS) garantiza que el proceso salte a obtener inteligencia semántica local (TF-IDF sobre scraper).
- **Outline en Cascada**: El uso del array de `fallbackModels` asume que la fase de *Outline* es el entregable más crítico del worker. Ante limitaciones de rate-limit o caídas en la API principal, se pasa iterativamente a modelos más eficientes.
- **Transmisión de Estado (`researchDossier`)**: Al actualizar el estado JSONB del `task_details` al final, el subsecuente worker de "Writing" va a poder consumir el `dossier.outline` y `dossier.semantics` sin tener que computar nada nuevo, convirtiéndose en una fábrica de texto lineal orientada directamente por datos.
