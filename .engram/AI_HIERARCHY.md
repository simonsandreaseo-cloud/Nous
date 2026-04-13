# 🧠 GENTLEMAN BRAIN PROTOCOL V2: Nous 2.0 AI Hierarchy

Este documento es la **Fuente de Verdad** para la orquestación de IA en Nous 2.0. Define la jerarquía de modelos, sus límites de cuota (RPD/RPM) y la lógica de fallbacks recursivos.

---

## 🏛️ 1. Matriz de Orquestación y Fallbacks (3 Niveles)

Si un modelo falla (por cuota o error 429), el sistema debe saltar al siguiente nivel en menos de 500ms.

| Tipo de Tarea | Prioridad 1 (Gemini) | Fallback 1 (Gemini) | Fallback 2 (Groq/Otras) | Fallback 3 (Seguridad) |
| :--- | :--- | :--- | :--- | :--- |
| **Editorial/MD** | `gemini-3.1-flash-lite` | `gemini-3.1-flash` | `groq/compound` | `llama-3.3-70b` |
| **Técnica/JSON** | `gemma-3-4b-it` | `gemini-3.1-flash-lite` | `meta-llama/llama-4-scout` | `qwen/qwen3-32b` |
| **UI/Chat/HTML** | `gemini-3.1-flash-lite` | `gemma-3-4b-it` | `meta-llama/llama-4-scout` | `kimi-k2-instruct` |
| **Razonamiento** | `gemma-3-27b-it` | `gemini-3.1-flash` | `groq/compound` | `openai/gpt-oss-120b` |

> [!IMPORTANT]
> **Regla de Oro de Costos:** Siempre se debe agotar primero la cuota de la familia **Gemini/Gemma** (Prioridad 1 y Fallback 1) antes de realizar el salto de nube a **Groq**, debido a que Google ofrece mayores ventanas de tokens gratuitos en el tier actual. La serie **Gemini 2.5** queda relegada a tareas técnicas de baja prioridad si los modelos 3.1 agotan su cuota.


---

## 📊 2. Auditoría Técnica y Rate Limits (Abril 2026)

### Ecosistema Google (Via Gemini API)
*Tier 1 estimado. Los límites exactos deben verificarse en el dashboard de AI Studio.*

| Modelo ID | RPM | RPD | TPM | Especialidad | Soporte JSON/HTML |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **gemini-3.1-flash-lite** | 15 | 1,500 | 1M | **Redacción Premium**. El más elegante. | ✅ Nativo |
| **gemma-3-4b-it** | 20 | 2,000 | 500K | **JSON/Técnico**. Rápido y muy estable. | ✅ Estricto |
| **gemma-3-12b-it** | 10 | 1,000 | 300K | Investigación intermedia. | ✅ |
| **gemma-3-27b-it** | 5 | 500 | 200K | Razonamiento denso. | ✅ |
| **gemini-3.1-flash** | 15 | 1,500 | 1M | Redacción de alto impacto (Backup). | ✅ |
| **gemini-2.5-flash-lite** | 15 | 2,000 | 1M | Speed fallback. | ✅ |

### Ecosistema Groq (LPU)
*Límites base para Plan Developer conforme a GroqDocs.*

| Modelo ID | RPM | RPD | TPM | Especialidad | Nota Técnica |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **llama-4-scout-17b** | 30 | 1,000 | 30K | **Velocidad Extrema**. UI Reactiva. | Latencia < 2s. |
| **groq/compound** | 30 | 250 | 70K | **Razonamiento**. Ensamble inteligente. | Alta latencia. |
| **llama-3.3-70b** | 30 | 1,000 | 12K | Versatilidad total. | Muy robusto. |
| **kimi-k2-instruct** | 60 | 1,000 | 10K | Creatividad / Tono sofisticado. | Moonshot AI. |
| **qwen/qwen3-32b** | 60 | 1,000 | 6K | Generación masiva (Long context). | Muy extenso. |
| **openai/gpt-oss-120b** | 30 | 1,000 | 8K | Planificación estratégica. | Parco pero lógico. |

---

## 🏗️ 3. Consideraciones para Tareas Pesadas (High-Volume & Bulk)

Utilizar estos modelos cuando la tarea requiera procesar cientos de ítems o generar volúmenes masivos de texto, ya que poseen los **Rate Limits más amplios** del tier gratuito.

| Tarea Pesada | Modelo Recomendado | RPD (Cuota Diaria) | Ventaja Clave |
| :--- | :--- | :--- | :--- |
| **Limpieza de Datos Masiva** | `llama-3.1-8b-instant` (Groq) | **14,400** | La cuota más alta disponible. Velocidad LPU. |
| **Extracción Técnica/JSON** | `gemma-3-4b-it` (Google) | **2,000** | Estabilidad extrema en formatos estructurados. |
| **Clasificación / Tags** | `gemini-2.5-flash-lite` (Google) | **2,000** | Balance ideal entre inteligencia y cuota diaria. |
| **Resúmenes en Lote** | `qwen/qwen3-32b` (Groq) | **1,000** | Gran ventana de contexto y cuota generosa de tokens. |

> [!TIP]
> **Estrategia de Carga:** Para tareas de "Scraper" o "SEO Audit" de miles de URLs, el orquestador debe rotar prioritariamente entre `llama-3.1-8b` y `gemma-3-4b` para no agotar la cuota de los modelos "pro" (`flash-lite` o `llama-4`).


---

## 🛠️ 3. Política de Resiliencia y Manejo de Errores

El orquestador de Nous 2.0 activa el **Salto de Fallback** inmediatamente al detectar cualquiera de los siguientes códigos de error, garantizando continuidad absoluta en la experiencia del usuario.

### Matriz de Errores Críticos (Activadores de Fallback)

| Código HTTP | Error (Google/Groq) | Causa Probable | Acción del Orquestador |
| :--- | :--- | :--- | :--- |
| **429** | `RESOURCE_EXHAUSTED` | Límite de cuota (RPM/TPM/RPD). | **Salto Inmediato** al fallback. |
| **500** | `INTERNAL_SERVER_ERROR` | Error inesperado en el proveedor. | **Salto Inmediato**. |
| **502** | `BAD_GATEWAY` | Fallo en la infraestructura de red. | **Salto Inmediato**. |
| **503** | `SERVICE_UNAVAILABLE` | Sobrecarga temporal del modelo. | **Salto Inmediato**. |
| **504 / 524**| `DEADLINE_EXCEEDED` | Timeout (Prompt muy grande o lentitud).| **Salto Inmediato**. |

> [!WARNING]
> **Errores No-Retornables (400, 401, 403):** Estos errores (parámetros inválidos o API Key revocada) no activan fallbacks automáticos en la misma capa, sino que escalan a un error fatal o requieren rotación manual de llaves.

### Configuración de Inferencia
*   **Markdown:** Forzar delimitadores `[START_MD]` y `[END_MD]` para facilitar el parsing de Nous.
*   **JSON:** Usar siempre `response_mime_type: "application/json"` en Gemini y `json_mode` en Groq.
*   **HTML:** Solicitar fragmentos semánticos `HTML5` sin etiquetas estructurales de página.

---
*Este documento ha sido actualizado tras la Auditoría de Resiliencia de Abril 2026.*
