# Exploración: 04-magic-ui-design-system

Este documento detalla la estrategia para integrar **Magic UI** y **Framer Motion** en el ecosistema de **Nous 3.0**, transformando la interfaz actual en una experiencia "Premium" y "High-Tech".

## 1. Análisis del Estado Actual
- **Base Tecnológica**: React 19, Next.js 15 (App Router), Tailwind CSS 4.
- **UI Actual**: Estética minimalista basada en Slate/White. Funcional pero carece de "feedback sensorial" avanzado.
- **Interactividad**: Uso básico de `framer-motion` en transiciones de página y `HomeClient`.
- **Componentes UI**: Ubicados en `src/components/ui`, mayormente estáticos (Lucide React + Tailwind).

## 2. Estrategia de Componentes

### Integración de Framer Motion (Transiciones de Jobs)
Para las tareas pesadas gestionadas por BullMQ (ej: Generación de Informes, Análisis de Estructura), implementaremos transiciones de estado fluidas:
- **Layout Animations**: Uso de `layout` prop para reordenar dinámicamente las reglas de segmentación sin saltos visuales.
- **AnimatePresence**: Transiciones "Cross-fade + Slide" entre los pasos del workflow (`settings` -> `validation` -> `complete`).
- **Progressive Disclosure**: El `loadingState` dejará de ser un overlay estático para convertirse en un componente de "Step Tracking" animado que muestra qué parte del pipeline de IA se está ejecutando en tiempo real.

### Selección de Componentes Magic UI
Hemos seleccionado 3 componentes clave para reforzar la "Inteligencia Editorial":

1.  **Shimmer Button**:
    - **Uso**: Call-to-actions principales (ej: "Analizar con IA", "Confirmar y Generar").
    - **Por qué**: Aporta una sensación de "energía latente" y modernidad sin ser intrusivo.
2.  **Animated List**:
    - **Uso**: Historial de informes y logs de procesamiento de BullMQ.
    - **Por qué**: Permite que nuevos elementos aparezcan con una coreografía suave, ideal para una "Inbox" de inteligencia SEO.
3.  **Particles Background**:
    - **Uso**: Fondo sutil en la pantalla de carga y en el panel lateral de configuración.
    - **Por qué**: Refuerza la metáfora de la "Nube de Datos" y la inteligencia distribuida de Nous.

## 3. Optimización (Performance & SEO)
- **Lazy Loading**: Los componentes de Magic UI se cargarán mediante `next/dynamic` con `{ ssr: false }` para evitar inflar el bundle inicial y asegurar que el servidor no intente renderizar efectos visuales complejos que dependen del DOM.
- **Client Boundary Strategy**: Mantendremos el core de los datos en Server Components. La capa de Magic UI actuará como un "wrapper" estético. 
- **Reduced Motion**: Respetaremos las preferencias del usuario mediante el hook `useReducedMotion` de Framer Motion.

## 4. Tematización: "High-Tech" Palette
La nueva paleta se define para transmitir precisión, profundidad y autoridad.

| Color | Hex | Uso |
| :--- | :--- | :--- |
| **Nous Indigo** | `#6366f1` | Acciones Primarias, IA Focus. |
| **Deep Slate** | `#0f172a` | Fondos de superficie, Tipografía Header. |
| **Emerald Insight** | `#10b981` | Métricas de Crecimiento, Éxito de Jobs. |
| **Glass White** | `rgba(255,255,255,0.7)` | Paneles con Backdrop Blur. |

### Aplicación de Estilo
- **Bordes**: Radio de 24px-32px para una sensación "orgánica".
- **Efectos**: Sombras suaves con tinte índigo (`shadow-indigo-500/10`) y efectos de cristal (`backdrop-blur-md`).
- **Tipografía**: Mantendremos Inter, pero con tracking ajustado y pesos "Black" para headers para dar un look editorial.

---
*Exploración finalizada por Gemini CLI (Senior Frontend Architect).*
