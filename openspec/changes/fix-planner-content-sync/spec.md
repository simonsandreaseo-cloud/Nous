# Especificaciones (Specs): Sincronización Planner-Studio

## 1. Requerimientos
- **Visibilidad del Planner:** El Planner debe saber exactamente si un documento tiene contenido redactado o no, sin necesidad de descargar el contenido pesado del artículo (manteniendo `LIGHT_TASK_COLUMNS`).
- **Transición Segura:** Cuando el usuario navegue desde el Planner hacia el Studio usando el acceso directo, el Studio debe cargar el documento correspondiente íntegro. Bajo ningún concepto el contenido existente debe perderse o sobrescribirse temporalmente con blanco.
- **Auto-Guardado Resiliente:** El editor no debe hacer guardados automáticos de contenido en blanco si se encuentra en medio de un proceso de carga asíncrona.

## 2. Criterios de Aceptación
1. En la vista del Planner, el botón para acceder al redactor debe decir "Abrir Redactor (Con Contenido)" y colorearse en verde si `word_count_real > 0`. Debe decir "Abrir Redactor (Vacío)" si `word_count_real === 0`.
2. Las lógicas que definen si una tarea está en estado "Redactando" o "Humanizando" (en la vista de Planner) deben basarse en `word_count_real > 0` si `content_body` no está disponible.
3. El estado del Planner (vía `initializeFromTask`) no debe inyectar `content: ''` si la tarea omitió `content_body` en su fetch. Debe pasar la batuta al Studio para que este lo traiga.
4. Al hacer clic repetido en el Planner hacia la misma tarea, el Studio no debe quedarse en blanco si la tarea tiene contenido en BD.

## 3. Comportamientos Esperados
- **Usuario:** Ve que en el Planner sus artículos "Por corregir" o "Humanizando" tienen la pastilla verde indicando contenido.
- **Usuario:** Hace clic en la pastilla verde. Se abre el Studio.
- **Sistema:** El Studio muestra un indicador de carga si hace falta, trae el texto asíncronamente y lo muestra en el editor TipTap sin perder un solo caracter.
