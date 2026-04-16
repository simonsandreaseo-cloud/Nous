# Design: Unificación y Sincronización del Sistema de Imágenes

## Technical Approach
Implementar un sistema de gestión reactivo basado en el estado del editor Tiptap. El hook `useImageManager` transformará los nodos del documento en una lista plana de `ImageAsset`. Todas las mutaciones se realizarán mediante transacciones de Tiptap localizando los nodos por su atributo `id` único, garantizando que los cambios en la UI afecten al nodo correcto independientemente de su posición.

## Architecture Decisions

### Decision: Búsqueda de Nodos por ID
**Choice**: Usar `editor.state.doc.descendants` para iterar y encontrar el nodo por su atributo `id`.
**Alternatives considered**: Usar `editor.commands.updateAttributes` basándose en la selección actual.
**Rationale**: La gestión en la `MediaTab` ocurre fuera del foco directo del editor. Buscar por ID permite actualizar imágenes que no están seleccionadas en ese momento.

### Decision: Modelo Unificado `ImageAsset`
**Choice**: Una interfaz única con discriminante `type: 'slot' | 'image'`.
**Alternatives considered**: Mantener tipos separados y mapear en la UI.
**Rationale**: Reduce la complejidad de los componentes `MediaTab` y `AssetCard`, permitiendo una grilla uniforme que maneja estados de carga y edición de forma coherente.

## Data Flow
```
    Tiptap State ──→ useImageManager (Derivación) ──→ Multi-UI (Card/Inspector)
         ↑                                                  │
         └─────────── Transacción Tiptap (por ID) ──────────┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/types/images.ts` | Modify | Unificar `GeneratedImage` y `ImageSlot` en `ImageAsset`. |
| `src/hooks/useImageManager.ts` | Modify | Refactor total para usar búsqueda por ID y exponer nuevos atributos. |
| `src/utils/image-utils.ts` | Create | Helpers `cleanDimension(val)` y `toTiptapWidth(val)`. |
| `src/components/contents/writer/MediaTab.tsx` | Modify | Ajustar desacoplamiento del Inspector y pase de callbacks. |
| `src/components/contents/writer/MediaTab/AssetCard.tsx` | Modify | Implementar props alineadas a `ImageAsset` y usar `id` para callbacks. |
| `src/components/contents/writer/NousAssetNodeView.tsx` | Modify | Delegar lógica de regeneración al `ImageWorkflowService`. |

## Interfaces / Contracts

```typescript
// src/types/images.ts
export interface ImageAsset {
  id: string; // Tiptap unique ID
  type: 'image' | 'slot';
  url?: string;
  prompt: string;
  attributes: {
    width: string; // Tiptap format: "100%" or "800px"
    align: 'left' | 'center' | 'right' | 'full';
    wrapping: 'inline' | 'wrap' | 'break' | 'behind' | 'front';
    pixelWidth?: number;
    pixelHeight?: number;
  };
  status: 'pending' | 'final' | 'ghost';
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `useImageManager` | Mock de `Editor` de Tiptap. Verificar que `updateAsset` localiza el nodo correcto por ID. |
| Integration | `AssetCard` Sync | Verificar que cambiar un atributo en el mock del hook actualiza el renderizado de la Card. |
| E2E | Refactor Flow | Abrir MediaTab, expandir Card, cambiar ancho, verificar que el nodo en el editor tiene el nuevo atributo. |

## Migration / Rollout
No se requiere migración de datos persistentes. El atributo `id` ya es parte del esquema de Tiptap pero se empezará a usar como clave primaria en la UI.

## Open Questions
- [ ] ¿UUID o ID numérico incremental para nuevos slots? Se optará por UUID corto para evitar colisiones entre sesiones.
