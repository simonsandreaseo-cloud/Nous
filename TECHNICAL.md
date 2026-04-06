# Nous Clinical Tech - Technical Documentation

## 1. Project Overview
Nous Clinical Tech is a high-performance, immersive home interface built with Next.js, React Three Fiber (R3F), and Tailwind CSS. It follows a "Clinical Tech" aesthetic, characterized by minimal typography, surgical blue/cyan highlights, and realistic glass refraction.

## 2. Architectural Layers
The application is structured into three distinct layers for optimized performance:
- **Background Layer (HTML/CSS)**: Manages global background colors and transitions.
- **Graphic Core (WebGL/R3F)**: Handles the 3D scene, including the curved data grid, the central refractive orb, 3D typography, and data particles.
- **UI Overlay Layer (DOM)**: Provides an accessible, interactive interface for system controls and status indicators.

## 3. Core Components
### 3.1 NousOrb
The central element of the interface. It uses `MeshTransmissionMaterial` for realistic glass refraction and chromatic aberration.
- **Energy Core**: An internal sphere with additive blending and HDR pulses.
- **Interaction**: Reactive to global hover states via Zustand. Secret "Burst" mode on double-click.

### 3.2 CurvedGrid
A topographic data floor simulated using `InstancedMesh`.
- **Optimization**: Uses 1200 instances with shared geometries and materials outside the React lifecyle to minimize memory allocation.
- **Visuals**: Features glowing "data tips" with HDR emissive properties.

### 3.3 CameraRig
Manages all cinematic movements.
- **Parallax**: Subtle mouse-based depth movement.
- **Section Transition**: Smooth lerp transitions between tactial viewpoints based on the `activeSection` state.

## 4. State Management
Uses **Zustand** for a lightweight, centralized global store (`useAppStore.ts`).
- Manages `activeSection`, `hoveredItem`, `systemStatus`, `isLoaded`, and `highContrast`.

## 5. Performance Strategy
- **Instancing**: Used for grid rods and particles.
- **GPU Tiering**: Deteccion of hardware capabilities via `useDetectGPU` to adjust DPR and post-processing quality.
- **Asset Loading**: Progressive system with a synchronized `LoadingScreen` and asset pre-fetching.

## 6. Accessibility & SEO
- **Semantic HTML**: Follows WCAG principles with ARIA labels and roles.
- **SEO**: Implements JSON-LD structured data and optimized meta tags in `layout.tsx`.
- **High Contrast Mode**: Accessible theme selectable via UI.

## 7. Design System: "Sentient UX" & Micro-interactions
To ensure the "Technological Sanctuary" feel, the interface must behave as a living organism:
- **Magnetic Cursor**: Interactive elements (buttons, monolith icons) must exert a "pull" force (approx. 20px radius) on the cursor.
- **Elastic Physics**: Panels (Office, Calendar) must open with "overshoot" physics (mass & springs), avoiding linear/digital transitions.
- **Orb Feedback (The Heart)**: The central orb is the primary feedback mechanism. 
  - *Example*: A critical error in the Local Node audit should trigger a visual "arrhythmia" (reddish glitch/blink) in the orb's refraction before any text appears.

## 8. Performance Budget (Hard Guardrails)
Strict metrics to maintain the "Zero-Lag" luxury experience:
- **First Contentful Paint (FCP)**: < 0.8 seconds.
- **Initial Bundle Size**: < 250kb (Gzipped).
- **GPU Usage (Idle)**: < 15%.
- **Adaptive LOD (Level of Detail)**: 
  - The system must detect GPU capability (Tier 1-3).
  - *Low-end devices*: Automatically reduce shader complexity (particle count, flow lines) without breaking the aesthetic direction.

---
*Created by Antigravity AI for Nous Clinical Tech.*
