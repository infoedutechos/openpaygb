# Local development — URLs and seed credentials

Use this when running **`npm run dev`** (default **http://localhost:3000**). Values below come from **`scripts/seed.ts`** unless overridden in **`.env.local`** (`SEED_*` variables).

---

## Prerequisites

```bash
# .env.local must include DATABASE_URL (or MONGODB_URI)
npm run db:push
npm run seed
```

Seed wipes tuition data and recreates the **default** tenant, programmes, and demo users.

---

## 1. Guest payer flow (no login)

| Step | URL |
|------|-----|
| Choose school | http://localhost:3000/pay |
| Default tenant checkout | http://localhost:3000/pay/default |
| Skip intro → programmes | http://localhost:3000/pay/default?programmes=1 |

**Flow:** Pick programme → year/semester → enter name + email → pay (TON Connect or Mbiyo when configured) → receipt at `/receipt/<paymentId>`.

**Requires:** Organization slug **`default`** with **`tenantStatus: active`** (seed sets this).

---

## 2. ODEL HUB (default tenant) — admin logins

Tenant name: **ODEL HUB (default tenant)** · slug: **`default`**

| Role | Sign-in URL | Email (default) | Password (default) |
|------|-------------|-----------------|---------------------|
| **School admin** (`org_admin`) | http://localhost:3000/school/login | `admin@odelhub.local` | `ChangeMe_Admin123!` |
| **Platform master** | http://localhost:3000/admin/login?master=1 | `master@odelhub.local` | `ChangeMe_Master123!` |

**After sign-in**

- School admin → http://localhost:3000/admin (students, payments, programmes, receipts)
- Master → http://localhost:3000/admin/master (tenants, approvals, FX, integrations)

**Auth API:** `POST /api/auth/login` with `{ email, password, rememberMe? }` — not legacy `POST /api/admin/login`.

---

## 3. Demo student login

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/student/login |
| School / slug | `default` |
| Email | `student@odelhub.local` |
| Password | `ChangeMe_Student123!` |

**After sign-in:** http://localhost:3000/student or http://localhost:3000/my/dashboard

Demo student is on programme **BEP-ENG/RE**, year **1**, semester **1**.

---

## 4. School workspace registration (self-serve)

| Step | URL / action |
|------|----------------|
| Request workspace | http://localhost:3000/admin/register |
| Verify email (from inbox) | Link in ODEL HUB email → marks verified → **http://localhost:3000/school/login?workspaceVerified=1** |
| Resend verification | Same page → **Resend verification email** or `POST /api/public/organization-register/resend` |
| Master approve | http://localhost:3000/admin/master/organizations |
| Master create school admin | Same page → **Create org admin** |
| School signs in | http://localhost:3000/school/login |

Full lifecycle: **[ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)** · sign-in detail: **[SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md)**.

**Email (production):** set **`BREVO_API_KEY`** (recommended, free at [brevo.com](https://www.brevo.com)) and **`TRANSACTIONAL_EMAIL_FROM`** (or legacy `RESEND_FROM`). Resend (`RESEND_API_KEY`) still works. **Dev:** if email is unset, register API returns a **dev verification link** in the JSON response.

---

## 5. Environment overrides

| Variable | Purpose |
|----------|---------|
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | School admin seed |
| `SEED_MASTER_EMAIL` / `SEED_MASTER_PASSWORD` | Master seed |
| `SEED_STUDENT_EMAIL` / `SEED_STUDENT_PASSWORD` | Demo student |
| `ODELHUB_TON_WALLET_ADDRESS` | Default org destination wallet |
| `NEXT_PUBLIC_APP_URL` | Verification links in email (must match browser URL in prod) |

---

## 6. Dev server reset and MongoDB resilience

| Command | When to use |
|---------|-------------|
| `npm run dev:clean` | Clears `.next`, kills port **3000**, restarts dev (fixes stale Turbopack / Prisma client) |
| `npm run dev:reset` | Full reset: kill Node on port, `prisma generate`, clean `.next`, start dev |
| `npx prisma generate` | After `schema.prisma` changes — stop dev first on Windows if you see **EPERM** on `query_engine` |

**Atlas timeouts** (`Server selection timeout`, `connection forcibly closed` / Windows error **10054**):

1. Confirm **`DATABASE_URL`** in `.env` / `.env.local`.
2. Atlas → **Network Access** → allow your IP (or `0.0.0.0/0` for local dev only).
3. Cluster not **paused**.
4. Retry — the app retries transient drops and shows a **database temporarily unavailable** banner instead of crashing master/tuition shells when possible.

Set `PRISMA_VERBOSE_ERRORS=1` to see full Prisma Atlas errors in the terminal (normally filtered in dev).

**LivePay local webhook:** use a tunnel (ngrok, Cloudflare Tunnel) so LivePay can reach `POST /api/webhooks/livepay`. Set `NEXT_PUBLIC_APP_URL` to the tunnel HTTPS origin, or set `LIVEPAY_WEBHOOK_URL` to the full webhook path. `GET /api/public/livepay-config` returns `webhookUrl` for copy-paste into the LivePay dashboard.

**LivePay `502` / `IP … not allowed` on checkout:** LivePay only accepts API calls from IPs you whitelist. Your dev machine’s **public** IP (shown in the terminal as `[checkout/livepay-start/collect] Error: IP x.x.x.x not allowed`) must be added in the **LivePay dashboard → API / security → allowed IPs**. Or disable IP restriction for sandbox testing. Check current IP: `curl https://ifconfig.me`

**Master Admin → Environment:** `/admin/master#deployment-environment` audits and **saves** platform deployment variables. Values saved in the dashboard are **encrypted in MongoDB** and override server / Vercel / `.env.local` at runtime (dashboard wins). Leave a field blank and save to clear a dashboard override and fall back to process env. `NEXT_PUBLIC_*` vars still require a rebuild for client bundles; server routes pick up dashboard values immediately after save.

**Relworx (optional MoMo rail):** [Relworx docs](https://payments.relworx.com/docs/). Set in `.env.local`:

| Variable | Purpose |
|----------|---------|
| `RELWORX_API_KEY` | **API KEY** from Relworx dashboard (full Bearer token; paste as-is) |
| `RELWORX_ACCOUNT_NO` | **ACCOUNT NUMBER** (business `account_no`, e.g. `RELJH012BV45P`) |
| `RELWORX_WEBHOOK_KEY` | **Webhook Signing Key** from business account settings |
| *(Key Prefix)* | Dashboard label only — **not used** by this app (same idea as LivePay **KEY ID**) |
| `RELWORX_CURRENCY` | Optional: `UGX` (default), `KES`, or `TZS` |
| `RELWORX_ENABLED` | Set `false` to hide rail even when keys exist |

Webhook URL: `GET /api/public/relworx-config` → `webhookUrl` (default `{NEXT_PUBLIC_APP_URL}/api/webhooks/relworx`). Tunnel required for local webhook delivery. Whitelist server IP in Relworx dashboard (see FAQs). Relworx limits **5 collect requests per 10 minutes per phone number**.

### Dev console: `webpack-hmr` / WebSocket interrupted

Harmless in development — hot reload lost connection. Common on this project because first compile is slow (middleware ~20s, **Ready** often 2–4 minutes on Windows).

| Cause | Fix |
|-------|-----|
| Dev restarted (`Port 3000 is in use — stopping old next dev`) | Hard refresh the tab (`Ctrl+Shift+R`) after terminal shows **Ready** |
| Page opened before **Ready** | Wait for `✓ Ready`, then reload |
| Opened site via **Network** URL (`172.x.x.x:3000`) | Use **`http://localhost:3000`** only — HMR WebSocket must match the page origin |
| Two `npm run dev` processes | One terminal only; or `npm run dev:reset` |
| Stale tab after `dev:clean` | Close tab, open fresh `http://localhost:3000` |

Default dev uses **Turbopack**; the browser may still log `/_next/webpack-hmr` — ignore if the app loads after refresh. Force Webpack only if needed: `NEXT_DEV_TURBO=0 npm run dev` (slower).

---

## Related docs

- [APP_STATUS_AUDIT.md](./APP_STATUS_AUDIT.md) — holistic scan, gaps, deployment readiness
- [SCHOOL_ADMIN_PROGRAMMES.md](./SCHOOL_ADMIN_PROGRAMMES.md) — what school admins can customize
- [USER_FLOW.md](./USER_FLOW.md) — guest pay APIs and receipts
