<?php
if (!defined('ABSPATH')) {
    exit;
}

class WC_Gateway_Odelhub_OpenPayGB extends WC_Payment_Gateway {
    public function __construct() {
        $this->id = 'odelhub_openpaygb';
        $this->method_title = 'OpenPayGB';
        $this->method_description = 'Hosted OpenPayGB checkout (Mobile Money / OPGB). Creates Partner API charges and redirects the customer.';
        $this->has_fields = false;
        $this->supports = array('products');

        $this->init_form_fields();
        $this->init_settings();

        $this->title = $this->get_option('title', 'OpenPayGB / Mobile Money');
        $this->description = $this->get_option('description', 'Pay securely with MTN or Airtel Mobile Money via OpenPayGB.');
        $this->enabled = $this->get_option('enabled', 'no');

        add_action('woocommerce_update_options_payment_gateways_' . $this->id, array($this, 'process_admin_options'));
        add_action('woocommerce_api_odelhub_openpaygb_return', array($this, 'handle_return'));
    }

    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title' => 'Enable/Disable',
                'type' => 'checkbox',
                'label' => 'Enable OpenPayGB',
                'default' => 'no',
            ),
            'title' => array(
                'title' => 'Title',
                'type' => 'text',
                'default' => 'OpenPayGB / Mobile Money',
            ),
            'description' => array(
                'title' => 'Description',
                'type' => 'textarea',
                'default' => 'Pay securely with MTN or Airtel Mobile Money via OpenPayGB hosted checkout.',
            ),
            'api_base' => array(
                'title' => 'API base URL',
                'type' => 'text',
                'description' => 'Example: https://odelpay.vercel.app (no trailing path).',
                'default' => 'https://odelpay.vercel.app',
            ),
            'api_key' => array(
                'title' => 'Partner API key',
                'type' => 'password',
                'description' => 'From Developers → Generated API keys (scopes: charges:create, charges:read).',
                'default' => '',
            ),
            'webhook_secret' => array(
                'title' => 'Webhook signing secret',
                'type' => 'password',
                'description' => 'From Developers → Webhooks. Used to verify X-Odelhub-Signature (HMAC-SHA256 of raw body).',
                'default' => '',
            ),
            'ugx_rate' => array(
                'title' => 'UGX conversion (store currency → UGX)',
                'type' => 'number',
                'description' => 'If your store currency is not UGX, multiply order total by this rate to get amountUgx. Use 1 when store currency is UGX.',
                'default' => '1',
                'custom_attributes' => array('step' => 'any', 'min' => '0'),
            ),
        );
    }

    public function process_payment($order_id) {
        $order = wc_get_order($order_id);
        if (!$order) {
            wc_add_notice('Order not found.', 'error');
            return array('result' => 'fail');
        }

        $settings = array(
            'api_base' => $this->get_option('api_base'),
            'api_key' => $this->get_option('api_key'),
        );

        $rate = floatval($this->get_option('ugx_rate', '1'));
        if ($rate <= 0) {
            $rate = 1;
        }
        $amount_ugx = (int) max(1, round(floatval($order->get_total()) * $rate));

        $return_url = add_query_arg(
            array(
                'wc-api' => 'odelhub_openpaygb_return',
                'order_id' => $order->get_id(),
                'key' => $order->get_order_key(),
            ),
            home_url('/')
        );

        $payload = array(
            'amountUgx' => $amount_ugx,
            'description' => sprintf('WooCommerce order #%s', $order->get_order_number()),
            'externalRef' => 'woo_' . $order->get_id(),
            'redirectUrl' => $return_url,
            'cancelUrl' => $order->get_cancel_order_url_raw(),
            'customerEmail' => $order->get_billing_email(),
            'customerPhone' => $order->get_billing_phone(),
            'customerName' => trim($order->get_billing_first_name() . ' ' . $order->get_billing_last_name()),
            'metadata' => array(
                'woocommerce_order_id' => $order->get_id(),
                'woocommerce_order_key' => $order->get_order_key(),
                'store_currency' => $order->get_currency(),
                'store_total' => $order->get_total(),
            ),
        );

        $result = Odelhub_Opgb_Api::create_charge($settings, $payload);
        if (!$result['ok']) {
            wc_add_notice('OpenPayGB error: ' . $result['error'], 'error');
            return array('result' => 'fail');
        }

        $charge = $result['charge'];
        $order->update_meta_data('_odelhub_charge_id', $charge['id']);
        $order->update_meta_data('_odelhub_checkout_url', $charge['checkoutUrl']);
        $order->update_status('pending', 'Awaiting OpenPayGB payment.');
        $order->save();

        return array(
            'result' => 'success',
            'redirect' => $charge['checkoutUrl'],
        );
    }

    public function handle_return() {
        $order_id = isset($_GET['order_id']) ? absint($_GET['order_id']) : 0;
        $key = isset($_GET['key']) ? wc_clean(wp_unslash($_GET['key'])) : '';
        $order = wc_get_order($order_id);
        if (!$order || $order->get_order_key() !== $key) {
            wp_die('Invalid return.');
        }

        $charge_id = $order->get_meta('_odelhub_charge_id');
        if ($charge_id) {
            $settings = array(
                'api_base' => $this->get_option('api_base'),
                'api_key' => $this->get_option('api_key'),
            );
            $fetched = Odelhub_Opgb_Api::get_charge($settings, $charge_id);
            if ($fetched['ok'] && !empty($fetched['charge']['status']) && $fetched['charge']['status'] === 'confirmed') {
                if (!$order->is_paid()) {
                    $order->payment_complete($charge_id);
                    $order->add_order_note('OpenPayGB charge confirmed on return: ' . $charge_id);
                }
            }
        }

        wp_safe_redirect($this->get_return_url($order));
        exit;
    }
}
