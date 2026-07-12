# Proposal: Mini Editor Pipeline Integration

## Intent
Connect the `Mini Editor` to the `surgical editing pipeline` using the `streamSurgicalEdit` function. Share the `tiptap` editor across all minitools (like `MiniHumanizerModal`).

## Scope
- Modify `MiniEditorModal.tsx` to include controls for the surgical editing pipeline.
- Ensure `tiptap` editor is available across all minitools. (Wait, they already use `useEditor` from `@tiptap/react` as seen in `MiniHumanizerModal.tsx` and `MiniEditorModal.tsx`).
- Wait, the user said: "el mini editor deberia activar el pepiline de edición quirurgica. No me molesta lo del tiptap, de hecho, me gustaría las demás herramientas también lo tengan"
Actually, both `MiniHumanizerModal` and `MiniEditorModal` ALREADY use tiptap. Let's check `CustomTransformModal.tsx` to see if it uses tiptap. If not, we should add it there too.
