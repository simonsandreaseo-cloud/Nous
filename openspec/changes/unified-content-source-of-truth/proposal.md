# Proposal: Unified Content Source of Truth (SSOT)

## Intent

Eliminate the "Double-Write" architecture where article content is mirrored in both the `tasks` and `task_contents` tables. This redundancy causes synchronization gaps, stale content in the UI, and data corruption during pipeline executions. The goal is to establish `task_contents` as the sole authoritative store for HTML content.

## Scope

### In Scope
- Remove `content_body` column from the `tasks` table.
- Refactor all data access layers to read/write content exclusively from `task_contents`.
- Update the `Task` TypeScript type to remove the `content_body` property.
- Unify content fetching logic across Editor, Pipeline, and Planner.
- Fix content synchronization in the "Orb" pipeline within `EditorialCalendar.tsx`.

### Out of Scope
- Changes to the `task_versions` table (this remains a historical archive).
- Modifications to how `word_count_real` is calculated (though it will now be decoupled from `tasks.content_body`).

## Capabilities

### New Capabilities
- `unified-content-storage`: A single, authoritative mechanism for managing draft content, ensuring that any update is immediately reflected across all views.

### Modified Capabilities
- `task-management`: Requirements for task retrieval now explicitly decouple metadata (from `tasks`) from content (from `task_contents`).
- `content-export`: Export utilities must now perform a join or a separate fetch to retrieve content for CSV/PDF exports.

## Approach

1. **Schema Clean-up**: Execute a migration to drop the `content_body` column from `tasks`.
2. **Type Enforcement**: Remove `content_body` from the `Task` type in `src/types/project.ts` to trigger compiler errors in all locations using the redundant field.
3. **Write Unification**: Audit `src/store/project/task-slice.ts` and `src/lib/services/writer/pipeline.ts` to ensure all `upsert` operations for content target only `task_contents`.
4. **Read Unification**: Update `persistence-slice.ts` (`initializeFromTask`) and `WriterStudio.tsx` to fetch content via `task_contents` exclusively.
5. **Pipeline Fix**: Refactor the `EditorialCalendar` "Orb" logic to ensure linear flow by awaiting `task_contents` updates before triggering subsequent pipeline stages.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/` | Modified | Migration to drop `tasks.content_body`. |
| `src/types/project.ts` | Modified | Remove `content_body` from `Task` type. |
| `src/store/project/task-slice.ts` | Modified | Remove `content_body` from `tasks` table operations. |
| `src/store/writer/persistence-slice.ts` | Modified | Unify content loading/saving to use `task_contents`. |
| `src/lib/services/writer/pipeline.ts` | Modified | Remove mirrored writes to `tasks`. |
| `src/lib/services/queue/handlers/` | Modified | Ensure all handlers target `task_contents` only. |
| `src/components/dashboard/EditorialCalendar.tsx` | Modified | Synchronize Orb pipeline via `task_contents`. |
| `src/utils/exportUtils.ts` | Modified | Update export logic to fetch content from `task_contents`. |

## Trade-offs

| Aspect | Impact | Analysis |
|--------|--------|-----------|
| **Planner Egress** | Neutral | No increase in payload. The Planner already uses `LIGHT_TASK_COLUMNS` to omit content. It will continue to fetch metadata from `tasks` and only fetch content from `task_contents` on demand. |
| **Read Latency** | Low | Slight increase for exports/batch reads as a join or second query is required. This is negligible compared to the gain in data integrity. |
| **Complexity** | Decreased | Removing the synchronization logic between two tables simplifies the codebase and reduces the surface area for bugs. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data loss during migration | Low | Perform a backup of `tasks.content_body` into a temporary table before dropping. |
| Breaking change in Export | Med | Implement a robust content fetcher in `exportUtils.ts` that handles missing content gracefully. |
| UI flicker during transition | Low | Ensure `WriterStudio` uses a loading state while fetching from `task_contents`. |

## Rollback Plan

1. Restore the `content_body` column to the `tasks` table via migration.
2. Re-add `content_body` to the `Task` type.
3. Re-introduce double-write logic in `task-slice.ts` and `pipeline.ts`.

## Dependencies

- None.

## Success Criteria

- [ ] `tasks` table no longer contains a `content_body` column.
- [ ] TypeScript compiles without errors after removing `content_body` from `Task` type.
- [ ] All content updates in the Editor are immediately visible in the Planner/Calendar without manual refresh.
- [ ] The "Orb" pipeline in `EditorialCalendar` processes content linearly without stale data overrides.
- [ ] Exports contain the correct, most recent version of the article.
