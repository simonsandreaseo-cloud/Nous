# Technical Design: Intelligence Core Strategist

## 1. ScraperService (Node.js + Cheerio)

The `ScraperService` will handle high-fidelity content extraction from competitor URLs directly in the Node.js runtime to avoid cold starts and overhead of external Edge Functions when possible, using `cheerio` for semantic cleaning.

### Implementation Detail
- **Input**: `url: string`
- **Output**: `Promise<{ cleanContent: string, snippet: string, headers: string[] }>`
- **Logic**:
  1. Fetch raw HTML using `fetch` with a realistic User-Agent.
  2. Load into `cheerio`.
  3. Remove noise: `script, style, noscript, iframe, nav, footer, header, aside, .ads, .sidebar`.
  4. Extract all `h1, h2, h3` for structural analysis.
  5. Extract text from the remaining body, preserving basic semantic spacing.
  6. Generate a 200-character snippet for the audit log.

### Audit Log Snippet Example
```json
{
  "event": "content_extraction",
  "url": "https://competitor.com/best-seo-tools",
  "status": "success",
  "data_snippet": "En esta guía comparamos las mejores herramientas SEO de 2024. Analizamos Semrush, Ahrefs y su impacto en el ranking...",
  "word_count": 1240,
  "timestamp": "2024-04-19T10:00:00Z"
}
```

## 2. StrategistService ("Maestro" Prompt)

The `StrategistService` is the cognitive brain of the research pipeline. It uses a specialized "Maestro" prompt to analyze the gathered data.

### Prompt: Maestro de Estrategia
```markdown
[System Instruction]
Eres el Arquitecto SEO Jefe de Nous. Tu misión es analizar a los competidores y superar su estrategia.
Recibirás un JSON con el contenido y encabezados de los top 5 resultados de Google.

[Constraints]
1. Genera un H1 Maestro que sea irresistible (CTR) y optimizado (SEO).
2. Identifica la Intención de Búsqueda predominante.
3. Proporciona un "Razonamiento Estratégico" detallado comparando tu propuesta contra competidores específicos.
4. Responde ÚNICAMENTE en JSON.

[Competitor Data]
{{competitorsData}}

[Output Schema]
{
  "masterH1": "string",
  "searchIntent": "string",
  "strategicReasoning": {
    "justification": "string",
    "competitorAnalysis": [
      { "url": "string", "flaw": "string", "ourAdvantage": "string" }
    ]
  }
}
```

### Method: `synthesizeStrategy(competitorsData)`
Uses `aiRouter.generate` with `model: 'gemini-2.0-flash-001'` (or the configured heavy reasoning model) and `jsonMode: true`.

## 3. Pipeline: `researchRouter.start`

The orchestration will follow a strictly sequential pipeline to ensure data integrity.

```typescript
// src/lib/services/research-router.ts

export const researchRouter = {
  async start(keyword: string) {
    // 1. Discovery Phase (SerpService)
    const { results } = await SerpProvider.fetchSerperSearch(keyword);
    
    // 2. Extraction Phase (ScraperService)
    const scrapedData = await Promise.all(
      results.slice(0, 5).map(r => ScraperService.scrapeAndClean(r.url, r.title))
    );

    // 3. Synthesis Phase (StrategistService)
    const strategy = await StrategistService.synthesizeStrategy(scrapedData);

    // 4. Persistence & Audit
    await AuditLogService.save('research_complete', { keyword, strategy });

    return strategy;
  }
}
```

## 4. Audit Visual (JSON Example)

This JSON represents a real audit log entry where the IA justifies its strategic decision.

```json
{
  "taskId": "task_123",
  "action": "strategy_synthesis",
  "output": {
    "masterH1": "Guía Definitiva de SEO 2024: Domina Google sin Trucos",
    "searchIntent": "Informational / Educational",
    "strategicReasoning": {
      "justification": "El H1 propuesto utiliza un ángulo de autoridad ('Guía Definitiva') y una promesa de valor negativa ('sin trucos') para diferenciarse de los competidores que usan títulos genéricos.",
      "competitorComparison": {
        "targetUrl": "https://competitor-a.com/seo-guide",
        "analysis": "El competidor A usa un H1 plano: 'Guía de SEO'. Carece de urgencia y no especifica el año. Mi propuesta añade 2024 y ataca el miedo al spam ('sin trucos')."
      }
    }
  },
  "model": "gemini-2.0-flash-001",
  "usage": { "totalTokens": 1450 }
}
```

## 5. API Key Integration

All services will use the unified configuration in `src/lib/ai/config.ts`:
- **Gemini**: `process.env.GEMINI_API_KEY` (via `getGeminiKey()`)
- **Serper**: `process.env.SERPER_API_KEY` (via `process.env`)
- **Supabase**: `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`
