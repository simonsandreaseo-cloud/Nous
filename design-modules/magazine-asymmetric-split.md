# Módulo: Magazine Asymmetric Split

**Propósito**: Crear divisiones de texto/imagen (o texto/producto) que no sean 50/50, sino que le den más peso visual a una de las columnas. Da un toque más editorial y menos predecible que la división clásica.

### CSS
```css
.mag-asym-split { display: grid; gap: 80px; align-items: center; margin: 80px 0; }
.mag-asym-img-focus { grid-template-columns: 1fr 1.5fr; }
.mag-asym-txt-focus { grid-template-columns: 1.5fr 1fr; }

.mag-asym-text { padding-right: 20px; }
.mag-asym-split.mag-asym-img-focus .mag-asym-text { padding-right: 0; padding-left: 20px; order: 2; }
.mag-asym-split.mag-asym-img-focus .mag-asym-media { order: 1; }

@media (max-width: 1024px) {
    .mag-asym-split { grid-template-columns: 1fr !important; gap: 40px; }
    .mag-asym-text { padding: 0 !important; order: 2 !important; }
    .mag-asym-media { order: 1 !important; }
}
```

### Pautas de Aplicación
- **Contenedor**: Crea un `<div class="mag-asym-split">` y añade la clase `.mag-asym-img-focus` si quieres que la imagen o producto ocupe más espacio (ideal cuando la foto tiene mucho detalle). Si el texto es largo, usa `.mag-asym-txt-focus`.
- **Hijos**: Dentro, utiliza dos contenedores: `.mag-asym-text` para la caja de texto y `.mag-asym-media` para la imagen o shortcode.
- **Cuándo usarlo**: Cuando la densidad de copywriting es muy grande (usa txt-focus para darle respiro) o cuando hay poco texto y quieres que el producto domine la sección visualmente (usa img-focus).
