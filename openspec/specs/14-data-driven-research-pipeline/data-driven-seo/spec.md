# Especificación: Data-Driven SEO Pipeline

## Overview (Resumen)
Esta especificación define el comportamiento de la fase de investigación SEO basada en datos (Data-Driven SEO), enfocándose en la obtención de volúmenes de búsqueda de competidores y el manejo de fallos para garantizar la estabilidad del pipeline.

## Requirements (RFC 2119)
- El sistema MUST usar la API de DataForSEO Labs (Tasks async) para obtener el volumen de búsqueda de los competidores.
- El sistema SHALL fallar gracefully si la API de DFS devuelve un error o timeout, continuando con la investigación semántica básica en su lugar.
- El sistema MUST ignorar (filtrar) las keywords de "marca" (ej: amazon, wikipedia).

## Scenarios (Gherkin)

### Scenario 1: Obtención exitosa de volumen de competidores
**Given** una target keyword y un listado de URLs de competidores
**When** el sistema inicia una Task async en DataForSEO Labs
**Then** el sistema MUST esperar a que la tarea se complete asincrónicamente
**And** procesar los volúmenes de búsqueda resultantes
**And** filtrar cualquier keyword identificada como marca.

### Scenario 2: Fallo gracefully en la API de DataForSEO
**Given** que la API de DataForSEO Labs es inaccesible, devuelve un timeout, o retorna un error 5xx/4xx
**When** el sistema intenta obtener los volúmenes de búsqueda de los competidores
**Then** el sistema SHALL capturar la excepción de forma segura (gracefully) sin hacer crash
**And** continuar el pipeline utilizando investigación semántica básica de respaldo.

### Scenario 3: Filtrado de Keywords de Marca
**Given** una respuesta exitosa de DataForSEO que contiene múltiples keywords y volúmenes
**When** el sistema procesa la lista obtenida
**Then** el sistema MUST identificar keywords asociadas a marcas conocidas (ej: "amazon", "wikipedia")
**And** remover dichas keywords de los resultados finales para evitar falsos positivos.
