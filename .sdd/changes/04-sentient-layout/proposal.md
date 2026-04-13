# Change Proposal: 04-sentient-layout (Motor de Diseño Estructurado V3)

## 1. Visión: De "Redactor" a "Diseñador de Conversión"
El sistema deja de ser un generador de texto plano para convertirse en un motor de maquetación que entiende la jerarquía visual de un CMS. Nous 2.0 ahora podrá "clonar" la estética de una web existente y generar contenido que se adapte perfectamente a plantillas preconfiguradas.

## 2. Nueva Jerarquía de Configuración
Se refactoriza el menú de configuración del proyecto:
- **Configuración > Contenidos > Diseño**
  - **Motor Freestyle**: (Actual) IA decide la disposición basándose en reglas heurísticas.
  - **Gestor de Plantillas**: Creación manual/visual de estructuras fijas (Slot-based).
  - **Extractor de Branding**: Herramienta basada en URL para heredar CSS, fuentes y layouts.

## 3. Componentes Clave

### 3.1 Scraper de Branding (Cloudflare Browser Rendering)
- Uso de una Edge Function de Supabase que lanza una instancia de Chromium en Cloudflare.
- **Output**: Un objeto JSON con variables CSS (`--primary`, `--font-family`), selectores de contenedores de blog y capturas de pantalla de los elementos UI (Botones, Widgets).

### 3.2 Tiptap Live Mockup
- El redactor ahora tiene un "Wrap" CSS que imita el ancho y estilo de la web objetivo.
- Se inyectan componentes decorativos (Header/Siderbar mockups) para dar contexto espacial al redactor.

### 3.3 Slot Manager (Smart Layout)
- Definición de slots de imagen con "Smart Ratio" (Aspect Ratio locking).
- Configuración de "Pautas de Estilo": Selector "Antes/Después" de párrafo con ID numérico.

## 4. Racionales y Desafíos
- **Complejidad de CSS**: No intentaremos replicar todo el CSS, sino las "Variables de Branding" críticas.
- **IA Constraint**: El generador de Outlines y el Redactor recibirán un esquema de "Plantilla" (JSON) que limita su libertad creativa para forzarlos a escribir dentro de los slots definidos.

---
*Senior Architect: Antigravity AI (Gentleman Class)*
