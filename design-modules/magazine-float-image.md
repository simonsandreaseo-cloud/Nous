# Módulo: Magazine Float Image

**Propósito**: Incrustar una imagen lateral para que el texto fluya ("flote") alrededor de ella de forma orgánica.

### CSS
```css
.mag-float-img { float: right; width: 45%; margin: 0 0 40px 50px; }

/* Importante: El contenedor padre directo debe usar `display: flow-root;` 
   o clearfix para evitar que la imagen se desborde al contenedor siguiente. */

@media (max-width: 1024px) {
    .mag-float-img { float: none; width: 100%; margin: 0 0 30px 0; }
}
```

### Pautas de Aplicación
- **Uso Estructural**: El `<div>` contenedor de la sección **debe** tener `display: flow-root;` (o clase similar de clearfix).
- **Etiquetado**: Inserta `<div class="mag-float-img mag-img"><img src="..."></div>` justo antes de los párrafos que quieres que envuelvan la imagen.
- **Efecto visual**: El texto fluirá naturalmente por la izquierda de la imagen (ya que la imagen flota a la derecha). Ideal para artículos donde la imagen complementa directamente el bloque de lectura extenso.
