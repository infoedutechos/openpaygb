# User Guide: Platform Master Admin

## Who this guide is for

This guide is for platform operators with `master` role access. You manage all school workspaces, payment rails, platform settings, and operational safety controls from the Master Console.

Primary entry:

- Login: `/admin/login?master=1` (or `/admin/login` and choose "Platform master")
- Console home: `/admin/master`

## Master sidebar map

The master shell navigation is defined in `components/admin/MasterManagerShell.tsx`.

| Sidebar item | Route / anchor | What you use it for |
|---|---|---|
| Overview | `/admin/master` | Platform totals, quick links, pending setup warnings |
| Organizations | `/admin/master/organizations` | Tenant lifecycle, favicons, school-level fee policies |
| Programmes | `/admin/master/programmes` | Duration/semester governance across schools |
| Tuition balance | `/admin/master/tuition-balance` | Cross-tenant outstanding and progress view |
| Virtual cards | `/admin/master#openpay-cards-overview` | OpenPayGB card settings and card fleet visibility |
| Chat & notifications | `/admin/master#platform-communications` | In-app comms and support experience |
| Knowledge base | `/admin/master#knowledge-base` | KB articles and copilot content management |
| Hub visibility (hide) | `/admin/master#hub-visibility` | Hide Tuition / Play / Dex / Developers from public UI |
| Hub maintenance | `/admin/master#hub-maintenance` | Maintenance screens per hub |
| Visitor analytics | `/admin/master#visitor-analytics` | Ecosystem totals + per-page visitors and actions |
| Social & share | `/admin/master#platform-social` | Platform social links/icons and share defaults |
| Backup | `/admin/master#system-backup` | Tuition backup export and recovery tooling |
| Environment | `/admin/master#deployment-environment` | Deployment env audit, overrides, sync |
| Mobile money | `/admin/master#mobile-money-providers` | Provider templates, webhook auth mapping |
| Partner API | `/admin/master#partner-integrations` | API keys, outbound webhook destinations |
| Documentation | `/docs` | Documentation library |

## Login and session basics

1. Open `/admin/login?master=1`.
2. Enter master email/password.
3. If successful, you are redirected to `/admin/master` (or validated `next` path).
4. Use the sidebar to move between governance sections.
5. Use "Change password" in operations links when rotating credentials.

If you accidentally use school mode, switch via the login mode tabs on `/admin/login`.

## Day-1 setup checklist

1. Open `/admin/master` and verify summary metrics load.
2. Check `Pending approval` and process organization requests.
3. Open Organizations and verify every active school has:
   - destination wallet
   - required branding/favicon
   - platform fee policy
4. Open Programmes and resolve any "duration setup pending" items.
5. Open Environment and ensure required variables are present.
6. Validate webhook readiness for enabled rails (LivePay, Mbiyo, Relworx, VixonPay).
7. Run backup export from Backup section.

## Major tasks (step-by-step)

## 1) Approve or reject school workspaces

1. Open `/admin/master/organizations`.
2. Filter pending entries and inspect registration details.
3. Confirm registration email verification status.
4. Approve (`tenantStatus = active`) or reject.
5. After approve, create org admin account if not yet created.
6. Confirm school can sign in through `/school/login`.

Related APIs:

- `GET/POST /api/master/organizations`
- `PATCH /api/master/organizations/[id]`
- `POST /api/master/admins`

## 2) Manage organizations and school-level policies

1. In Organizations, open a specific school row.
2. Update destination wallet when treasury account changes.
3. Configure processing fee mode (inherit, fixed UGX, percent).
4. Optionally set org-level FX overrides for TON pricing.
5. Upload or replace school favicon for branded public pages.

Useful endpoints:

- `/api/master/organizations/[id]/destination-wallet`
- `/api/master/organizations/[id]/checkout-platform-fee`
- `/api/master/organizations/[id]/fx`
- `/api/master/organizations/[id]/favicon`

## 3) Govern programmes across tenants

1. Open `/admin/master/programmes`.
2. Focus on programmes without explicit duration/semester settings.
3. Apply or patch durations so tuition progress can be accurately computed.
4. Recheck tuition balance views for corrected progress display.

## 4) Use tuition balance oversight

1. Open `/admin/master/tuition-balance`.
2. Optionally filter by school slug.
3. Search by student name, email, or programme.
4. Expand a row to inspect detailed installment and context-level balance.
5. Open student record for targeted remediation.

Data source:

- `GET /api/admin/tuition-balances` (master mode supports `organizationSlug` filter)

## 5) Configure OpenPayGB virtual card platform behavior

1. Open `/admin/master` and scroll to virtual card settings.
2. Toggle card enable/disable for platform.
3. Set issue fee in TON.
4. Review active cards and aggregate card balances in the overview section.
5. Validate student card UX at `/student/card`.

## 6) Manage mobile money providers

