# Engram Observations - Nous 2.0

## [2026-05-14] Solución a Verbosidad en Humanizador (Gemma-4)

### Problema
El modelo `gemma-4-31b-it` (vía Google AI Studio) presentaba *prompt leakage* y prefacios analíticos (ej: `* Input: ... * Task: ...`) al procesar bloques de HTML en el humanizador. Además, el uso de `systemInstruction` causaba errores 500 en la API de Google.

### Causa Raíz
Los modelos de la familia Gemma tienden a realizar un Chain of Thought (CoT) conversacional si el mensaje del usuario es solo texto plano. La falta de delimitadores y disparadores de salida permitía que el modelo "divagara" antes de entregar el resultado.

### Solución (Plan A - Blindaje Estructural)
Se aplicaron tres capas de defensa en `src/components/tools/writer/services.ts`:
1. **Unificación de Instrucciones:** Se movieron las reglas del sistema al cuerpo del mensaje del usuario para máxima compatibilidad.
2. **Delimitadores Fuertes:** El input HTML se envuelve en `<<<HTML_INPUT>>>`.
3. **Disparador de Salida (Output Forcing):** Se añadió la frase `SALIDA HTML DIRECTA (iniciando exactamente con la primera etiqueta...):` al final del prompt.
4. **Defensa de Poda:** Se añadió un post-procesamiento por código para extraer estrictamente el contenido entre el primer `<` y el último `>`.

### Resultado
Eliminación total de prefacios y verbosidad. El modelo ahora responde directamente con el código HTML procesado.
