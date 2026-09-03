# School admin login and dashboard access

This document explains how **school staff** (org admins) sign in to the **School Admin Dashboard**, how that differs from the **platform master** console, and what was implemented in the product UI to make the flow discoverable.

**Related docs:**

- [LOCAL_DEV_AND_CREDENTIALS.md](../platform/LOCAL_DEV_AND_CREDENTIALS.md) — seed URLs, guest pay, demo logins  
- [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) — pending workspace → email verify → approval → org admin creation  
- [SCHOOL_ADMIN_PROGRAMMES.md](./SCHOOL_ADMIN_PROGRAMMES.md) — programme/fee customization for org admins  
- [ADMIN_FLOW.md](../flows/ADMIN_FLOW.md) — org admin dashboard routes and APIs after sign-in  
- [MASTER_ADMIN_FLOW.md](../flows/MASTER_ADMIN_FLOW.md) — platform master console  
- [APP_STATUS_AUDIT.md](../product/APP_STATUS_AUDIT.md) — holistic scan and deployment checklist  

---

## 1. Quick reference: URLs

| Purpose | URL | Notes |
|--------|-----|--------|
| **School admin sign-in** | `/school/login` | Friendly URL; rewrites to `/admin/login?school=1` |
| School admin sign-in (query) | `/admin/login?school=1` | Same form as `/school/login` |
| **Platform master sign-in** | `/admin/login?master=1` | Separate tab/copy on login page |
| Generic admin sign-in | `/admin/login` | Defaults to school-focused copy |
| **School dashboard** (after login) | `/admin` | Tuition Hub: students, payments, programmes, reports |
| School dashboard alias | `/school-admin` | Rewrites to `/admin` (`next.config.ts`) |
| **Master console** (after login) | `/admin/master` | All tenants, approvals, FX, integrations |
| Request a workspace (no login yet) | `/admin/register` | Creates **pending** org only — no admin account |

**Authentication API:** `POST /api/auth/login` with `{ email, password, rememberMe? }` — not the legacy `POST /api/admin/login` (env `ADMIN_PASSWORD` shell).

**Code constants:** `lib/admin-auth-entry.ts` — `SCHOOL_ADMIN_LOGIN_PATH`, `PLATFORM_MASTER_LOGIN_PATH`, login mode helpers and UI copy.

---

## 2. Roles

| Role | `AdminUser.role` | Dashboard after login | Scope |
|------|------------------|----------------------|--------|
| **School admin** | `org_admin` | `/admin` | One `organizationId` only |
| **Platform master** | `master` | `/admin/master` | All organizations |

Org admins **cannot** open `/admin/master`. Masters can open `/admin` (tuition hub) when needed.

Redirect logic: `lib/admin-dashboard.ts` → `adminDashboardHref()`, and `app/admin/login/page.tsx` → `safeNextParam()`.

---

## 3. End-to-end lifecycle (school)

```mermaid
flowchart TD
  A[School submits /admin/register] --> B[ODEL HUB verification email]
  B --> C[Applicant clicks link]
  C --> D["/school/workspace-status?slug=…&verified=1"]
  D --> E{Master approval required?}
  E -->|Yes default| F[Master approves tenant]
  E -->|Auto mode| G[Workspace may activate on verify]
  F --> H[Organization: active]
  G --> H
  H --> I[Master: Create org admin]
  I --> J[Share email + password with school]
  J --> K[School: /school/login]
  K --> L[POST /api/auth/login]
  L --> M[/admin School Admin Dashboard]
```

### Step 1 — Request workspace (self-service)

1. Open **`/admin/register`**.
2. Submit school name, URL slug, **contact email** (required), and optional notes.
3. API: **`POST /api/public/organization-register`** → org with `tenantStatus: pending` and an ODEL HUB **verification email** (registration details + submitted time).
4. Applicant clicks the link → **`GET /api/public/organization-register/verify`** → redirect **`/school/workspace-status?slug=…&verified=1`** (or `activated=1` when auto-activate is on).

