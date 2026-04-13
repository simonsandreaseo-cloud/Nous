# 🌸 Manual de Ingeniería: Pollinations AI

Este documento es la fuente de verdad para la integración de Pollinations AI en **Nous 2.0**. Su objetivo es evitar errores de configuración y asegurar un uso óptimo de los servicios de generación de medios.

## 🖼️ Generación de Imágenes (GET /image)

La forma principal de generar imágenes es a través de una petición `GET` a `https://gen.pollinations.ai/image/{prompt}`.

### Modelos Disponibles (Verificados)
Utilizar un modelo no listado resultará en un error **400 Bad Request**.

*   **grok-imagine-pro** (Recomendado): El modelo más potente disponible actualmente. Alta coherencia y detalle.
*   **flux**: Excelente para realismo general.
*   **wan-image-pro**: Ideal para estilos artísticos y digitales de alta gama.
*   **gptimage**: Optimizado para prompts complejos.

> [!CAUTION]
> **NUNCA** usar `flux-realism` o `turbo`. Estos modelos causan fallos inmediatos. Se ha priorizado el uso de versiones **-pro** para maximizar la calidad visual.

### Parámetros de Query
| Parámetro | Tipo | Descripción | Default |
| :--- | :--- | :--- | :--- |
| `model` | string | ID del modelo (ej: `flux`). | `flux` |
| `width` | number | Ancho de la imagen. | `1024` |
| `height` | number | Alto de la imagen. | `1024` |
| `seed` | number | Semilla para reproducibilidad. | Aleatorio |
| `nologo` | boolean | `true` para remover la marca de agua. | `false` |
| `enhance` | boolean | Mejora automática del prompt. | `false` |
| `key` | string | API Key (`sk_...`). | Requerido |

---

### 🔊 Generación de Audio y Voces (GET /audio)
Endpoint: `https://gen.pollinations.ai/audio/{text}`

**Voces Disponibles:**
*   `nova`, `shimmer`, `rachel`, `alloy`, `echo`, `fable`, `onyx`.
*   Soporta IDs de ElevenLabs personalizados si se cuenta con la suscripción vinculada.

---

## 🛠️ Implementación en Nous 2.0

### Servicios Críticos
*   **`PollinationsService`**: (`src/lib/services/pollinationsService.ts`) Encargado de la construcción de URLs y validación técnica del prompt.
*   **`uploadGeneratedImage`**: (`src/lib/actions/imageActions.ts`) Server Action que descarga la imagen y la persiste en Supabase. Incluye registro detallado de errores (Body logging).

### Flujo de Autenticación
El sistema utiliza la variable `NEXT_PUBLIC_POLLINATIONS_API_KEY` (Secret Key `sk_`). 
*   **Localización**: `.env.local`
*   **Seguridad**: Aunque la clave tiene prefijo `NEXT_PUBLIC`, las descargas se realizan en una **Server Action** para evitar bloqueos por CORS y proteger la lógica de persistencia.

---

## 🚨 Troubleshooting: Error 400
Si recibes un error 400, verifica en este orden:
1.  **Modelo**: ¿Estás usando `flux`? Otros nombres pueden ser obsoletos.
2.  **Prompt**: Asegúrate de que el prompt no esté vacío o sea solo espacios.
3.  **Dimensiones**: Mantente cerca de los estándares (1024x1024, 1280x720).

---
*Ultima actualización: 2026-04-11 - Corrección de modelos inválidos y mejora de logging.*
