# Tasks: 06-batch-optimization

## Phase 1: Technical Debt & Cleanup
- [x] 1.1 Fix Linter Errors: Resolve the `react/no-unescaped-entities` errors in `SEODataTab.tsx` and `InventorySidebar.tsx`.
- [x] 1.2 Fix cascading `setState` warnings in `BriefingEditorPanel`, `OutlineEditorPanel`, and `TranslationSidebarPanel` by removing synchronous state updates from effects.

## Phase 2: El Motor de Optimización en Lote (The Magic Button)
- [x] 2.1 Service Layer: Create `src/lib/services/writer/seo-optimization.ts` with the new AI optimization schema. Set up prompt engineering to require natural insertions of LSI/ASK and the 40-word "Nectar".
- [x] 2.2 Integration: Connect the "Aplicar Optimización en Lote" button in `SEODataTab.tsx` to the new service. Handle loading states, error boundaries, and notifications.
- [x] 2.3 Tiptap Bridge: Implement the global text replacement logic. Iterate through the AI response (`paragraphEdits`) and replace nodes in the editor securely without breaking the structure.

## Phase 3: El Néctar & External Linking (Post-Processing)
- [x] 3.1 Nectar Injection: If the AI provides `nectarParagraph`, find the first `h1` in the editor (or start of document) and insert a paragraph immediately below it.
- [x] 3.2 External Links Injection: Map the `externalLinks` array from the AI to the content, finding exact matches of `anchorText` and applying a `href` mark. Limit to 1-2 links per default settings.

## Phase 4: Floating Outline UI
- [x] 4.1 Component Creation: Create `src/components/contents/writer/widgets/FloatingOutlineUI.tsx`. Implement the horizontal-scroll contextual menu and the orange "Outline" sticky button.
- [x] 4.2 Sidebar Deprecation: Remove the `OutlineEditorPanel` from `src/components/contents/writer/ContentsSidebar.tsx` to free up space.
- [x] 4.3 Interactive Insertion: Connect the floating UI to the Tiptap editor so clicking "Insert Segment" drops the outline segment directly into the text with a smooth animation (Framer Motion or pretext).