**Important:** This step does **not** create a dashboard login account. After email confirmation, a platform master still must **approve** the workspace and **create org admin** credentials.

**Expired link:** use **Resend verification email** on `/admin/register` (same contact email).

### Step 2 — Master approves

1. Master signs in at **`/admin/login?master=1`**.
2. Go to **`/admin/master/organizations`**.
3. Approve the tenant → `tenantStatus: active`.
4. Programmes/FX may be cloned from slug `default` (see [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)).

### Step 3 — Master creates school admin

1. Same page: section **“Create org admin”**.
2. Select an **active** organization, set display name (optional), **email**, **password** (min 10 characters).
3. API: **`POST /api/master/admins`** with `{ email, password, name?, organizationId }`.
4. Returns **400** if the organization is not **active**.

Master should **share the email and password** with the school (no automatic invite email in the default flow).

Success message in UI: *“School admin created (…). Share that email and password with the school — they sign in at /school/login.”*

### Step 4 — School admin signs in

1. Open **`/school/login`** (or **`/admin/login?school=1`**).
2. Enter the email and password from the platform operator.
3. On success → redirected to **`/admin`** (unless `?next=` points to another allowed `/admin` path).

**Not the same as:**

- **Student login** — `/student/login` (payer portal).
- **Legacy shell login** — `POST /api/admin/login` + `ADMIN_PASSWORD` (Play/admin shell cookie), if still used elsewhere.

---

## 4. Login page UX (implemented)

**File:** `app/admin/login/page.tsx`  
**Shared config:** `lib/admin-auth-entry.ts`

### School vs master tabs

The login page has tabs:

- **School admin** — cyan styling, school-focused title and hint.
- **Platform master** — amber styling, master console copy.

Selecting a tab updates the URL via `router.replace(adminLoginPathForMode(...))`.

### Copy by mode

| Mode | Title | Subtitle (summary) |
|------|--------|-------------------|
| School | School Admin Dashboard | Use email/password from your institution (ODEL HUB). |
| Master | Platform Master Console | Platform operator credentials. |
| Default | Admin sign in | Both roles use this page; defaults to school copy. |

Cross-links at the bottom of the form: “Platform operator? Master console sign in” / “School staff? School admin sign in”.

### Registration CTA on login

`RequestSchoolWorkspaceCta` (inline on login) links to **`/admin/register`** and states that **login details come after platform approval**, not from the registration form.

---

## 5. Where users find sign-in links (implemented)

| Location | Link / label |
|----------|----------------|
| Marketing home (`app/page.tsx`) | **School admin sign in** → `/school/login`; **Platform master →** → `/admin/login?master=1` |
| Site footer (`components/SiteFooter.tsx`) | **School admin** → `/school/login`; **Master console** → `/admin/login?master=1` |
| Tuition hub bottom nav (`components/hub/TuitionHubBottomNav.tsx`) | **School admin** → `/school/login` |
| Login page footer area | Request school workspace → `/admin/register` |
| Register page (`app/admin/register/page.tsx`) | 4-step checklist + **School admin sign in** → `/school/login` |
| Ecosystem hub registry (`lib/ecosystem/hubs.ts`) | Tuition `routes.admin` → `/school/login` |
| `RequestSchoolWorkspaceCta` card/inline | Explains `/school/login` after approval |

**Page title bar:** `components/SiteTitleBar.tsx` — `/school/login` and `/admin/login` show “School admin sign in”.

---

## 6. School dashboard (`/admin`) — what they get

After `org_admin` login, the **Tuition Hub** shell (`components/admin/TuitionAdminShell.tsx`) provides:

| Area | Route |
|------|--------|
| Overview | `/admin` |
| Profile (name, photo, password) | `/admin/profile` |
| Tuition balance | `/admin/tuition-balance` |
| Students | `/admin/students`, `/admin/students/[id]` |
| Payments | `/admin/payments` |
| Payment requests | `/admin/payment-requests` |
| Virtual cards | `/admin/virtual-cards` |
| Programmes | `/admin/programmes` |
| Receipts | `/admin/receipts` |
| Reports | `/admin/reports` |
| Users | `/admin/users` |
| Settings (org config) | `/admin/settings` |

