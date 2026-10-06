# Módulo: Magazine Drop Cap

**Propósito**: Darle un estilo de "primera plana" o inicio de capítulo a un texto, haciendo que la primera letra del párrafo sea gigante y flote a la izquierda del resto del texto (Letra Capitular).

### CSS
```css
.mag-drop-cap::first-letter {
    float: left;
    font-size: 5.5rem;
    line-height: 0.8;
    padding-right: 15px;
    padding-top: 8px;
    font-weight: 900;
    color: #000;
    text-transform: uppercase;
}
```

### Pautas de Aplicación
- **Uso**: Añade la clase `.mag-drop-cap` a la etiqueta `<p>` con la que inicie el artículo o una sección muy importante.
- **Detalle**: El pseudo-elemento `::first-letter` automáticamente tomará la primera letra del párrafo y le aplicará el formato gigante.
- **Cuándo usarlo**: Utilízalo siempre en el primer párrafo introductorio (lead) del artículo para dar un impacto fuerte y clásico de periódico/revista impresa.
