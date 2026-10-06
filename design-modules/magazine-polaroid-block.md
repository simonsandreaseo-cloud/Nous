# Módulo: Magazine Polaroid Block

**Propósito**: Crear una composición asimétrica donde una imagen adquiere el aspecto físico de una foto polaroid (con borde blanco, rotación ligera y sombra) colocada junto a un bloque de texto. Aporta un toque nostálgico, artesanal o de "detrás de escena".

### CSS
```css
.mag-polaroid-block { display: grid; grid-template-columns: 1fr 1.5fr; gap: 60px; align-items: center; margin: 60px 0; }
.mag-polaroid-frame { 
    padding: 20px 20px 60px 20px; 
    background: #fff; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
    transform: rotate(-2deg); 
}
.mag-polaroid-frame img { width: 100%; height: auto; display: block; mix-blend-mode: multiply; }

@media (max-width: 900px) {
    .mag-polaroid-block { grid-template-columns: 1fr; }
    .mag-polaroid-frame { transform: none; margin-bottom: 40px; padding: 15px 15px 45px 15px; }
}
```

### Pautas de Aplicación
- **Estructura**: Envuelve la sección en un `<div class="mag-polaroid-block">`.
- **Imagen**: Dentro de la primera columna, usa `<div class="mag-polaroid-frame">` y coloca la imagen dentro. El padding inferior ancho (`60px`) crea el efecto visual de una polaroid antigua donde se escribía con marcador.
- **Texto**: En la segunda columna, coloca el texto descriptivo o un shortcode de producto.
- **Cuándo usarlo**: Ideal para secciones de "historia", "inspiración", "moodboard" o referencias al pasado (como colecciones retro o vintage).
