# Tasks: Unificación y Sincronización del Sistema de Imágenes

## Phase 1: Foundation & Types
- [/] 1.1 Unificar interfaces en `src/types/images.ts` definiendo `ImageAsset`.
- [ ] 1.2 Crear `src/utils/image-utils.ts` con helpers `cleanDimension` y `toTiptapWidth`.
- [ ] 1.3 Implementar tests unitarios para los helpers de `image-utils.ts`.

## Phase 2: Testing Setup (Strict TDD)
- [ ] 2.1 Configurar mocks de Tiptap Editor en `src/hooks/__tests__/useImageManager.test.ts`.
- [ ] 2.2 Crear test que falle (RED) para la extracción de assets por ID.

## Phase 3: Core Implementation (useImageManager)
- [ ] 3.1 Refactorizar `useImageManager` para que pase el test de extracción por ID (GREEN).
- [ ] 3.2 Crear test (RED) para la mutación de atributos por ID (`updateAssetAttributes`).
- [ ] 3.3 Implementar `updateAssetAttributes` usando transacciones de Tiptap por ID (GREEN).
- [ ] 3.4 Implementar lógica de regeneración centralizada que invoque `ImageWorkflowService`.

## Phase 4: UI Synchronization & Wiring
- [ ] 4.1 Actualizar `AssetCard.tsx`: remover `index`, usar `ImageAsset` y callbacks por ID.
- [ ] 4.2 Actualizar `MediaTab.tsx`: sincronizar el Inspector con el nuevo contrato de atributos.
- [ ] 4.3 Modificar `NousAssetNodeView.tsx` para delegar la regeneración al hook/servicio central.

## Phase 5: Verification & Cleanup
- [ ] 5.1 Verificar sincronización bidireccional (Card <-> Inspector) en el navegador.
- [ ] 5.2 Realizar "Judgment Day" review de los cambios realizados.
- [ ] 5.3 Eliminar lógica redundante y logs de depuración.
