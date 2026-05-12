# Design: 09-Real-Time SEO Density

## Technical Approach
The Real-Time SEO Density system provides a high-performance, non-blocking feedback loop for content creators. It utilizes a dedicated analysis engine (`@nous/seo-engine`) running in a Web Worker to ensure that even large articles (2,000+ words) can be analyzed without causing UI jank or input lag in the Tiptap editor.

The system maps keyword density directly to a visual "Semaphore" UX (Semaphore/Pulse) in the sidebar, providing immediate signals on under-optimization, optimal range, or over-optimization (keyword stuffing).

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
| :--- | :--- | :--- | :--- |
| **Execution Context** | Web Worker | Main Thread | Decouples CPU-intensive regex matching from the UI thread, ensuring 60fps interaction during typing. |
| **Word Counting** | Plain Text Extraction | HTML Regex | Extracting text from Tiptap's JSON or HTML via `getText()` prevents counting SEO keywords inside `href`, `alt`, or class attributes. |
| **Update Strategy** | Debounced Push | Continuous/Idle | A 500ms debounce balances "real-time" feel with energy efficiency and battery life on mobile/laptops. |
| **Matching Logic** | Boundary-aware Regex | Simple `indexOf` | Uses `\b` (word boundaries) to ensure "SEO" doesn't count as a match in "SEOing" or "ASEO". |

## Data Flow

1. **Input**: User types in `WriterEditor` (Tiptap).
2. **Hook**: `useDebouncedContent` captures `editor.getText()` and debounces the string.
3. **Dispatch**: The `SEOPulse` widget detects a change in the debounced text.
4. **Offload**: `SEOPulse` sends the text and `targetKeywords` (from `WriterStore`) to the `SEOAnalysisWorker`.
5. **Analyze**: `KeywordAnalyzer` iterates through keywords, applies Regex, and calculates density percentages.
6. **Output**: Worker posts `AnalysisResult` back to the main thread.
7. **Render**: `SEOPulse` maps the results to Tailwind colors and updates the UI.

```text
[WriterEditor] --(text)--> [useDebouncedContent] --(debounced)--> [SEOPulse]
                                                                     |
[WriterStore] --(keywords)-------------------------------------------┘
                                                                     |
                                                           (Post to Worker)
                                                                     |
                                                         [SEOAnalysisWorker]
                                                                     |
                                                         (Return Results)
                                                                     |
                                                           [SEOPulse UI]
```

## File Changes

| File | Action | Description |
| :--- | :--- | :--- |
| `src/packages/seo-engine/KeywordAnalyzer.ts` | Create | Core logic for counting words and calculating keyword density. |
| `src/packages/seo-engine/types.ts` | Create | Shared types for analysis results and statuses. |
| `src/packages/seo-engine/seo.worker.ts` | Create | Web Worker entry point that instantiates the analyzer. |
| `src/hooks/useDebouncedContent.ts` | Create | React hook that accepts the editor instance and returns throttled plain text. |
| `src/components/contents/writer/widgets/SEOPulse.tsx` | Create | Sidebar component displaying the list of keywords and their status. |
| `src/components/contents/writer/SEOTab.tsx` | Modify | Integrate the `SEOPulse` widget into the existing SEO Tab layout. |

## Interfaces / Contracts

```typescript
// @nous/seo-engine/types.ts
export type DensityStatus = 'gray' | 'green' | 'red';

export interface KeywordMetric {
  keyword: string;
  count: number;
  density: number;
  status: DensityStatus;
}

export interface AnalysisReport {
  keywords: KeywordMetric[];
  totalWords: number;
  healthScore: number; // 0-100 based on green keywords ratio
}

// KeywordAnalyzer implementation logic
export class KeywordAnalyzer {
  analyze(text: string, targets: string[]): AnalysisReport {
    // 1. Clean and count total words (support for Latin/UTF8)
    const words = text.toLowerCase().match(/[\wáéíóúñ]+/gu) || [];
    const totalWords = words.length;
    const cleanText = words.join(' ');

    const metrics = targets.map(kw => {
      // 2. Exact word boundary matching
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      const count = (text.match(regex) || []).length;
      
      const density = totalWords > 0 ? (count / totalWords) * 100 : 0;
      
      // 3. Status Mapping
      let status: DensityStatus = 'gray';
      if (density >= 0.5 && density <= 2.5) status = 'green';
      else if (density > 2.5) status = 'red';

      return { keyword: kw, count, density, status };
    });

    const greenCount = metrics.filter(m => m.status === 'green').length;
    const healthScore = targets.length > 0 ? (greenCount / targets.length) * 100 : 0;

    return { keywords: metrics, totalWords, healthScore };
  }
}
```

## Visual Mapping

| Status | Density Range | Tailwind 4 Class | Visual Meaning |
| :--- | :--- | :--- | :--- |
| **Gray** | `< 0.5%` | `text-slate-400` | Missing or Under-optimized |
| **Green** | `0.5% - 2.5%` | `text-emerald-500` | Optimal (Healthy) |
| **Red** | `> 2.5%` | `text-rose-500` | Over-optimized (Danger) |

## Testing Strategy

| Layer | What to Test | Approach |
| :--- | :--- | :--- |
| **Unit** | `KeywordAnalyzer` | Validate density calculations with mock texts of 10, 100, and 1000 words. |
| **Integration** | `useDebouncedContent` | Verify that text extraction from Tiptap is debounced correctly using Vitest + JSDOM. |
| **E2E** | `SEOPulse` Widget | Playwright test: Type keywords in the editor and assert color changes in the sidebar. |

## Open Questions
- [ ] ¿Deberíamos permitir configurar los umbrales (0.5% - 2.5%) por proyecto? (Por ahora hardcoded en el diseño).
- [ ] ¿Cómo manejamos keywords que son frases (long-tail)? (La Regex `\b` debería soportarlas correctamente).
