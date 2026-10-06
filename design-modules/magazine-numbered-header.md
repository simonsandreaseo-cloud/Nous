# Módulo: Magazine Numbered Header

**Propósito**: Crear encabezados gigantescos y altamente estilizados para artículos en formato de "Lista" (Listicles) o "Top X". 

### CSS
```css
.mag-num-header {
    display: flex;
    align-items: baseline;
    border-bottom: 2px solid #000;
    padding-bottom: 15px;
    margin: 80px 0 40px 0;
}
.mag-num-header .mag-num {
    font-size: 5rem;
    font-weight: 900;
    color: #000;
    margin-right: 25px;
    line-height: 0.75;
    letter-spacing: -3px;
}
.mag-num-header h2, .mag-num-header h3 {
    font-size: 2rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0 !important;
    line-height: 1.1;
}

@media (max-width: 768px) {
    .mag-num-header .mag-num { font-size: 4rem; margin-right: 15px; }
    .mag-num-header h2, .mag-num-header h3 { font-size: 1.5rem; }
}
```

### Pautas de Aplicación
- **Estructura**: 
  ```html
  <div class="mag-num-header">
      <div class="mag-num">01</div>
      <h2>La Silueta Aviador</h2>
  </div>
  ```
- **Diseño**: Combina un número colosal (flexbox alineado a la base del texto) con el título en mayúsculas, y una gruesa línea negra inferior.
- **Cuándo usarlo**: Siempre que el artículo enumere elementos (Las 7 Siluetas, Los 5 Errores, Top 10 Gafas). Reemplaza por completo el aburrido formato de texto `<h2>1. La Silueta Aviador</h2>` por un diseño digno de GQ o Vogue.