Public pay for their school: **`/pay/<orgSlug>`** (only when tenant is **active**).

Full API and scope rules: [ADMIN_FLOW.md](../flows/ADMIN_FLOW.md).

---

## 7. Platform branding vs per-platform social icons (Master console)

On **`/admin/master#platform-social`** (Social, share & home screen):

| Feature | Purpose |
|---------|---------|
| **Site-wide logo** | One image for favicon, PWA, link previews (`/api/platform/logo`) |
| **Per-platform icons** | Optional upload per row (WhatsApp, Telegram, etc.) for footer/support (`/api/public/social-icon/{key}`) |
| **Community links table** | URL + On / Footer / Support toggles |

If no per-platform icon is uploaded, the footer shows **text badges** (WA, TG, …) via `components/SocialLinksRow.tsx`.

**Prisma field:** `SiteUiSettings.socialLinkIcons` (JSON). After schema changes run:

```bash
npx prisma generate
node scripts/db-push.cjs
```

Then **restart the dev server** (Turbopack caches the Prisma client). If `socialLinkIcons` is unknown at runtime, `lib/site-ui-settings.ts` falls back to a query without that field until the client is regenerated.

---

## 8. Development and demo credentials

Create or reset a dev admin (often **master** from seed):

```bash
npm run admin:ensure
# or
npm run seed
```

Use **`SEED_ADMIN_EMAIL`** and **`SEED_ADMIN_PASSWORD`** from **`.env.local`** (overrides `.env`) on **`/admin/login`** or **`/school/login`**.

To test a true **school admin**, create one under **Master → Organizations → Create org admin** for an active org, or ensure seed creates an `org_admin` tied to an organization.

---

## 9. Middleware and session

- Protected: `/admin/*` (except login, register, reset-password, notifications), `/school-admin/*`.
- Unauthenticated users redirect to **`/admin/login`** with optional `?next=` return path.
- Session: JWT in httpOnly cookie via `lib/auth.ts` (`odelhub_admin` / tuition session — see `hooks/useTuitionAdminGate.ts`, `middleware.ts`).

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| “Invalid credentials” after register | No org admin created yet | Master must approve org + **Create org admin** |
| Lands on `/admin/master` as school user | Wrong account role | Use org_admin credentials, not master |
| Org admin cannot sign in | Org still **pending** | Master approves first; create admin only on **active** org |
| `Unknown field socialLinkIcons` | Stale Prisma client | Stop dev → `npx prisma generate` → restart dev |
| `/school/login` 404 | Dev server not restarted after `next.config` rewrite | Restart `npm run dev` |
| Login works but no footer icons | No per-platform uploads | Master uploads icons in platform-social, or use default text badges |

---

## 11. Key source files

| Area | Path |
|------|------|
| Login URLs & copy | `lib/admin-auth-entry.ts` |
| Login UI | `app/admin/login/page.tsx` |
| School login redirect | `app/school/login/page.tsx`, `next.config.ts` rewrites |
| Register UI | `app/admin/register/page.tsx` |
| Register API | `app/api/public/organization-register/route.ts` |
| Create org admin API | `app/api/master/admins/route.ts` |
| Master org UI | `app/admin/master/organizations/page.tsx` |
| Auth login API | `app/api/auth/login/route.ts` |
| Dashboard redirect | `lib/admin-dashboard.ts` |
| Tuition admin shell | `components/admin/TuitionAdminShell.tsx` |
| Request workspace CTA | `components/tuition/RequestSchoolWorkspaceCta.tsx` |

---

## 12. Summary

- **One login form**, two audiences: use **`/school/login`** for schools and **`/admin/login?master=1`** for platform operators.
- **School dashboard** is **`/admin`** after `org_admin` authentication — there is no separate “school-admin app,” only aliases and clearer marketing links.
- **Accounts are provisioned by the master** after workspace approval; self-registration alone does not grant access.
