# Mbiyo dashboard — Webhook & IP whitelisting

Configure [Mbiyo merchant API settings](https://dashboard.mbiyo.africa/user/profile/index/api) so ODELHUB Pay can receive payment status callbacks and verify them securely.

## Values to enter

| Mbiyo dashboard field | What to enter |
|----------------------|---------------|
| **Webhook URL** | `https://<your-live-domain>/api/webhooks/mbiyo` |
| **Webhook Secret** | A long random string (see below) — **same** value in Vercel/hosting as `MBIYO_WEBHOOK_SECRET` |
| **IP Whitelisted** | See [IP whitelist](#ip-whitelist) — often left empty on Vercel unless Mbiyo gives you fixed egress IPs |

Replace `<your-live-domain>` with your production host **without** a trailing slash — the same host as `NEXT_PUBLIC_APP_URL` (e.g. `https://your-app.vercel.app`).

### Webhook URL examples

| Environment | Webhook URL |
|-------------|-------------|
| Vercel production | `https://YOUR-PROJECT.vercel.app/api/webhooks/mbiyo` |
| Custom domain | `https://pay.yourschool.com/api/webhooks/mbiyo` |
| Local dev | Mbiyo cannot reach `localhost` — use a tunnel (ngrok, Cloudflare Tunnel) and put that public URL in the dashboard **or** rely on per-request `callback_url` only while testing |

**Health check:** `GET https://<domain>/api/webhooks/mbiyo` returns `OK` (useful to confirm the route is deployed).

Checkout and collect flows also send `callback_url` on each payin; that URL **overrides** the dashboard default for that transaction ([Mbiyo payin docs](https://dashboard.mbiyo.africa/docs/reference/merchant/payin)).

### Webhook Secret

1. Generate a secret (32+ bytes), e.g. PowerShell:

   ```powershell
   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
   ```

   Or: `openssl rand -hex 32`

2. Paste it into **Webhook Secret** on the Mbiyo dashboard.
3. Set the **identical** string in your app environment:

   ```env
   MBIYO_WEBHOOK_SECRET=<same-secret-as-dashboard>
   ```

4. Redeploy after changing env on Vercel.

Mbiyo signs webhooks with **HMAC-SHA256** of the **raw** JSON body (hex digest in the `Signature` header). ODELHUB Pay verifies that in `lib/mbiyo/verify-webhook-signature.ts`. In **production**, `MBIYO_WEBHOOK_SECRET` must be set or webhook POSTs are rejected.

Also set keys from the same dashboard page ([API profile](https://dashboard.mbiyo.africa/user/profile/index/api)):

| Mbiyo dashboard | ODELHUB Pay env | Used for |
|-----------------|-----------------|----------|
| **API Keys → Live** | `MBIYO_SECRET_KEY` | Production (`odelpay.vercel.app`) — server payins, status checks |
| **API Keys → Test** | `MBIYO_SECRET_KEY` | Local/sandbox only — fake money, no real mobile-money debit |
| **Public keys → Live** | `NEXT_PUBLIC_MBIYO_PUBLIC_KEY` | Production — safe in browser (optional today) |
| **Public keys → Test** | `NEXT_PUBLIC_MBIYO_PUBLIC_KEY` | Local test — pair with Test API key |
| **Webhook Secret** | `MBIYO_WEBHOOK_SECRET` | Not the same as API or public keys |

```env
MBIYO_SECRET_KEY=<Live API key for production>
MBIYO_API_BASE_URL=https://dashboard.mbiyo.africa/api/v1
NEXT_PUBLIC_MBIYO_PUBLIC_KEY=<Live public key for production>
```

**Do not mix modes:** use Live API key + Live public key on Vercel; use Test + Test only on localhost when experimenting.

`MBIYO_SECRET_KEY` is sent as `Authorization: Bearer …` from the server (`lib/mbiyo/client.ts`). Never put the API key in a `NEXT_PUBLIC_*` variable.

### IP whitelist

Mbiyo’s public API docs do not define this field. It is usually one of:

1. **Your server’s outbound IPs** — IPs allowed to call Mbiyo’s API with your `MBIYO_SECRET_KEY`. Vercel serverless uses **dynamic** egress IPs on standard plans, so you often **cannot** list a stable set. Options:
   - Leave **IP Whitelisted** empty if Mbiyo allows it.
   - Ask Mbiyo support ([contact@mbiyopay.com](mailto:contact@mbiyopay.com)) whether IP whitelist is required for your account.
   - Use [Vercel Static IPs](https://vercel.com/docs/connectivity/static-ips) (paid) and whitelist those egress addresses.

2. **Mbiyo’s webhook sender IPs** — Rare on merchant dashboards; if Mbiyo publishes IP ranges for callbacks, you would allow them on **your** firewall. Vercel does not require this for `/api/webhooks/mbiyo` to work.

**Inbound webhooks** (Mbiyo → your app) do not need you to whitelist anything on Vercel; Mbiyo POSTs to your public HTTPS URL.

## Verify end-to-end

1. Deploy with `NEXT_PUBLIC_APP_URL`, `MBIYO_SECRET_KEY`, and `MBIYO_WEBHOOK_SECRET` set → redeploy.
2. Open `GET https://<domain>/api/webhooks/mbiyo` → `OK`.
3. Run a small test payin; confirm the payment moves from pending when Mbiyo sends `status: successful`.
4. In Master Admin → mobile money providers, Mbiyo should show as configured when both secrets/keys are set (`lib/builtin-mobile-money.ts`).

## Related

- [VERCEL_ENV_SETUP.md](../upstream-ura-pearl/VERCEL_ENV_SETUP.md) — full env list and post-deploy checklist
- Webhook handler: `app/api/webhooks/mbiyo/route.ts`
- Payin start: `app/api/public/checkout/mbiyo-start/route.ts`
