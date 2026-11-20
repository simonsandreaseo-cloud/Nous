# Manual Maestro de Arquitectura y Librería de Módulos CSS Editoriales
**Proyecto:** Nous — Sistema de Maquetación Editorial de Lujo para Shopify  
**Ubicación:** `Desarrollos/Nous/LIBRERIA_MODULOS_CSS.md`  
**Última actualización:** Septiembre 2026

---

## 🏛️ 1. Filosofía del Proyecto: Alta Costura en la Web

El objetivo de Nous no es subir texto plano a un blog, sino transformar cada artículo en una experiencia visual inmersiva, elegante y vanguardista digna de revistas de moda y diseño como *Vogue*, *GQ* o *Harper's Bazaar*.

- **El Espacio Negativo:** No temerle al espacio en blanco. Márgenes amplios (`gap: 60px` a `80px`) dan aire y permiten que los productos respiren con autoridad.
- **Asimetría Controlada:** Huir de la clásica cuadrícula aburrida e inflexible de "imagen arriba, texto abajo". La asimetría deliberada genera dinamismo y curiosidad durante el scroll.
- **Fluidez y Ritmo:** Diseñar el flujo visual para que el ojo del lector viaje de manera orgánica desde los titulares persuasivos hacia los productos y puntos de conversión.

---

## 🚫 2. Límites de Acción y Reglas de Oro SEO (El Territorio del Body)

Nuestra jurisdicción técnica como desarrolladores y maquetadores de contenido **es exclusivamente el cuerpo del artículo (`body`)**.

1. **PROHIBICIÓN TOTAL DEL `<h1>`:**
   - **NUNCA** generes la etiqueta `<h1>` dentro del código HTML.
   - El CMS de Shopify inyecta automáticamente el `<h1>` a través del título principal de la plantilla. Incluir un `<h1>` en el código creará títulos duplicados, arruinando la jerarquía semántica y penalizando el SEO.
   - El artículo debe comenzar siempre con un párrafo introductorio `<p>` o con un subtítulo `<h2>`.
2. **PROHIBICIÓN DE BANNERS HERO (`.hero`):**
   - El banner principal de portada se carga desde los campos nativos del CMS.
   - **NUNCA** diseñes un bloque de portada con imagen gigante al inicio. Inicia directamente con el texto y distribuye las imágenes a lo largo del cuerpo del artículo.
3. **COPYWRITING INTOCABLE Y SAGRADO (REGLA DE ORO):**
   - Está estrictamente prohibido alterar, corregir, resumir o "mejorar" el texto original suministrado por el redactor.
   - No cortes frases, no fusiones párrafos ni modifiques encabezados para que "encajen" en un bloque visual.
   - **El layout CSS se construye y adapta alrededor del texto original; el texto nunca se mutila para adaptarse al CSS.**
4. **JERARQUÍA SEMÁNTICA DESCENDENTE:**
   - Usar `<h2>` para los ejes temáticos principales y `<h3>` para modelos específicos o subtemas. No saltar niveles jerárquicos (ej. de `<h2>` a `<h4>`) sin justificación estructural.

---

## 🎨 3. Arquitectura Técnica: CSS Estructural vs. CSS Decorativo

Trabajamos bajo el principio del **"Esqueleto sin Piel"**: construimos la arquitectura espacial, pero dejamos que el tema nativo de Shopify vista los elementos.

### ✅ Lo que SÍ se debe aplicar (CSS Estructural):
- `display: grid;`, `display: flex;`, `display: flow-root;`
- Espaciado y dimensiones relativas: `gap`, `margin`, `padding`, `width`, `max-width`, `calc()`
- Profundidad y flujo: `z-index`, `position: relative`, `position: absolute`, `order`
- Transformaciones espaciales: `transform: rotate(...)`, sombras sutiles (`box-shadow`), efectos de cristal (`backdrop-filter`)

