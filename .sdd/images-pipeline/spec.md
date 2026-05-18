# Specification: Unified Editorial Visual Pipeline

## 🎯 Functional Requirements
- **RF1: Strategic Blueprint**: The system must generate a visual plan before writing that defines roles (`hero`, `product_showcase`, `trust_signal`, `feature_highlight`, `cta_background`), ratios, and semantic anchors.
- **RF2: Production Pipeline**: Every generated image must go through: `Gen AI` -> `Sharp (WebP)` -> `Supabase Storage`.
- **RF3: Semantic Injection**: The system must search for the exact anchor phrase in the HTML and place the visual component immediately after, regardless of paragraph index.
- **RF4: Layout Components**: Inject complex HTML structures (`<figure>`, `<div>` with design classes) instead of simple `<img>` tags.
- **RF5: Asset Portability**: `PatcherMaster` must transform Supabase URLs to client CDN URLs in the final export step.

## 🛠 User Scenarios
- **Scenario A (Automatic Flow)**: User generates an article -> AI plans visuals -> System generates, optimizes, and injects assets -> User receives a layouted HTML.
- **Scenario B (Manual Refinement)**: User clicks "Regenerate" on an image -> `VisualEngine` creates a new version -> Asset is updated in storage -> URL in HTML remains the same but content changes.
