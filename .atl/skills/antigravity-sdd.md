# Skill: Antigravity SDD Workaround

Esta skill define cómo el agente Antigravity debe ejecutar el flujo de **Spec-Driven Development (SDD)** de forma secuencial y segura, evitando la degradación de contexto.

## Trigger
- Siempre que se trabaje en una tarea compleja, refactorización mayor o nueva funcionalidad planificada.
- Cuando el usuario diga "usa sdd".

## Reglas de Operación

### 1. File-System como Memoria (Save State)
Antigravity tiene **PROHIBIDO** avanzar a la siguiente fase del SDD sin antes guardar el output completo en un archivo físico en la carpeta `.sdd/`. El chat NO es un medio de almacenamiento confiable para arquitectura.

| Fase | Archivo de Salida |
|------|-------------------|
| Explore | `.sdd/01-exploration.md` |
| Propose | `.sdd/02-proposal.md` |
| Spec | `.sdd/03-specification.md` |
| Design | `.sdd/04-design.md` |
| Tasks | `.sdd/05-tasks.md` |
| Verify | `.sdd/06-verification.md` |

### 2. Amnesia Controlada (Load State)
Al iniciar cualquier fase (excepto Explore), Antigravity **NO DEBE** confiar en su historial de chat. Su primera acción obligatoria es usar la herramienta `view_file` para cargar el archivo generado en el paso anterior. Esto refresca el contexto exacto.

### 3. Role Switching Estricto
Al cambiar de fase, el agente debe anunciar explícitamente el cambio de rol. Ejemplo: *"Cambiando a modo SDD-Design. Cargando especificaciones..."*.

### 4. Uso de Engram Local
Las decisiones globales que afecten a todo el proyecto (ej. "usamos Tailwind 4 para todo") deben registrarse en `.engram/observations.md` además del archivo de fase correspondiente.

---
*Referencia: docs/antigravity-sdd-workaround.md*
