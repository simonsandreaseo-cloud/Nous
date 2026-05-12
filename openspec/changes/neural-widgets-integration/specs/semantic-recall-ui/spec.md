# Delta for Semantic Recall UI

## MODIFIED Requirements

### Requirement: Collapsible Interface
To avoid distracting the writer, the Semantic Recall widget MUST be collapsible and MUST use the shared `WidgetContainer` component.
(Previously: The Semantic Recall widget MUST be collapsible.)

#### Scenario: Minimizing Recall Widget
- GIVEN the Semantic Recall widget is open in the Stacks sidebar
- WHEN the user triggers the collapse action in the WidgetContainer header
- THEN the widget MUST hide its main content until manually re-expanded

### Requirement: Compact Knowledge Cards
Knowledge fragments MUST be rendered as compact cards optimized for the sidebar's "Zen" layout.

#### Scenario: Viewing Fragments
- GIVEN knowledge fragments are retrieved
- WHEN they are displayed in the SemanticMemory widget
- THEN they MUST appear as small, high-density cards with minimal typography
