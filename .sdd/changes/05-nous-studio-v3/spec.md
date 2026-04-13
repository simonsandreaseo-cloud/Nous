# Technical Specification: 05-nous-studio-v3

## 1. Módulo de Investigación y Scraping Masivo

### 1.1 Ingesta y Scraping Paralelo
- **REQ-1 (Simultaneidad)**: Implementar scraping paralelo de **20 URLs simultáneas** utilizando Cloudflare Browser Rendering + Supabase Edge Functions.
- **REQ-2 (Serper Integration)**: Configurar Serper para 30 resultados por ángulo de búsqueda, reduciendo de 6 a **4 ángulos principales**.
- **REQ-3 (Filtro de Entrada)**: Eliminar dominios prohibidos antes del scraping.
- **REQ-4 (Readability & Markdown)**: Implementar un pipeline de limpieza basado en `Readability.js` para extraer el bloque de contenido principal y convertirlo a **Markdown destilado**. No pasar HTML sucio a la IA.
- **REQ-5 (H1 & Intent Parallel)**: Mientras se scrapea, un proceso paralelo de IA genera el **H1 Maestro** e identifica la **Intención de Búsqueda**.

### 1.2 Filtrado IA de Alto Contexto
- **REQ-6 (Filtro IA Distilled)**:
  - **Modelos**: Gemini 3.1 Flash Lite Preview o Groq.
  - **Input**: Markdown destilado de todas las URLs supervivientes + H1 + Intención de Búsqueda.
  - **Output**: Lista de URLs ganadoras útiles para la redacción. Agnóstico al tipo de contenido.

## 2. Métricas Propietarias: LSI & ASK

### 2.1 LSI Advanced
- **REQ-7 (Cálculo)**: Cantidad de usos recomendados por cada 700 palabras.
- **REQ-8 (Semáforo de Color LSI)**:
  - Verde: +/- 2 diff. Amarillo: > 2 diff. Gris: < mitad. Rojo: >= 150%.

### 2.2 ASK (Argot SEO Keywords)
- **REQ-9 (Detección)**: IA especializada determina palabras de nicho valiosas (ASK) y su frecuencia ideal.
- **REQ-10 (Semáforo de Color ASK)**:
  - Verde: EXACTO. Amarillo: >= 70%. Gris: < 70%. Rojo: >= 150%.
- **REQ-11 (Visualización)**: Usar **Gráficos de Bala (Bullet Graphs)** para cada indicador.

## 3. Workflow Editorial y Studio

### 3.1 Floating Outline Menu
- **REQ-12 (Contextual UI)**: Botón flotante "Outline" que despliega un menú con navegación horizontal de segmentos (H2).
- **REQ-13 (Segment Interaction)**: Cada segmento permite visualización de pautas/referencias y botón de inserción/seguimiento. Animación de recolección vía `@chenglou/pretext`.
- **REQ-14 (Cerebro Gemma 3 27b)**: Analiza el Markdown de competidores para sintetizar la estructura de headers.
- **REQ-15 (Formato H2)**: Pautas, Referencias, LSI, Keywords, Enlaces internos, Densidad de Argot y lista ASK.

### 3.2 El Néctar (Intro)
- **REQ-16 (Post-H1)**: Párrafo de **máximo 2 oraciones y 40 palabras finales** que resuelva la intención de búsqueda de forma directa.

## 4. Post-procesado y Calidad SEO

### 4.1 Optimización Quirúrgica
- **REQ-17 (Surgical Injection)**: Inyección de terminología (LSI/ASK) en conectores o huecos semánticos sin reescribir oraciones completas.
- **REQ-18 (Humanización First)**: El proceso de Humanización ocurre primero para alcanzar el 0% de detección IA. La optimización quirúrgica de keywords ocurre DESPUÉS.
- **REQ-19 (Sticky Action Tool)**: Botón fijo inferior por pestaña (Nous, RM, Yoast) que aplica las correcciones con colores de marca.

## 5. UI de Sistema e Inmersión

### 5.1 Consola de Versiones
- **REQ-23 (Etiquetado)**: Registro de autoría: Usuario, Humanizador, Redactor, Post-procesado.
- **REQ-24 (Preview & Restore)**: Modo previsualización al hacer clic; botón de restauración.

### 5.2 Modo Envolvente
- **REQ-25 (Audio)**: Switch en settings para activar sonidos y música de fondo (Opera GX style). Desactivado por defecto.
- **REQ-26 (Intensidad)**: Slider de intensidad; nivel máximo: "Solo si disfrutas tu trabajo".

---
*Senior Architect: Antigravity AI (Senior Architect)*
