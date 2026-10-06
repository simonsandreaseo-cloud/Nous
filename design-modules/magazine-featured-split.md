# Módulo: Magazine Featured Split

**Propósito**: Darle un protagonismo absoluto a una fotografía o producto (ocupando 2/3 de la pantalla) acompañado de una caja de texto pequeña y elegante (ocupando 1/3) con efecto *Glassmorphism* (cristal esmerilado). 

### CSS
```css
.mag-featured-split {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 40px;
    margin: 120px 0;
    align-items: center;
}
.mag-featured-split.reverse {
    grid-template-columns: 2fr 1fr;
}
.mag-featured-split.reverse .mag-split-info { order: 2; }
.mag-featured-split.reverse .mag-split-media { order: 1; }

.mag-glass-box {
    background: rgba(245, 245, 245, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 40px;
    border-radius: 1.5rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.03);
    border: 1px solid rgba(255, 255, 255, 0.5);
}

.mag-split-media img {
    width: 100%; height: auto; display: block; 
    border-radius: 2rem; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
    mix-blend-mode: multiply;
}

@media (max-width: 900px) {
    .mag-featured-split, .mag-featured-split.reverse { 
        grid-template-columns: 1fr; 
        gap: 40px; 
        margin: 60px 0; 
    }
    .mag-featured-split.reverse .mag-split-info { order: 2; }
    .mag-featured-split.reverse .mag-split-media { order: 1; }
    .mag-glass-box { padding: 25px; }
}
```

### Pautas de Aplicación
- **Contenedor Principal**: Utiliza `<div class="mag-featured-split">`. Si quieres que la imagen (el lado grande) esté a la izquierda y el texto a la derecha, añádele la clase `.reverse`.
- **Caja de Texto**: Usa `<div class="mag-split-info mag-glass-box">`. Esto aplicará el efecto translúcido borroso con bordes redondeados y un sutil borde blanco (estilo macOS/iOS).
- **Imagen / Producto**: Usa `<div class="mag-split-media">` en la otra columna.
- **Uso estratégico**: Al otorgar un espacio de `2fr` a la columna multimedia, los shortcodes de Shopify para sliders de productos se verán enormes e imponentes, atrayendo la compra. Ideal para presentar el producto "Héroe" de una sección.
