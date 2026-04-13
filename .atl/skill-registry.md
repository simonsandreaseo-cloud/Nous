# Skill Registry: nous_2.0

Este documento cataloga el stack tecnológico y las convenciones del proyecto para asegurar que los agentes operen con el contexto correcto.

## Tech Stack
- **Framework:** Next.js 16 (React 19)
- **Lenguaje:** TypeScript (Strict Mode)
- **Base de Datos:** Supabase (PostgreSQL)
- **UI:** Tailwind CSS 4, Framer Motion, Lucide React
- **Estado:** Zustand
- **Editor:** TipTap
- **AI:** Anthropic (Claude), Google (Gemini/Gemma 3), OpenAI, Groq

## Convenciones de Código
- **Componentes:** Usar componentes funcionales con TypeScript. Preferir composición sobre herencia.
- **Estilos:** Usar utilidades de Tailwind 4. Mantener el diseño premium y dinámico (Rich Aesthetics).
- **Base de Datos:** Usar el cliente de Supabase. Seguir patrones de RLS (Row Level Security).
- **Editor:** Mantener las extensiones de TipTap actualizadas y centralizadas.

## Habilidades Activas (User Skills)
| Skill | Trigger |
|-------|---------|
| `branch-pr` | PR creation workflow for Agent Teams Lite. |
| `go-testing` | Go testing patterns for Gentleman.Dots. |
| `issue-creation` | Issue creation workflow for Agent Teams Lite. |
| `judgment-day` | Parallel adversarial review protocol. |
| `skill-creator` | Creates new AI agent skills. |

## Habilidades Activas (Project Skills)
| Skill | Trigger |
|-------|---------|
| `supabase` | Use when doing ANY task involving Supabase. |
| `supabase-postgres-best-practices` | Postgres performance optimization and best practices. |
| `antigravity-sdd` | Siempre que se trabaje en una tarea compleja o planificada. |

## Project Standards (auto-resolved)
See `AGENTS.md` and `TECHNICAL.md` for project conventions and rules.
- Design: Rich Aesthetics, Sentient UX, Clinical Tech aesthetic (Next.js 16 + React 19).
- Architecture: Background Layer, Graphic Core (R3F), UI Overlay Layer.
- Performance: FCP < 0.8s, Bundle < 250kb, GPU idle < 15%, adaptive LOD.
- State: Zustand (global store).
- Git/Env: Confirm destructive ops. Only touch .env on explicit request.

---
*Ultima actualización: 2026-04-13*