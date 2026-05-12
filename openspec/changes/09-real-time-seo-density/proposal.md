# Proposal: 09-Real-Time SEO Density (Semaphore UX)

## Context
Actualment el Nous Studio v2 permite generar contenido optimizado, pero el usuario no tiene feedback visual inmediato sobre la densidad de keywords mientras edita manualmente. Necesitamos un sistema de "Semáforo" que valide la salud SEO del contenido en tiempo real sin latencia de red.

## Problem
- Los usuarios sobre-optimizan o sub-optimizan sin darse cuenta.
- El análisis SEO actual es asíncrono y depende de procesos externos.
- Falta de feedback táctil/visual durante la escritura.

## Proposed Solution
Implementar `@nous/seo-engine` como una librería puramente frontend que analice el texto plano extraído de Tiptap y lo compare con la estrategia definida en el `WriterStore`.

### Key Components
1. **`@nous/seo-engine` (src/lib/seo-engine)**:
   - Motor de análisis basado en Regex con límites de palabra (`\b`).
   - Soporte para keywords principales y LSI.
   - Cálculo de estados:
     - **Gris (Falta)**: 0 apariciones.
     - **Verde (Óptimo)**: 1-3 apariciones (dependiendo de la longitud del texto).
     - **Rojo (Sobre-optimizado)**: >3% de densidad o exceso de repeticiones.

2. **SEO Density Widget**:
   - Componente React en el sidebar del Writer.
   - Escucha los cambios del editor con un debounce de 500ms.
   - Visualización tipo "Píldoras" con colores de semáforo.

3. **Auditability**:
   - Logs al `AuditLogger` (vía console/store) cuando se completan hitos (ej: "SEO 100% cubierto").

## Impact
- Mejora drástica en la UX de edición.
- Garantiza que el contenido final cumpla con la estrategia SEO sin salir del editor.
- Reducción de latencia al procesar todo en el cliente.

## Strategy
1. **Research**: Validar extracción de texto en `WriterEditor.tsx`.
2. **Implementation**: Crear motor de análisis y tests unitarios.
3. **UI/UX**: Diseñar el widget en el sidebar.
4. **Validation**: Pruebas con diferentes longitudes de texto y keywords.

## Next Steps
- Crear la especificación técnica (`spec.md`).
- Implementar el motor de análisis.
