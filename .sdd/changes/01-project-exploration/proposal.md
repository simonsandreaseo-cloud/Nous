# Change Proposal: 01-project-exploration

## Intent
Explore the current implementation of the "Nous Link Master Engine" and the "Extractor Nous" engine to find optimization opportunities in the internal linking logic and the Tiptap editor persistence.

## Scope
- Review `src/lib/tiptap-nous-asset.ts` and `src/lib/services/writer/html-processor.ts`.
- Investigate the integration of "Link Patcher" with Regex-based URL normalization.
- Check current TipTap support for `data-original-url`.

## Approach
1. Use `sdd-explore` to perform a static analysis of the affected modules.
2. Identify gaps or inconsistencies in the "Extractor Nous" placement logic.
3. Propose formal specs and a technical design for improvements.

## Rationale
Since I am now operating as the Senior Architect with the Gentle Stack, I must ensure that the core engines are robust and follow the newly established AI hierarchy and coding patterns.
