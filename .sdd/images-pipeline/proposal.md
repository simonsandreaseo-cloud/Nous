# Proposal: Unified Editorial Visual Pipeline

**Intent**: Transform the fragmented image system into an automated, professional editorial design workflow.

**Scope**:
- **Planning**: Replace `[[image]]` markers with a `Visual Blueprint` (JSON).
- **Production**: Centralize generation and optimization in `VisualEngine` -> `PostProcessingService` -> `Supabase Storage`.
- **Layout**: Implement injection based on **Semantic Anchors** via `LayoutService`.
- **Delivery**: Ensure total portability through `PatcherMaster`.

**Approach**: Move all heavy logic to the server (Server Actions), treat images as managed assets (not raw URLs), and decouple writing from visual layout.
