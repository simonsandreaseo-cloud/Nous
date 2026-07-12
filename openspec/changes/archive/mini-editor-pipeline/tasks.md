# Tasks: Mini Editor Pipeline Integration

## Phase 1: Mini Editor Update
- [ ] Add `streamSurgicalEdit` import to `MiniEditorModal.tsx`.
- [ ] Add AI processing state (`isProcessing`, `statusMessage`, `error`, `selectedModel`, etc.) to `MiniEditorModal.tsx`.
- [ ] Add the model selector dropdown in the footer.
- [ ] Add a "Edición Quirúrgica" button that triggers `streamSurgicalEdit(editor.getHTML(), {}, 50, ...)` and updates the editor content chunk by chunk.
- [ ] Make the editor readonly when processing.

## Phase 2: Custom Transform Update
- [ ] Replace `inputHtml` textarea in `CustomTransformModal.tsx` with a `tiptap` editor using `useEditor` and `getSharedExtensions`.
- [ ] Allow getting the HTML from the tiptap editor for the transformation process.
- [ ] Update UI to fit the tiptap editor nicely in the left column.
