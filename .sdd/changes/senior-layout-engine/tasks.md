# Tasks: senior-layout-engine

## Phase 1: Foundation & Type Safety
- [ ] 1.1 Define `LayoutRole` enum (`HERO`, `ICON`, `FEATURE`, `INFO`) in `src/lib/types/layout.ts`.
- [ ] 1.2 Implement `imageSlot` Tiptap node in `src/lib/tiptap-image-slot.ts` with attributes for `role` and `prompt`.
- [ ] 1.3 Fix type errors in `src/components/contents/writer/MediaTab.tsx`: Correct `AssetCardProps` to include `asset` property.
- [ ] 1.4 Fix type errors in `src/components/contents/writer/MediaTab.tsx`: Correct `ImageLightboxProps` to include `image` property.
- [ ] 1.5 Fix type errors in `src/hooks/useImageManager.ts`: Resolve argument count and `HeadlessLayoutResult` property mismatches.
- [ ] 1.6 Fix syntax errors in `src/lib/services/writer/batch-actions.ts`: Correct commas and brackets in lines 312 and 336.

## Phase 2: Core Implementation
- [ ] 2.1 Implement `PostProcessingService` in `src/lib/services/postProcessingService.ts` for Sharp operations and Supabase uploads.
- [ ] 2.2 Refactor `src/lib/actions/imageActions.ts` to delegate processing to `PostProcessingService`.
- [ ] 2.3 Update `ImagePlanningService` in `src/lib/services/imagePlanningService.ts` to extract semantic anchors and assign `LayoutRole`.
- [ ] 2.4 Implement `ImageWorkflowService.persistImages` using `Promise.allSettled` for parallel uploads in `src/lib/services/writer/image-workflow.ts`.
- [ ] 2.5 Implement `BlueprintService` to inject `imageSlot` nodes based on predefined patterns.

## Phase 3: Integration & Rendering
- [ ] 3.1 Update `NousAsset.renderHTML` in `src/lib/tiptap-nous-asset.ts` to convert layout attributes to inline CSS.
- [ ] 3.2 Update `MediaTab.tsx` insertion logic to resolve semantic anchors and place images.
- [ ] 3.3 Integrate `imageSlot` detection in `ImageWorkflowService` to prioritize slot filling over AI planning.

## Phase 4: Verification
- [ ] 4.1 Test Scenario: Verify image position survival after content edits (Semantic Anchoring).
- [ ] 4.2 Test Scenario: Verify visual distinction between HERO and ICON images (Layout-Aware Prompting).
- [ ] 4.3 Test Scenario: Verify 1:1 layout fidelity when pasting exported HTML into external CMS.
- [ ] 4.4 Test Scenario: Verify manual `imageSlot` filling.
- [ ] 4.5 Benchmark: Compare upload time for 5+ images before and after parallelization.
