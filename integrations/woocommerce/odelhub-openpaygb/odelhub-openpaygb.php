<?php
/**
 * Plugin Name: OpenPayGB for WooCommerce
 * Plugin URI: https://odelpay.vercel.app/opgb
 * Description: Accept Uganda Mobile Money and OpenPayGB hosted checkout via the ODEL HUB Partner API.
 * Version: 1.0.0
 * Author: ODEL HUB / OpenPayGB
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * WC requires at least: 7.0
 * Text Domain: odelhub-openpaygb
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ODELHUB_OPGB_VERSION', '1.0.0');
define('ODELHUB_OPGB_PATH', plugin_dir_path(__FILE__));
define('ODELHUB_OPGB_URL', plugin_dir_url(__FILE__));

add_action('plugins_loaded', 'odelhub_opgb_init', 11);

function odelhub_opgb_init() {
    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function () {
            echo '<div class="notice notice-error"><p>OpenPayGB for WooCommerce requires WooCommerce.</p></div>';
        });
        return;
    }

    require_once ODELHUB_OPGB_PATH . 'includes/class-odelhub-api.php';
    require_once ODELHUB_OPGB_PATH . 'includes/class-odelhub-gateway.php';
    require_once ODELHUB_OPGB_PATH . 'includes/class-odelhub-webhook.php';

    add_filter('woocommerce_payment_gateways', function ($gateways) {
        $gateways[] = 'WC_Gateway_Odelhub_OpenPayGB';
        return $gateways;
    });

    Odelhub_Opgb_Webhook::init();
}
