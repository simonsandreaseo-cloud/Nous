# Módulo: Magazine Mosaic

**Propósito**: Crear una galería estilo "mosaico" con un bloque de texto seguido por dos imágenes contiguas, ideal para mostrar detalles o diferentes ángulos.

### CSS
```css
.mag-mosaic { display: grid; grid-template-columns: repeat(12, 1fr); gap: 40px; align-items: center; }
.mag-mos-txt { grid-column: 1 / 6; }
.mag-mos-img1 { grid-column: 6 / 9; }
.mag-mos-img2 { grid-column: 9 / 13; }

@media (max-width: 1024px) {
    .mag-mosaic { display: flex; flex-direction: column; gap: 20px; }
}
```

### Pautas de Aplicación
- **Contenedor**: Utiliza `<div class="mag-mosaic">` como contenedor principal.
- **Estructura Interna**:
  1. `<div class="mag-mos-txt">`: Para el título, separador y texto descriptivo (ocupa 5/12 del espacio).
  2. `<div class="mag-mos-img1 mag-img">`: Primera imagen del mosaico.
  3. `<div class="mag-mos-img2 mag-img">`: Segunda imagen (más ancha que la primera).
- **Cuándo usarlo**: Utilízalo para secciones donde hay poco texto pero se necesitan mostrar dos imágenes visuales juntas para contrastar modelos o detalles técnicos.
