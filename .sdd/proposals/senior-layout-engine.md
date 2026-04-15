# Proposal: senior-layout-engine

## Intent

Transform the current image generation system from a simple "image-per-paragraph" tool into a professional web design layout engine. The goal is to decouple visual assets from fragile paragraph indexes, introduce layout-aware AI generation, and ensure that the resulting design is portable to external platforms like WordPress and Shopify via inline CSS.

## Scope

### In Scope
- **Semantic Anchoring**: Transition from `paragraphIndex` to phrase-based semantic anchors for robust image placement.
- **Layout-Aware Prompting**: Integration of layout types (Hero, Icon, Infographic) into the AI planning and generation pipeline.
- **Portable HTML Export**: Implementation of inline styles in Tiptap's `renderHTML` for visual properties (alignment, wrapping, dimensions).
- **Interactive Slot System**: A new `imageSlot` Tiptap node for manual design marking and AI targeting.
- **Design Blueprints**: Templates for automatic slot distribution based on article architecture.
- **Infrastructure Decoupling**: Extraction of image processing into a dedicated `PostProcessingService` and parallelization of uploads.

### Out of Scope
- Integration with external DAM (Digital Asset Management) systems.
- Real-time collaborative editing of image slots.
- Automatic generation of SVG infographics (only raster images).

## Capabilities

### New Capabilities
- `semantic-anchoring`: Ability to link images to specific text phrases that survive content edits.
- `layout-aware-generation`: AI generates images tailored to their layout role (e.g., minimal icons for lists vs. cinematic heroes).
- `portable-layout-export`: Generation of HTML with embedded CSS for cross-platform layout fidelity.
- `image-slotting`: Manual placement of design placeholders that act as targets for the AI pipeline.
- `design-blueprints`: Automated layout scaffolding based on predefined article patterns.
- `parallel-asset-processing`: High-performance image optimization and upload pipeline.

### Modified Capabilities
- `image-planning`: Updated to generate semantic anchors and layout roles instead of just paragraph indices.
- `image-persistence`: Refactored from a monolithic server action to a service-based architecture with parallel execution.

## Approach

### 1. Semantic Anchoring & Planning
- Update `ImagePlanningService` to use a "Contextual Anchor" strategy. Instead of `paragraphIndex: 5`, Gemini will return `anchor: "The impact of climate change on coral reefs"`.
- The insertion logic will search the document for the first occurrence of this anchor to place the `nousAsset`.

### 2. Layout-Aware Pipeline
- Introduce a `LayoutRole` enum (`HERO`, `ICON`, `FEATURE`, `INFO`).
- `ImagePlanningService` will assign a `LayoutRole` to each image.
- `ImageWorkflowService` will map `LayoutRole` to specific `ImagePresets` (e.g., `ICON` $\rightarrow$ high-contrast, white background, centered subject).

### 3. Tiptap Slot System & Blueprints
- Implement `imageSlot` node: A non-rendering placeholder in the editor that stores desired `LayoutRole` and `prompt` hints.
- `ImageWorkflowService` will scan for `imageSlot` nodes first. If found, it fills them; if not, it falls back to AI planning.
- `BlueprintService` will provide functions like `applyListicleBlueprint(editor)` to inject slots at strategic points.

### 4. Portable HTML
- Modify `NousAsset.renderHTML` to convert attributes (`align`, `wrapping`, `width`) into a `style` string (e.g., `style="float: left; margin-right: 2rem; width: 50%"`).

### 5. Infrastructure Refactor
- Create `PostProcessingService` to handle Sharp operations (resizing, watermarking, WebP conversion) and Supabase upload.
- Update `ImageWorkflowService.persistImages` to use `Promise.allSettled` for concurrent uploads, reducing total pipeline time.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/services/imagePlanningService.ts` | Modified | Add semantic anchor extraction and layout role assignment. |
| `src/lib/services/writer/image-workflow.ts` | Modified | Implement slot detection, parallel persistence, and layout-aware prompt assembly. |
| `src/lib/tiptap-nous-asset.ts` | Modified | Update `renderHTML` for inline CSS export. |
| `src/lib/tiptap-image-slot.ts` | New | Define the `imageSlot` Tiptap node. |
| `src/lib/services/postProcessingService.ts` | New | Extract optimization and upload logic from `imageActions.ts`. |
| `src/lib/actions/imageActions.ts` | Modified | Delegate processing to `PostProcessingService`. |
| `src/components/contents/writer/MediaTab.tsx` | Modified | Update insertion logic to use semantic anchors. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Anchor collision (same phrase appearing twice) | Med | Use a "fuzzy match" or select the phrase closest to the original paragraph index. |
| CSS incompatibility in some CMS | Low | Use standard CSS properties (float, width, margin) that are universally supported. |
| Parallel upload rate limits | Low | Implement a simple concurrency limit (e.g., max 5 concurrent uploads). |

## Rollback Plan

- **Code**: Revert to previous commit.
- **Data**: No destructive DB changes planned; existing `paragraphIndex` remains as a fallback in the `nousAsset` attributes.

## Dependencies

- `sharp` for image processing (already present).
- `@tiptap/core` and `@tiptap/react` for new node implementation.

## Success Criteria

- [ ] Images stay in the correct position after adding/removing paragraphs (via semantic anchors).
- [ ] Generated images for "icons" are visually distinct from "hero" images.
- [ ] Exported HTML maintains layout (float/width) when pasted into an external editor.
- [ ] `imageSlot` nodes can be manually placed and filled by the AI.
- [ ] Image upload time for articles with 5+ images is reduced by $\sim 50\%$ due to parallelization.
