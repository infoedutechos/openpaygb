# VixonPay, virtual card, webhooks & local dev

Session reference for **VixonPay MoMo**, **OpenPayGB virtual card**, webhook tunnels, performance tuning, and troubleshooting.  
API reference: [docs.vixonpay.com/pay](https://docs.vixonpay.com/pay)

---

## 1. Environment variables

Set in **`.env.local` only** (never commit live keys).

| Variable | Purpose |
|----------|---------|
| `VIXONPAY_API_KEY` | Bearer token — VixonPay dashboard → Settings → API Keys |
| `VIXONPAY_WEBHOOK_SECRET` | HMAC SHA512 key for `X-VixonPay-Signature` |
| `VIXONPAY_WEBHOOK_URL` | Optional full public webhook URL (overrides auto-derived URL) |
| `NEXT_PUBLIC_APP_URL` | App origin (e.g. `http://localhost:3000` dev, production HTTPS in prod) |
| `DATABASE_URL` | MongoDB Atlas connection string |

Placeholders are in `.env.example`. Master Admin env registry group: **VixonPay (Uganda MoMo)**.

**Security:** Rotate keys if they were shared in chat or committed by mistake. Production keys belong only in `.env.local` / Vercel env — not in git.

---

## 2. VixonPay dashboard — webhook

VixonPay cannot reach `localhost`. Use a **tunnel** for local dev or your **production domain** in prod.

| Field | Local dev (tunnel) | Production |
|-------|-------------------|------------|
| **Label** | `ODELHUB Pay — local dev` | `ODELHUB Pay — production` |
| **Webhook URL** | `https://<tunnel-host>/api/webhooks/vixonpay` | `https://odelpay.vercel.app/api/webhooks/vixonpay` |

Replace `<tunnel-host>` with the URL printed by `npm run tunnel:dev` (e.g. `lovely-camels-read.loca.lt`).  
Tunnel URLs **change every restart** — update the dashboard and `VIXONPAY_WEBHOOK_URL` each time.

**Health check:** `GET /api/webhooks/vixonpay` → `OK`

**Signature:** `X-VixonPay-Signature` = HMAC SHA512 of the **raw** JSON body using `VIXONPAY_WEBHOOK_SECRET`. Implemented in `lib/vixonpay/verify-webhook-signature.ts`.

---

## 3. What VixonPay powers

### A. Virtual card activation & top-up (MoMo)

Students can **activate** a reserved card or **add funds** via mobile money (UGX).

| Step | Detail |
|------|--------|
| UI | `/student/card` — **Pay with MoMo to activate** or **Top up via MoMo** |
| Activate API | `POST /api/student/openpay-card/issue/momo-start` with `rail: "vixonpay"` (card must be `pending_issue`) |
| Top-up API | `POST /api/student/openpay-card/fund/momo-start` with `rail: "vixonpay"` (card must be `active`) |
| Issue fee | TON fee × org FX → UGX (min UGX 1,000); exposed as `platform.issueFeeUgx` on `GET /api/student/openpay-card` |
| Flow | Create top-up → `vixonPayCollectMoney()` → STK on phone → webhook confirms activation or balance |
| Memo | `opcardissuemomo:{topupId}` activates card; `opcardmomo:{topupId}` credits balance |
| Rail priority | VixonPay → LivePay → Relworx (first configured wins) |

### B. Tuition checkout (MoMo)

Guest and signed-in students can pay tuition via VixonPay.

| Step | Detail |
|------|--------|
| Guest UI | `/pay/<orgSlug>` → Pay with **VixonPay** |
| Student UI | `/student/pay` → Pay with **VixonPay** |
| API | `POST /api/public/checkout/vixonpay-start` |
| Confirm | Webhook `POST /api/webhooks/vixonpay` or poll `GET /api/payments/:id/public` |
| Ledger rail | `PaymentRail.vixonpay` in Prisma |

---

## 4. Virtual card — student UI

| Item | Value |
|------|--------|
| Sidebar link | **Virtual card** (student portal shell) |
| Page | http://localhost:3000/student/card |
| Component | `components/student/OpenPayCardPanel.tsx` |
| Also on | http://localhost:3000/student (student home) |

Card lifecycle: opt-in → pay issue fee (MoMo or TON) → active → top up (VixonPay MoMo / TON) → pay tuition with card balance at checkout.

Platform master must enable OpenPayGB card in platform settings for the panel to appear.

---

## 5. Key code paths

| Area | Path |
|------|------|
| VixonPay client | `lib/vixonpay/client.ts` |
| Webhook verify | `lib/vixonpay/verify-webhook-signature.ts` |
| Tuition confirm | `lib/vixonpay/confirm-payment.ts` |
| Status poll | `lib/vixonpay/transaction-status.ts` |
| Card MoMo top-up | `lib/openpay-card-momo-topup.ts` |
| Checkout start | `app/api/public/checkout/vixonpay-start/route.ts` |
| Webhook | `app/api/webhooks/vixonpay/route.ts` |
| Public config | `app/api/public/vixonpay-config/route.ts` |
| Webhook smoke test | `scripts/test-vixonpay-webhook.cjs` |

---

## 6. Commands cheat sheet

```bash
# Schema + client (stop dev first on Windows if EPERM on query_engine)
npm run db:generate
npm run db:push

# Clean dev server (kills port 3000, clears .next)
npm run dev:clean

# Expose localhost for VixonPay webhooks
npm run tunnel:dev
# → copy "your url is: https://....loca.lt"
# → dashboard: https://....loca.lt/api/webhooks/vixonpay

# Signed webhook smoke test
npm run test:vixonpay-webhook
npm run test:vixonpay-webhook -- https://YOUR-TUNNEL.loca.lt
```

After changing `.env.local`, restart dev (`npm run dev:clean`) so env is reloaded.

---

## 7. MongoDB & app performance

### Connection tuning (automatic)

`lib/mongodb-connection-url.ts` augments `DATABASE_URL` when driver params are missing:

- `maxPoolSize` / `minPoolSize` — warm connection pool  
- `serverSelectionTimeoutMS=8000` — fail fast instead of multi-minute hangs  
- `connectTimeoutMS`, `socketTimeoutMS`, `retryWrites`, `w`

Applied in `lib/prisma.ts` before `PrismaClient` is created.

### Notification polling

- `/api/platform/notifications` uses a **6s** Prisma deadline; returns empty list on timeout (no crash).  
- Deadline timeouts are **not** logged as warnings (expected when Atlas is slow).  
- `PlatformNotificationBell` / `NotificationCenter`: poll every **90s**, skip when browser tab is hidden.

### Atlas checklist (dev slowness)

1. `DATABASE_URL` set in `.env.local`  
2. Atlas **Network Access** includes your IP (or `0.0.0.0/0` for dev only)  
3. Cluster **not paused**  
4. Region reasonably close to your machine  

First Turbopack compile after `dev:clean` can take **1–3+ minutes** — browser fetches may show “Could not reach the server” until **Ready** and first compile finish.

### Prisma `EPERM` on Windows

If `npm run db:generate` fails renaming `query_engine-windows.dll.node`:

```bash
npm run dev:clean   # or: node scripts/clean-next.cjs --kill-port
npm run db:generate
```

---

## 8. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `withPrismaRetry is not defined` on webhook | Missing imports in webhook route | Fixed — ensure `prisma`, `withPrismaRetry`, `confirmVixonPayPaymentIfEligible` imported in `app/api/webhooks/vixonpay/route.ts` |
| Webhook 401 Unauthorized | Wrong `VIXONPAY_WEBHOOK_SECRET` or body tampered | Match dashboard secret; verify raw-body HMAC |
| Webhook 500 | See terminal `[webhooks/vixonpay]` | Fix error; retry with `npm run test:vixonpay-webhook` |
| `NetworkError when attempting to fetch` | Dev down, compiling, or Mongo timeout | Wait for Ready; hard-refresh; check Atlas |
| No **Virtual card** in sidebar | Old bundle / not signed in | Hard-refresh; go to `/student/card` |
| Card panel empty | Platform card disabled | Master admin → enable OpenPayGB card |
| Tunnel 408 / expired | localtunnel session ended | Re-run `npm run tunnel:dev` |

---

## 9. Demo student login (local)

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/student/login |
| School / slug | `default` |
| Email | `student@odelhub.local` |
| Password | `ChangeMe_Student123!` |

Requires `npm run db:push` and `npm run seed`. More: [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md).

---

## 10. Production go-live

1. Set `VIXONPAY_API_KEY`, `VIXONPAY_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL` on Vercel.  
2. Webhook URL: `https://<production-domain>/api/webhooks/vixonpay`  
3. Deploy; `GET` health check on webhook route.  
4. Test small real MoMo collection (card top-up or tuition).  

See also [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) and [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md).

---

## 11. Related docs

- [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md) — seeds, dev reset, LivePay/Relworx notes  
- [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md) — parallel pattern for another MoMo rail  
- [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md) — external Visa/MC issuing options (not OpenPayGB closed-loop card)
