## Exploration: Unificación y Sincronización del Sistema de Imágenes

### Current State
El sistema actual se encuentra en un estado inconsistente tras una refactorización parcial. Los callbacks entre `MediaTab` (contenedor) y `AssetCard` (item) dependen de un `index` volátil en lugar del `id` del nodo de Tiptap, lo que provoca errores de tipo y desincronización. Además, el editor maneja la regeneración por su cuenta, ignorando los presets del proyecto definidos en los servicios globales.

### Affected Areas
- `src/hooks/useImageManager.ts` — Debe centralizar la lectura de todos los atributos de Tiptap (incluyendo wrapping y dimensiones físicas) y exponer acciones por ID.
- `src/components/contents/writer/MediaTab/AssetCard.tsx` — Requiere sincronización de props y eliminación total de la dependencia de `index`.
- `src/components/contents/writer/MediaTab.tsx` — El panel Inspector debe desacoplarse y usar los mismos callbacks unificados que la Card.
- `src/components/contents/writer/NousAssetNodeView.tsx` — Debe delegar la regeneración al hook/servicio central para respetar los presets.
- `src/types/images.ts` — Unificar `GeneratedImage` y `ImageSlot` en una interfaz `ImageAsset` coherente.

### Approaches
1. **Refactor Estructural de Ciclo de Vida (Recomendado)** — Migrar todas las operaciones a ID-based, unificar tipos y centralizar la lógica de Tiptap en el hook `useImageManager`.
   - Pros: Elimina bugs de desincronización, garantiza que el Inspector y la Card vean siempre lo mismo, simplifica tests.
   - Cons: Toca cinco archivos críticos simultáneamente.
   - Effort: Medium

2. **Parche de Sincronización** — Solo arreglar los tipos de los callbacks actuales manteniendo la estructura de `index`.
   - Pros: Menor riesgo inmediato.
   - Cons: No resuelve la fragmentación de lógica de regeneración ni la falta de atributos en la UI. Acumula deuda técnica.
   - Effort: Low

### Recommendation
Se recomienda el **Approach 1 (Refactor Estructural)**. Dado que estamos en modo **Strict TDD**, la estabilidad a largo plazo del sistema de edición depende de tener un contrato de datos sólido entre el Editor y la UI de gestión de medios.

### Risks
- **Desplazamiento de Posiciones**: Al insertar/borrar por ID, debemos asegurar que el editor no pierda el foco o la posición si hay múltiples assets similares.
- **Pérdida de Unidades**: La conversión de dimensiones de `number` (UI) a `string` (Tiptap) debe ser robusta para no perder el `%` o `px`.

### Ready for Proposal
Yes — El camino técnico está claro y los riesgos están identificados.
