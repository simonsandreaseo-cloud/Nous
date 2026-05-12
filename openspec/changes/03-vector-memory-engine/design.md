# Design: 03-vector-memory-engine

## Technical Approach

The Vector Memory Engine implements a long-term semantic memory system for Nous 2.0. It leverages `pgvector` in Supabase for high-performance vector storage and similarity search, combined with Gemini's `text-embedding-004` model for high-quality 768-dimensional embeddings.

The system is designed as an asynchronous pipeline:
1. **Extraction**: Workers (like `research-worker.ts`) extract raw text from various sources.
2. **Chunking**: Text is split into manageable fragments using a recursive character splitting strategy to preserve context.
3. **Vectorization**: A dedicated `vector-worker.ts` calls Gemini API to generate embeddings for each fragment.
4. **Persistence**: Fragments and their corresponding vectors are stored in the `knowledge_base` table using Drizzle ORM.
5. **Recall**: An AI-accessible `RecallService` performs cosine similarity searches to retrieve relevant context for subsequent AI tasks.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Storage** | Raw SQL vs Drizzle | **Drizzle ORM**: Provides type-safety and better integration with the planned project standards. |
| **Indexing** | IVFFlat vs HNSW | **HNSW (Hierarchical Navigable Small World)**: Faster query performance and better recall at scale, though with higher build time and memory usage. |
| **Embedding Model** | text-embedding-004 | **text-embedding-004**: State-of-the-art model from Google with 768 dimensions and optimized for retrieval tasks. |
| **Processing** | Sync vs Async | **Async (BullMQ/Workers)**: Offloads the latency of Gemini API calls (approx 1-2s per call) to avoid blocking main research workflows. |

## Data Flow

```
[research-worker] ──(raw text)──> [vector-queue]
                                       │
                                       ▼
[vector-worker] <──(job)── [BullMQ/Redis]
      │
      ├─> [Chunker] ──(fragments)──┐
      │                            │
      ├─> [Gemini API] <──(text)───┘
      │        │
      │        └─(768d vector)──┐
      │                         ▼
      └─> [Drizzle/Postgres] ──> (knowledge_base)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/db/schema/knowledge-base.ts` | Create | Drizzle schema definition for `knowledge_base` table with `vector` type. |
| `src/lib/embeddings/service.ts` | Create | `EmbeddingService` wrapping `@google/generative-ai` for `text-embedding-004`. |
| `src/lib/embeddings/chunker.ts` | Create | Implementation of Recursive Character Splitting. |
| `src/lib/jobs/vector-worker.ts` | Create | Background worker to process vectorization jobs. |
| `src/lib/jobs/research-worker.ts` | Modify | Update to enqueue text fragments into the `vector-queue`. |
| `src/lib/services/ai/recall.ts` | Create | `RecallService` for semantic search queries. |

## Interfaces / Contracts

### Knowledge Base Schema
```typescript
import { pgTable, uuid, text, jsonb, timestamp, vector, index } from 'drizzle-orm/pg-core';
import { projects } from './projects'; // Assume projects schema exists or will be created

export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  contentFragment: text('content_fragment').notNull(),
  embedding: vector('embedding', { dimensions: 768 }),
  metadata: jsonb('metadata').$type<{
    url?: string;
    title?: string;
    source?: 'research' | 'upload' | 'crawl';
  }>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  embeddingIdx: index('embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
}));
```

### Embedding Service Contract
```typescript
export interface IEmbeddingService {
  /**
   * Generates a 768-dimensional vector using Gemini text-embedding-004.
   */
  generate(text: string): Promise<number[]>;
  
  /**
   * Batch generates embeddings for multiple fragments.
   */
  generateBatch(texts: string[]): Promise<number[][]>;
}
```

### Recall Search (Drizzle)
```typescript
import { cosineDistance, desc, sql, eq, and } from 'drizzle-orm';

export async function matchFragments(projectId: string, queryEmbedding: number[], limit = 5) {
  const similarity = sql<number>`1 - (${cosineDistance(knowledgeBase.embedding, queryEmbedding)})`;
  
  return await db
    .select({
      id: knowledgeBase.id,
      content: knowledgeBase.contentFragment,
      metadata: knowledgeBase.metadata,
      similarity,
    })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.projectId, projectId),
        sql`${knowledgeBase.embedding} IS NOT NULL`
      )
    )
    .orderBy(desc(similarity))
    .limit(limit);
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `chunkText` | Test with various text lengths and markdown structures to ensure proper overlap and fragment sizes. |
| Unit | `EmbeddingService` | Mock Gemini SDK to verify correct payload handling and dimension validation. |
| Integration | `matchFragments` | Use a test database with `pgvector` to verify that cosine similarity returns the expected top-K fragments. |
| E2E | Semantic Recall Flow | Trigger a research task and verify that fragments appear in the knowledge base and are retrievable via query. |

## Migration / Rollout

1. **Database Extension**: Enable `vector` extension in Supabase via SQL migration.
2. **Schema Migration**: Apply Drizzle migration to create `knowledge_base` table and HNSW index.
3. **Environment Variables**: Add `GOOGLE_AI_API_KEY` to the worker environment.
4. **Phased Indexing**: Initially only index new research data. Existing data can be backfilled via a one-off script if needed.

## Open Questions

- [ ] Should we use Matryoshka embeddings (truncation to 256/512) to save space if the database grows beyond 1M fragments?
- [ ] Is BullMQ the final choice for worker infrastructure, or should we use Supabase Edge Functions / Queues?
