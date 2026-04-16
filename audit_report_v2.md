# Auditoría de Sobrecarga del Frontend y Egress de Supabase (Actualizada)

Tras analizar el estado actual del repositorio y los archivos involucrados en la aplicación `nous_2.0`, se han detectado los siguientes cuellos de botella que causan sobrecarga en el cliente y un consumo desmedido de *egress* de Supabase.

## 1. El Problema Principal: Auto-save Agresivo y Efecto "Echo"

El problema principal radica en cómo el cliente sincroniza su estado local con la base de datos a través de la función `updateTask` y la suscripción a WebSockets de Supabase.

### Archivo: `src/components/contents/writer/WriterStudio.tsx`
*   **Auto-save Monolítico (Líneas 408-429):**
    Existe un `useEffect` con un debounce de **10 segundos** (previamente reportado como 3 segundos, actualmente es de 10000ms).
    *   **Problema de Dependencias:** El array de dependencias de este hook incluye prácticamente todo el estado del editor (`content`, `strategyH1`, `strategyTitle`, `rawSeoData`, `strategyOutline`, `nousExtractorFindings`, etc.). Cualquier mínimo cambio en **cualquiera** de estos campos (incluso si solo se escribe una letra en el contenido) resetea el timer y dispara el guardado.
    *   **Payload Gigante:** Al dispararse, el `payload` construye un objeto inmenso. No solo envía el `content_body`, sino que incluye reconstrucciones completas de `research_dossier` (que anida `rawSeoData`, `briefing` y `nous_extractor_findings`) y `outline_structure`. Esto significa que cada 10 segundos de edición activa, el cliente envía cientos de KB o MBs a la API.

*   **El "Echo" de Realtime (Líneas 389-404):**
    El componente mantiene una suscripción `postgres_changes` al evento `UPDATE` para la tabla `task_contents`.
    *   **Problema:** Dado que el cliente envía un payload gigante (con todo el contenido) a través de REST (`updateTask`) cada 10 segundos, la base de datos emite un evento `UPDATE`. El canal de WebSocket recibe *de vuelta* este mismo payload gigante y la UI evalúa la diferencia. Si bien hay una comprobación `newContent !== useWriterStore.getState().content`, el gasto de red (egress) de recibir el objeto masivo a través de WebSocket ya se ha producido para todos los clientes conectados, multiplicando el tráfico por el número de pestañas o usuarios viendo el documento.

## 2. Ineficiencia en la Propagación (`updateTask`)

### Archivo: `src/store/project/task-slice.ts` (Líneas 161-231)
*   Se ha constatado que el código de `updateTask` ha sido mejorado arquitectónicamente respecto a versiones anteriores. Ya no utiliza `.select()` de forma explícita para recuperar el registro entero tras el guardado, lo que ahorra la mitad del egress en la llamada REST.
*   Además, divide inteligentemente las actualizaciones usando `Promise.all` e instruye *upserts* en tablas separadas (`task_contents`, `task_research`).
*   **El problema persistente:** Aunque `task-slice.ts` es ahora más eficiente distribuyendo la carga en base de datos, está a merced de lo que envía `WriterStudio.tsx`. Como `WriterStudio.tsx` envía un objeto con `research_dossier` y `content_body` completos en cada guardado, el store ejecuta un *upsert* de esos objetos pesados cada 10 segundos, induciendo carga innecesaria en la base de datos y propagando cambios vacíos o redundantes por la red.

## 3. Seguimiento de Presencia (Presence)

### Archivo: `src/components/contents/writer/WriterStudio.tsx` (Líneas 362-387)
*   **Revisión del problema antiguo:** El reporte anterior mencionaba problemas con el evento `visibilitychange` reenviando el estado de presencia de forma indiscriminada.
*   **Estado actual:** La lógica actual utiliza una suscripción a `presence` de Supabase acoplada a un `setInterval` de limpieza que se ejecuta cada 30 segundos (línea 379). No parece haber eventos DOM de `visibilitychange` alterando esto actualmente. Sin embargo, se debe monitorear si el `useEffect` que contiene el canal `writer_presence` no se está desmontando y remantando innecesariamente debido a cambios en sus dependencias (`[draftId, localUser, setActiveUsers, trackPresence]`).

## Recomendaciones Inmediatas (Plan de Refactorización)

1.  **Diferenciación del Estado (Diffing) en `WriterStudio.tsx`:**
    Se debe sustituir el `useEffect` monolítico por una lógica que guarde una referencia local (`useRef`) del último estado guardado en la base de datos. El temporizador de autoguardado solo debe incluir en su `payload` aquellas claves que **realmente hayan cambiado**. Si solo cambió `content_body`, no debe incluirse `research_dossier` bajo ninguna circunstancia.

2.  **Debounce Específico:**
    El autoguardado de texto (`content_body`) debe tener su propio debounce (ej. 5s-10s) separado de los cambios en metadatos pesados (`research_dossier`), los cuales idealmente deberían guardarse cuando se acciona explícitamente algún botón en su respectiva pestaña (SEO, Research, Outline) o mediante un tracking profundo.

3.  **Supresión de Suscripción a Contenido de Texto:**
    Si no es estrictamente imperativo que dos usuarios vean cómo se escriben letras en tiempo real (tipo Google Docs), la suscripción a `task_contents` en Supabase Realtime debería desactivarse. Para un sistema de "bloqueo de editor", bastaría con el sistema de Presence y un botón de "Tomar Control del Documento".
