# Delta Spec: Theme Switcher Experiment

## Requirements
1. **Zustand Store**: `useThemeStore` must manage `theme` ('glass' | 'sleek') and a `setTheme` action.
2. **Persistence**: The theme must persist across page reloads using `zustand/middleware`'s `persist`.
3. **CSS Variables**:
   - `glass`: Transparent backgrounds, blur effects, vibrant accents.
   - `sleek`: Deep charcoal backgrounds, sharp borders, minimal accents.
4. **Theme Toggler**: A component that switches the theme and displays a micro-animation with Framer Motion.
5. **Layout Integration**: The `data-theme` attribute must be applied to the `<html>` or `<body>` element.

## Technical Constraints
- Use Tailwind 4 `@theme` block or CSS variables in `globals.css`.
- Support Next.js SSR (hydration-safe store).
- No external UI libraries (headless components or raw JSX/Tailwind only).

## Scenarios
- **Scenario 1**: User clicks toggle -> Theme changes instantly -> Store updates -> LocalStorage updates.
- **Scenario 2**: User reloads page -> Previous theme is restored before meaningful paint (avoid flash of unstyled theme).
