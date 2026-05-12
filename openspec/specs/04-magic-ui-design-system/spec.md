# Specification: 04-magic-ui-design-system

This specification defines the UX and UI requirements for the Magic UI Design System in Nous 3.0, focusing on "Living UI" principles and "Editorial Aesthetics".

## 1. Living UI (`living-ui`)

The interface MUST feel reactive and organic, providing immediate visual feedback without compromising performance.

### 1.1 Staggered Task List
Items in task lists MUST appear with a staggered animation to guide the user's eye and provide a premium feel.

**Scenario: Loading task items**
- **Given** a list of tasks is being fetched from the backend.
- **When** the data is received and rendered in the UI.
- **Then** each item MUST appear sequentially with a "stagger" effect using Framer Motion.
- **And** the total animation duration MUST NOT exceed 500ms to maintain perceived speed.

### 1.2 Shimmer Trigger Button
The primary action button MUST reflect the background processing state when an investigation is active.

**Scenario: Active BullMQ Job investigation**
- **Given** a BullMQ Job is currently processing an investigation.
- **When** the user views the trigger button for that investigation.
- **Then** the button MUST show an active "Shimmer" effect.
- **And** the button SHALL remain interactive (e.g., allowing cancellation or status check).

### 1.3 Screen Transitions
Transitions between different views or screens SHALL be smooth to reduce cognitive load.

**Scenario: Navigating between screens**
- **Given** the user triggers a navigation action.
- **When** the current view is replaced by a new one.
- **Then** the system SHALL perform a fade-in/out transition.
- **And** the transition MUST be non-blocking, allowing user input immediately upon the start of the new view's entrance.

## 2. Editorial Aesthetics (`editorial-aesthetics`)

The system SHALL prioritize readability and high-end visual depth, following modern editorial design standards.

### 2.1 Typography and Kerning
The system MUST use high-quality sans-serif fonts with optimized spacing.

**Scenario: Rendering text content**
- **Given** the application is rendering text elements.
- **Then** the system MUST use "Inter" or "Outfit" as the primary typeface.
- **And** the kerning (letter-spacing) MUST be optimized for readability (e.g., `tracking-tight` for headers).

### 2.2 Glassmorphism Modals
Modals and overlays SHALL use a "Glassmorphism" effect to maintain context and depth.

**Scenario: Opening a modal**
- **Given** a modal window is triggered by a user action.
- **When** the modal is displayed over the content.
- **Then** the modal background SHALL have a blur effect (`backdrop-blur`).
- **And** the background opacity SHALL be semi-transparent to allow the underlying content to remain faintly visible.

### 2.3 Error Feedback (Vibrate)
Error states MUST capture the user's attention through subtle haptic-like visual feedback.

**Scenario: Validation error or system failure**
- **Given** a form validation fails or a critical error occurs.
- **When** the error message or state is displayed.
- **Then** the affected component or error container MUST perform a subtle "vibrate" (shake) animation.
- **And** the animation MUST NOT repeat indefinitely to avoid user annoyance.

## 3. Performance & Implementation Mandates

### 3.1 Interactivity Priority
- **Mandate**: Animations MUST NOT delay interactivity.
- **Requirement**: Components MUST be interactive (clickable/scrollable) as soon as they are visible in the DOM, even if the entrance animation is still in progress.
- **Requirement**: Use `next/dynamic` with `ssr: false` for complex animations to avoid blocking the main thread during hydration.

### 3.2 Reduced Motion Support
- **Requirement**: The system MUST respect the user's OS-level `prefers-reduced-motion` setting.
- **Requirement**: When reduced motion is enabled, "stagger", "shimmer", and "vibrate" effects SHALL be replaced by simple opacity fades or static states.

---
*Specifications redactadas por Gemini CLI (Senior UX Engineer).*
