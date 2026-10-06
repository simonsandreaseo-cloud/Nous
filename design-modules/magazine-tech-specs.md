# Módulo: Magazine Tech Specs

**Propósito**: Mostrar datos duros, características técnicas, o comparaciones en una tabla de diseño ultra moderno. Ideal para artículos que analizan tecnología, materiales avanzados o gadgets, donde la tabla por defecto de Shopify se queda corta.

### CSS
```css
.mag-tech-specs {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    margin: 40px 0;
    border-radius: 8px; /* Bordes redondeados en las esquinas de la tabla */
}
.mag-tech-specs th {
    background: #1e293b; /* Cabecera oscura, estilo "Tech" */
    color: white;
    padding: 1.2rem 1.5rem;
    text-align: left;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-size: 0.9rem;
}
.mag-tech-specs td {
    padding: 1.2rem 1.5rem;
    background: #f8fafc; /* Fondo gris súper claro */
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
}
.mag-tech-specs tr:last-child td {
    border-bottom: none;
}
.mag-tech-specs tr:hover td {
    background: #f1f5f9; /* Efecto hover sutil en filas */
}

@media (max-width: 768px) {
    .mag-tech-specs th, .mag-tech-specs td {
        padding: 1rem;
    }
}
```

### Pautas de Aplicación
- **Estructura**: Usa una `<table>` estándar de HTML y aplícale la clase `.mag-tech-specs`.
- **Organización**: Siempre usa la estructura completa semántica: `<thead>`, `<tbody>`, `<tr>`, `<th>`, y `<td>`. La magia del diseño depende de que diferencies los `th` (títulos) de los `td` (datos).
- **Cuándo usarlo**: Utiliza esta tabla cuando necesites desglosar las características técnicas de unas gafas (ej. Procesador, Peso, Protección IP, Tipo de Cristal) o hacer cuadros comparativos de "Ventajas vs. Desventajas". Le da un aire de review técnico a lo Xataka o The Verge.
