# Software Design Document (SDD): Arquitectura Modular

## 1. Patrón Arquitectónico Base: Feature-Sliced Design (FSD)
El código mutará desde una agrupación por tipo de archivo (`components/`, `lib/`, `hooks/`) a una agrupación orientada al dominio (Domain-Driven).

### Estructura de Directorios Propuesta
```text
src/
├── app/                        # Capa de enrutamiento y composición de layouts
├── shared/                     # UI genérica y utilidades transversales
│   ├── ui/                     # Botones, Modales, Inputs (Dumb components)
│   ├── lib/                    # Supabase client global, cn() de Tailwind
│   └── hooks/                  # usePermissions, useMediaQuery
└── features/                   # Lógica de negocio encapsulada por dominio
    ├── dashboard/              # Dominio: Dashboard
    │   ├── calendar/           # Feature: Editorial Calendar
    │   │   ├── ui/             # Fragmentos visuales (Ej: CalendarGrid.tsx, TaskModal.tsx)
    │   │   ├── model/          # Estado y hooks (Ej: useEditorialCalendarLogic.ts)
    │   │   └── api/            # Peticiones específicas (Ej: updateTaskDate.ts)
    │   └── strategy/           # Feature: Strategy Grid
    │       ├── ui/             # StrategyRow.tsx, StrategyHeader.tsx
    │       ├── model/          # useStrategyGridState.ts
    │       └── api/            # StrategyService adaptadores
    └── writer/                 # Dominio: Writer Studio
```

## 2. Estrategia de Desacoplamiento (Caso: `EditorialCalendar.tsx`)

Actualmente, `EditorialCalendar.tsx` (1570 líneas) combina estado, iconos, JSX anidado, y llamadas a servicios.

### Paso 1: Extracción del Estado (Modelo)
Creación de `features/dashboard/calendar/model/useEditorialCalendar.ts`.
- Trasladar los más de 8 hooks de estado (`selectedTask`, `isUploadModalOpen`, `taskForImages`, etc.).
- Trasladar las funciones de handlers atados a los modales (`handleTaskSave`, `openStrategyModal`).
- Retornar un objeto de estado unificado y funciones dispachadoras para que la UI lo consuma.

### Paso 2: Fragmentación de la Vista (UI)
Dividir el archivo `.tsx` original en componentes más pequeños dentro de `features/dashboard/calendar/ui/`:
- `CalendarHeader.tsx` (Botones de acción superior, filtros).
- `CalendarGrid.tsx` (La cuadrícula visual y renderización de los días).
- `TaskDetailsModal.tsx` (El modal masivo con los inputs).
- `SchedulingModal.tsx`.

### Paso 3: Encapsulamiento de Red (Capa API)
En lugar de importar instancias como `StrategyService` y `supabase` en la vista:
- Crear acciones dedicadas en `features/dashboard/calendar/api/calendar.actions.ts` (Server Actions) o usar React Query para exponer mutaciones estandarizadas a los hooks de modelo.

## 3. Estrategia Client Boundaries en Next.js
**Objetivo:** Retirar el `"use client"` de los archivos a nivel de página (ej. `app/dashboard/page.tsx` o contenedores raíz de tabs).
- El orquestador o "View Component" actuará como **Server Component**, resolviendo de antemano el fetch de datos base (ej: `getTasks()`).
- Los componentes interactivos (ej. `CalendarGrid.tsx` o `StrategyGrid.tsx`) recibirán este payload inicial como `initialData` por `props` y declararán la directiva `"use client"` a su nivel.
- Todo proveedor de contexto debe estar asilado en un directorio `src/providers` importado de forma individual para evitar corromper los subárboles adyacentes a nivel servidor.

## 4. Inyección de Dependencias
- La UI no interactúa con Supabase o Zustand directamente. Todo se inyecta por hooks especializados (`model`).
- Esto permite la creación de un archivo de pruebas puro (`useEditorialCalendar.test.ts`) para simular la máquina de estados lógicos sin requerir `jsdom` o renderizar HTML.
