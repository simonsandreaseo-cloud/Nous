# Contextual Intelligence Specification

## Purpose
Define the behavior of smart widgets that provide structural assistance and real-time feedback based on the current editing context and background processes.

## Requirements

### Requirement: tRPC Data Integration
The system MUST use tRPC as the primary communication protocol to fetch and synchronize widget data with the backend.

#### Scenario: Real-time Data Fetching
- GIVEN the editor is active
- WHEN a contextual widget is mounted
- THEN it SHALL initiate a tRPC query to retrieve relevant contextual data
- AND it MUST update its internal state with the received data

### Requirement: Outline Header Insertion
The Outline widget MUST allow the user to insert structural headers directly into the editor document with a single click.

#### Scenario: One-click Header Insertion
- GIVEN the Outline widget is displaying the document structure
- WHEN the user clicks on a specific header entry in the widget
- THEN the system MUST insert the corresponding header at the current editor cursor position

### Requirement: Background Job Visual Feedback
If a BullMQ Job is active for the current context, the widgets SHALL display an animated "Glow" (brillo) state to indicate background processing.

#### Scenario: Active Job Glow Animation
- GIVEN a BullMQ job is processing a task related to the current document
- WHEN the user views the intelligence widgets
- THEN the widgets MUST exhibit a rhythmic "Glow" animation
- AND the animation SHALL cease automatically once the job completes

### Requirement: Collapsible Interface
To minimize cognitive load and preserve screen real estate, all intelligence widgets MUST be collapsible.

#### Scenario: Collapsing a Widget
- GIVEN an intelligence widget is in its expanded state
- WHEN the user clicks the collapse toggle
- THEN the widget MUST minimize its footprint while remaining accessible for expansion
