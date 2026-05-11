# Tasks: studio-nous-integration-humanizer-refresh

## Phase 1: Foundation
- [ ] 1.1 Modify `src/components/dashboard/NousOrb.tsx`: Add `variant?: 'floating' | 'header'` to `NousOrbProps`.
- [ ] 1.2 Create `src/components/dashboard/NousAssistantMenu.tsx`: Extract the action buttons, pipeline toggles, and console trigger logic from `NousOrb.tsx`.

## Phase 2: UI Integration
- [ ] 2.1 Modify `src/components/dashboard/NousOrb.tsx`: Remove the internal menu state/JSX and apply CSS changes based on `variant` (fixed vs relative).
- [ ] 2.2 Modify `src/components/contents/writer/WriterStudio.tsx`: Update the 'nous' tab content to render `NousOrb` as a header and `NousAssistantMenu` as the main body.
- [ ] 2.3 Verify: Ensure the 'nous' tab layout is correct and `NousOrb` does not float over the UI when in the sidebar.

## Phase 3: Humanizer Logic
- [ ] 3.1 Modify `src/components/contents/writer/useWriterActions.ts`: Remove guards in `handleHumanize` that block execution if `is_humanized` is true.
- [ ] 3.2 Modify `src/components/contents/writer/useWriterActions.ts`: Implement a Supabase update call to the `tasks` table to set `is_humanized: true` and `humanized_at: now` after `runHumanizerPipeline` completes.
- [ ] 3.3 Verify: Trigger humanization on previously humanized content and check that the process starts and the DB timestamp updates.

## Phase 4: Validation
- [ ] 4.1 Test: Verify "Acciones de Edición" and "Acciones Inteligentes" work as expected within the `NousAssistantMenu` in the sidebar.
- [ ] 4.2 Test: Verify the iterative humanization flow from UI trigger to DB persistence.

## Phase 5: Cleanup
- [ ] 5.1 Clean up `src/components/dashboard/NousOrb.tsx`: Remove any unused imports or legacy state related to the old menu.
