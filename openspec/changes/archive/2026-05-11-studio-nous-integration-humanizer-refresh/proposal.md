# Proposal: studio-nous-integration-humanizer-refresh

## Intent

Modernize the AI interaction in the Studio by moving the assistant menu from a floating `NousOrb` to a dedicated 'Nous' tab in the sidebar. Additionally, standardize and improve the Humanizer logic to allow iterative refinement.

## Scope

### In Scope
- **UI Integration**:
  - Create a new `NousTab` component in the `WriterSidebar`.
  - Move "Acciones de Edición" (Single Action triggers: SEO, Generate, Humanize) to the `NousTab`.
  - Move "Acciones Inteligentes" (Batch Pipeline: Research, Draft, Humanize, Translate) to the `NousTab`.
  - Refactor `NousOrb` to remove its `fixed` positioning and the floating menu functionality, keeping it as a purely visual status/progress indicator.
- **Humanizer Logic**:
  - Allow text to be re-processed by the humanizer even if `is_humanized` is already true.
  - Ensure `is_humanized` and `humanized_at` metadata are updated upon every successful humanization.
  - Standardize "Humanize" action availability across Planner and Writer views.

### Out of Scope
- Modification of the core AI prompts used by the humanizer.
- Changing the underlying `runHumanizerPipeline` implementation.

## Capabilities

### New Capabilities
- `nous-studio-tab`: A centralized AI control center in the sidebar for both single and batch actions.

### Modified Capabilities
- `content-humanizer`: Now supports iterative processing and updated metadata tracking.

## Approach

1. **UI Refactor**:
   - **New Component**: Create `src/components/contents/writer/NousTab.tsx` to house the extracted logic from `NousOrb`.
   - **Sidebar Integration**: Update `WriterSidebar.tsx` to include the 'Nous' tab in the navigation and the `renderTabContent` switch.
   - **Orb Decoupling**: Modify `NousOrb.tsx` to remove the `isOpen` state and the `fixed` positioning. The Orb will now serve as a visual ornament (potentially inside the `NousTab` or as a non-blocking floating element) that simply reflects the `effectiveIsProcessing` state.
2. **Logic Enhancement**:
   - **Iterative Humanization**: Update `handleHumanize` in `useWriterActions.ts` to remove any guards against already humanized content.
   - **Metadata Sync**: Implement an update call to Supabase (table `tasks`) to refresh `is_humanized` and `humanized_at` timestamps after each successful humanization.
3. **Pipeline Migration**:
   - Move the `PipelineToggle` and batch execution logic from `NousOrb` to `NousTab`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/dashboard/NousOrb.tsx` | Modified | Remove menu logic, remove `fixed` position, keep visual indicator. |
| `src/components/contents/writer/WriterSidebar.tsx` | Modified | Add 'Nous' tab to navigation and render logic. |
| `src/components/contents/writer/NousTab.tsx` | New | Implements the new AI control center UI. |
| `src/components/contents/writer/useWriterActions.ts` | Modified | Update `handleHumanize` for re-processing and metadata updates. |
| `src/store/writer/types.ts` | Modified | Add `nous` to `SidebarTab` type. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Reduced accessibility of quick actions | Low | Ensure the 'Nous' tab is easily accessible and the layout is intuitive. |
| Metadata desync | Low | Use atomic updates in Supabase for `is_humanized` and `humanized_at`. |

## Rollback Plan

1. Revert changes to `WriterSidebar.tsx` and `NousOrb.tsx`.
2. Delete `NousTab.tsx`.
3. Revert `useWriterActions.ts` to the previous version of `handleHumanize`.

## Dependencies

- Existing `WriterSidebar` architecture.
- `useWriterActions` hook for triggering AI pipelines.

## Success Criteria

- [ ] "Acciones de Edición" and "Acciones Inteligentes" are fully functional within the 'Nous' sidebar tab.
- [ ] `NousOrb` no longer opens a menu and is no longer `fixed` in a way that blocks the UI.
- [ ] User can re-run "Humanize" on content that was previously humanized.
- [ ] `is_humanized` and `humanized_at` are correctly updated in the database after each run.
