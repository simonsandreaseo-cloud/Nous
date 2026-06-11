# Feature: Link Strategy Matrix (Estrategia de Enlazado por Tipo de Contenido)

## 1. Introduction
This specification defines the behavior for the Advanced Link Strategy Hub in Nous. It allows users to define internal linking priorities per content type, enable strict linking modes, define high-priority VIP URLs, and batch-upload manual URLs to the project's inventory.

## 2. Requirements

### 2.1 Configuration Storage
- **MUST** store configurations in `project.settings.link_strategy.per_content_type`.
- **MUST** support the following structure per content type: `strict_mode` (boolean), `strict_category` (string), `category_priorities` (record of string to number 1-10), `planned_priorities` (record of string to number 1-10), and `vip_urls` (array of strings).
- **MUST** default unconfigured categories to a neutral priority of 5.

### 2.2 User Interface (UI)
- **MUST** provide a Master-Detail interface in the Project Settings -> "Estrategia de Enlazado" tab.
- **MUST** list all available content types in a sidebar/pills layout.
- **MUST** display configuration options (Strict Toggle, Category Sliders, Planner Sliders, VIP URLs) for the selected content type.
- **MUST** provide a global "Importar URLs al Inventario" button to open the CSV Smart Uploader.
- **MUST** allow the user to decide the tie-breaker logic (Planned vs Published) via a global toggle/setting.

### 2.3 Manual URL Ingestion
- **MUST** process CSV/XLSX files up to 5,000 rows per batch.
- **MUST** extract `URL`, `Title`, and `Category` columns.
- **MUST** insert or update (Upsert) the `project_urls` table using `project_id` and `url` as the unique constraint.
- **MUST** overwrite existing GSC-discovered metadata if a manual URL matches.

### 2.4 Research Pipeline (RCP) Integration
- **MUST** apply the `strict_mode` filter if active for the task's content type, discarding non-matching categories before semantic search or during processing.
- **MUST** multiply the semantic relevance score of fetched URLs by the defined priority score (1-10) of their category.
- **MUST** inject `vip_urls` at the top of the AI context window to guarantee maximum visibility.

## 3. Scenarios

**Scenario 1: Applying Strict Mode**
- **Given** the user is researching a task of type "Producto"
- **And** the "Producto" link strategy has `strict_mode = true` and `strict_category = "categoria-padre"`
- **When** the RCP fetches URLs from the database
- **Then** the final combined units sent to the AI **MUST** only contain URLs from "categoria-padre" (or planned tasks of type "categoria-padre").

**Scenario 2: Applying Priority Balance**
- **Given** the user is researching a task of type "Blog Post"
- **And** the "Blog Post" link strategy has priority 10 for "product" and 2 for "blog"
- **When** the RCP fetches URLs
- **Then** the URLs **MUST** be re-sorted by `(semantic_score * priority_multiplier)`
- **And** the prompt to the AI **MUST** explicitly state the high-priority categories.

**Scenario 3: Uploading Custom URLs**
- **Given** the user uploads a CSV with a URL that already exists in the database
- **When** the import runs
- **Then** the URL's category and title in the database **MUST** be updated to match the CSV's data, without duplicating the row.
