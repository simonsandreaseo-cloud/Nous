## Exploration: 05-asset-engine-migration

### Current State (Nous 2.0)
The image processing in 2.0 is handled by `VisualEngine` and `PostProcessingService`. While technically running on the server (via Server Actions in `imageActions.ts`), the logic is still coupled to the Next.js application structure.
- **Pollinations**: Used for image generation via direct URL construction.
- **Sharp**: Used for resizing, watermarking, and WebP conversion.
- **Supabase**: The server-side code uses `SERVICE_ROLE` to bypass RLS and handle uploads directly to the `content-images` bucket.
- **Workflow**: Analyzing text -> Planning images -> Generating URLs -> Downloading/Processing -> Uploading -> DB Persistence.

### Affected Areas
- `src/lib/actions/imageActions.ts` — Will be replaced by calls to the new `@nous/assets` package.
- `src/lib/services/writer/VisualEngine.ts` — Logic will be migrated to the package.
- `src/lib/services/images/PostProcessingService.ts` — Core logic for Sharp will be encapsulated in `@nous/assets`.
- `research-worker` — New integration point for automatic image suggestions.

### Approaches
1. **Monolithic Migration** — Keep the logic within the Next.js API/Actions but refactor for better separation.
   - Pros: Simple to implement, no new package management overhead.
   - Cons: Harder to reuse in background workers (like `research-worker`), keeps `sharp` dependency in the main app.
   - Effort: Low

2. **Decoupled Package (@nous/assets)** — Extract all image logic into a dedicated backend package.
   - Pros: Clean separation of concerns, `sharp` stays in the backend only, easily consumable by workers and the main API, centralized asset management.
   - Cons: Initial setup overhead for the package.
   - Effort: Medium

### Recommendation
I recommend **Approach 2 (Decoupled Package)**. In Nous 3.0, we need the `research-worker` to be able to trigger image generation without relying on the Next.js frontend or actions. Centralizing this in `@nous/assets` ensures that the `ImageGenerator` is a pure backend service that can be scaled independently on Render.

### Proposed Architecture for 3.0
- **@nous/assets/ImageGenerator**: A service that takes text/prompts and returns processed storage paths.
- **@nous/assets/Processor**: Encapsulates `sharp` logic for optimization and watermarking.
- **Automatic Trigger**: The `research-worker` calls `ImageGenerator` upon completion of content analysis.
- **Storage**: Backend uses `SERVICE_ROLE` exclusively. The frontend only reads from public URLs or signed URLs.

### Risks
- **Sharp on Render**: Ensuring the Render environment has the necessary native dependencies for `sharp`.
- **Latency**: Generation and optimization take time; must be handled via background jobs (BullMQ) to avoid blocking the main thread.

### Ready for Proposal
Yes — The architecture is clear. We can proceed to define the specs for the `@nous/assets` package.
