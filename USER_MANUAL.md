# Manual de Usuario: Content Suite & GSC Intelligence

Bienvenido a la guía completa de **Content Suite**. Esta plataforma integra gestión de proyectos, creación de contenido con IA y analítica de Search Console en un flujo de trabajo unificado.

---

## 🚀 1. Configuración Inicial

### Requisitos Previos
1.  **Supabase**: Asegúrate de que las migraciones de base de datos (`supabase_task_manager.sql`) se hayan ejecutado.
2.  **API Keys**: Necesitas una API Key de Google Gemini para las funciones de IA.
    *   Ve a `Settings` (Configuración) en la barra lateral.
    *   Añade tu clave en la sección "Gestor de LLM".

---

## 📂 2. Gestión de Proyectos y Tareas

El núcleo del flujo de trabajo es el **Tablero de Proyectos**.

1.  **Crear Proyecto**: Desde el Dashboard principal, haz clic en "Nuevo Proyecto". Asigna un nombre y, opcionalmente, la URL de la propiedad de Search Console (`gsc_property_url`).
2.  **Tablero Kanban**: Dentro del proyecto, verás un tablero tipo Trello/Jira.
3.  **Crear Tareas**:
    *   Añade tareas en la columna "Idea" o "To Do".
    *   **Importante**: Asigna una URL o Keyword objetivo en la descripción o título para que el sistema de inteligencia pueda rastrearla después.

---

## ✍️ 3. Creación de Contenido con Contexto

Hemos integrado la redacción directamente con las tareas:

1.  **Vincular Herramienta**: En cualquier tarjeta de tarea, haz clic en el botón **"Redactor IA 2.0"** (o "Content Writer Legacy").
2.  **Modo Contextual**:
    *   La herramienta se abrirá con un **banner azul** indicando que está vinculada a la tarea (ej: `Tarea #45: Optimizar Home`).
    *   La IA usará automáticamente el título/keyword de la tarea como contexto inicial.
3.  **Flujo "Terminar Tarea"**:
    *   Cuando termines de editar, haz clic en **"Terminar Tarea"** en la barra lateral izquierda.
    *   **Acciones Automáticas**:
        1.  Guarda el borrador en la nube.
        2.  Vincula el borrador a la tarea original.
        3.  Mueve la tarea a la columna "Review".
        4.  Te devuelve al tablero del proyecto.

---

## 📊 4. Inteligencia de Search Console (GSC)

Analiza tus datos de GSC y sincronízalos con tus tareas.

### Carga de Datos
1.  Abre la herramienta **Report Generator**.
2.  Sube tus archivos CSV exportados de GSC (`Pages.csv`, `Queries.csv`, `Countries.csv`).
3.  Haz clic en "Generar Informe".

### Panel de Inteligencia de Tareas
El sistema cruzará automáticamente las URLs de tus **Tareas Activas** con los datos del CSV.

*   **Pestaña "Tareas Activas"**:
    *   Verás una lista de tus tareas que coinciden con URLs del informe.
    *   Métricas clave: Clics, Impresiones, Posición y su variación (Deltas).
    *   **Botón "Sincronizar todo"**: Haz clic para enviar estas métricas directamente a la descripción de cada tarea en el tablero. Se añadirá un log con la fecha (ej: `[Sync GSC 21/12] Clicks: 150 (+10)...`).

*   **Pestaña "Alertas Decay"**:
    *   Detecta automáticamente URLs o Keywords que han perdido tráfico o posicionamiento significativo.
    *   **Botón "Crear Tarea"**: Convierte una alerta de caída en una nueva tarea en tu tablero con un solo clic. La tarea incluirá los detalles de la caída en la descripción.

---

## 🛠️ Solución de Problemas

*   **No veo mis tareas en el informe**: Asegúrate de que la tarea tiene definida la `gsc_property_url` del proyecto o que el título de la tarea coincide con la Keyword/URL del CSV.
*   **Error al sincronizar**: Verifica tu conexión a internet y que tu sesión de usuario sea válida.

---
*Generado por Antigravity Agent - Diciembre 2025*
