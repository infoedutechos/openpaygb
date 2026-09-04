# OpenPayGB ↔ WooCommerce

**Last updated:** 2026-09-04

Seamless WordPress / WooCommerce checkout using the OpenPayGB Partner API and hosted checkout.

## Install

1. **Download** the installable zip from [https://odelpay.vercel.app/api/public/woocommerce-plugin](https://odelpay.vercel.app/api/public/woocommerce-plugin) (or open [integrations/woocommerce/odelhub-openpaygb](https://odelpay.vercel.app/integrations/woocommerce/odelhub-openpaygb)).
2. Unzip into `wp-content/plugins/odelhub-openpaygb/`.
3. Activate **OpenPayGB for WooCommerce** in WP Admin → Plugins.
4. WooCommerce → Settings → Payments → **OpenPayGB**:
   - **API base URL** — e.g. `https://odelpay.vercel.app`
   - **Partner API key** — Developers dashboard → **Generated API keys** (`charges:create`, `charges:read`)
   - **Webhook signing secret** — Developers → Webhooks (events: `charge.confirmed`, `charge.failed`, optionally `charge.created`)
   - **UGX conversion** — `1` if store currency is UGX; otherwise multiply store total → UGX
5. Register webhook URL on the Developer dashboard:

```text
https://YOUR-STORE.example/wp-json/odelhub-openpaygb/v1/webhook
```

## Flow

1. Customer selects OpenPayGB at Woo checkout.
2. Plugin `POST /api/partner/v1/charges` with `externalRef=woo_{orderId}` and order metadata.
3. Customer is redirected to hosted `/opgb/checkout/{id}` (MoMo / sandbox).
4. On success:
   - Browser return hits `?wc-api=odelhub_openpaygb_return` and re-checks charge status.
   - Webhook `charge.confirmed` marks the Woo order paid (HMAC `X-Odelhub-Signature`).
5. Merchant settlement / cashout remains on `/developers/dashboard#settlement` (fee rules from **Who sets fees**).

## Fee automation

Fee payer, surcharges, and overrides configured on the Developer App apply automatically to every WooCommerce charge — no extra Woo settings. Use dashboard presets + live quote / auto-save on **Who sets fees**.

## Related

- [PARTNER_API.md](./PARTNER_API.md)
- [OPENPAYGB_PAYMENT_PROVIDER.md](./OPENPAYGB_PAYMENT_PROVIDER.md)
- Plugin path: [`integrations/woocommerce/odelhub-openpaygb/`](https://odelpay.vercel.app/integrations/woocommerce/odelhub-openpaygb)
- Zip download: [`/api/public/woocommerce-plugin`](https://odelpay.vercel.app/api/public/woocommerce-plugin)
- Developers panel: [`/developers/dashboard#woocommerce`](https://odelpay.vercel.app/developers/dashboard#woocommerce)
