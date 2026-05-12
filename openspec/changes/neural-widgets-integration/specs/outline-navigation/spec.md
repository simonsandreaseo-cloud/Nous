# Outline Navigation Specification

## Purpose
Provide a high-level view of the document structure and enable quick navigation and content injection.

## Requirements

### Requirement: Compact Tree View
The OutlineMap widget MUST render a hierarchical tree representing the editor's headings (H1, H2, H3).

#### Scenario: Reflecting Editor Content
- GIVEN the editor contains structured text with headers
- WHEN the OutlineMap widget is visible
- THEN it MUST show a compact tree matching the header hierarchy

### Requirement: Content Injection
The widget MUST provide an action to insert a section's text or a pre-defined template into the editor at a specific level.

#### Scenario: Injecting Section
- GIVEN the user clicks an "Insert" icon next to an outline item
- WHEN the callback onInsert(text, level) is triggered
- THEN the text MUST be inserted into the editor with the corresponding header level
