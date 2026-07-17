# Design: Unified Content Source of Truth (SSOT)

## Technical Approach

The objective is to eliminate the "Double-Write" architecture where article content is stored in both `tasks.content_body` and the `task_contents` table. We will establish `task_contents` as the single authoritative source of truth (SSOT) for all article bodies.

The strategy follows a compiler-driven refactor:
1. **Data Migration**: Safely mirror and verify all content in `task_contents` before dropping the legacy column.
2. **Type Enforcement**: Remove `content_body` from the `Task` type to force the identification of all illegal access points via TypeScript errors.
3. **Layer Refactoring**: Centralize content retrieval and persistence in the persistence slice and pipeline services.
4. **Pipeline Synchronization**: Ensure the Orb pipeline fetches the most recent content directly from the SSOT, preventing race conditions or stale data usage.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|------------|
| **SSOT Table** | `task_contents` | `tasks` (consolidated) | `task_contents` allows for better scaling and separation of metadata (tasks) from heavy content (bodies), preventing bloated task queries. |
| **Migration Path** | Mirror $\rightarrow$ Verify $\rightarrow$ Drop | Immediate Drop | Mirroring ensures zero data loss. Verification query provides a safety gate before destructive action. |
| **Content Fetching** | Direct DB call / Store Rehydration | Joining every task query | Joining `task_contents` in every list view would degrade performance. Heavy content is loaded only on demand (Writer/Export). |

## Data Flow

### Content Retrieval Flow
`UI/Pipeline` $\rightarrow$ `PersistenceSlice.fetchCurrentBody()` $\rightarrow$ `supabase('task_contents')` $\rightarrow$ `Store State`

### Content Update Flow
`Pipeline` $\rightarrow$ `supabase('task_contents').upsert()` $\rightarrow$ `supabase('tasks').update(metadata)` $\rightarrow$ `UI Refresh`

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/project.ts` | Modify | Remove `content_body` from `Task` interface. |
| `src/store/writer/persistence-slice.ts` | Modify | Implement `fetchCurrentBody()`. Refactor `loadContentById` and `initializeFromTask` to rely solely on `task_contents`. |
| `src/lib/services/writer/pipeline.ts` | Modify | Ensure all pipeline functions (`executeDraftPipeline`, etc.) write content exclusively to `task_contents`. |
| `src/components/dashboard/EditorialCalendar.tsx` | Modify | Update `runTask...Pipeline` helpers to remove fallback to `task.content_body`. Update export handlers to join with `task_contents`. |
| `src/utils/exportUtils.ts` | Modify | Update CSV/TSV formatters to handle content passed as a separate property or joined type. |

## Interfaces / Contracts

### New Helper Type
To support exports without modifying the base `Task` type:
```typescript
export type TaskWithContent = Task & {
    content_body: string;
};
```

### Access Layer Method
```typescript
// Added to PersistenceSlice
fetchCurrentBody: (taskId: string) => Promise<string>;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Database** | Migration Integrity | Run verification query: `COUNT(*) where tasks.content_body != task_contents.content_body`. |
| **Integration** | Content Load/Save | Verify that saving content in Writer updates `task_contents` and NOT `tasks`. |
| **E2E** | Orb Pipeline | Run a batch pipeline and verify content persistence in `task_contents` between steps. |
| **Regression** | Export Utility | Export a task to CSV and verify the "Contenido" column is populated. |

## Migration / Rollout

### SQL Migration Plan
1. **Mirroring**: 
   ```sql
   INSERT INTO task_contents (id, content_body) 
   SELECT id, content_body FROM tasks 
   WHERE content_body IS NOT NULL 
   AND id NOT IN (SELECT id FROM task_contents);
   ```
2. **Synchronization**:
   ```sql
   UPDATE task_contents tc 
   SET content_body = t.content_body 
   FROM tasks t 
   WHERE tc.id = t.id AND t.content_body IS NOT NULL;
   ```
3. **Verification**:
   ```sql
   SELECT count(*) FROM tasks 
   WHERE content_body IS NOT NULL 
   AND (NOT EXISTS (SELECT 1 FROM task_contents WHERE id = tasks.id) 
       OR content_body != (SELECT content_body FROM task_contents WHERE id = tasks.id));
   ```
4. **Cleanup**: 
   `ALTER TABLE tasks DROP COLUMN content_body;`

## Open Questions
- [ ] Should we implement a caching layer for `task_contents` in the store to avoid repeated DB calls during fast switches? (Decision: Keep it simple for now, direct DB call is sufficient for current load).
