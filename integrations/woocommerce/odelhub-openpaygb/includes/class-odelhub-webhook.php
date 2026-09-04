<?php
if (!defined('ABSPATH')) {
    exit;
}

class Odelhub_Opgb_Webhook {
    public static function init() {
        add_action('rest_api_init', function () {
            register_rest_route('odelhub-openpaygb/v1', '/webhook', array(
                'methods' => 'POST',
                'callback' => array(__CLASS__, 'handle'),
                'permission_callback' => '__return_true',
            ));
        });
    }

    public static function handle(WP_REST_Request $request) {
        $gateways = WC()->payment_gateways()->payment_gateways();
        $gateway = isset($gateways['odelhub_openpaygb']) ? $gateways['odelhub_openpaygb'] : null;
        if (!$gateway) {
            return new WP_REST_Response(array('error' => 'Gateway not configured'), 503);
        }

        $secret = $gateway->get_option('webhook_secret');
        $raw = $request->get_body();
        $sig = $request->get_header('x-odelhub-signature');
        if ($secret) {
            $expected = hash_hmac('sha256', $raw, $secret);
            if (!$sig || !hash_equals($expected, $sig)) {
                return new WP_REST_Response(array('error' => 'Invalid signature'), 401);
            }
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            return new WP_REST_Response(array('error' => 'Invalid JSON'), 400);
        }

        $type = isset($payload['type']) ? $payload['type'] : '';
        $charge = isset($payload['data']['charge']) && is_array($payload['data']['charge'])
            ? $payload['data']['charge']
            : null;

        if (!$charge || empty($charge['id'])) {
            return new WP_REST_Response(array('ok' => true, 'ignored' => true));
        }

        $order = self::find_order($charge);
        if (!$order) {
            return new WP_REST_Response(array('ok' => true, 'order' => 'not_found'));
        }

        if ($type === 'charge.confirmed') {
            if (!$order->is_paid()) {
                $order->payment_complete($charge['id']);
                $order->add_order_note('OpenPayGB webhook charge.confirmed: ' . $charge['id']);
            }
        } elseif ($type === 'charge.failed') {
            if ($order->has_status(array('pending', 'on-hold'))) {
                $order->update_status('failed', 'OpenPayGB charge.failed: ' . $charge['id']);
            }
        }

        return new WP_REST_Response(array('ok' => true));
    }

    private static function find_order($charge) {
        $meta = isset($charge['metadata']) && is_array($charge['metadata']) ? $charge['metadata'] : array();
        if (!empty($meta['woocommerce_order_id'])) {
            $order = wc_get_order(absint($meta['woocommerce_order_id']));
            if ($order) {
                return $order;
            }
        }

        if (!empty($charge['externalRef']) && strpos($charge['externalRef'], 'woo_') === 0) {
            $id = absint(substr($charge['externalRef'], 4));
            $order = wc_get_order($id);
            if ($order) {
                return $order;
            }
        }

        $orders = wc_get_orders(array(
            'limit' => 1,
            'meta_key' => '_odelhub_charge_id',
            'meta_value' => $charge['id'],
        ));
        return $orders ? $orders[0] : null;
    }
}
