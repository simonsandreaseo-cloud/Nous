# Image Management Core Specification

## Purpose
Establecer un sistema robusto de identificación y manipulación de recursos visuales (imágenes y slots) dentro del editor, permitiendo una comunicación precisa entre el estado del documento y los componentes de gestión de medios.

## Requirements

### Requirement: Asset Identification
Cada recurso visual (imagen o slot) dentro del documento MUST poseer un identificador único (ID) persistente que sea independiente de su posición relativa en el texto.

#### Scenario: Unique ID Assignment
- GIVEN un documento con múltiples imágenes.
- WHEN se extrae la lista de assets mediante el hook de gestión.
- THEN cada objeto `ImageAsset` debe contener un `id` único que represente un nodo específico en Tiptap.

### Requirement: Unified Data Model
El sistema SHALL unificar los tipos de "Image Slot" (pendiente) y "Nous Asset" (final) bajo una interfaz común `ImageAsset` para simplificar el consumo en la UI.

#### Scenario: Resource Type Discrimination
- GIVEN una lista mixta de slots e imágenes generadas.
- WHEN se renderiza la `MediaTab`.
- THEN los componentes deben poder distinguir el tipo (`type: 'slot' | 'image'`) y el estado de la UI (expandido, cargando) usando el mismo modelo.

### Requirement: Atomic Mutation through ID
Todas las operaciones de actualización (cambio de dimensiones, alineación, ajuste de texto) MUST realizarse utilizando el `id` del asset como referencia única para evitar colisiones por desplazamiento de nodos.

#### Scenario: Safe Attribute Update
- GIVEN una imagen con `id: "img_123"`.
- WHEN se cambia el ancho al 50% desde la `AssetCard`.
- THEN el hook debe encontrar exactamente el nodo con ese ID y aplicar el cambio sin afectar a otros nodos similares.
- AND no se debe producir corrupción de atributos por error de referencia indexada.

### Requirement: Project-Aligned Regeneration
La regeneración de imágenes desde cualquier punto de entrada MUST invocar el servicio de workflow global (`ImageWorkflowService`) para asegurar la aplicación consistente de semillas, modelos y estilos configurados a nivel de proyecto.

#### Scenario: Consistent Regeneration Call
- GIVEN una imagen insertada en el editor.
- WHEN se activa la acción de "Regenerar" desde el `NousAssetNodeView`.
- THEN se debe invocar la misma lógica que en la `AssetCard`, resultando en una imagen que respeta los presets del draft actual.
