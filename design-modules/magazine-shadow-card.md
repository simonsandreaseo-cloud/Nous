# Módulo: Magazine Shadow Card

**Propósito**: Resaltar un bloque de texto colocándolo dentro de una "tarjeta" blanca con un sombreado suave (`box-shadow`), situada junto a un producto o imagen.

### CSS
```css
.mag-shadow-card-split { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; align-items: start; margin: 80px 0; }
.mag-shadow-text { 
    background: #fff; 
    padding: 60px; 
    box-shadow: 15px 15px 40px rgba(0,0,0,0.04); 
    position: relative; 
}

@media (max-width: 1024px) {
    .mag-shadow-card-split { grid-template-columns: 1fr; gap: 40px; }
    .mag-shadow-text { padding: 40px; margin-bottom: -40px; margin-right: 0; z-index: 2; }
}
```

### Pautas de Aplicación
- **Contenedor**: Usa `<div class="mag-shadow-card-split">`.
- **Estructura**: Usa `<div class="mag-shadow-text">` para el texto y `<div class="mag-media">` (o directamente el shortcode de producto) en la otra columna.
- **Cuándo usarlo**: Es excelente para resaltar ventajas técnicas de un modelo (ej. tecnología de bisagras o materiales). El sombreado le da volumen a la web, como si fuera una tarjeta física de presentación.
