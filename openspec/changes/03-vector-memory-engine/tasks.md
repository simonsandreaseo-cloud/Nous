# Tasks: 03-vector-memory-engine

## Phase 1: Database Migration
- [ ] Enable pgvector extension in Supabase/PostgreSQL.
- [ ] Create Drizzle schema for knowledge_base table in src/lib/db/schema/knowledge-base.ts.
- [ ] Configure HNSW index for cosine similarity search on the embedding column.
- [ ] Generate and apply Drizzle migration (
px drizzle-kit generate & migrate).

## Phase 2: Embedding Service
- [ ] Implement EmbeddingService in src/lib/embeddings/service.ts using @google/generative-ai.
- [ ] Integrate 	ext-embedding-004 with support for 768 dimensions.
- [ ] Implement Chunker in src/lib/embeddings/chunker.ts with Recursive Character Splitting logic.
- [ ] Add unit tests for chunking logic and embedding generation (mocked).

## Phase 3: Background Worker
- [ ] Define ector-queue in the BullMQ configuration.
- [ ] Create src/lib/jobs/vector-worker.ts to handle embedding and storage tasks.
- [ ] Implement retry logic and error handling for Gemini API rate limits.
- [ ] Verify worker connectivity with Redis and the database.

## Phase 4: Integration
- [ ] Update src/lib/jobs/research-worker.ts to extract fragments after research completion.
- [ ] Implement logic to enqueue fragments into ector-queue with proper metadata.
- [ ] Ensure projectId is correctly propagated through the vectorization pipeline.
- [ ] Conduct integration test of the full flow: Research -> Chunking -> Vectorization -> Storage.

## Phase 5: Search Implementation
- [ ] Create RecallService in src/lib/services/ai/recall.ts.
- [ ] Implement matchFragments function using Drizzle's cosineDistance helper.
- [ ] Create an internal API/service method for the AI to query relevant context.
- [ ] Add integration tests for semantic search accuracy and performance.
