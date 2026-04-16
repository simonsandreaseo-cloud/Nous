# Auditoría de Consumo de Egress en Supabase (Tabla `tasks` y WriterStudio)

## 1. El Problema Principal: Efecto "Echo" de Supabase Realtime + Auto-save

El problema principal de consumo desmedido de egress radica en la combinación de un **Auto-save agresivo** en el cliente y la suscripción a **Supabase Realtime (postgres_changes)** en la misma tabla (`tasks`).

### Archivo: `src/components/contents/writer/WriterStudio.tsx`
*   **Auto-save (Línea 468-529):** Existe un `useEffect` que implementa un autoguardado con un debounce de **3 segundos** (`setTimeout(..., 3000)`).
*   **Dependencias masivas:** Este `useEffect` depende de casi todo el estado del editor (`content`, `strategyH1`, `strategyTitle`, `rawSeoData`, `nousExtractorFindings`, etc.). Cualquier mínima pulsación de tecla o cambio en estos campos activa el timer de 3 segundos para hacer un `updateTask()`.
*   **Payload Gigante:** Cada vez que el autoguardado se dispara, se envía un objeto enorme que incluye:
    *   `content_body` (todo el contenido del artículo, que puede pesar muchos KB).
    *   `research_dossier` (que anida `rawSeoData`, `briefing`, `nous_extractor_findings`).
    *   `outline_structure`, `excerpt`, metadatos, etc.
*   **El "Echo" de Realtime (Línea 439-465):** En el mismo componente, hay una suscripción activa a `postgres_changes` para la tabla `tasks` (filtrada por `draftId`).
*   **Resultado:**
    1.  El usuario teclea algo -> Pasan 3 segundos.
    2.  El cliente envía un payload gigante (`UPDATE`) a la base de datos a través de `updateTask`.
    3.  Supabase procesa el `UPDATE`. Al estar la tabla en modo `realtime`, Supabase **transmite inmediatamente el payload completo (que ahora incluye el artículo entero) a todos los clientes suscritos** a ese ID.
    4.  El mismo cliente que acaba de guardar, recibe de vuelta su propio objeto gigante por el canal de Realtime. Si hay varias pestañas o usuarios viendo el documento, todos reciben este payload de X KB cada 3 segundos por cada editor activo.

## 2. Ineficiencia en `updateTask` y Respuesta del Servidor

### Archivo: `src/store/project/task-slice.ts`
*   **Función `updateTask` (Línea 107-160):**
*   Realiza un `.update(finalUpdates).eq('id', taskId).select().maybeSingle()`.
*   Al usar `.select()`, Supabase devuelve **todo el registro actualizado**.
*   Por lo tanto, en cada autoguardado, el cliente consume egress por duplicado:
    1.  A través de la respuesta HTTP del método `update()` que devuelve el registro completo.
    2.  A través del socket de WebSocket (Realtime) que hace broadcast del mismo registro completo.

## 3. Presencia Ineficiente (Presence)

### Archivo: `src/components/contents/writer/WriterStudio.tsx`
*   **Presence tracking (Línea 349-436):**
*   Hay un canal `writer_presence:${draftId}` que rastrea a los usuarios.
*   El evento de visibilidad de la ventana vuelve a ejecutar un `trackPresence(channel)` cada vez que la ventana gana el foco, reenviando los datos de usuario a todo el canal en lugar de solo mantener el estado pasivo que Supabase ya gestiona.

## Conclusión y Recomendaciones Arquitectónicas (A implementar)

1.  **Desacoplar Content del Auto-save Principal:**
    *   No guardar toda la estructura de la tarea (SEO, dossiers, metadata) si solo cambió una letra en el editor de texto. Debería haber endpoints u operaciones atómicas (ej: `updateTaskContent`, `updateTaskSEO`).
2.  **Optimizar / Eliminar la Suscripción Realtime para `content_body`:**
    *   Si no es estrictamente necesario el formato tipo "Google Docs" colaborativo en tiempo real letra por letra, se debe quitar la suscripción `postgres_changes` de la tabla `tasks` y manejar los bloqueos ("Editor ocupado por X persona") mediante `Presence`.
    *   Si la colaboración es necesaria, usar CRDTs (Yjs) a través de canales de Supabase enviando *solo los deltas/diffs* (los cambios exactos) en lugar de enviar el artículo entero en cada `UPDATE` de la base de datos.
3.  **No pedir el objeto de vuelta en Updates rutinarios:**
    *   Quitar `.select()` del método `updateTask` en el store si el cliente ya tiene el estado optimista actualizado localmente. Esto reduce el egress de la API REST a la mitad.
