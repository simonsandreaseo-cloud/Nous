# Módulo: Magazine Duo Overlap

**Propósito**: Crear un collage editorial de alto impacto visual utilizando dos imágenes en posiciones escalonadas (staggered) y un bloque de texto que se superpone a ellas desde abajo. Es una estructura pesada y dominante.

### CSS
```css
.mag-duo-overlap { display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px; align-items: start; margin: 80px 0; }
.mag-duo-img-1 { grid-column: 1 / 6; grid-row: 1; }
.mag-duo-img-2 { grid-column: 6 / 13; grid-row: 1; margin-top: 80px; }
.mag-duo-img-1 img, .mag-duo-img-2 img { width: 100%; height: auto; mix-blend-mode: multiply; }
.mag-duo-info { 
    grid-column: 1 / 8; 
    grid-row: 2; 
    background: #fff; 
    padding: 40px; 
    border: 1px solid #eaeaea; 
    margin-top: -60px; 
    z-index: 2; 
    position: relative; 
}

/* Modificador inverso */
.mag-duo-overlap.reverse .mag-duo-img-1 { grid-column: 8 / 13; grid-row: 1; margin-top: 0; }
.mag-duo-overlap.reverse .mag-duo-img-2 { grid-column: 1 / 8; grid-row: 1; margin-top: 80px; }
.mag-duo-overlap.reverse .mag-duo-info { grid-column: 6 / 13; grid-row: 2; }

@media (max-width: 900px) {
    .mag-duo-overlap { display: flex; flex-direction: column; }
    .mag-duo-img-2 { margin-top: 20px; }
    .mag-duo-info, .mag-duo-overlap.reverse .mag-duo-info { margin-top: 0; border: none; padding: 20px 0; }
}
```

### Pautas de Aplicación
- **Contenedor**: Usa `<div class="mag-duo-overlap">` para el diseño base o agrega la clase `.reverse` para invertir las columnas.
- **Imágenes**: Usa `.mag-duo-img-1` y `.mag-duo-img-2`. La segunda imagen automáticamente bajará `80px` para romper la alineación horizontal.
- **Texto**: `.mag-duo-info` se ubica debajo, pero su margen negativo (`-60px`) hace que suba y "pise" las imágenes.
- **Cuándo usarlo**: Perfecto para mostrar variaciones de color de un mismo producto en un contexto lifestyle (ej. una persona usando el lente en la imagen 1, un detalle del lente en la imagen 2) acompañado de su descripción narrativa debajo.
