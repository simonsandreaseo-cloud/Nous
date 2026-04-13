# Technical Specification: 04-sentient-layout (Cloudflare Branding Scraper)

## 1. Overview
Implementación de un motor de extracción visual que utiliza Cloudflare Browser Rendering para analizar una URL proporcionada por el usuario y extraer su identidad visual (Branding) para replicarla en el editor de Nous 2.0.

## 2. Requerimientos Técnicos

### 2.1 Edge Execution
- **REQ-1**: La función debe ejecutarse en una Edge Function de Supabase.
- **REQ-2**: Debe conectarse al servicio de "Browser Rendering" de Cloudflare utilizando el protocolo CDP (Chrome DevTools Protocol) a través de un WebSocket persistente.

### 2.2 Extracción de Datos
- **REQ-3 (CSS Variables)**: Extraer todos los tokens de diseño persistentes (Colores, Border-radius, Espaciados) del elemento `root` o `body`.
- **REQ-4 (Typography)**: Identificar la tipografía principal y de encabezados, incluyendo `font-family`, `font-weight` y `line-height`.
- **REQ-5 (Layout DOM)**: Analizar la estructura del contenedor principal de contenido para detectar anchos máximos (`max-width`) y paddings laterales.
- **REQ-6 (Visual Assets)**: Capturar capturas de pantalla de elementos atómicos específicos (un botón de ejemplo, un widget de sidebar) para usarlos como mockups.

## 2.3 Procesamiento de Datos
- **REQ-7**: Normalizar los valores de color a formato Hexadecimal o HSL.
- **REQ-8**: Generar una hoja de estilos dinámica (Tailwind Config Override o Injected Styles) que se aplique al Tiptap Editor.

## 3. Escenarios (Given/When/Then)

### Escenario 1: Extracción exitosa de Branding
**Given** una URL válida de un blog externo (ej. `midominio.com/blog/ejemplo`)
**When** el usuario activa el "Extractor de Diseño" en la configuración del proyecto
**Then** el Scraper SHALL navegar a la URL usando Cloudflare Browser Rendering
**And** SHALL retornar un objeto `BrandingProfile` con colores, fuentes y anchos de contenedor.

### Escenario 2: Simulación de Editor Immersivo
**Given** un `BrandingProfile` cargado en el proyecto
**When** el usuario abre el Redactor (WriterStudio)
**Then** el contenedor del editor SHALL aplicar los estilos del perfil (fuentes, anchos)
**And** SHALL mostrar mockups posicionados del Header y Sidebar extraídos para ofrecer una experiencia WYSIWYG real.

---
*Senior Architect: Antigravity AI (Senior Architect)*
