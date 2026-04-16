# Proposal: Unificación y Sincronización del Sistema de Imágenes

## Intent
Resolver la desincronización y los errores de tipo entre el Editor de Tiptap y el Panel de Medios. Actualmente, el uso de índices volátiles para callbacks corrompe los atributos de los nodos y duplica la lógica de servicios (regeneración), lo que degrada la experiencia del autor y la estabilidad del contenido.

## Scope

### In Scope
- Creación de interfaz `ImageAsset` unificada (Slot + Final Image).
- Refactor de `useImageManager` para operar 100% por `id`.
- Sincronización de atributos faltantes (`wrapping`, `align`, `pixelWidth/Height`) en la UI.
- Unificación de la lógica de regeneración delegando al hook central.
- Limpieza de props en `AssetCard` y `MediaTab`.

### Out of Scope
- Nueva infraestructura de almacenamiento (se usa Supabase existente).
- Cambio en los modelos de IA de generación (se mantienen Grok/Flux vía Pollinations).
- Refactor de otros nodos de Tiptap (solo assets e image-slots).

## Capabilities

### New Capabilities
- `image-management-core`: Gestión centralizada de assets del documento mediante estado derivado de Tiptap.
- `image-ui-synchronization`: Sincronización bidireccional entre la vista del editor y los paneles laterales de configuración.

### Modified Capabilities
None (Repositorio nuevo en SDD).

## Approach
Implementar un refactor estructural siguiendo el patrón de **Single Source of Truth**. El hook `useImageManager` actuará como el único traductor entre la estructura interna de Tiptap y los componentes React, exponiendo una lista de `ImageAsset` y un set de callbacks que reciben el `id` del nodo para garantizar precisión atómica en las actualizaciones.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/hooks/useImageManager.ts` | Modified | Reimplamentar lógica de extracción y mutación por ID. |
| `src/components/contents/writer/MediaTab/AssetCard.tsx` | Modified | Eliminar `index`, sincronizar nuevos atributos de diseño. |
| `src/components/contents/writer/MediaTab.tsx` | Modified | Ajustar pase de callbacks y limpieza del Inspector. |
| `src/components/contents/writer/NousAssetNodeView.tsx` | Modified | Delegar regeneración de imagen al hook. |
| `src/types/images.ts` | Modified | Unificar interfaces de datos. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Pérdida de foco en el editor | Med | Usar transacciones de Tiptap que preserven la selección original. |
| Corrupción de unidades CSS | Low | Implementar helpers de sanitización (`px`, `%`) para las dimensiones. |
| Colisión de IDs | Low | Asegurar que la generación de IDs sea determinista o suficientemente aleatoria (UUID). |

## Rollback Plan
Revertir a los commits previos a la implementación. Las migraciones de base de datos no se ven afectadas ya que solo cambia el manejo de atributos en la capa de UI/Editor.

## Success Criteria
- [ ] Los cambios realizados en una `AssetCard` se reflejan instantáneamente en el Inspector y viceversa.
- [ ] No se producen errores de consola `"undefined object properties"` al actualizar el ancho de una imagen desde la Card.
- [ ] La regeneración de imagen funciona correctamente desde ambos puntos de entrada (Editor y MediaTab) usando la misma configuración.
- [ ] Todos los tests de Vitest para `useImageManager` pasan con el nuevo esquema de IDs.
