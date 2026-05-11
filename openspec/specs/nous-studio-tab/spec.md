# nous-studio-tab Specification

## Purpose
Centralize AI interaction within the Studio sidebar, replacing the floating menu with a dedicated tab for better UX and layout consistency.

## Requirements

### Requirement: Sidebar Action List Rendering
The system MUST render the AI actions (e.g., Investigación SEO, Redactar Contenido, Humanizar) as a list of options within the sidebar container when the 'Nous' tab is active.

#### Scenario: Accessing AI Actions
- GIVEN the user is in the Studio Writer view
- WHEN the user selects the 'Nous' tab in the sidebar
- THEN the system MUST display the list of available AI actions
- AND the actions MUST be contained within the sidebar's boundaries (not floating)

### Requirement: NousOrb Integration
The `NousOrb` 3D element MUST remain visible as a header within the 'Nous' tab, positioned relatively to the sidebar container.

#### Scenario: Visual Orb Placement
- GIVEN the 'Nous' tab is active
- WHEN the sidebar renders
- THEN the `NousOrb` MUST appear at the top of the tab content
- AND it MUST NOT be positioned `fixed` on the screen

### Requirement: Action Triggering
The actions within the `NousTab` MUST trigger the same underlying AI pipelines as the previous floating menu.

#### Scenario: Triggering Humanizer from Tab
- GIVEN the 'Nous' tab is active
- WHEN the user clicks the "Humanizar" action
- THEN the system MUST initiate the humanization pipeline
- AND the `NousOrb` MUST reflect the processing state

## Success Criteria
- AI actions are no longer in a floating menu.
- 'Nous' tab is fully functional in the `WriterSidebar`.
- `NousOrb` is visually integrated into the tab.
