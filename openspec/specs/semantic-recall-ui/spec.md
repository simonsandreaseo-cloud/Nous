# Semantic Recall UI Specification

## Purpose
Expose relevant knowledge fragments retrieved via vector similarity search to assist the user during the writing and research process.

## Requirements

### Requirement: Knowledge Fragment Retrieval
The system MUST display fragments from the `knowledge_base` (pgvector) that are semantically relevant to the current task or editor content.

#### Scenario: Contextual Recall
- GIVEN the user is writing in the editor
- WHEN the semantic recall system performs a similarity search
- THEN it MUST display the top-matching fragments in the sidebar widget

### Requirement: Fragment Actionability
Each displayed knowledge fragment SHALL provide options to be copied to the clipboard or inserted directly into the editor.

#### Scenario: Copying a Fragment
- GIVEN a knowledge fragment is displayed in the widget
- WHEN the user clicks the "Copy" action
- THEN the system MUST copy the fragment content to the system clipboard

#### Scenario: Inserting a Fragment
- GIVEN a knowledge fragment is displayed in the widget
- WHEN the user clicks the "Insert" action
- THEN the system MUST insert the fragment text at the current editor cursor position

### Requirement: Collapsible Interface
To avoid distracting the writer, the Semantic Recall widget MUST be collapsible.

#### Scenario: Minimizing Recall Widget
- GIVEN the Semantic Recall widget is open
- WHEN the user triggers the collapse action
- THEN the widget MUST hide its main content until manually re-expanded
