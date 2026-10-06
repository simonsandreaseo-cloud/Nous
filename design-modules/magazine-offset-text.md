# Módulo: Magazine Offset Text

**Propósito**: Romper la monotonía del texto centrado o justificado moviendo el bloque de texto hacia un lado de la pantalla.

### CSS
```css
.mag-txt-offset-l { max-width: 800px; margin: 0 auto 0 5%; }
.mag-txt-offset-r { max-width: 800px; margin: 0 5% 0 auto; }

@media (max-width: 1024px) {
    .mag-txt-offset-l, .mag-txt-offset-r { margin: 0 auto; }
}
```

### Pautas de Aplicación
- **`.mag-txt-offset-l`**: Desplaza el bloque de texto hacia el margen izquierdo, dejando un espacio vacío asimétrico a la derecha.
- **`.mag-txt-offset-r`**: Desplaza el bloque de texto hacia el margen derecho, dejando un espacio vacío a la izquierda.
- **Flujo Visual**: Alternar entre textos centrados (`.mag-txt-center`), alineados a la izquierda y a la derecha, ayuda a mantener al lector atento simulando el paso de página de una revista real. Úsalo para subtítulos importantes.
