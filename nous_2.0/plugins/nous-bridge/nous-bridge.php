<?php
/**
 * Plugin Name: Nous Bridge
 * Plugin URI: https://nousclinical.doc
 * Description: Puente inteligente para la maquetación automática de contenidos enriquecidos desde Nous.
 * Version: 1.0.0
 * Author: Antigravity AI
 * Author URI: https://nousclinical.doc
 * License: GPL2
 * Text Domain: nous-bridge
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Define constants
define('NOUS_BRIDGE_VERSION', '1.0.0');
define('NOUS_BRIDGE_PATH', plugin_dir_path(__FILE__));
define('NOUS_BRIDGE_URL', plugin_dir_url(__FILE__));

// Load classes
require_once NOUS_BRIDGE_PATH . 'includes/class-nous-api-handler.php';
require_once NOUS_BRIDGE_PATH . 'includes/class-nous-media-handler.php';
require_once NOUS_BRIDGE_PATH . 'includes/class-nous-blocks.php';

/**
 * Initialize the plugin
 */
function nous_bridge_init()
{
    $api_handler = new Nous_API_Handler();
    $api_handler->init();
}
add_action('plugins_loaded', 'nous_bridge_init');

/**
 * Register settings for authentication token
 */
function nous_bridge_register_settings()
{
    register_setting('nous_bridge_settings', 'nous_bridge_token');

    add_settings_section(
        'nous_bridge_section',
        __('Configuración de Seguridad', 'nous-bridge'),
        null,
        'nous-bridge'
    );

    add_settings_field(
        'nous_bridge_token',
        __('Token de Autenticación de Nous', 'nous-bridge'),
        'nous_bridge_token_render',
        'nous-bridge',
        'nous_bridge_section'
    );
}
add_action('admin_init', 'nous_bridge_register_settings');

function nous_bridge_token_render()
{
    $token = get_option('nous_bridge_token');
?>
    <input type='text' name='nous_bridge_token' value='<?php echo esc_attr($token); ?>' class='regular-text'>
    <p class='description'><?php _e('Este token debe coincidir con el configurado en tu proyecto en Nous para permitir la publicación automática.', 'nous-bridge'); ?></p>
    <?php
}

function nous_bridge_add_admin_menu()
{
    add_options_page(
        'Nous Bridge',
        'Nous Bridge',
        'manage_options',
        'nous-bridge',
        'nous_bridge_options_page'
    );
}
add_action('admin_menu', 'nous_bridge_add_admin_menu');

function nous_bridge_options_page()
{
?>
    <div class="wrap">
        <h1>Nous Bridge - Configuración</h1>
        <form action='options.php' method='post'>
            <?php
    settings_fields('nous_bridge_settings');
    do_settings_sections('nous-bridge');
    submit_button();
?>
        </form>
    </div>
    <?php
}
