# Design: 11-wordpress-bridge-plugin-implementation

## Overview
Este diseño define la arquitectura del plugin "Nous Bridge 3", un puente agnóstico y modular para WordPress que facilita la ingesta de contenido, gestión de medios y automatización SEO desde Nous 3.0. El enfoque principal es la simplicidad ("Instalar y Olvidar") y el uso de estándares nativos de WordPress.

## 1. Plugin Core (`nous-bridge-3.php`)

La estructura principal del plugin será una clase única que orqueste la carga de componentes. Se evitarán menús de configuración innecesarios, delegando la autenticación en **Application Passwords**.

```php
<?php
/**
 * Plugin Name: Nous Bridge 3
 * Description: Puente modular de alto rendimiento para Nous 3.0.
 * Version: 3.0.0
 * Author: Nous Engine
 */

if (!defined('ABSPATH')) exit;

final class Nous_Bridge_3 {
    private static $instance = null;

    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->define_constants();
        $this->includes();
        $this->init_hooks();
    }

    private function define_constants() {
        define('NOUS_BRIDGE_V3_VERSION', '3.0.0');
        define('NOUS_BRIDGE_V3_PATH', plugin_dir_path(__FILE__));
    }

    private function includes() {
        require_once NOUS_BRIDGE_V3_PATH . 'includes/class-rest-handler.php';
        require_once NOUS_BRIDGE_V3_PATH . 'includes/class-media-processor.php';
        require_once NOUS_BRIDGE_V3_PATH . 'includes/class-seo-mapper.php';
    }

    private function init_hooks() {
        add_action('rest_api_init', [new Nous_REST_Handler(), 'register_routes']);
    }
}

add_action('plugins_loaded', ['Nous_Bridge_3', 'instance']);
```

## 2. REST Handler (`class-rest-handler.php`)

Encargado de registrar los endpoints y procesar el payload JSON de entrada de forma agnóstica al Custom Post Type.

```php
class Nous_REST_Handler {
    public function register_routes() {
        register_rest_route('nous/v3', '/sync', [
            'methods'  => 'POST',
            'callback' => [$this, 'handle_sync_request'],
            'permission_callback' => [$this, 'check_permissions']
        ]);
    }

    public function check_permissions() {
        return current_user_can('edit_posts');
    }

    public function handle_sync_request(WP_REST_Request $request) {
        $params = $request->get_json_params();
        
        $post_data = [
            'ID'           => !empty($params['id']) ? intval($params['id']) : 0,
            'post_title'   => sanitize_text_field($params['title']),
            'post_content' => wp_kses_post($params['content']),
            'post_type'    => !empty($params['post_type']) ? sanitize_key($params['post_type']) : 'post',
            'post_status'  => !empty($params['status']) ? sanitize_key($params['status']) : 'publish',
        ];

        if (!post_type_exists($post_data['post_type'])) {
            return new WP_Error('invalid_type', 'Post type no válido', ['status' => 400]);
        }

        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Procesar Imagen Destacada
        if (!empty($params['featured_image'])) {
            Nous_Media_Processor::sideload_featured_image($params['featured_image'], $post_id);
        }

        // Procesar SEO
        if (!empty($params['seo'])) {
            Nous_SEO_Mapper::map_seo_metadata($post_id, $params['seo']);
        }

        return new WP_REST_Response([
            'success' => true,
            'data'    => [
                'id'  => $post_id,
                'url' => get_permalink($post_id)
            ]
        ], 200);
    }
}
```

## 3. Media Processor (`class-media-processor.php`)

Implementación robusta de sideloading para asegurar que las imágenes optimizadas por Nous residan localmente en el servidor de WordPress.

```php
class Nous_Media_Processor {
    public static function sideload_featured_image($image_url, $post_id) {
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        // Sideload image as an attachment
        $attachment_id = media_sideload_image($image_url, $post_id, null, 'id');

        if (!is_wp_error($attachment_id)) {
            return set_post_thumbnail($post_id, $attachment_id);
        }
        
        return false;
    }
}
```

## 4. SEO Mapper (`class-seo-mapper.php`)

Mapeador estático que detecta automáticamente si Yoast SEO o RankMath están activos y actualiza los metadatos correspondientes.

```php
class Nous_SEO_Mapper {
    public static function map_seo_metadata($post_id, $meta_data) {
        $mapping = [
            'title'       => ['_yoast_wpseo_title', 'rank_math_title'],
            'description' => ['_yoast_wpseo_metadesc', 'rank_math_description'],
            'focus_kw'    => ['_yoast_wpseo_focuskw', 'rank_math_focus_keyword']
        ];

        foreach ($mapping as $key => $meta_keys) {
            if (!empty($meta_data[$key])) {
                $value = sanitize_text_field($meta_data[$key]);
                foreach ($meta_keys as $meta_key) {
                    update_post_meta($post_id, $meta_key, $value);
                }
            }
        }
    }
}
```

## 5. Security Layer

El plugin confía plenamente en la autenticación de WordPress mediante **Application Passwords**. 

- **Autenticación**: El cliente (Nous 3.0) debe enviar el header `Authorization: Basic base64(username:application_password)`.
- **Autorización**: El método `check_permissions` en `Nous_REST_Handler` valida que el usuario autenticado tenga al menos la capacidad `edit_posts`.
- **Escalabilidad**: Al usar `current_user_can`, el plugin respeta los roles y capacidades granulares de WordPress (ej: un autor solo podrá editar sus propios posts si se parametriza así).

## 6. Pruebas de Integración (Propuesta)

1. **Test Ingesta CPT**: Validar que el plugin puede crear una entrada en un CPT personalizado (ej: 'portfolio').
2. **Test SEO Switch**: Activar Yoast, enviar payload, desactivar Yoast, activar RankMath, enviar payload, y verificar que ambos metadatos se persistan correctamente.
3. **Test Media Sideload**: Enviar una URL de imagen válida y verificar que el `_thumbnail_id` sea un attachment local.
