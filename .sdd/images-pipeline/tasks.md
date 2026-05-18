# Implementation Tasks: Unified Editorial Visual Pipeline

- [x] **Phase 1: Blueprinting**
    - [x] Refactor `ImagePlanningService` to return the new `VisualBlueprint` schema.
    - [x] Update writing prompts to stop using `[[image]]` markers.
- [x] **Phase 2: Production Pipeline**
    - [x] Consolidate `VisualEngine` to strictly use the flow `Gen` -> `Sharp` -> `Storage`.
    - [x] Implement `PostProcessingService` for aggressive weight optimization (max_kb).
- [x] **Phase 3: Semantic Layout**
    - [x] Implement `SemanticAnchorManager` for phrase searching in DOM.
    - [x] Create the component injection engine in `LayoutService`.
- [x] **Phase 4: Portability & Export**
    - [x] Integrate `PatcherMaster` into the final export flow.
    - [x] Define presets of "Screaming Styles" for transactional landing pages.
- [x] **Phase 5: UI Integration**
    - [x] Connect `WriterStudio` with new regeneration and planning Server Actions.
    - [ ] Implement Visual Blueprint UI (Planning board).

