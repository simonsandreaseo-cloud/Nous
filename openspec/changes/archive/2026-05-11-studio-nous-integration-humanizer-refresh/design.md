# Design: studio-nous-integration-humanizer-refresh

## Technical Approach

The goal is to decouple the AI assistant's visual representation (`NousOrb`) from its operational interface (the action menu) and integrate this interface directly into the Studio's sidebar. Simultaneously, the humanization process will be updated to allow iterative runs and ensure strict metadata tracking in the database.

### UI Refactoring
- **Decoupling**: Extract the menu logic (Action buttons, Pipeline toggles, Console toggle) from `NousOrb.tsx` into a new standalone component `NousAssistantMenu.tsx`.
- **Contextual Positioning**: Introduce a `variant` prop to `NousOrb` to handle two states: `floating` (fixed position for general dashboard use) and `header` (relative position for the Studio sidebar).
- **Studio Integration**: Replace the inline `NousOrb` in `WriterStudio.tsx` (within the 'nous' tab) with a layout that combines the `NousOrb` (as a header) and the `NousAssistantMenu` (as the main content).

### Humanizer Logic Update
- **Permission Lift**: Ensure no guards in `useWriterActions.ts` or `services.ts` block the execution of `runHumanizerPipeline` based on the `is_humanized` flag.
- **Metadata Persistence**: Implement an explicit database update call after a successful humanization pipeline run to sync `is_humanized: true` and `humanized_at: current_timestamp` to the `tasks` table.

## Architecture Decisions

### Decision: Component Split (Orb vs. Menu)
**Choice**: Extract `NousAssistantMenu` from `NousOrb`.
**Alternatives considered**: Keeping them together and using CSS to hide/show parts.
**Rationale**: `NousOrb` is primarily a 3D visual indicator and trigger. The menu is a complex set of forms and action lists. Splitting them improves maintainability and allows the menu to be used in different layout contexts (like the sidebar) without dragging the floating positioning logic.

### Decision: Positioning Strategy
**Choice**: Prop-driven positioning (`variant="floating" | "header"`).
**Alternatives considered**: Creating two separate components.
**Rationale**: The 3D orb visual logic is identical in both cases; only the wrapper's CSS layout changes. A prop is cleaner and avoids code duplication.

## Data Flow

### Humanizer Refresh Sequence

```
User Action (NousAssistantMenu) 
    │
    ▼
useWriterActions.ts (handleHumanize)
    │
    ├─► setHumanizing(true)
    │
    ▼
services.ts (runHumanizerPipeline)
    │
    ├─► Chunking ──► Humanization Phase ──► SEO/Review Phase
    │
    ▼
useWriterActions.ts (Completion)
    │
    ├─► store.setContent(refinedHtml)
    │
    └─► Supabase Update (tasks table)
        └─► { metadata: { is_humanized: true, humanized_at: now } }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/dashboard/NousAssistantMenu.tsx` | Create | New component containing the action lists, pipeline toggles, and console trigger logic. |
| `src/components/dashboard/NousOrb.tsx` | Modify | Remove menu JSX/logic. Add `variant` prop to toggle between `fixed` and `relative` positioning. |
| `src/components/contents/writer/WriterStudio.tsx` | Modify | Update the 'nous' tab rendering to use `NousOrb` (header) + `NousAssistantMenu` (content). |
| `src/components/contents/writer/useWriterActions.ts` | Modify | Add Supabase update call in `handleHumanize` to persist humanization metadata. |

## Interfaces / Contracts

### NousOrb Props Update
```typescript
interface NousOrbProps {
    variant?: 'floating' | 'header';
    // ... existing props
}
```

### Supabase Update Payload
```typescript
{
    metadata: {
        is_humanized: true,
        humanized_at: new Date().toISOString(),
        // preserve other metadata
    }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| UI/Visual | Sidebar Layout | Verify `NousOrb` is no longer floating when in the 'nous' tab and the menu is correctly contained. |
| Functional | Iterative Humanization | Trigger humanization on already humanized content and verify it executes without blocking. |
| Integration | DB Persistence | Verify that `is_humanized` and `humanized_at` are updated in the `tasks` table after a successful run. |

## Migration / Rollout
No migration required.
