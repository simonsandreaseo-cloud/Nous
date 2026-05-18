# Technical Design: Unified Editorial Visual Pipeline

## 🏛 Component Architecture
1. **`ImagePlanningService`**: Generates the `VisualBlueprint` (JSON) analyzing content and goal (e.g., transactional landing page).
2. **`VisualEngine` (The Orchestrator)**:
    - Receives the Blueprint.
    - Coordinates `PollinationsService` for generation.
    - Sends result to `PostProcessingService` for WebP conversion and upload.
    - Registers asset in `task_images` table.
3. **`LayoutService`**:
    - Receives raw HTML and `ImageAsset` list.
    - Uses `SemanticAnchorManager` to locate exact position.
    - Inserts "Screaming HTML" components.
4. **`PatcherMaster`**:
    - Final export filter.
    - Applies domain substitution regex and final CSS styles.

## 🔄 Data Flow (Sequence)
`User Request` -> `ImagePlanningService` -> `VisualEngine` -> `Supabase Storage` -> `LayoutService` -> `PatcherMaster` -> `Final HTML`.
