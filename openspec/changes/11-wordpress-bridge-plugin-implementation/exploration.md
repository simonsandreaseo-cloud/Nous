# Exploration: 11-wordpress-bridge-plugin-implementation

## 1. Análisis del Código Actual (Nous 2.0)
El plugin actual (`nous-bridge`) es funcional pero limitado.
- **`class-nous-api-handler.php`**: Registra la ruta `nous/v1/publish`. Usa un token personalizado (`X-Nous-Token`) guardado en las opciones de WP.
- **`class-nous-media-handler.php`**: Implementa una descarga manual usando `download_url` y `media_handle_sideload`. Es robusto pero puede simplificarse.
- **`class-nous-blocks.php`**: Intenta convertir HTML a bloques de Gutenberg mediante Regex. Esto es frágil y difícil de mantener para maquetaciones complejas.

## 2. Diseño de Universalidad

### Dynamic Post Types
Para permitir que Nous publique en cualquier CPT (Custom Post Type), el payload debe incluir el slug del post type.
```php
$post_type = !empty($params['post_type']) ? sanitize_key($params['post_type']) : 'post';

// Validar si el post type existe para evitar errores
if (!post_type_exists($post_type)) {
    return new WP_Error('invalid_post_type', 'El Post Type especificado no existe.', ['status' => 400]);
}
```

### Soporte SEO (Yoast & RankMath)
El plugin debe mapear campos estándar de SEO a los metadatos específicos de cada plugin.
- **Yoast SEO**: `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`.
- **RankMath**: `rank_math_title`, `rank_math_description`, `rank_math_focus_keyword`.

**Propuesta de Implementación:**
```php
public function update_seo_metadata($post_id, $seo_data) {
    $mapping = [
        'title'       => ['_yoast_wpseo_title', 'rank_math_title'],
        'description' => ['_yoast_wpseo_metadesc', 'rank_math_description'],
        'focus_kw'    => ['_yoast_wpseo_focuskw', 'rank_math_focus_keyword']
    ];

    foreach ($mapping as $key => $meta_keys) {
        if (!empty($seo_data[$key])) {
            foreach ($meta_keys as $meta_key) {
                update_post_meta($post_id, $meta_key, sanitize_text_field($seo_data[$key]));
            }
        }
    }
}
```

## 3. Seguridad: Application Passwords
WordPress introdujo **Application Passwords** en la versión 5.6. 
- **Ventaja**: Permite usar Basic Auth nativo (`Authorization: Basic base64(user:app_password)`).
- **Impacto**: Elimina la necesidad de `X-Nous-Token` y de una página de configuración en el plugin para el token.
- **Implementación**: El `permission_callback` de la ruta REST simplemente usará `current_user_can('edit_posts')`. WordPress se encarga de la autenticación antes de llegar al callback.

## 4. Manejo de Medios (Sideloading)
Nous 3.0 optimiza las imágenes y las expone vía URL. El plugin debe "importarlas" a la librería local para evitar problemas de CORS y asegurar la persistencia.

**Optimización con `media_sideload_image`**:
```php
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

// Descarga y adjunta la imagen al post, retornando el ID del attachment
$attachment_id = media_sideload_image($url, $post_id, $title, 'id');

if (!is_wp_error($attachment_id)) {
    set_post_thumbnail($post_id, $attachment_id);
}
```

## 5. Estrategia "Instalar y Olvidar"
El plugin debe ser un "headless bridge". 
1. El usuario instala el plugin.
2. Crea un **Application Password** en su perfil de usuario de WP.
3. Pega la URL del sitio, el usuario y el password en **Nous 3.0**.
4. ¡Listo! No hay menús de configuración complicados en WP.

## Conclusión
La transición a Nous 3.0 requiere que el Bridge sea agnóstico al contenido. El plugin no debe "maquetar" (eso lo hace Nous), solo debe "recibir y persistir" bloques de Gutenberg, metadatos y medios.
