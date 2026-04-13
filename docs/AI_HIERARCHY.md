# AI Hierarchy Master Document - Nous 2.0

Este documento es la fuente de verdad para la selección de modelos de IA en el ecosistema Nous. Ha sido consolidado tras múltiples rondas de pruebas ("The Tournament") para optimizar latencia, costo y precisión.

## 1. Jerarquía por Caso de Uso

| Nivel | Caso de Uso | Modelo Recomendado | Proveedor | Por qué |
| :--- | :--- | :--- | :--- | :--- |
| **Catedral (Escritura Premium)** | Redacción SEO, humanización, razonamiento complejo. | `llama-3.3-70b-versatile` | Groq | Tono "Gentleman", alta matización y adherencia a guías de estilo. |
| **Técnico (Estructura)** | Generación de JSON, Regex, extracción de datos, esquemas. | `gemma-3-4b-it` | Groq | Máxima estabilidad en formatos estructurados y baja latencia. |
| **Volumen (Investigación)** | Scrapeo masivo, análisis de grandes listas de URLs, categorización rápida. | `gemini-3.1-flash-lite-preview` | Google | Ventana de contexto inbatible y costo-eficiencia para procesos en lote. |

## 2. Configuración de Emergencia (Fallbacks)

Si el modelo principal falla por cuota o latencia:
1. **Fallback Técnico:** `meta-llama/llama-4-scout-17b-16e-instruct`
2. **Fallback Calidad:** `openai/gpt-4o` (OpenRouter)
3. **Fallback Velocidad:** `gemini-1.5-flash`

## 3. Roles de Agente (Gentleman SDD)

Para el flujo de desarrollo Spec-Driven (SDD), se ha configurado el siguiente "Dream Team" híbrido:

| Rol | Modelo | Proveedor | Razón |
| :--- | :--- | :--- | :--- |
| **Orchestrator** | `Gemini 3.1 Flash` | Google | Visión global y manejo de contexto masivo. |
| **Spec** | `Gemini 3.1 Flash` | Google | Precisión en la definición de requerimientos. |
| **Design** | `Gemini 3.1 Flash` | Google | Velocidad y coherencia arquitectónica. |
| **Apply (Coding)** | `Llama-3.3-70b-versatile` | **Groq** | Lógica de programación superior y respuesta instantánea. |
| **Verify** | `Gemini 3.1 Flash` | Google | Consistencia técnica y validación rápida. |

## 4. Implementación
Cualquier nueva implementación (Edge Functions, Server Actions) DEBE seguir esta jerarquía.

---
*Ultima Actualización: 2026-04-11 - Tras el Torneo Final.*
