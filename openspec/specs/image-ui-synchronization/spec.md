# Image UI Synchronization Specification

## Purpose
Garantizar una experiencia de usuario fluida y coherente al permitir que múltiples interfaces de control (Card, Inspector, Editor) manipulen el mismo recurso de imagen de forma sincronizada y sin pérdida de datos.

## Requirements

### Requirement: Bidirectional Propagation
Cualquier cambio de atributo realizado en un panel de control (ej: Inspector lateral) MUST reflejarse de forma inmediata en los demás paneles activos que visualicen el mismo asset.

#### Scenario: Card to Inspector Sync
- GIVEN un asset seleccionado y visible tanto en el Inspector como en su `AssetCard` en la grilla.
- WHEN el usuario cambia la alineación en la `AssetCard`.
- THEN el control de alineación en el Inspector debe actualizar su estado visual para reflejar el nuevo valor.

### Requirement: Unified Dimension Sanitization
El sistema MUST sanitizar las entradas de dimensiones (ancho/alto) para asegurar la compatibilidad entre los controles numéricos de la UI y los formatos de Tiptap (`%`, `px`).

#### Scenario: Number to Percent Conversion
- GIVEN un control deslizante de ancho en la UI que maneja valores de 1 a 100.
- WHEN el usuario selecciona el valor `50`.
- THEN el sistema debe inyectar el atributo `width: "50%"` en el nodo de Tiptap.

#### Scenario: Unit Preservation
- GIVEN un asset con un ancho fijo de `"800px"`.
- WHEN se visualiza en la UI de edición.
- THEN el sistema debe respetar la unidad seleccionada y permitir el ajuste sin forzar la conversión a porcentajes si no es requerido.

### Requirement: Transient UI State Persistence
El estado efímero del asset en la UI (ej: si la Card está "expandida" para edición rápida) SHOULD persistir durante re-renders ligeros del editor para evitar saltos visuales molestos.

#### Scenario: Component Expansion Stability
- GIVEN una `AssetCard` expandida por el usuario.
- WHEN el contenido del editor cambia (triggering a state update).
- THEN la `AssetCard` debería permanecer expandida si el ID del asset sigue presente en el documento.
