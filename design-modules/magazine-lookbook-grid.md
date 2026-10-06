# Módulo: Magazine Lookbook Grid

**Propósito**: Crear una cuadrícula compleja tipo "Lookbook" donde múltiples imágenes, textos descriptivos y productos flotan orgánicamente ocupando distintas porciones del ancho, simulando una doble página de revista.

### CSS
```css
.mag-lookbook {
    display: grid; grid-template-columns: repeat(12, 1fr); gap: 20px;
    max-width: 1100px; margin: 100px auto; padding: 0 20px; align-items: start;
}
.mag-lb-text {
    background-color: #ffffff; padding: 40px; z-index: 2;
    border: 1px solid #eaeaea; box-shadow: 0 15px 40px rgba(0,0,0,0.04);
}
/* Patrón A (Alternado) */
.mag-lb-img-1 { grid-column: 1 / 8; grid-row: 1; height: 600px; }
.mag-lb-txt-1 { grid-column: 7 / 13; grid-row: 1; margin-top: 150px; }
.mag-lb-prod-1 { grid-column: 1 / 13; grid-row: 2; margin: 80px 0; }
.mag-lb-img-2 { grid-column: 6 / 13; grid-row: 3; height: 500px; }
.mag-lb-txt-2 { grid-column: 1 / 7; grid-row: 3; margin-top: 100px; }

@media (max-width: 900px) {
    .mag-lookbook { grid-template-columns: 1fr; gap: 30px; margin: 40px auto; padding: 0 15px; }
    .mag-lookbook > div { grid-column: 1 / -1 !important; grid-row: auto !important; margin-top: 0 !important; height: auto !important; max-height: 500px; }
    .mag-lb-text { padding: 30px; margin-top: -40px !important; margin-left: 15px; margin-right: 15px; text-align: left !important; }
}
```

### Pautas de Aplicación
- **Contenedor**: Usa `<div class="mag-lookbook">`.
- **Estructura**: Usa las clases enumeradas para disponer el contenido. El bloque `.mag-lb-text` incluye un sombreado suave que permite que el texto resalte al solaparse con las imágenes.
- **Cuándo usarlo**: Utilízalo para una sección principal de una colección donde tienes 2-3 fotos lifestyle del mismo modelo pero en distintos ángulos o colores, junto con descripciones y el producto final.
