# Network Visa / Mastercard issuing (OpenPayGB)

**Not** the closed-loop [OpenPayGB platform card](./OPENPAYGB_PLATFORM_CARD.md). This path issues (or enrolls) **scheme** cards via a BIN sponsor.

## Paths supported in code

| Provider | Env | Status |
|----------|-----|--------|
| **LivePay** | `CARD_ISSUING_PROVIDER=livepay` + `LIVEPAY_CARD_ISSUING_URL` + `LIVEPAY_API_KEY` | Ready when LivePay documents the create-card URL |
| **Visa Developer (VDP)** | `CARD_ISSUING_PROVIDER=visa_vdp` + mTLS certs + `VISA_USER_ID` / `VISA_PASSWORD` | Sandbox **hello-world** + optional `VISA_ISSUE_PATH` after program approval |

## Your developer.visa.com account

1. Create a project on [developer.visa.com](https://developer.visa.com/) and download **two-way SSL** credentials (cert + key).
2. Set in Master → Deployment environment (or `.env`):
   - `VISA_USER_ID`, `VISA_PASSWORD`
   - `VISA_CERT_PATH` / `VISA_KEY_PATH` (or `VISA_CERT_PEM` / `VISA_KEY_PEM`)
   - `VISA_ENV=sandbox` (default) or `production`
3. Probe: `POST /api/master/card-issuing/issue` with `{ "probeHelloWorld": true, "holderName": "x", "email": "a@b.c" }`  
   or `GET /api/public/card-issuing-config` with `VISA_PROBE_ON_CONFIG=1`.
4. **Production PANs** still need a **BIN sponsor** (bank / processor / LivePay). VDP alone does not mint OpenPayGB BINs. After approval, set `VISA_ISSUE_PATH` (e.g. VCPE enrollment path from Visa).

## APIs

| Method | Path | Role |
|--------|------|------|
| GET | `/api/public/card-issuing-config` | Readiness |
| POST | `/api/master/card-issuing/issue` | Master issue / hello-world probe |
| POST | `/api/webhooks/visa-issuing` | Lifecycle status (`x-visa-webhook-secret`) |

## Data model

`NetworkIssuedCard` stores **last4**, provider id/token, status — **never** full PAN or CVV.

## Related

- Acquiring (pay *with* Visa/MC): Flutterwave/Paystack + PayWizard — see [OPENPAYGB_GATEWAY_MATURITY.md](./OPENPAYGB_GATEWAY_MATURITY.md)
- Investigation options: [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md)
