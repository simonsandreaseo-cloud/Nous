# Specification: 06-batch-optimization

## Features
### 1. Batch Optimization (The Magic Button)
- **Component**: `SEODataTab.tsx`'s sticky footer button "Aplicar Optimización en Lote".
- **Trigger**: Click opens a loading state (e.g. "Analizando y Optimizando...").
- **Process**:
  - Gathers the `currentContent` (HTML/Text).
  - Collects missing/underused LSI keywords, missing ASK keywords, target Density gaps, and missing Internal Links.
  - Sends a specialized system prompt to the selected LLM (`SEOOptimizationService.applyBatchOptimization`).
  - The AI returns JSON with precise replacements for specific paragraphs to naturally include the missing elements.
  - Injects changes back into the `useWriterStore`'s `currentContent` via Tiptap commands or global state update.

### 2. El Néctar (The Nectar Introduction)
- **Requirement**: An AI-generated, ultra-dense paragraph of max 40 words (2 sentences max) right after the H1.
- **Content**: Solves the search intent immediately, no fluff, no introductions.
- **Trigger**: Generated either during the Outline creation or as part of the Batch Optimization if missing.

### 3. External Linking Automation
- **Requirement**: Add 1 to 2 high-authority external links (e.g. Wikipedia, high-DR sources) naturally in the content.
- **Process**: Done during Batch Optimization. AI suggests an `anchor_text` and a `url` for a specific paragraph, and the frontend applies the hyperlink tag.

### 4. Interactive Floating Outline (Sidebar Deprecation)
- **Requirement**: Remove the `OutlineEditorPanel` from the right sidebar.
- **UI**: A small, floating sticky button (top left/right of the editor) labeled "Outline".
- **Interaction**: Opens a horizontal-scroll contextual menu with the H2s/Segments. Includes buttons to "Insert", "Regenerate", or "Hide".
- **Animation**: Smooth collapse/expand (e.g. `@chenglou/pretext` or framer-motion) simulating text being "sucked into" or "spit out of" the button.

## Data Models
New response schema for Optimization AI:
```typescript
interface OptimizationResult {
  nectarParagraph?: string; // If missing, provide the 40-word nectar
  paragraphEdits: {
    originalTextExtract: string; // To match the paragraph
    newOptimizedText: string;
    addedKeywords: string[]; // Debug info
  }[];
  externalLinks: {
    anchorText: string;
    url: string;
  }[];
}
```