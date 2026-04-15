# Proposal: 06-batch-optimization

## Intent
Implement the "Aplicar Optimización en Lote" (Batch Optimization) engine for the Writer Studio. This feature acts as a "Magic Button" that analyzes the current content against SEO guidelines (LSI, ASK, Density, Interlinking) and intelligently rewrites or injects necessary keywords and elements without breaking the tone or structure of the content. Additionally, it must implement "El Néctar" (the ultra-optimized 40-word introduction paragraph right after the H1).

## Scope
- `SEODataTab.tsx`: Wire up the Magic Button to trigger the AI optimization service.
- `src/lib/services/writer/seo-optimization.ts` (New): Create a specialized AI service that takes the current editor content and missing/under-used SEO elements, and returns a surgical set of changes.
- `src/components/contents/writer/OutlineFloatingUI.tsx` (New): Migrate the Outline sidebar into a floating, interactive UI over Tiptap.
- Tiptap Editor Extensions/Commands: Ability to programmatically insert "El Néctar" and auto-link external references.

## Approach
1. **AI Optimization Service**: Instead of completely rewriting the content, the AI will be instructed to find natural insertion points for missing LSI/ASK keywords. We'll use a large context model (e.g. Gemini 3.1 Pro or Claude 3.5) with JSON output to return precise paragraph modifications: `[{ paragraphIndex: 3, newText: "..." }]`.
2. **Floating Outline UI**: Replace the static right-sidebar Outline with an interactive floating menu. Use `@chenglou/pretext` (if needed, or framer-motion) for the "collecting" animation, moving outline blocks into the editor seamlessly.
3. **El Néctar**: Automatically insert a highly dense, 2-sentence (max 40 words) introductory paragraph immediately following the H1, serving as the core intent-resolver.
4. **External Links**: In the post-processing phase, request the AI to find 1-2 natural anchor texts and attach high-authority external links.