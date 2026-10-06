# Módulo: Magazine Specs Table

**Propósito**: Mostrar especificaciones técnicas o características de un producto en un formato de tabla limpia y editorial. Ideal para catálogos o fichas técnicas que requieren comparación.

### CSS
```css
.mag-specs-table { width: 100%; border-collapse: collapse; margin: 60px 0; border: none; }
.mag-specs-table, .mag-specs-table tbody, .mag-specs-table tr, .mag-specs-table td { border: 0px solid transparent !important; }
.mag-specs-row { border-bottom: 1px solid #eaeaea; }
.mag-specs-col-img { width: 35%; padding-right: 40px; text-align: left !important; vertical-align: middle; }
.mag-specs-col-txt { width: 65%; text-align: left; vertical-align: middle; padding: 20px 0; }
.mag-specs-col-txt strong { text-transform: uppercase; font-size: 0.85rem; letter-spacing: 1px; color: #555; }

@media (max-width: 900px) {
    .mag-specs-table, .mag-specs-table tbody, .mag-specs-table tr, .mag-specs-table td { display: block; width: 100%; }
    .mag-specs-col-img { width: 100%; padding-right: 0; margin-bottom: 20px; }
    .mag-specs-col-txt { width: 100%; border-bottom: 1px solid #eaeaea; padding-bottom: 30px; }
}
```

### Pautas de Aplicación
- **Estructura**: Usa una tabla HTML convencional (`<table>`) y aplícale la clase `.mag-specs-table`.
- **Limpieza de Shopify**: El CSS resetea específicamente el marco negro (`border: 0px`) que Shopify inyecta por defecto a las tablas.
- **Columnas**: Usa `.mag-specs-col-img` para la celda de la imagen/shortcode (izquierda) y `.mag-specs-col-txt` para las especificaciones en texto (derecha).
- **Contenido**: En la celda de texto, resalta las etiquetas con `<strong>` (ej. `<strong>Material:</strong> Acetato`). El CSS automáticamente las hará ver como pequeños rótulos técnicos de revista.
