# Spec: 11-wordpress-bridge-plugin-implementation

## Overview
Este documento define las especificaciones técnicas para el plugin Bridge de WordPress en Nous 3.0. El objetivo es proporcionar una interfaz agnóstica para la ingesta de contenido, automatización de metadatos SEO y gestión segura de recursos.

## 1. Security & Authorization (Security First)

### 1.1 User Permission Validation
El sistema MUST validar que el usuario autenticado posee las capacidades necesarias para realizar la acción solicitada.

**Scenario: Validating write permissions**
- **Given** an authenticated request via Application Passwords or REST API Token.
- **When** the request hits the ingestion endpoint.
- **Then** the system MUST execute `current_user_can('edit_posts')` or a more specific capability based on the `post_type`.
- **And** IF the user lacks permissions, the system MUST return a `403 Forbidden` status with a descriptive error message.

## 2. wordpress-universal-ingestion

### 2.1 JSON Payload Processing
El sistema MUST procesar un objeto JSON con la estructura definida para crear o actualizar contenido.

**Input Fields:**
- `id` (Optional): Integer. ID del post a actualizar.
- `title` (Required): String. Título del contenido.
- `content` (Required): String. Contenido en formato HTML o bloques de Gutenberg.
- `post_type` (Required): String. Slug del Custom Post Type (ej: 'post', 'page', 'portfolio').
- `status` (Required): String. Estado del post (ej: 'publish', 'draft', 'pending').

### 2.2 Creation vs Update Logic
- IF `id` is NOT provided, the system SHALL create a new post using `wp_insert_post()`.
- IF `id` is provided, the system SHALL update the existing post using `wp_update_post()`.
- The system MUST sanitize all input fields before persistence using WordPress standard functions (e.g., `sanitize_text_field`, `wp_kses_post`).

**Scenario: Creating a new post**
- **Given** a JSON payload without an `id`.
- **When** the endpoint processes the request.
- **Then** the system SHALL create a new entry in the `wp_posts` table.
- **And** return the new `ID` and the public `permalink`.

**Scenario: Updating an existing post**
- **Given** a JSON payload with a valid `id`.
- **When** the endpoint processes the request.
- **Then** the system SHALL update the corresponding record in `wp_posts`.
- **And** return the `ID` and the updated `permalink`.

### 2.3 Response Structure
El sistema MUST devolver un objeto JSON con el siguiente formato en caso de éxito:
```json
{
  "success": true,
  "data": {
    "id": 123,
    "url": "https://example.com/mi-post-nuevo/"
  }
}
```

## 3. seo-meta-automation

### 3.1 Plugin Detection
El sistema MUST identificar dinámicamente si los plugins **Yoast SEO** o **RankMath** están activos en la instalación.

### 3.2 Metadata Mapping
El sistema SHALL mapear los campos genéricos de SEO a los meta-keys específicos del plugin detectado.

**Mapping Table:**
| Generic Field | Yoast SEO Meta Key | RankMath Meta Key |
| :--- | :--- | :--- |
| `seo_title` | `_yoast_wpseo_title` | `rank_math_title` |
| `seo_description` | `_yoast_wpseo_metadesc` | `rank_math_description` |

**Scenario: Mapping SEO fields for Yoast SEO**
- **Given** that Yoast SEO is active.
- **And** the payload contains `seo_title` and `seo_description`.
- **When** the post is saved or updated.
- **Then** the system SHALL update `_yoast_wpseo_title` and `_yoast_wpseo_metadesc` in the `wp_postmeta` table.

**Scenario: Mapping SEO fields for RankMath**
- **Given** that RankMath is active.
- **And** the payload contains `seo_title` and `seo_description`.
- **When** the post is saved or updated.
- **Then** the system SHALL update `rank_math_title` and `rank_math_description` in the `wp_postmeta` table.

## 4. Error Handling
- IF the `post_type` provided does not exist, the system MUST return a `400 Bad Request`.
- IF `wp_insert_post` or `wp_update_post` fails, the system MUST return a `500 Internal Server Error` with the `WP_Error` message.