1. Open mobile money section in `/admin/master`.
2. Create provider definitions or update existing mappings.
3. Set webhook auth type and secret/header configuration.
4. Verify callback URL targets:
   - generic: `/api/webhooks/provider/[code]`
   - dedicated: `/api/webhooks/livepay`, `/api/webhooks/mbiyo`, `/api/webhooks/relworx`, `/api/webhooks/vixonpay`
5. Test a small transaction and confirm status transitions.

## 7) Manage Partner API integration

1. Open partner integration section.
2. Create API keys with least-privilege scopes.
3. Save plaintext secret immediately (shown once).
4. Register outbound webhook endpoints with signing secret.
5. Validate partner receives `payment.confirmed`.

Partner endpoints:

- `/api/partner/v1/payments`
- `/api/partner/v1/payments/[id]`
- `/api/partner/v1/organizations`

## 8) Environment management and secret hygiene

1. Open deployment environment section (`/admin/master#deployment-environment`).
2. Review missing required values and sensitive status.
3. Update encrypted overrides only when needed.
4. Optionally trigger sync/auto tasks for registry and Vercel mirror.
5. Revalidate health endpoints and payment rails after changes.

Key API:

- `GET/PATCH /api/master/deployment-env`

## 9) Run backup and recovery drills

1. Open backup section.
2. Export a fresh JSON backup (`GET /api/master/backup`).
3. Store backup in secure, versioned offline location.
4. Periodically verify restore path in a non-production environment.

Restore-related:

- `POST /api/master/backup/restore`
- `GET /api/master/backup/status`

## 10) Visitor analytics

1. Open **Visitors** (`/admin/master#visitor-analytics`).
2. Review **today** and **all-time** unique visitors + page views.
3. Inspect **last 30 days**, **countries today**, **countries (all time)**, and **top locations** (city/region when the edge provides them).
4. Optionally toggle **Show visitor counts on the home page**.

**Privacy:** raw IP addresses are **never stored**. Analytics keep a SHA-256 of the anonymous visitor cookie, country code, optional city/region from the CDN edge, and aggregate counts. Rate-limit keys are also hashed.

API:

- `GET /api/master/visitor-stats`
- `PATCH /api/master/visitor-stats` `{ "showPublicVisitorStats": true|false }`
- Public: `POST /api/public/visit`, `GET /api/public/visit-stats`

## 11) Download project artifacts (organised catalogue)

1. Open **Docs & downloads** (`/admin/master#project-download`).
2. Use the **categorised catalogue**:
   - **Whole project** — full ZIP (data + demo logins + env + docs + source)
   - **Documentation & guides** — project description, user guides, full docs library
   - **Live platform data** — tuition and scoped JSON exports
   - **Access & credentials** — master admins, demo Schools/Universities logins, environment
   - **Source code** — repository archive
3. Download an entire category ZIP or individual parts.
4. Archive securely (env and demo sheets contain secrets).

API:

- `GET /api/master/project-download?part=...` — parts include `full`, `documentation`, `demo-logins`, `cat-documentation`, `cat-data`, `cat-credentials`, …
- `GET /api/master/project-download?catalogue=1` — JSON catalogue metadata

## Master operations playbook

| Situation | Immediate action |
|---|---|
| New school requests spiking | Review pending schools, verify email status, bulk approve/reject with notes |
| Checkout failures after deploy | Validate Environment section and `NEXT_PUBLIC_APP_URL` |
| Webhook confirmations delayed | Verify provider secrets and callback URLs in Mobile money |
| Balance/progress looks wrong | Check programme duration setup and fee row completeness |
| Partner cannot fetch payments | Verify key scope/enabled state and organization scoping |
| Suspected secret drift | Reconcile env overrides vs deployment source of truth |

## Troubleshooting

| Symptom | Probable cause | Fix |
|---|---|---|
| Cannot access `/admin/master` | Logged in as `org_admin` | Sign out and use master mode login |
| School stuck pending | Verification email not confirmed | Use resend flow and re-open verify link |
| Webhooks returning unauthorized | Secret/header mismatch | Update provider secret and signature settings |
| OpenPayGB card disabled for students | Platform setting off | Enable in master virtual card settings |
| Backup endpoint fails | DB or permissions issue | Confirm master session and DB connectivity |
| Environment page shows missing critical vars | Incomplete deploy config | Fill required vars and redeploy/sync |

## Security and governance reminders

- Keep API key and webhook secret rotation cadence documented.
- Use least-privilege scopes for partner keys.
- Run periodic backup exports and restore tests.
- Keep master account count minimal and audited.
- Monitor rate limits and webhook volume anomalies.

## Useful quick links

- Master console: `/admin/master`
- Organizations: `/admin/master/organizations`
- Programmes: `/admin/master/programmes`
- Tuition balance: `/admin/master/tuition-balance`
- School login shortcut (for testing): `/school/login`
- Public checkout picker: `/pay`
