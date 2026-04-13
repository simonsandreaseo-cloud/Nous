# Project Memory: nous_2.0

## Observaciones de Ingeniería

* **2026-04-10:** Inicialización del stack "Gentle AI". Se establecen las bases para el flujo SDD y la memoria persistente local.
* **Stack Detectado:** El proyecto usa React 19 y Next.js 16 con Tailwind 4 (versión alpha/beta según dependencias). Es importante mantener la coherencia con los nuevos paradigmas de Tailwind 4 durante el desarrollo.
* **Base de Datos:** Estructura basada en Supabase. Se requiere especial atención a las políticas de RLS para evitar fugas de datos en componentes compartidos.
* **2026-04-11:** Se solida el [AI_HIERARCHY.md](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20Antigravity/nous_2.0/.engram/AI_HIERARCHY.md) oficial. Adicionalmente, se corrige el error **400 Bad Request** en Pollinations eliminando modelos obsoletos (`flux-realism`, `turbo`) y centralizando el conocimiento en el [POLLINATIONS_MANUAL.md](file:///c:/Users/Simon%20Sandrea/Pictures/Desarrollos%20Antigravity/nous_2.0/.engram/POLLINATIONS_MANUAL.md).

---
*Este archivo actúa como el "cerebro" del proyecto. Todas las decisiones importantes de diseño o correcciones de bugs críticos deben registrarse aquí.*