### ❌ Lo que está ESTRICTAMENTE PROHIBIDO (CSS Decorativo):
- **Cero fuentes externas (`@import` y `font-family`):** PROHIBIDO importar fuentes desde Google Fonts o definir tipografías forzadas en los textos. El CMS ya inyecta las fuentes oficiales de la marca.
- **Cero colores globales de texto:** No forzar colores en párrafos ni enlaces que rompan la paleta del tema de Shopify.
- **Cero Frameworks Externos (CERO Tailwind CSS):** No alucinar ni incluir clases utilitarias ajenas como `text-indigo-600`, `w-full`, `shadow-2xl`, etc. Todo el CSS debe ser nativo y auto-contenido dentro de esta librería.
- **Máximo 2 Columnas para Textos de Lectura:** NUNCA diagramar párrafos de lectura en 3 columnas (incluyendo minigalerías o cuadrículas de tarjetas que contengan párrafos explicativos). La lectura humana colapsa en web con 3 columnas estrechas. El límite estricto para texto es 2 columnas (`column-count: 2` o grid 50/50). Las 3 columnas se reservan única y exclusivamente para galerías de productos.
- **Bullets Confinados o Eliminados en Tarjetas:** NUNCA permitir que viñetas nativas de lista (`disc`) queden flotando en el aire fuera del margen izquierdo de tarjetas o cajas con borde/fondo. En cuadrículas de tarjetas, eliminar las viñetas externas (`list-style: none;` o estructura `<div>`) o confinar el bullet visual estrictamente DENTRO de la tarjeta mediante `.mag-bullet-dot` o `list-style-position: inside`.

---

## 📸 4. Protocolo Crítico de Tratamiento de Imágenes y Medios

1. **Recorte de Fotografías Lifestyle (Cuidado con las Cabezas):**
   - Cuando se utilice `object-fit: cover` en fotos verticales o de modelos, **NUNCA** permitir que la imagen se recorte por la parte superior (decapitando al modelo).
   - Aplicar **SIEMPRE** `object-position: center top;` o `object-position: top;` para forzar que el rostro quede visible y el exceso se pierda por la parte inferior.
2. **Precaución Absoluta con Selectores de Imagen (`> img`):**
   - Al estilar imágenes dentro de un layout, usar **SIEMPRE selectores de hijo directo** (ej. `.mag-split-media > img` o `.overlap-image > img`).
   - **PELIGRO:** Si usas selectores generales como `.mi-contenedor img`, la regla descenderá y afectará a las imágenes internas de las tarjetas de producto inyectadas por Shopify a través de shortcodes, rompiendo sus dimensiones.
3. **Fusión de Fondos Blancos (`mix-blend-mode: multiply`):**
   - Para fotografías de producto sobre fondo blanco o gris claro, aplicar siempre `mix-blend-mode: multiply;` para integrarlas orgánicamente sobre el fondo de la web sin necesidad de PNGs transparentes pesados.
4. **Mapeo Semántico Obligatorio de Imágenes:**
   - Auditar siempre el nombre de archivo de cada URL (ej. `.../Gucci-GG1680S.webp`). Colocar la fotografía **exactamente** en la sección donde se habla de ese modelo específico. Prohibido agrupar imágenes en mosaicos arbitrarios si eso implica descontextualizarlas de su texto correspondiente.
5. **Prohibido Inventar Imágenes:**
   - NUNCA inventar URLs ni usar imágenes generadas por IA. Si faltan recursos gráficos, estructurar el layout para que el usuario pueda insertarlos o dejar el espacio semántico reservado.

---

## 🛍️ 5. Embeds de Shopify, Sintaxis de Shortcodes y Hacks de Splide

Shopify transforma los shortcodes de productos en carruseles JavaScript controlados por la librería **Splide.js**. Conocer y neutralizar su comportamiento matemático es vital para que no rompa el diseño.

### Regla 1: Sintaxis de Shortcodes Intocable
- Shopify admite tanto corchetes cuadrados `[*ID*]` como llaves `{ *ID* }`. Respeta estrictamente la sintaxis que envíe el usuario; nunca la alteres.

### Regla 2: Shortcodes Libres de Ancho Completo
- Si un producto va solo en su propia línea a lo ancho, **déjalo desnudo** sin envoltorios extraños. Shopify lo renderiza de forma nativa sin problemas.

