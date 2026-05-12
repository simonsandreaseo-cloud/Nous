# Design: 12-neural-translation-pipeline

## Technical Approach

The Neural Translation Pipeline aims to provide high-fidelity translation for complex HTML content (specifically SEO-focused tables and articles) using **Gemini 1.5 Pro**. The core strategy relies on a "Structural Protection" layer that isolates HTML tags from the translatable text using unique markers (`[[T1]]`, `[[T2]]`). This ensures the LLM focuses exclusively on linguistic translation without corrupting the layout or technical attributes of the tags.

The process is handled asynchronously via **BullMQ** to manage long-running translation tasks without blocking the main thread, with real-time feedback provided to the UI through **tRPC** subscriptions or polling.

## Architecture Decisions

### Decision: HTML Tag Protection Strategy
| Option | Tradeoff | Decision |
|--------|----------|----------|
| Regex Replacement | Fast but fragile with nested or malformed HTML. | Rejected |
| **Cheerio Parsing** | Heavier but robust DOM manipulation and precise node isolation. | **Chosen** |

**Rationale**: Cheerio allows us to accurately identify inline tags (`<b>`, `<i>`, `<a>`) and structural tags (`<table>`, `<td>`). We can systematically replace content while keeping the container structure intact.

### Decision: Marker Format
**Choice**: `[[T1]]`, `[[T2]]`, ... `[[TN]]`
**Rationale**: Using a distinct, non-standard marker prevents the LLM from confusing markers with actual text content. The `T` prefix indicates "Tag" and numeric ordering ensures sequential restoration.

### Decision: Worker Infrastructure
**Choice**: BullMQ + Redis.
**Rationale**: Aligns with the project's strategic direction (Change 02). Provides automatic retries, concurrency control, and progress tracking, which is essential for translating large documents.

## Data Flow

```
1. Client ──────> tRPC (translation.start) ──────> BullMQ (Queue)
                                                      │
2. Worker <────── Job Execution <─────────────────────┘
     │
     ▼
3. TranslationEngine.protectStructure(html) ──> [Protected Text + Tag Map]
     │
     ▼
4. AI Router (Gemini 1.5 Pro) ──> [Translated Protected Text]
     │
     ▼
5. TranslationEngine.restoreStructure(text, map) ──> [Final HTML]
     │
     ▼
6. Database (Create Task with translation_parent_id) ──> AuditLog
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/translation-service/engine.ts` | Create | Implementation of `TranslationEngine` with protection/restoration logic. |
| `src/lib/translation-service/index.ts` | Create | Public API for the translation package. |
| `src/lib/jobs/translation-worker.ts` | Create | BullMQ Worker that orchestrates the translation flow. |
| `src/server/routers/translation.ts` | Create | tRPC router for translation job management. |
| `src/components/translation/TranslationPanel.tsx` | Create | UI Widget using Magic UI for progress visualization. |

## Interfaces / Contracts

### TranslationEngine
```typescript
interface TagMap {
  [key: string]: string; // "[[T1]]": "<b>"
}

export class TranslationEngine {
  /**
   * Replaces <b>, <i>, <a> tags with markers like [[T1]], [[T2]]
   */
  protectStructure(html: string): { protectedText: string; tagMap: TagMap };

  /**
   * Replaces markers back with their original HTML tags
   */
  restoreStructure(translatedText: string, tagMap: TagMap): string;
}
```

### AI System Prompt (Gemini 1.5 Pro)
```text
You are a professional neural translation engine. 
Your task is to translate the provided text from [SOURCE_LANG] to [TARGET_LANG].

CRITICAL RULES:
1. PRESERVE ALL MARKERS: You will see markers like [[T1]], [[T2]], etc. DO NOT translate, modify, or remove them.
2. POSITIONING: Keep the markers in their correct linguistic position within the translated sentence.
3. OUTPUT: Return ONLY the translated text. Do not provide explanations or chat.
4. INTEGRITY: Ensure the number of markers in your response matches the input exactly.
```

### Database Schema Extension (Supabase)
```sql
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS translation_parent_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;
```

## UI Widget: TranslationPanel

The `TranslationPanel` will use **Magic UI** components (`CircularProgress` or `LineProgress`) and subscribe to the job status:

```typescript
const TranslationPanel = ({ taskId }: { taskId: string }) => {
  const [progress, setProgress] = useState(0);
  const { data: jobStatus } = trpc.translation.status.useQuery(
    { taskId },
    { enabled: !!taskId, refetchInterval: (data) => (data?.state === 'completed' ? false : 1000) }
  );

  // Magic UI Circular Progress would be rendered here based on jobStatus.progress
};
```

## Audit Logs & Error Handling

- **Integrity Error**: If `restoreStructure` detects a mismatch in marker counts (e.g., Input: 10, Output: 9), it will throw a `TranslationIntegrityError`.
- **Log Format**: 
  `[ERROR] [TranslationWorker] Integrity mismatch for Job {jobId}. Expected {inputCount} markers, received {outputCount}. Source Task: {parentTaskId}.`
- **Retry Logic**: BullMQ will retry up to 3 times with exponential backoff.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `protectStructure` | Verify that nested `<b>` and `<a>` are replaced by markers in order. |
| Unit | `restoreStructure` | Verify that markers are replaced by original tags without loss. |
| Integration | `TranslationWorker` | Full flow mock AI response and verify DB entry creation. |

## Migration / Rollout

1. Apply DB migration to add `translation_parent_id`.
2. Install `bullmq` and `ioredis` if not present.
3. Deploy Worker and tRPC router.

## Open Questions

- [ ] Should we support attributes in `<a>` tags during translation (e.g., `href`)? (Current design preserves them via the Tag Map).
- [ ] Handling of malformed HTML in source tasks.
