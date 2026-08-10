# Plan de Auditoría y Refactorización Arquitectónica

**Rol:** Arquitecto de Software Senior
**Stack Tecnológico:** Next.js (App Router, v14/15), Tailwind CSS, Supabase, Zustand, React Query.
**Contexto:** Refactorización de código monolítico (archivos > 2000 líneas), deuda técnica severa, mezcla de responsabilidades (UI, lógica, fetch, estado).
**Objetivo:** Arquitectura modular, escalable (SOLID), separación estricta de responsabilidades, migración sin disrupción en producción.

---

## 1. Arquitectura de Directorios (Feature-Sliced Design / Domain-Driven)

Para escalar la aplicación y evitar monolitos, adoptaremos una arquitectura basada en **Feature-Sliced Design (FSD)** adaptada a Next.js App Router. Esta estructura divide el código por dominios funcionales, separando la infraestructura de la presentación y la lógica de negocio.

```text
src/
├── app/                      # Capa de Enrutamiento (Next.js App Router)
│   ├── (auth)/               # Grupos de rutas lógicas
│   ├── dashboard/
│   │   ├── page.tsx          # Exclusivamente Server Components (Composición)
│   │   └── loading.tsx       # UI de carga
│   └── layout.tsx
├── features/                 # Módulos de Dominio (Domain-Driven)
│   ├── invoices/             # Ejemplo de un dominio
│   │   ├── components/       # UI específica del dominio (Presentacional)
│   │   ├── hooks/            # Lógica de negocio y estado (Client/Shared)
│   │   ├── actions/          # Server Actions (Mutaciones)
│   │   ├── services/         # Fetching puro (Supabase)
│   │   ├── store/            # Estado local del feature (Zustand slice)
│   │   └── types/            # Interfaces de TypeScript
│   └── users/
├── shared/                   # Código compartido globalmente
│   ├── components/           # UI genérica (Botones, Modales, Tablas)
│   ├── hooks/                # Hooks utilitarios (useDebounce, useMediaQuery)
│   ├── lib/                  # Configuración de librerías (Supabase client, React Query)
│   ├── utils/                # Funciones puras (formateadores, validadores)
│   └── types/                # Tipos globales
└── providers/                # Wrappers de contexto (React Query, Theme, etc.)
```

---

## 2. Estrategia de Desacoplamiento (Resolución de Cuellos de Botella)

Para desfragmentar los archivos de más de 2000 líneas, aplicaremos reglas estrictas basadas en el principio de responsabilidad única (SRP):

### A. Aislamiento de Client Boundaries (Server vs. Client Components)
- **Regla Estricta:** El árbol de renderizado por defecto es del servidor. El uso de la directiva `"use client"` debe retrasarse hasta el punto más profundo posible (las "hojas" del árbol).
- **Ejecución:** Los archivos de 2000 líneas (actualmente Client Components masivos) se dividirán. El componente padre en `app/` será un **Server Component** asíncrono que realiza el fetch inicial y pasa los datos como `props` a subcomponentes interactivos aislados (Client Components).

### B. Extracción de Lógica (Custom Hooks y React Query)
- **Regla Estricta:** Un componente de React (archivo `.tsx`) solo debe retornar JSX. No puede tener lógica compleja de manipulación de datos ni cadenas largas de `useEffect`.
- **Ejecución:**
  - Todo manejo de estado (Zustand) y ciclo de vida debe extraerse a hooks en `features/[dominio]/hooks/use[Dominio]Logic.ts`.
  - El fetching de cliente no debe usar `useEffect`. Se utilizará React Query (`useQuery`, `useMutation`), encapsulado dentro del custom hook.

### C. Agnosticismo de UI (Componentes Presentacionales)
- **Regla Estricta:** La carpeta `components/` solo albergará componentes "tontos" (Dumb Components).
- **Ejecución:** No pueden realizar fetch de datos ni conocer el origen de la información. Su contrato de comunicación es exclusivamente mediante `props` bien tipadas. Si un botón necesita actualizar Supabase, recibe la función de mutación (`onClick`) desde su contenedor inteligente.

### D. Encapsulamiento de Red (Capa de Servicios y Server Actions)
- **Regla Estricta:** Prohibido instanciar clientes de base de datos (Supabase) o hacer `fetch()` directamente en componentes de UI.
- **Ejecución:**
  - Consultas (Reads): En `features/[dominio]/services/[dominio].service.ts` para Server Components.
  - Mutaciones (Writes): En `features/[dominio]/actions/[dominio].actions.ts` utilizando Server Actions para manejar formularios y actualizaciones, manteniendo la seguridad en el servidor.

---

## 3. Plan de Ejecución por Fases (Migración Iterativa Segura)

No reescribiremos la aplicación de una sola vez ("Big Bang"). Migraremos de forma iterativa empleando el patrón **Strangler Fig**.

- **Fase 1: Preparación y Andamiaje (Semanas 1-2)**
  - Configurar las carpetas `shared/` y `features/`.
  - Configurar alias absolutos en `tsconfig.json` (`@/features/*`, `@/shared/*`).
  - Auditar y actualizar reglas de ESLint para bloquear imports indebidos.

- **Fase 2: Extracción de Infraestructura y Red (Semanas 3-4)**
  - Identificar un archivo monolítico (ej. `Dashboard.tsx`).
  - Extraer las llamadas a Supabase a un nuevo archivo `services/dashboard.service.ts`.
  - Reemplazar los `useEffect` de carga de datos por queries de React Query o Server Components (si el routing lo permite).

- **Fase 3: Separación Presentacional (Semanas 4-6)**
  - Trocear el JSX gigante del monolito en subcomponentes pequeños y agnósticos dentro de `features/dashboard/components/`.
  - Reemplazar el código en el archivo original importando estos nuevos componentes. En este punto, el monolito actúa solo como orquestador.

- **Fase 4: Empuje de Client Boundaries y Refinamiento (Semanas 7-8)**
  - Convertir el orquestador (ahora limpio) en un **Server Component**, eliminando `"use client"`.
  - Inyectar la interactividad únicamente en los subcomponentes hojas que realmente necesiten estado o event listeners.
  - Repetir Fases 2-4 para el siguiente monolito.

---

## 4. Estándares y Reglas de Linter (Linting y CI/CD)

Para garantizar que el código no vuelva a degradarse, implementaremos configuraciones restrictivas en ESLint (`eslint.config.mjs` / `.eslintrc.js`):

1. **Límites de tamaño (Complejidad Cognitiva):**
   - Límite estricto de **250 líneas** por archivo `.tsx` (`max-lines`). Si crece más, es señal de que se debe subdividir.
   - Límite de complejidad ciclomática de `10` para funciones (`complexity`).

2. **Patrones de Importación (Barrels y Aliases):**
   - Obligar el uso de Path Aliases (`@/shared/components/Button`) en lugar de rutas relativas (`../../../Button`) mediante `no-restricted-imports`.
   - Prohibir importaciones cruzadas entre dominios (ej. `features/users` no puede importar de `features/invoices`). Deben comunicarse a través del módulo compartido o composición de componentes.

3. **Inyección de Dependencias y Hooks:**
   - Uso de `eslint-plugin-react-hooks` en modo `error` para prevenir fugas de memoria.
   - Forzar la separación: Si un archivo tiene directiva `"use client"`, se prohíbe importar librerías de servidor (`pg`, `fs`, clientes admin de Supabase) usando `import/no-unresolved` o la configuración de Next.js.