### Regla 3: El Hack de Splide para 1 Solo Producto Confinado
Cuando insertas un único producto dentro de un espacio estrecho (como la celda de una tabla o una columna lateral), Shopify cree que debe inicializar un carrusel de 3 productos y encoge el ítem al 33%, convirtiéndolo en un ícono minúsculo ("Bug de los Íconos").  
**Solución:** Neutralizar la matemática de Splide envolviendo el shortcode y aplicando:
```css
.tu-contenedor-padre .splide__slide { 
    width: 100% !important; 
    max-width: 400px !important; 
    margin: 0 auto !important; 
}
.tu-contenedor-padre .splide__arrows, 
.tu-contenedor-padre .splide__pagination { 
    display: none !important; 
}
.tu-contenedor-padre .splide__list { 
    display: flex !important; 
    justify-content: center !important; 
}
```

### Regla 4: El Hack de Splide para Grillas de 3 Productos (Aislamiento Obligatorio)
Para galerías múltiples de 3 o más productos en una sola fila, se deben aplicar proporciones relativas (`calc`) y **SIEMPRE prefijadas con `.editorial-container`** para evitar romper sliders globales del sitio web (como el banner de opiniones de Trustpilot en el header):
```css
.editorial-container .splide__list { 
    display: flex !important; 
    flex-wrap: wrap; 
    justify-content: center !important; 
    gap: 20px; 
}
.editorial-container .splide__slide { 
    width: calc(33.333% - 20px) !important; 
    min-width: 250px; 
    margin: 0 !important; 
}
```

### Regla 5: Tablas Exclusivas y Reseteo del Marco Negro
Únicamente usamos tablas `<table>` para catálogos con fotos y descripciones lado a lado o comparativas técnicas.  
**Regla Obligatoria:** Shopify inyecta un marco negro tosco por defecto a todas las tablas. Siempre debes aplicar un reseteo de bordes:
```css
table, tbody, tr, td { 
    border: 0px solid transparent !important; 
}
```

---

## 🧹 6. Higiene de Código y Reglas de Producción

1. **CERO COMENTARIOS (REGLA ESTRICTA E INNEGOCIABLE):**
   - **PROHIBIDO** incluir comentarios HTML (`<!-- ... -->`) en el código entregado.
   - **PROHIBIDO** incluir comentarios CSS (`/* ... */`) en el bloque `<style>` del entregable final.
   - El código entregado al CMS debe ser 100% limpio, sintético y listo para producción.
2. **Estructura de Entrega Única:**
   - El archivo se compone exclusivamente de:
     1. Bloque `<style>` al inicio (con las clases encapsuladas).
     2. Estructura HTML debajo, envuelta en `.editorial-container` y `.mag-wrapper`.

---

## 📑 7. Índice de Módulos

