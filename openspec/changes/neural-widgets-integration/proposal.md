# Proposal: Neural Widgets Integration

## Intent
Enhance the Nous Studio with a modular widget system ("Neural Widgets") to provide contextual intelligence and navigation without disrupting the writing flow.

## Scope

### In Scope
- Create `@nous/ui-widgets` package for shared widget components.
- Implement `WidgetContainer` with collapsable state and motion-enhanced loading indicators.
- Implement `OutlineMap` widget for hierarchical content navigation and editor injection.
- Implement `SemanticMemory` widget for pgvector-based recall via tRPC.
- Integrate a "Stacks" sidebar layout in the Studio.

### Out of Scope
- Full refactor of the existing sidebar (only adding the Stacks system).
- New tRPC endpoints (assuming recall exists or will be minimal extensions).

## Capabilities

### New Capabilities
- `ui-widgets-system`: Core framework for developing and registering Studio widgets.
- `outline-navigation`: Real-time content structure visualization and interaction.

### Modified Capabilities
- `semantic-recall-ui`: Extending recall visualization with compact widget cards.

## Approach
1. **Infrastructure**: Setup `@nous/ui-widgets` in the monorepo (or as a dedicated folder in `src/components`).
2. **Components**: Develop `WidgetContainer` using Framer Motion for smooth transitions.
3. **Widgets**:
   - `OutlineMap`: Tree-view using Tiptap content as source.
   - `SemanticMemory`: tRPC query for `recall.search`.
4. **Layout**: Modify `StudioSidebar` to support a vertical stack of widgets.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/studio` | Modified | Integration of the Stacks sidebar. |
| `src/packages/ui-widgets` | New | New package for widget components. |
| `src/hooks/use-outline.ts` | New | Hook to sync editor content with OutlineMap. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Performance lag with large outlines | Medium | Use memoization and virtualized lists if needed. |
| UI clutter in sidebar | Medium | "Zen" design: collapsable containers and minimal cards. |

## Rollback Plan
Revert changes to `StudioSidebar` and remove the `ui-widgets` package folder.

## Success Criteria
- [ ] Widgets are collapsable and animatable.
- [ ] `OutlineMap` correctly reflects editor headers.
- [ ] `SemanticMemory` displays recall results in compact cards.
