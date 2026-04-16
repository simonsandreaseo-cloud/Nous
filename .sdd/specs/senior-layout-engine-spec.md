# Specs for senior-layout-engine

## Domain: semantic-anchoring (NEW)

### Requirement: Robust Image Placement
The system MUST link images to a specific text phrase (anchor) rather than a paragraph index.

#### Scenario: Content Edit Survival
- GIVEN an image anchored to "The impact of climate change"
- WHEN a paragraph is added before the anchor text
- THEN the image MUST remain positioned immediately after the anchor text.

#### Scenario: Anchor Not Found
- GIVEN an image with an anchor that no longer exists in the text
- WHEN the document is rendered
- THEN the system SHOULD fallback to the original paragraph index if available, otherwise place it at the end of the document.

## Domain: layout-aware-generation (NEW)

### Requirement: Role-Based Visuals
The system MUST generate images tailored to their assigned `LayoutRole` (HERO, ICON, FEATURE, INFO).

#### Scenario: Hero Image Generation
- GIVEN a slot with `LayoutRole: HERO`
- WHEN the AI generates the prompt
- THEN the prompt MUST include cinematic, wide-angle, and high-impact visual keywords.

#### Scenario: Icon Image Generation
- GIVEN a slot with `LayoutRole: ICON`
- WHEN the AI generates the prompt
- THEN the prompt MUST specify minimal backgrounds, centered subjects, and high-contrast styles.

## Domain: portable-layout-export (NEW)

### Requirement: Cross-Platform Fidelity
The system MUST export HTML with inline CSS for layout properties to ensure 1:1 fidelity in external CMS.

#### Scenario: Inline Style Rendering
- GIVEN a `nousAsset` with `align: left` and `width: 50%`
- WHEN `renderHTML` is called
- THEN the output MUST contain `style="float: left; width: 50%;"`.

## Domain: image-slotting (NEW)

### Requirement: Manual Design Markers
The system MUST support `imageSlot` nodes as placeholders for AI generation.

#### Scenario: Slot Filling
- GIVEN a document with an `imageSlot` node
- WHEN the image workflow is executed
- THEN the system MUST prioritize filling the slot using the slot's internal prompt hints over AI planning.

## Domain: design-blueprints (NEW)

### Requirement: Automated Layout Scaffolding
The system SHOULD provide blueprints to automatically distribute image slots based on article patterns.

#### Scenario: Listicle Blueprint
- GIVEN a listicle-style article
- WHEN `applyListicleBlueprint` is called
- THEN the system MUST inject `imageSlot` nodes at strategic intervals (e.g., every 2 items).

## Domain: parallel-asset-processing (NEW)

### Requirement: High-Performance Uploads
The system MUST process image optimizations and uploads in parallel.

#### Scenario: Batch Processing
- GIVEN an article with 5 images
- WHEN `persistImages` is called
- THEN the system MUST use `Promise.allSettled` to upload assets concurrently.

## Domain: image-planning (MODIFIED)

### Requirement: Contextual Anchor Extraction
The system MUST extract semantic anchors and layout roles instead of just paragraph indices.
(Previously: Generated only paragraph indices for image placement)

#### Scenario: Planning Output
- GIVEN a content analysis request
- WHEN `ImagePlanningService` runs
- THEN the output MUST include an array of objects containing `{ anchor: string, role: LayoutRole }`.

## Domain: image-persistence (MODIFIED)

### Requirement: Service-Based Architecture
The system MUST delegate image processing to a dedicated `PostProcessingService`.
(Previously: Monolithic logic inside server actions)

#### Scenario: Processing Delegation
- GIVEN an image to be persisted
- WHEN `imageActions` is called
- THEN it MUST delegate resizing and WebP conversion to `PostProcessingService`.
