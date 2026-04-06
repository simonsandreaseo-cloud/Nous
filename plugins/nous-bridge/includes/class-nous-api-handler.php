<?php
/**
 * Handles REST API requests from Nous
 */

if (!defined('ABSPATH')) {
    exit;
}

class Nous_API_Handler
{

    public function init()
    {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes()
    {
        register_rest_route('nous/v1', '/publish', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_publish'),
            'permission_callback' => array($this, 'check_auth'),
        ));
    }

    /**
     * Check if the request has a valid token
     */
    public function check_auth($request)
    {
        $token_header = $request->get_header('X-Nous-Token');
        $saved_token = get_option('nous_bridge_token');

        if (empty($saved_token)) {
            return new WP_Error('no_token_configured', 'El plugin Nous Bridge no tiene un token configurado.', array('status' => 500));
        }

        return $token_header === $saved_token;
    }

    /**
     * Handle the publication request
     */
    public function handle_publish($request)
    {
        $params = $request->get_json_params();

        if (empty($params['title']) || empty($params['content'])) {
            return new WP_Error('missing_params', 'Falta el título o el contenido.', array('status' => 400));
        }

        // Process images in content if they are URLs
        $content = $this->process_content_images($params['content']);

        // Convert HTML to Gutenberg blocks
        $block_handler = new Nous_Blocks();
        $content = $block_handler->parse_html_to_blocks($content);

        $post_data = array(
            'post_title' => $params['title'],
            'post_content' => $content,
            'post_status' => isset($params['status']) ? $params['status'] : 'draft',
            'post_author' => 1, // Default to first user, could be configurable
            'post_type' => 'post',
        );

        // Check for existing post if updating
        if (!empty($params['post_id'])) {
            $post_data['ID'] = $params['post_id'];
            $post_id = wp_update_post($post_data);
        }
        else {
            $post_id = wp_insert_post($post_data);
        }

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        // Handle tags and categories
        if (!empty($params['categories'])) {
            wp_set_post_categories($post_id, $params['categories']);
        }
        if (!empty($params['tags'])) {
            wp_set_post_tags($post_id, $params['tags']);
        }

        // Handle Featured Image
        if (!empty($params['featured_image_url'])) {
            $media_handler = new Nous_Media_Handler();
            $attachment_id = $media_handler->upload_from_url($params['featured_image_url'], $post_id);
            if (!is_wp_error($attachment_id)) {
                set_post_thumbnail($post_id, $attachment_id);
            }
        }

        return rest_ensure_response(array(
            'success' => true,
            'post_id' => $post_id,
            'url' => get_permalink($post_id),
            'edit_url' => get_edit_post_link($post_id, '')
        ));
    }

    /**
     * Find image tags in HTML content and sideload them if they are external
     */
    private function process_content_images($content)
    {
        // This is a simplified version. Robust HTML parsing might be needed for complex cases.
        $media_handler = new Nous_Media_Handler();

        preg_match_all('/<img[^>]+src=["\']([^"\']+)["\']/', $content, $matches);

        if (!empty($matches[1])) {
            foreach ($matches[1] as $url) {
                // If it's an external URL (could be from Nous or AI generator)
                if (strpos($url, get_site_url()) === false) {
                    $attachment_id = $media_handler->upload_from_url($url);
                    if (!is_wp_error($attachment_id)) {
                        $new_url = wp_get_attachment_url($attachment_id);
                        $content = str_replace($url, $new_url, $content);
                    }
                }
            }
        }

        return $content;
    }
}
