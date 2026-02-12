# Nous Layout Agents: El Futuro de la Maquetación Autónoma

## 1. Visión General
El proyecto **Nous Layout Agents** busca revolucionar la forma en que se publica contenido en la web. No se trata simplemente de un "publicador" automático, sino de un sistema de agentes inteligentes capaces de realizar una **diagramación excelente y hermosa** de contenidos enriquecidos (listas, headers, citas, negritas) directamente en WordPress, adaptándose fielmente a los estilos y la identidad visual de cada proyecto individual.

## 2. El Ecosistema de Agentes
A diferencia de un maquetador estándar, estos agentes interpretan la intención del contenido y la "personalidad" del sitio destino:

### 2.1 Agent: The Semantic Editor (Enriquecedor)
*   **Función**: Asegura que el contenido tenga una estructura HTML enriquecida y semántica de alta fidelidad.
*   **Responsabilidades**: Transformar texto plano en HTML con jerarquías de encabezados (H1-H4), insertar citas (blockquotes), gestionar listas ordenadas/desordenadas, y aplicar énfasis (RTF) donde el contenido lo requiera para mejorar la legibilidad.

### 2.2 Agent: The Visual Interpreter (Adaptador de Estilo)
*   **Función**: Analiza el diseño del sitio destino (WordPress del usuario) y adapta el contenido.
*   **Responsabilidades**: Identificar los patrones de diseño del tema activo del usuario (colores corporativos, espaciados, fuentes) y asegurar que el contenido se integre de forma "hermosa" sin romper la estética preexistente. No impone el estilo de Nous, sino que potencia el estilo del cliente.

### 2.3 Agent: The Publisher (Conector)
*   **Función**: Gestiona la comunicación técnica con WordPress.
*   **Responsabilidades**: Autenticación segura, gestión de medios (subida de imágenes generadas por IA) y verificación de que el layout se renderice correctamente en diferentes dispositivos (responsive).

## 3. Estrategia de Integración con WordPress

### ¿Necesitamos un Plugin?
**Sí, como un Puente Universal**. El plugin (**"Nous Bridge"**) no debe imponer estilos, sino facilitar la recepción técnica:
1.  **Gestión de Medios Inteligente**: Recibir las imágenes generadas/seleccionadas en Nous y subirlas automáticamente a la librería de WordPress, asignando ALT tags y títulos SEO.
2.  **Limpieza y Mapeo de Bloques**: Convertir el HTML enriquecido de Nous en bloques nativos de Gutenberg para que el usuario pueda editarlos fácilmente después.
3.  **Endpoint Seguro**: Un conducto privado para que Nous envíe el contenido sin necesidad de dar acceso de "Administrador" completo a la API estándar.

## 4. Stack Tecnológico Sugerido

### Inteligencia Artificial (Modelos Low Cost/Premium)
*   **Gemini 1.5 Flash / 2.0 Flash**: Son la opción ideal por su ventana de contexto masiva (permitiendo analizar artículos enteros y estilos de diseño simultáneamente) y su costo ínfimo.
*   **DeepSeek-V3**: Excelente para la lógica de estructuración de datos JSON a bajo costo.
*   **GPT-4o-mini**: Para validaciones rápidas de copy y tono.

### Infraestructura y Lenguajes
*   **Backend**: Node.js/Next.js (dentro de Nous 2.0).
*   **WP Plugin**: PHP ligero (WP Boilerplate) + React para el editor de bloques.
*   **Estilos**: Tailwind CSS (configuración compartida entre Nous y el Plugin de WP para consistencia visual).

## 5. Roadmap de Desarrollo Conceptual

### Fase 1: El Cerebro (Q3 2026)
*   Desarrollo de los prompts de sistema para "The Architect" y "The Stylist".
*   Creación de un "Layout Designer" interno en Nous que previsualice cómo quedará el post antes de enviarlo.

### Fase 2: El Puente (Q4 2026)
*   Desarrollo del plugin **Nous Bridge** para WordPress.
*   Implementación de autenticación vía Application Passwords o JWT.

### Fase 3: Autonomía (Q1 2027)
*   Conexión con el Calendario Editorial de Nous para que los agentes maqueten y programen contenido de forma 100% autónoma.

---
*Documento funcional para referencia de agentes de IA y equipo de desarrollo.*
*Creado por Antigravity AI - Nous Clinical Tech.*
