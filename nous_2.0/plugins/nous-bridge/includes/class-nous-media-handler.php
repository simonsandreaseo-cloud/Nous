<?php
/**
 * Handles media uploads from external URLs
 */

if (!defined('ABSPATH')) {
    exit;
}

class Nous_Media_Handler
{

    /**
     * Upload an image from a URL to the WordPress Media Library
     *
     * @param string $url The image URL
     * @param int $post_id Optional. The post ID to attach the image to.
     * @return int|WP_Error Attachment ID or WP_Error on failure.
     */
    public function upload_from_url($url, $post_id = 0)
    {
        if (!function_exists('download_url')) {
            require_once ABSPATH . 'wp-admin/includes/image.php';
            require_once ABSPATH . 'wp-admin/includes/file.php';
            require_once ABSPATH . 'wp-admin/includes/media.php';
        }

        // Download the file from the URL
        $temp_file = download_url($url);

        if (is_wp_error($temp_file)) {
            return $temp_file;
        }

        // Get file information
        $file_array = array(
            'name' => basename($url),
            'tmp_name' => $temp_file,
        );

        // Check file extension/type. If missing, try to detect.
        if (strpos($file_array['name'], '.') === false) {
            $file_type = wp_check_filetype($temp_file);
            if ($file_type['ext']) {
                $file_array['name'] .= '.' . $file_type['ext'];
            }
            else {
                // Default to jpg if unknown
                $file_array['name'] .= '.jpg';
            }
        }

        // Do the upload
        $attachment_id = media_handle_sideload($file_array, $post_id);

        // If error, unlink the temp file
        if (is_wp_error($attachment_id)) {
            @unlink($file_array['tmp_name']);
            return $attachment_id;
        }

        return $attachment_id;
    }
}
