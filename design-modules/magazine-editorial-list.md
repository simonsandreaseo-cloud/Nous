# Módulo: Magazine Editorial List

**Propósito**: Transformar una lista aburrida de características, ventajas o consejos en una cuadrícula de dos columnas con bloques estilo tarjeta. Destaca mediante una sutil línea lateral (border-left) y un fondo gris muy tenue.

### CSS
```css
.mag-editorial-list { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 60px 0; }
.mag-list-item { 
    padding: 30px; 
    background: #fcfcfc; 
    border: 1px solid #f0f0f0; 
    border-left: 4px solid #000; 
}
.mag-list-item h4 { margin-top: 0; font-size: 1.2rem; }

@media (max-width: 768px) {
    .mag-editorial-list { grid-template-columns: 1fr; }
}
```

### Pautas de Aplicación
- **Contenedor**: Envuelve toda la lista en un `<div class="mag-editorial-list">`.
- **Ítems**: Cada tarjeta debe ser un `<div class="mag-list-item">`. Dentro, puedes usar un `<h4>` para el título del ítem y párrafos normales o shortcodes.
- **Cuándo usarlo**: Utilízalo para desglosar viñetas largas (bullets) que tienen su propio título y explicación, como "Tipos de rostros", "Características técnicas", o "Variedades de cristales". Visualmente es mucho más rico que una etiqueta `<ul>`.
