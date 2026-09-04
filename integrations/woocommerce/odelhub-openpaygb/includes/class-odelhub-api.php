<?php
if (!defined('ABSPATH')) {
    exit;
}

class Odelhub_Opgb_Api {
    public static function create_charge($settings, $payload) {
        $base = trailingslashit(rtrim($settings['api_base'], '/'));
        $url = $base . 'api/partner/v1/charges';
        $key = trim($settings['api_key']);

        $response = wp_remote_post($url, array(
            'timeout' => 45,
            'headers' => array(
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'User-Agent' => 'Odelhub-OpenPayGB-WooCommerce/' . ODELHUB_OPGB_VERSION,
            ),
            'body' => wp_json_encode($payload),
        ));

        if (is_wp_error($response)) {
            return array('ok' => false, 'error' => $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if ($code < 200 || $code >= 300 || empty($body['charge']['checkoutUrl'])) {
            $err = is_array($body) && !empty($body['error']) ? $body['error'] : ('HTTP ' . $code);
            return array('ok' => false, 'error' => $err, 'raw' => $body);
        }

        return array('ok' => true, 'charge' => $body['charge']);
    }

    public static function get_charge($settings, $charge_id) {
        $base = trailingslashit(rtrim($settings['api_base'], '/'));
        $url = $base . 'api/partner/v1/charges/' . rawurlencode($charge_id);
        $key = trim($settings['api_key']);

        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'headers' => array(
                'Authorization' => 'Bearer ' . $key,
                'Accept' => 'application/json',
            ),
        ));

        if (is_wp_error($response)) {
            return array('ok' => false, 'error' => $response->get_error_message());
        }

        $code = wp_remote_retrieve_response_code($response);
        $body = json_decode(wp_remote_retrieve_body($response), true);
        if ($code < 200 || $code >= 300 || empty($body['charge'])) {
            $err = is_array($body) && !empty($body['error']) ? $body['error'] : ('HTTP ' . $code);
            return array('ok' => false, 'error' => $err);
        }

        return array('ok' => true, 'charge' => $body['charge']);
    }
}
