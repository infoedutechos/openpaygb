# OpenPayGB for WooCommerce

Contributors: odelhub
Requires at least: 6.0
Tested up to: 6.7
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later

Accept Mobile Money / OpenPayGB hosted checkout in WooCommerce via the ODEL HUB Partner API.

## Installation

1. Upload the `odelhub-openpaygb` folder to `/wp-content/plugins/`.
2. Activate the plugin.
3. Configure API base, Partner API key, and webhook secret under WooCommerce → Settings → Payments → OpenPayGB.
4. Point an OpenPayGB developer webhook to `/wp-json/odelhub-openpaygb/v1/webhook`.

See `docs/platform/WOOCOMMERCE.md` in the ODELHUB-Pay repo for the full guide.
