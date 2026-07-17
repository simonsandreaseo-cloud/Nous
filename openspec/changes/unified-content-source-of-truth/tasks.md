# Tasks: Unified Content Source of Truth (SSOT)

## Phase 1: Foundation & Data Migration
- [ ] 1.1 Create SQL migration to mirror 	asks.content_body data into 	ask_contents for all existing articles.
- [ ] 1.2 Verify data parity between 	asks.content_body and 	ask_contents using a verification query.
- [ ] 1.3 Execute SQL migration to drop the content_body column from the 	asks table.
- **Verification**: Run a query to confirm 	asks.content_body is gone and 	ask_contents contains all expected data.

## Phase 2: Type System Update
- [ ] 2.1 Remove content_body property from the Task type definition (likely in src/types/task.ts or equivalent).
- [ ] 2.2 Fix any resulting TypeScript errors in interfaces that extended or used the Task type.
- **Verification**: Run 
pm run type-check (or 	sc) to ensure all legacy references to 	ask.content_body are flagged.

## Phase 3: Persistence Layer Refactoring
- [ ] 3.1 Refactor src/store/writer/persistence-slice.ts: Update content retrieval logic to fetch exclusively from 	ask_contents.
- [ ] 3.2 Refactor src/store/writer/persistence-slice.ts: Update content save/update logic to target only 	ask_contents.
- [ ] 3.3 Remove any fallback code that attempted to read from 	asks.content_body.
- **Verification**: Unit test the persistence methods to ensure content is correctly saved to and read from 	ask_contents.

## Phase 4: Pipeline & Logic Refactor
- [ ] 4.1 Refactor src/lib/services/writer/pipeline.ts: Remove double-write logic that updated both 	asks and 	ask_contents.
- [ ] 4.2 Update queue handlers and background workers to ensure they only update 	ask_contents.
- [ ] 4.3 Clean up pipeline function signatures to remove deprecated content arguments.
- **Verification**: Perform a trace of a content update request to verify only one database write occurs in the 	ask_contents table.

## Phase 5: UI & Export Integration
- [ ] 5.1 Refactor src/components/dashboard/EditorialCalendar.tsx: Update data fetching to use the unified persistence layer for the latest content.
- [ ] 5.2 Refactor src/utils/exportUtils.ts: Ensure the export process retrieves article bodies from the unified 	ask_contents source.
- **Verification**: Confirm the Editorial Calendar displays current content and the generated exports contain the correct article body.

## Phase 6: Final Validation
- [ ] 6.1 Execute a full end-to-end flow: Create article $\rightarrow$ Edit content $\rightarrow$ Export article.
- [ ] 6.2 Final Database Audit: Verify 	asks table schema is clean and 	ask_contents is the sole source of truth.
- **Verification**: E2E test pass and database schema verification.
