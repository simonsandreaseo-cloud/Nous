# AI Text Toolkit Integration Specification

## Purpose

This specification defines the behavior for the AI Text Toolkit, which provides expert-driven text refinement within the editor. It ensures natural language improvements, depth enhancement, and tone adjustments while preserving original formatting and layout integrity.

## Requirements

### Requirement: text-refinement-experts

The system MUST provide a set of specialized AI experts to refine selected text fragments while maintaining article coherence and formatting.

1. The system MUST offer at least the following three experts:
   - `Humanizer`: Improves natural flow and reduces "AI-sounding" patterns.
   - `Expander`: Adds depth, examples, and relevant details to the selection.
   - `ToneShifter`: Adjusts the formality and professional resonance of the text.
2. The experts MUST receive the selected text fragment AND the `contextSummary` of the article to ensure consistent tone and factual alignment.
3. The system MUST return the refined text while preserving original `<b>` (bold) and `<a>` (link) tags, inheriting the marker-based protection logic (SPE) from the translation engine.
4. If the refinement process exceeds 2 seconds, the UI MUST display a "Consultando expertos..." status message.

#### Scenario: Refining text with Humanizer expert

- GIVEN a selected text fragment: "The efficiency is maximized by the system."
- AND a `contextSummary` describing a technical productivity article.
- WHEN the `Humanizer` expert is invoked.
- THEN the system MUST send both the fragment and `contextSummary` to the AI engine.
- AND the output MUST be a more natural version (e.g., "The system boosts efficiency to the max.") preserving any bolding or links.

#### Scenario: Preserving bolding and links during refinement

- GIVEN a selected fragment: "Visit <b>Nous</b> at <a href='https://nous.com'>our site</a>."
- WHEN a refinement expert is invoked.
- THEN the system MUST use numeric markers (SPE logic) to protect the `<b>` and `<a>` tags.
- AND the final output MUST restore the tags in their correct relative positions within the refined text.

#### Scenario: UI feedback for long-running refinement

- GIVEN a refinement request is in progress.
- WHEN the processing time exceeds 2 seconds.
- THEN the system MUST update the button or status indicator to show "Consultando expertos...".

### Requirement: interactive-diff-ui

The system MUST provide an interactive interface for users to trigger refinements and preview changes before applying them to the document.

1. The frontend MUST display a floating menu (Bubble Menu) whenever a text selection is made within the editor.
2. The system SHALL allow the user to preview the proposed change using a Diff view before inserting it into the editor.
3. Each refinement operation MUST generate a unique, auditable `traceId` which MUST be logged in the Render environment for traceability.

#### Scenario: Triggering refinement from Bubble Menu

- GIVEN a text selection in the editor.
- WHEN the Bubble Menu appears.
- THEN it MUST include options for `Humanizer`, `Expander`, and `ToneShifter`.

#### Scenario: Previewing changes with Diff UI

- GIVEN a refined text suggestion from an expert.
- WHEN the user selects "Preview".
- THEN the system MUST show a Diff view highlighting the additions and removals.
- AND the user MUST be able to either "Accept" (insert) or "Discard" the change.

#### Scenario: Audit traceability

- GIVEN a refinement operation is executed.
- WHEN the request is processed by the backend.
- THEN a `traceId` MUST be generated and included in the response.
- AND this `traceId` MUST be visible in the Render logs associated with the expert's execution.
