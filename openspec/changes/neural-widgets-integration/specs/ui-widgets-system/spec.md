# UI Widgets System Specification

## Purpose
Provide a standardized container and lifecycle for Studio widgets, ensuring consistent "Zen" behavior (minimizing distraction) and smooth interactions.

## Requirements

### Requirement: Standardized Widget Container
Every Studio widget MUST be wrapped in a `WidgetContainer` component that provides a header and a collapsible body.

#### Scenario: Collapsing Widget
- GIVEN a widget is expanded
- WHEN the user clicks the toggle button in the header
- THEN the widget body MUST animate to a collapsed state using Framer Motion
- AND the header MUST remain visible

### Requirement: Animated Loading States
Widgets MUST display a "neural" loading animation (e.g., pulsing glow or skeleton) while fetching data via tRPC.

#### Scenario: Data Fetching
- GIVEN a widget is performing an async operation
- WHEN the loading state is active
- THEN the widget MUST show a non-intrusive animation that preserves the "Zen" aesthetic
