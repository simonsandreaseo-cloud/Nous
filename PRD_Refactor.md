# Product Requirements Document (PRD): Refactorización Arquitectónica

## 1. Resumen Ejecutivo
**Proyecto:** `nous_2.0` (Next.js App Router)
**Objetivo:** Refactorizar la arquitectura del proyecto para mitigar la deuda técnica severa existente en componentes críticos (ej. `EditorialCalendar.tsx` con >1500 líneas y `StrategyGrid.tsx` con >1300 líneas) mediante la adopción de principios SOLID, Feature-Sliced Design (FSD) y una estricta separación de responsabilidades (UI, Estado, Fetching).

## 2. Definición del Problema
Actualmente, componentes clave actúan como monolitos:
- **Acoplamiento Fuerte:** La lógica de negocio, manejo de estado (hasta más de 8 `useState` por archivo), y llamadas a APIs de bases de datos (Supabase) están codificadas directamente dentro de los componentes de UI.
- **Rendimiento y Rendering:** Client Components masivos (declarados con `"use client"`) rompen las fronteras de renderizado de servidor, aumentando el coste computacional del cliente.
- **Mantenibilidad:** Archivos de más de 1000 líneas son imposibles de testear unitariamente y dificultan el trabajo colaborativo.

## 3. Requerimientos Funcionales (FR)
- **FR1: Separación de Lógica y UI.** Todo estado local o global (Zustand) y toda lógica computacional debe ser extraída desde el JSX a hooks personalizados (ej. `useEditorialCalendarLogic`).
- **FR2: Agnosticismo de Datos en UI.** Los componentes presentacionales no deben instanciar conexiones a base de datos. Deben recibir datos mediante `props`.
- **FR3: Server Actions y Servicios.** Todo fetching asíncrono y mutaciones de Supabase deben reubicarse en una capa de servicios (`/services` o `/actions`).

## 4. Requerimientos No Funcionales (NFR)
- **NFR1: Sin Interrupción de Negocio.** La refactorización debe ejecutarse en fases (patrón Strangler Fig) para asegurar que el sistema siga 100% operativo en cada despliegue.
- **NFR2: Rendimiento (RSC).** Maximizar el uso de React Server Components, empujando `"use client"` a las hojas más profundas del árbol de componentes.
- **NFR3: Linting Estricto.** Implementar métricas estáticas en la canalización CI que bloqueen commits de archivos con >250 líneas o dependencias circulares.

## 5. Alcance e Hitos de Refactorización
- **Hito 1 (Fundación):** Configuración de la estructura de directorios Feature-Sliced Design (`src/features`, `src/shared`).
- **Hito 2 (Editorial Calendar):** Desfragmentación del archivo `EditorialCalendar.tsx` (Extracción de modales, headers y el grid a `/features/dashboard/components/calendar/`).
- **Hito 3 (Strategy Grid):** Desfragmentación de `StrategyGrid.tsx` y creación de `useStrategyGridState`.
- **Hito 4 (Validación de Fronteras):** Conversión de componentes de vista a Server Components.
