# Design: 10-WordPress Universal Bridge

## Technical Approach

Este cambio refactoriza la integración actual con WordPress hacia un sistema basado en **Drivers** modulares, permitiendo que Nous 3.0 se conecte no solo con WordPress, sino con cualquier CMS (Shopify, Ghost) en el futuro. Se implementa una nueva arquitectura en el plugin de WordPress (`Nous_Universal_Handler`) para soportar Custom Post Types (CPT) y metadatos de SEO, mientras que en el backend se introduce el paquete `@nous/connectors`.

## Architecture Decisions

### Decision: Connector-Driver Pattern

**Choice**: Implementar una interfaz `ConnectorDriver` en TypeScript.
**Alternatives considered**: Seguir usando servicios estáticos por cada plataforma.
**Rationale**: El patrón Driver permite que la lógica de publicación sea agnóstica al CMS. Cada conector implementa su propia lógica de `publish()` y `sideloadMedia()`.

### Decision: Modular PHP Handler

**Choice**: Crear la clase `Nous_Universal_Handler` en PHP.
**Alternatives considered**: Seguir extendiendo `Nous_API_Handler`.
**Rationale**: `Nous_API_Handler` debe encargarse solo del ruteo y autenticación. La lógica de negocio de WordPress (crear posts, mapear metadatos) debe estar en un Handler universal que soporte CPTs dinámicos.

## Data Flow

```
Nous Backend (Job) ──→ WordPressDriver ──→ PostProcessingService (Optimización WebP)
         │                    │                          │
         │                    └─────→ WP REST API ←──────┘
         │                               │
         └──────── Supabase (Credentials)┘
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/connectors/types.ts` | Create | Interfaces `ConnectorDriver`, `PublishParams`, `MediaResult`. |
| `src/lib/connectors/wordpress.ts` | Create | Clase `WordPressDriver` con soporte para CPT y `sideloadMedia`. |
| `plugins/nous-bridge/includes/class-nous-universal-handler.php` | Create | Lógica universal para creación de posts y metadatos. |
| `plugins/nous-bridge/includes/class-nous-api-handler.php` | Modify | Delegar la publicación al `Nous_Universal_Handler`. |
| `supabase/migrations/20260420_add_project_connections.sql` | Create | Tabla `project_connections` para guardar tokens y URLs. |

## Interfaces / Contracts

### TypeScript: WordPressDriver Interface

```typescript
export interface WordPressCredentials {
    url: string;
    token: string;
}

export interface PublishParams {
    title: string;
    content: string;
    post_type: string; // "post", "page", "product", etc.
    status: 'publish' | 'draft' | 'pending';
    featured_image_url?: string;
    meta?: Record<string, string>; // Yoast SEO, RankMath, Custom Fields
}

export class WordPressDriver implements ConnectorDriver {
    async publish(credentials: WordPressCredentials, params: PublishParams): Promise<PublishResponse>;
    async sideloadMedia(url: string, credentials: WordPressCredentials): Promise<string>; // WP Media URL
}
```

### PHP: Universal Handler Contract

```php
class Nous_Universal_Handler {
    public function create_or_update_post( $params ) {
        // Soporta: post_type, post_status, post_title, post_content
        // Mapeo dinámico de meta_input para SEO y CPTs
    }
}
```

## Audit Visualization

Cuando se publique exitosamente en un CPT de "Productos", el log en Render (Standard Output) se verá así:

```bash
[2026-04-20 10:15:22] [INFO] [WordPressDriver] Initiating publication for Project: "EcoStore" (ID: 550e8400)
[2026-04-20 10:15:23] [DEBUG] [WordPressDriver] Sideloading featured image: https://supabase.storage/generations/hero.webp
[2026-04-20 10:15:25] [INFO] [WordPressDriver] SUCCESS: Published to "product" CPT.
[2026-04-20 10:15:25] [AUDIT] {
  "post_id": 1024,
  "post_type": "product",
  "url": "https://ecostore.com/product/organic-t-shirt/",
  "seo_meta": ["_yoast_wpseo_title", "_yoast_wpseo_metadesc"],
  "duration_ms": 3200
}
```

## Security

Las credenciales de WordPress se guardarán en una tabla dedicada en Supabase:

```sql
CREATE TABLE public.project_connections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
    type text NOT NULL, -- "wordpress", "shopify", etc.
    credentials jsonb NOT NULL, -- { "url": "...", "token": "..." }
    created_at timestamp with time zone DEFAULT now()
);

-- RLS: Solo el dueño del proyecto puede ver/editar las credenciales
ALTER TABLE public.project_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own connections" 
ON public.project_connections FOR ALL 
USING (project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid()));
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (TS) | `WordPressDriver` | Mock de `fetch` para simular respuestas de la WP REST API. |
| Integration | PHP `Universal_Handler` | Tests de PHPUnit simulando el request de REST API con diferentes `post_type`. |
| E2E | Flow completo | Publicar un post desde el Dashboard de Nous y verificar en WP que se creó el CPT con SEO meta. |

## Open Questions

- [ ] ¿Debemos encriptar el JSONB de `credentials` a nivel de aplicación (Vault) o basta con RLS y el cifrado en reposo de Supabase?
- [ ] ¿Cómo manejamos el mapeo de categorías si los IDs de WordPress no existen en Nous? (Probablemente crear por nombre).
