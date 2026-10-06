# Módulo: Magazine Overlap (Efecto Frosted Glass)

**Propósito**: Crear una composición donde una imagen ocupa gran parte de la pantalla y un bloque de texto se superpone (pisa) a un costado. En este módulo, el texto cuenta con un efecto "Frosted Glass" (vidrio esmerilado) extremo.

### CSS
```css
.mag-overlap {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    align-items: center;
    margin: 6rem 0;
}
.mag-overlap .overlap-image {
    grid-column: 1 / 8;
    grid-row: 1;
    z-index: 1;
}
.mag-overlap .overlap-text {
    grid-column: 7 / 13;
    grid-row: 1;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 60px;
    z-index: 2;
    position: relative;
    box-shadow: 0 30px 60px rgba(0,0,0,0.1);
    border: 1px solid rgba(255, 255, 255, 0.4);
}
.mag-overlap.reverse .overlap-image {
    grid-column: 4 / 13;
}
.mag-overlap.reverse .overlap-text {
    grid-column: 1 / 6;
}

.mag-overlap .overlap-image img {
    width: 100%;
    height: auto;
    display: block;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@media (max-width: 1024px) {
    .mag-overlap, .mag-overlap.reverse {
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .mag-overlap .overlap-text, .mag-overlap.reverse .overlap-text {
        width: 90%;
        margin: -40px auto 0 auto;
        padding: 30px;
    }
}
```

### Pautas de Aplicación
- **Contenedor Principal**: Utiliza `<div class="mag-overlap">`. Si quieres que la imagen pase a la derecha y el texto a la izquierda, añádele la clase `.reverse`.
- **Imagen**: Usa `<div class="overlap-image">` y coloca dentro la etiqueta `<img>` o el shortcode de la galería.
- **Caja de Texto**: Usa `<div class="overlap-text">`. Esto aplicará el efecto translúcido borroso con borde blanco.
- **Uso ideal**: Al usar `blur(20px)` y `rgba(0.5)`, asegúrate de que la imagen debajo tenga colores vibrantes para que el efecto "Frosted Glass" se aprecie correctamente al teñir la caja de texto.
