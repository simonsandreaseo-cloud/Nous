# Módulo: Magazine Core

**Propósito**: Estilos base para contenedores, separadores e imágenes generales del diseño editorial.

### CSS
```css
.mag-wrapper { max-width: 1400px; margin: 0 auto; padding: 40px 20px; display: flex; flex-direction: column; gap: 80px; overflow: hidden; }
.mag-img > img { width: 100%; height: auto; display: block; mix-blend-mode: multiply; object-fit: cover; }
.mag-txt-center { max-width: 900px; margin: 0 auto; text-align: center; }
.mag-divider { border: 0; border-top: 2px solid #000; width: 60px; margin: 0 0 30px 0; }
.mag-divider-center { border: 0; border-top: 2px solid #000; width: 60px; margin: 0 auto 30px auto; }
```

### Pautas de Aplicación
- **`.mag-wrapper`**: Úsalo SIEMPRE como el contenedor padre o principal de todo el artículo. Todos los demás módulos van dentro de este.
- **`.mag-img`**: Aplícalo a cualquier contenedor de imagen genérico. El `mix-blend-mode: multiply` hará que el fondo blanco de la imagen se funda con la web (ideal para fotos de producto).
- **`.mag-txt-center`**: Úsalo para párrafos de introducción o conclusiones que requieran protagonismo centrado.
- **`.mag-divider` / `.mag-divider-center`**: Úsalos (`<hr class="...">`) antes de títulos (h2/h3) para dar aire y pausa visual, típico en revistas impresas.
