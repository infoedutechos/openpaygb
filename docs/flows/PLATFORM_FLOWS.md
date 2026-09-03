# Platform flows and multi-tenant operations

Operational reference for tenant registration, tuition pay URLs, student portal, and admin surfaces.

---

## 1. Implemented capabilities (reference)

### Tenant self-registration

- **UI:** [`/admin/register`](../app/admin/register/page.tsx)
- **API:** [`POST /api/public/organization-register`](../app/api/public/organization-register/route.ts) (rate-limited).
- Creates an **`Organization`** with **`tenantStatus: pending`**.
- Shared validation/provisioning entry: [`createPendingOrganization`](../lib/organization-intake.ts) (also used by the master console **`POST /api/master/organizations`**).

### Public tuition checkout (no admin session)

- **`POST /api/public/checkout/student`** — active org only; body includes **`organizationSlug`**. Returns **`checkoutToken`** and sets HttpOnly cookie **`odelhub_checkout`**.
- **`POST /api/public/checkout/session`** — resume pay links with `?studentId=`; verifies email when the student record has one.
- **`GET /api/public/checkout/balance`**, **`POST /api/public/checkout/payment`**, cancel routes — require checkout session (cookie or **`x-checkout-token`**) or student portal JWT.
- **PayWizard** ([`PayWizard.tsx`](../app/pay/PayWizard.tsx)) stores the token in **`sessionStorage`** and sends it on checkout API calls.

### Org-scoped catalog and quotes

- **`GET /api/programmes?orgSlug=`** — programmes for one **active** tenant (omit query for **`default`** org fallback).
- **`GET /api/programmes/[code]/quote?year=&semester=&orgSlug=`** — quote + **`destinationWallet`** for that org.
- FX: **`getActiveUgxPerTonForOrganization`** ([`lib/fx.ts`](../lib/fx.ts)).
- Payments: **`create-payment`** uses org FX and **`organization.destinationWallet`** (fallback to env default wallet).

### Pay URLs

- **`/pay`** → redirects to **`/pay/default`**.
- **`/pay/[orgSlug]`** — tuition flow for one **active** org (404 if slug inactive/unknown).

### Middleware and public admin routes

- [`middleware.ts`](../middleware.ts) allows **`/admin/login`**, **`/admin/register`**, **`/admin/reset-password`** without tuition JWT. **`/school/login`** rewrites to school admin login. **`/admin/notifications`** and other URA game admin pages require a valid **`admin_session`** cookie (see [SECURITY_HARDENING.md](../operations/SECURITY_HARDENING.md)).
- **`/student/*`** requires **`odelhub_student`** cookie except **`/student/login`**.

### Admin layout bypass

- [`app/admin/layout.tsx`](../app/admin/layout.tsx): unauthenticated shells for login, reset password, register, notifications.

### School (tenant) admin shell

- Tuition sidebar shows tenant name from **`GET /api/auth/me`** (**`organization`** on org admins).
- **School dashboard:** **`/admin`** — title “School dashboard” in tuition hub.

### Student portal

- **Login:** **`/student/login`** → **`POST /api/auth/student-login`** (**email + password + organizationSlug**).
- **Session:** JWT cookie **`odelhub_student`** ([`lib/student-auth.ts`](../lib/student-auth.ts)).
- **Dashboard:** **`/student`** → **`GET /api/student/me`** (profile + payments + link to **`/pay/{organizationSlug}`**).
- **Logout:** **`POST /api/auth/student-logout`**.
- Portal password is set by org admin:** **`PATCH /api/students/[id]/portal-password`**.

---

## 2. How multi-tenants self-register

1. Institution opens **`/admin/register`** (Workspace link in the app shell/footer).
2. Submits **name**, **slug**, **contact email**, optional notes → **`POST /api/public/organization-register`** creates **`pending`** tenant.
3. A **master** user reviews **`/admin/master/organizations`**, **approve** or **reject**.
4. **Approve** sets tenant **active** and clones programmes + FX from the **`default`** template (existing provision behaviour).

Until **active**, **`/pay/{slug}`** is not served for that slug and public checkout rejects it.

---

## 3. Flow vs dashboard routing

| Area | Flow (journey) | Dashboard / home |
|------|----------------|-------------------|
| **Multi-tenant** | Request workspace **`/admin/register`** → pending → master approves **`/admin/master/organizations`** | N/A |
| **Multi-tenant (school)** | Org admin stays inside one tenant | **`/admin`** — School dashboard (tuition hub) |
| **Students (pay)** | TON pay flow **`/pay/{orgSlug}`** (e.g. **`/pay/default`**) | N/A |
| **Students (portal)** | Sign in **`/student/login`** | **`/student`** |
| **Master console** | Tenant lifecycle + org admins | **`/admin/master`** (overview) |
| **Master organizations** | Create/approve tenants, create org admins | **`/admin/master/organizations`** |

---

## 4. Prisma (local setup)

Generate the client (no DB required):

```bash
npx prisma generate
```

Push schema to MongoDB (**requires `DATABASE_URL` or `MONGODB_URI` in `.env` / `.env.local`**):

```bash
npx prisma db push
```

The repo also exposes **`npm run db:push`**, which runs [`scripts/db-push.cjs`](../scripts/db-push.cjs) (loads `.env.local` then `.env` via [`scripts/load-env.cjs`](../scripts/load-env.cjs)).

If `npx prisma db push` reports **`Environment variable not found: DATABASE_URL`**, configure env first.

If Atlas returns **TLS “InternalError”** or **`ReplicaSetNoPrimary`**, the cluster is unreachable from this machine (network, IP allow-list, or cluster state)—fix Atlas connectivity and re-run **`db push`**.

Schema changes apply new or adjusted models (for example **`AdminPasswordResetToken`**, **`Organization`** ↔ **`AdminPasswordResetToken`**).

---

## 5. Operational notes

- Configure each org’s **`destinationWallet`** (and FX) so quotes and settlements match treasury.
- **`default`** slug is the bootstrap tenant; **`/pay/default`** suits single-school deployments until more tenants are approved.
- **Resend + `NEXT_PUBLIC_APP_URL`** are required in production for admin “Forgot password” emails ([`docs` env hints](../.env.example)).
