# Nous Layout Agents: El Futuro de la Maquetación Autónoma

## 1. Visión General
El proyecto **Nous Layout Agents** busca revolucionar la forma en que se publica contenido en la web. No se trata simplemente de un "publicador" automático, sino de un sistema de agentes inteligentes capaces de realizar una **diagramación de lujo** y una **maquetación quirúrgica** de contenidos (blogs, noticias, reportes) directamente en WordPress, manteniendo la estética "Clinical Tech" característica de Nous.

## 2. El Ecosistema de Agentes
Para lograr una maquetación hermosa y funcional, el sistema se dividirá en tres roles especializados:

### 2.1 Agent: The Architect (Estructurador)
*   **Función**: Analiza el contenido en bruto (texto plano, Markdown, transcripciones) y lo descompone en una estructura jerárquica de bloques.
*   **Responsabilidades**: Identificar jerarquías de encabezados (H1-H4), detectar puntos clave para insertar citas (blockquotes), sugerir ubicaciones para elementos visuales (imágenes, gráficos) y organizar listas de datos.

### 2.2 Agent: The Stylist (Diseñador Visual)
*   **Función**: Aplica la capa de diseño "Clinical Tech" sobre la estructura.
*   **Responsabilidades**: Seleccionar qué bloques deben tener efectos de glassmorphism, definir espaciados (whitespace) generosos para legibilidad, aplicar acentos de color (surgical blue/cyan) y asegurar que la tipografía sea consistente con el santuario tecnológico de Nous.

### 2.3 Agent: The Publisher (Conector)
*   **Función**: Gestiona la comunicación técnica con WordPress.
*   **Responsabilidades**: Autenticación segura, gestión de medios (subida de imágenes generadas por IA) y verificación de que el layout se renderice correctamente en diferentes dispositivos (responsive).

## 3. Estrategia de Integración con WordPress

### ¿Necesitamos un Plugin?
**Sí, es altamente recomendado**. Aunque la REST API de WordPress es potente, para lograr una maquetación "hermosa y excelente" que use la estética de Nous, un plugin propio (**"Nous Bridge"**) facilitaría:
1.  **Registro de Bloques Personalizados**: Crear bloques de Gutenberg que ya vengan con el estilo "Clinical" pre-aplicado.
2.  **Inyección de Assets**: Cargar las tipografías y estilos CSS de Nous de forma eficiente.
3.  **Endpoint de Alta Fidelidad**: Un endpoint personalizado que reciba JSON estructurado directamente desde los agentes de Nous, evitando la limpieza de HTML innecesaria.

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
