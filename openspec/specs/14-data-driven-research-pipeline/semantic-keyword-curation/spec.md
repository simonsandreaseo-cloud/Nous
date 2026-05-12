# Especificación: Semantic Keyword Curation

## Overview (Resumen)
Esta especificación detalla la extracción, refinamiento y curación de LSI (Latent Semantic Indexing) keywords y "jerga de nicho" a partir del texto procesado y scrapeado de los competidores directos.

## Requirements (RFC 2119)
- El sistema MUST extraer LSI usando el algoritmo TF-IDF sobre el texto scrapeado de los competidores.
- El sistema MUST luego curar y refinar las keywords extraídas utilizando un LLM para evaluar relevancia semántica y contextual.
- El sistema MUST extraer "Jerga de Nicho" (ASK - vocabulario especializado o argot del sector) directamente de los textos de la competencia.

## Scenarios (Gherkin)

### Scenario 1: Extracción y curación de LSI mediante TF-IDF y LLM
**Given** un conjunto de textos scrapeados y limpios de los competidores
**When** se inicia el pipeline de procesamiento semántico
**Then** el sistema MUST aplicar TF-IDF para identificar términos estadísticamente relevantes
**And** enviar esta lista preliminar a un LLM
**And** el LLM MUST devolver la lista curada de LSI keywords, eliminando ruido y falsos positivos.

### Scenario 2: Extracción de Jerga de Nicho (ASK)
**Given** un conjunto de textos scrapeados de competidores
**When** el sistema analiza el texto en busca de terminología especializada
**Then** el sistema MUST extraer la "Jerga de Nicho" (ASK) utilizada en el sector
**And** agregar esta jerga curada al pool semántico disponible para la posterior generación de contenido.
