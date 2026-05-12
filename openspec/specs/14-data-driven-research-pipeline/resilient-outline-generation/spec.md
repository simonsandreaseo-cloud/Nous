# Especificación: Resilient Outline Generation

## Overview (Resumen)
Esta especificación cubre la generación de estructuras (outlines) de artículos mediante LLMs, con un enfoque prioritario en la estabilidad estructural, la integridad del formato de respuesta y los mecanismos de fallback ante fallos de inferencia.

## Requirements (RFC 2119)
- El sistema MUST generar un array JSON que represente el outline, el cual debe incluir obligatoriamente niveles jerárquicos de H2 y H3.
- El sistema SHALL implementar una matriz de rotación de modelos para la generación del outline (ej: intentar primero con Flash, luego hacer fallback a Llama o Gemma si el JSON es inválido).

## Scenarios (Gherkin)

### Scenario 1: Generación exitosa de JSON Outline
**Given** un contexto rico que incluye keywords LSI y jerga de nicho (ASK)
**When** el sistema solicita al modelo principal (ej: Flash) la generación del outline
**Then** el sistema MUST recibir y validar un array JSON
**And** el JSON MUST contener correctamente estructurados los niveles de heading H2 y H3.

### Scenario 2: JSON Inválido y rotación resiliente de Modelos
**Given** que el modelo principal devuelve una respuesta con JSON malformado, cortado o que no cumple con el esquema requerido
**When** el sistema intenta parsear y falla la validación
**Then** el sistema SHALL capturar el error sin causar un crash (fail gracefully)
**And** el sistema SHALL activar la matriz de rotación de modelos
**And** el sistema MUST reintentar la solicitud utilizando el siguiente modelo en la jerarquía (ej: Llama, luego Gemma) hasta obtener un JSON válido o agotar los reintentos disponibles.
