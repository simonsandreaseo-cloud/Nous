# Módulo: Magazine Pull Quote

**Propósito**: Destacar una cita, frase célebre o idea clave en medio del texto. Rompe la monotonía de los párrafos largos atrayendo la atención del lector hacia una frase de alto impacto.

### CSS
```css
.mag-pull-quote {
    font-size: 2.2rem;
    font-style: italic;
    text-align: center;
    border-top: 4px solid #000;
    border-bottom: 4px solid #000;
    padding: 50px 30px;
    margin: 80px 10%;
    line-height: 1.3;
    color: #111;
    font-family: Georgia, serif; /* Le da un toque ultra elegante y tradicional */
}
.mag-pull-quote span {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    margin-top: 30px;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-family: inherit; /* Vuelve a la tipografía base de Shopify para el autor */
    color: #555;
}

@media (max-width: 768px) {
    .mag-pull-quote { 
        margin: 60px 0; 
        font-size: 1.6rem; 
        padding: 40px 20px; 
    }
}
```

### Pautas de Aplicación
- **Estructura**: Usa un `<div class="mag-pull-quote">`. Adentro, coloca la frase entre comillas directamente, y el nombre del autor/fuente dentro de una etiqueta `<span>`.
- **Ejemplo**: 
  ```html
  <div class="mag-pull-quote">
      "La moda pasa, el estilo permanece."
      <span>- Coco Chanel</span>
  </div>
  ```
- **Cuándo usarlo**: Ideal para romper paredes de texto densas o resaltar opiniones de expertos, diseñadores o celebridades mencionadas en el artículo.
