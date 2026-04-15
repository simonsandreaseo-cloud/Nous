# Proposal: Theme Switcher Experiment

## Intent
Implement a premium theme switcher to allow users to toggle between two distinct visual styles: **Glassmorphism** (semi-transparent, vibrant) and **Sleek Dark** (deep black, high contrast).

## Scope
- Create a `useThemeStore` using Zustand.
- Implement CSS variables for both theme modes.
- Add a theme toggle component with Framer Motion animations.
- Apply theme styles to the main layout.

## Approach
- **State**: Persistent Zustand store saved to `localStorage`.
- **CSS**: Tailwind 4 with CSS variable injection based on a data-attribute (`data-theme`).
- **UI**: A floating toggle button or a settings menu item.

## Risks
- Avoiding hydration mismatch in Next.js when reading from `localStorage`.
- Ensuring all components use the new CSS variables instead of hardcoded colors.
