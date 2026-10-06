# Módulo: Magazine Dark Glass

**Propósito**: Crear una caja de texto con estilo *Glassmorphism* (cristal esmerilado) pero en su variante oscura, también conocida como "Modo Nocturno" o "Smoke Glass". Especialmente útil para superponer textos blancos sobre fotografías nocturnas, tecnológicas o con alto contraste.

### CSS
```css
.mag-glass-dark {
    background: rgba(15, 23, 42, 0.50); /* Azul marino muy oscuro / negro translúcido */
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 2.5rem;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    color: white;
    z-index: 10;
    border-radius: 1rem;
}
.mag-glass-dark h1, 
.mag-glass-dark h2, 
.mag-glass-dark h3, 
.mag-glass-dark h4, 
.mag-glass-dark p, 
.mag-glass-dark a {
    color: white !important;
}

@media (max-width: 900px) {
    .mag-glass-dark {
        padding: 1.5rem;
    }
}
```

### Pautas de Aplicación
- **Uso Estructural**: Es una clase de "modificador" o "utilidad". Puedes aplicarla a cualquier contenedor (un simple `<div>`, o sumarla como `.mag-ov-txt-r.mag-glass-dark` en un módulo de Overlap) para transformar el fondo del bloque de texto.
- **Contraste**: A diferencia del efecto *Glassmorphism* blanco (que requiere fotos claras detrás para notarse), este modo oscuro funciona increíble sobre imágenes oscuras o para contrastar violentamente sobre fondos blancos aportando un toque premium / tech (como el diseño de productos Apple Pro).
- **Herencia**: El CSS forza el texto interior a ser blanco para garantizar la legibilidad.