### Estructura Base
- [01. Magazine Core (`magazine-core.md`)](#01-magazine-core)

### Layouts Asimétricos y Splits
- [02. Magazine Asymmetric Split (`magazine-asymmetric-split.md`)](#02-magazine-asymmetric-split)
- [03. Magazine Featured Split (`magazine-featured-split.md`)](#03-magazine-featured-split)
- [04. Magazine Shadow Card (`magazine-shadow-card.md`)](#04-magazine-shadow-card)
- [05. Magazine Float Image (`magazine-float-image.md`)](#05-magazine-float-image)
- [06. Magazine Offset Text (`magazine-offset-text.md`)](#06-magazine-offset-text)

### Superposiciones y Composiciones Editoriales
- [07. Magazine Overlap & Frosted Glass (`magazine-overlap.md`)](#07-magazine-overlap--frosted-glass)
- [08. Magazine Duo Overlap (`magazine-duo-overlap.md`)](#08-magazine-duo-overlap)
- [09. Magazine Lookbook Grid (`magazine-lookbook-grid.md`)](#09-magazine-lookbook-grid)
- [10. Magazine Mosaic (`magazine-mosaic.md`)](#10-magazine-mosaic)
- [11. Magazine Polaroid Block (`magazine-polaroid-block.md`)](#11-magazine-polaroid-block)

### Tablas, Listas y Fichas Técnicas
- [12. Magazine Specs Table (`magazine-specs-table.md`)](#12-magazine-specs-table)
- [13. Magazine Tech Specs Table (`magazine-tech-specs.md`)](#13-magazine-tech-specs-table)
- [14. Magazine Editorial List (`magazine-editorial-list.md`)](#14-magazine-editorial-list)

### Micro-Módulos Tipográficos
- [15. Magazine Drop Cap (`magazine-drop-cap.md`)](#15-magazine-drop-cap)
- [16. Magazine Pull Quote (`magazine-pull-quote.md`)](#16-magazine-pull-quote)
- [17. Magazine Numbered Header (`magazine-numbered-header.md`)](#17-magazine-numbered-header)

### Utilidades y Estilos Especiales
- [18. Magazine Dark Glass (`magazine-dark-glass.md`)](#18-magazine-dark-glass)

---

## 📦 8. Catálogo Completo de Módulos (01 al 18)

### 01. Magazine Core
**Propósito:** Estilos base para contenedores globales, imágenes con mezcla y divisores tipográficos.

#### CSS
```css
.mag-wrapper { 
    max-width: 1400px; 
    margin: 0 auto; 
    padding: 40px 20px; 
    display: flex; 
    flex-direction: column; 
    gap: 80px; 
    overflow: hidden; 
}
.mag-img > img { 
    width: 100%; 
    height: auto; 
    display: block; 
    mix-blend-mode: multiply; 
    object-fit: cover; 
}
.mag-txt-center { 
    max-width: 900px; 
    margin: 0 auto; 
    text-align: center; 
}
.mag-divider { 
    border: 0; 
    border-top: 2px solid #000; 
    width: 60px; 
    margin: 0 0 30px 0; 
}
.mag-divider-center { 
    border: 0; 
    border-top: 2px solid #000; 
    width: 60px; 
    margin: 0 auto 30px auto; 
}
```

---

### 02. Magazine Asymmetric Split
**Propósito:** Divisiones con pesos asimétricos (1fr / 1.5fr o 1.5fr / 1fr) que rompen la previsibilidad del 50/50.

#### CSS
```css
.mag-asym-split { 
    display: grid; 
    gap: 80px; 
    align-items: center; 
    margin: 80px 0; 
}
.mag-asym-img-focus { grid-template-columns: 1fr 1.5fr; }
.mag-asym-txt-focus { grid-template-columns: 1.5fr 1fr; }

.mag-asym-text { padding-right: 20px; }
.mag-asym-split.mag-asym-img-focus .mag-asym-text { 
    padding-right: 0; 
    padding-left: 20px; 
    order: 2; 
}
.mag-asym-split.mag-asym-img-focus .mag-asym-media { order: 1; }

@media (max-width: 1024px) {
    .mag-asym-split { grid-template-columns: 1fr !important; gap: 40px; }
    .mag-asym-text { padding: 0 !important; order: 2 !important; }
    .mag-asym-media { order: 1 !important; }
}
```

---

### 03. Magazine Featured Split
**Propósito:** Producto protagonista ocupando 2/3 (66%) de la pantalla, flanqueado por una caja de texto con efecto *Glassmorphism*.

#### CSS
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
    width: 100%; 
    height: auto; 
    display: block; 
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

---

### 04. Magazine Shadow Card
**Propósito:** Resalta un bloque de texto dentro de una tarjeta blanca con sombra difuminada y suave, generando profundidad física.

#### CSS
```css
.mag-shadow-card-split { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 80px; 
    align-items: start; 
    margin: 80px 0; 
}
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

---

### 05. Magazine Float Image
**Propósito:** Envuelve una imagen dentro del flujo natural del texto (`float: right`), permitiendo una lectura continua clásica.

#### CSS
```css
.mag-float-img { 
    float: right; 
    width: 45%; 
    margin: 0 0 40px 50px; 
}

@media (max-width: 1024px) {
    .mag-float-img { float: none; width: 100%; margin: 0 0 30px 0; }
}
```
*Nota:* El contenedor padre debe incluir `display: flow-root;` para contener los flotantes.

---

### 06. Magazine Offset Text
**Propósito:** Desplaza los párrafos hacia la izquierda o hacia la derecha, rompiendo la cuadrícula rígida.

#### CSS
```css
.mag-txt-offset-l { max-width: 800px; margin: 0 auto 0 5%; }
.mag-txt-offset-r { max-width: 800px; margin: 0 5% 0 auto; }

@media (max-width: 1024px) {
    .mag-txt-offset-l, .mag-txt-offset-r { margin: 0 auto; }
}
```

---

### 07. Magazine Overlap & Frosted Glass
**Propósito:** Superpone una caja de texto translúcida (*Frosted Glass* con `blur(20px)`) pisando físicamente una fotografía de gran escala.

#### CSS
```css
.mag-overlap {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    align-items: center;
    margin: 6rem 0;
}
.mag-overlap .overlap-image {
    grid-column: 1 / 8;
    grid-row: 1;
    z-index: 1;
}
.mag-overlap .overlap-text {
    grid-column: 7 / 13;
    grid-row: 1;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    padding: 60px;
    z-index: 2;
    position: relative;
    box-shadow: 0 30px 60px rgba(0,0,0,0.1);
    border: 1px solid rgba(255, 255, 255, 0.4);
}
.mag-overlap.reverse .overlap-image {
    grid-column: 4 / 13;
}
.mag-overlap.reverse .overlap-text {
    grid-column: 1 / 6;
}

.mag-overlap .overlap-image img {
    width: 100%;
    height: auto;
    display: block;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@media (max-width: 1024px) {
    .mag-overlap, .mag-overlap.reverse {
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .mag-overlap .overlap-text, .mag-overlap.reverse .overlap-text {
        width: 90%;
        margin: -40px auto 0 auto;
        padding: 30px;
    }
}
```

---

### 08. Magazine Duo Overlap
**Propósito:** Dos fotos escalonadas y una caja de texto inferior con margen negativo que pisa ambas fotografías.

#### CSS
```css
.mag-duo-overlap { 
    display: grid; 
    grid-template-columns: repeat(12, 1fr); 
    gap: 20px; 
    align-items: start; 
    margin: 80px 0; 
}
.mag-duo-img-1 { grid-column: 1 / 6; grid-row: 1; }
.mag-duo-img-2 { grid-column: 6 / 13; grid-row: 1; margin-top: 80px; }
.mag-duo-img-1 img, .mag-duo-img-2 img { width: 100%; height: auto; mix-blend-mode: multiply; }
.mag-duo-info { 
    grid-column: 1 / 8; 
    grid-row: 2; 
    background: #fff; 
    padding: 40px; 
    border: 1px solid #eaeaea; 
    margin-top: -60px; 
    z-index: 2; 
    position: relative; 
}

.mag-duo-overlap.reverse .mag-duo-img-1 { grid-column: 8 / 13; grid-row: 1; margin-top: 0; }
.mag-duo-overlap.reverse .mag-duo-img-2 { grid-column: 1 / 8; grid-row: 1; margin-top: 80px; }
.mag-duo-overlap.reverse .mag-duo-info { grid-column: 6 / 13; grid-row: 2; }

@media (max-width: 900px) {
    .mag-duo-overlap { display: flex; flex-direction: column; }
    .mag-duo-img-2 { margin-top: 20px; }
    .mag-duo-info, .mag-duo-overlap.reverse .mag-duo-info { margin-top: 0; border: none; padding: 20px 0; }
}
```

---

### 09. Magazine Lookbook Grid
**Propósito:** Cuadrícula de 12 columnas que simula una doble página abierta de revista, intercalando fotos lifestyle, texto y productos.

#### CSS
```css
.mag-lookbook {
    display: grid; 
    grid-template-columns: repeat(12, 1fr); 
    gap: 20px;
    max-width: 1100px; 
    margin: 100px auto; 
    padding: 0 20px; 
    align-items: start;
}
.mag-lb-text {
    background-color: #ffffff; 
    padding: 40px; 
    z-index: 2;
    border: 1px solid #eaeaea; 
    box-shadow: 0 15px 40px rgba(0,0,0,0.04);
}
.mag-lb-img-1 { grid-column: 1 / 8; grid-row: 1; height: 600px; }
.mag-lb-txt-1 { grid-column: 7 / 13; grid-row: 1; margin-top: 150px; }
.mag-lb-prod-1 { grid-column: 1 / 13; grid-row: 2; margin: 80px 0; }
.mag-lb-img-2 { grid-column: 6 / 13; grid-row: 3; height: 500px; }
.mag-lb-txt-2 { grid-column: 1 / 7; grid-row: 3; margin-top: 100px; }

@media (max-width: 900px) {
    .mag-lookbook { grid-template-columns: 1fr; gap: 30px; margin: 40px auto; padding: 0 15px; }
    .mag-lookbook > div { 
        grid-column: 1 / -1 !important; 
        grid-row: auto !important; 
        margin-top: 0 !important; 
        height: auto !important; 
        max-height: 500px; 
    }
    .mag-lb-text { 
        padding: 30px; 
        margin-top: -40px !important; 
        margin-left: 15px; 
        margin-right: 15px; 
        text-align: left !important; 
    }
}
```

---

### 10. Magazine Mosaic
**Propósito:** Mosaico de 3 elementos horizontales: 1 bloque de texto y 2 fotos contiguas.

#### CSS
```css
.mag-mosaic { 
    display: grid; 
    grid-template-columns: repeat(12, 1fr); 
    gap: 40px; 
    align-items: center; 
}
.mag-mos-txt { grid-column: 1 / 6; }
.mag-mos-img1 { grid-column: 6 / 9; }
.mag-mos-img2 { grid-column: 9 / 13; }

@media (max-width: 1024px) {
    .mag-mosaic { display: flex; flex-direction: column; gap: 20px; }
}
```

---

### 11. Magazine Polaroid Block
**Propósito:** Efecto de fotografía polaroid (borde inferior ancho, rotación `-2deg` y sombra), combinada con texto lateral.

#### CSS
```css
.mag-polaroid-block { 
    display: grid; 
    grid-template-columns: 1fr 1.5fr; 
    gap: 60px; 
    align-items: center; 
    margin: 60px 0; 
}
.mag-polaroid-frame { 
    padding: 20px 20px 60px 20px; 
    background: #fff; 
    box-shadow: 0 20px 40px rgba(0,0,0,0.1); 
    transform: rotate(-2deg); 
}
.mag-polaroid-frame img { 
    width: 100%; 
    height: auto; 
    display: block; 
    mix-blend-mode: multiply; 
}

@media (max-width: 900px) {
    .mag-polaroid-block { grid-template-columns: 1fr; }
    .mag-polaroid-frame { transform: none; margin-bottom: 40px; padding: 15px 15px 45px 15px; }
}
```

---

### 12. Magazine Specs Table
**Propósito:** Catálogo limpio de productos (foto izquierda, specs derecha), con reseteo de bordes de Shopify.

#### CSS
```css
.mag-specs-table { 
    width: 100%; 
    border-collapse: collapse; 
    margin: 60px 0; 
    border: none; 
}
.mag-specs-table, 
.mag-specs-table tbody, 
.mag-specs-table tr, 
.mag-specs-table td { 
    border: 0px solid transparent !important; 
}
.mag-specs-row { border-bottom: 1px solid #eaeaea; }
.mag-specs-col-img { 
    width: 35%; 
    padding-right: 40px; 
    text-align: left !important; 
    vertical-align: middle; 
}
.mag-specs-col-txt { 
    width: 65%; 
    text-align: left; 
    vertical-align: middle; 
    padding: 20px 0; 
}
.mag-specs-col-txt strong { 
    text-transform: uppercase; 
    font-size: 0.85rem; 
    letter-spacing: 1px; 
    color: #555; 
}

@media (max-width: 900px) {
    .mag-specs-table, 
    .mag-specs-table tbody, 
    .mag-specs-table tr, 
    .mag-specs-table td { display: block; width: 100%; }
    .mag-specs-col-img { width: 100%; padding-right: 0; margin-bottom: 20px; }
    .mag-specs-col-txt { width: 100%; border-bottom: 1px solid #eaeaea; padding-bottom: 30px; }
}
```

---

### 13. Magazine Tech Specs Table
**Propósito:** Tabla de datos duros y especificaciones con cabecera oscura (`#1e293b`), esquinas redondeadas y filas alternadas con hover.

#### CSS
```css
.mag-tech-specs {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    margin: 40px 0;
    border-radius: 8px;
}
.mag-tech-specs th {
    background: #1e293b;
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
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    vertical-align: top;
}
.mag-tech-specs tr:last-child td {
    border-bottom: none;
}
.mag-tech-specs tr:hover td {
    background: #f1f5f9;
}

@media (max-width: 768px) {
    .mag-tech-specs th, .mag-tech-specs td {
        padding: 1rem;
    }
}
```

---

### 14. Magazine Editorial List
**Propósito:** Cuadrícula de 2 columnas de tarjetas sutiles con borde lateral negro grueso (`border-left: 4px solid #000`) para sustituir viñetas aburridas.

#### CSS
```css
.mag-editorial-list { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 40px; 
    margin: 60px 0; 
}
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

---

### 15. Magazine Drop Cap
**Propósito:** Letra capitular monumental (`5.5rem`) para párrafos de apertura.

#### CSS
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

---

### 16. Magazine Pull Quote
**Propósito:** Cita destacada en gran formato entre gruesas líneas negras para romper muros de texto.

#### CSS
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
    font-family: Georgia, serif;
}
.mag-pull-quote span {
    display: block;
    font-size: 1rem;
    font-weight: 700;
    margin-top: 30px;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-family: inherit;
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

---

### 17. Magazine Numbered Header
**Propósito:** Encabezados numerados colosales (`5rem`) con títulos en mayúsculas y línea divisoria inferior para artículos Top / Listicle.

#### CSS
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

---

### 18. Magazine Dark Glass
**Propósito:** Efecto *Glassmorphism* oscuro (*Smoke Glass* / Modo Noche) para fotografías oscuras, gadgets tecnológicos o ambientes deportivos de alta gama.

#### CSS
```css
.mag-glass-dark {
    background: rgba(15, 23, 42, 0.50);
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

---

## ✅ 9. Checklist de Calidad Final de Producción para Nous

Antes de emitir cualquier artículo maquetado, verificar esta lista de control:

- [ ] **Estructura limpia:** Bloque `<style>` al inicio y estructura HTML debajo.
- [ ] **SEO intacto:** ¿Se omitieron todos los `<h1>`? ¿El artículo arranca con `<p>` o `<h2>`?
- [ ] **Cero Banners Hero:** ¿Se omitieron bloques `.hero` de portada?
- [ ] **Copywriting 100% fiel:** ¿Se conservó el texto exactamente como fue suministrado, sin podas ni modificaciones?
- [ ] **Cero comentarios:** ¿El entregable está 100% libre de comentarios HTML (`<!-- -->`) y CSS (`/* */`)?
- [ ] **CSS puramente estructural:** ¿Se omitieron fuentes externas (`@import`), clases de Tailwind y estilos invasivos para `p`/`h2`?
- [ ] **Máximo 2 columnas para lectura:** ¿Ningún párrafo largo está comprimido en 3 columnas?
- [ ] **Aislamiento de selectores de imagen:** ¿Todas las reglas de imagen usan selectores directos (`> img`) para no romper carruseles internos de Shopify?
- [ ] **Cuidado con las cabezas de modelos:** ¿Las fotos verticales y lifestyle tienen `object-position: center top;` para no decapitar rostros?
- [ ] **Fusión de fondos blancos:** ¿Las fotos de producto tienen `mix-blend-mode: multiply;`?
- [ ] **Hacks de Splide encapsulados:** ¿Los productos individuales o de catálogo tienen sus hacks de Splide aislados dentro de sus contenedores?
- [ ] **Reseteo de tablas:** ¿Se aplicó `border: 0px solid transparent !important;` en las tablas para matar el marco negro de Shopify?
- [ ] **Mapeo semántico:** ¿Cada foto o shortcode está ubicado exactamente en la sección que describe ese modelo específico?
