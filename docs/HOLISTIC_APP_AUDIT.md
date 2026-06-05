# Holistic app audit (deep scan)

**Date:** 2026-06-04 · **App:** ODEL HUB Pay (Next.js 15 + Prisma/MongoDB + merged URA game surface) · **Backlog:** [BACKLOG.md](./BACKLOG.md)

---

## Executive summary

| Area | Grade | Notes |
|------|-------|-------|
| Tuition product (pay + admin) | **Production-capable** | Needs `RESEND_*`, `JWT_SECRET`, `DATABASE_URL`, Mbiyo keys for live UGX alternative |
| School workspace onboarding | **Complete** | Register → email verify → master approve → org admin → `/school/login` |
| Programme customization (org admin) | **Complete** | CRUD + fees + CSV import at `/admin/programmes` |
| UI vs codebase | **Mostly aligned** | 59 routes match inventory; minor doc/UX gaps fixed this pass |
| LivePay | **Integrated** (env opt-in) | Checkout + webhook + status poll — [LIVEPAY_INTEGRATION_ASSESSMENT.md](./LIVEPAY_INTEGRATION_ASSESSMENT.md) |
| Deployment | **Ready with checklist** | `npm run verify`, `PRODUCTION_GO_LIVE.md` |

---

## 1. App architecture

- **Tenants:** `Organization` with `tenantStatus` pending | active | rejected
- **Auth:** Tuition JWT (`odelhub_admin`) + legacy URA `admin_session` + student JWT
- **APIs:** ~230 routes — inventory in `docs/API_INVENTORY.csv`
- **UI:** 59 `page.tsx` files — inventory in `docs/UI_ROUTES.csv`
- **Game/URA:** Legacy `/admin/*` game pages coexist; tuition hub is `(tuition-hub)` group

---

## 2. School workspace approval (two modes)

| Mode | Master setting | Flow |
|------|----------------|------|
| **Email verify + master approval** (default) | `schoolWorkspaceRequireMasterApproval: true` | Register → ODEL HUB email (details + timestamp) → click link → `/school/login` → master approves → master creates org admin |
| **Email verify + auto-activate** | `requireMasterApproval: false` | Same email → verify may activate tenant immediately → master still creates org admin credentials |

Master toggle: `components/admin/MasterSchoolWorkspaceRegistrationSettings.tsx`  
Policy API: `GET/PATCH /api/master/school-workspace-registration`

---

## 3. School admin login (after master approval)

1. Master sets org **active** and creates **org admin** (`POST /api/master/admins`) on `/admin/master/organizations`
2. School opens **`/school/login`** (→ `/admin/login?school=1`)
3. **`POST /api/auth/login`** → cookie `odelhub_admin` → **`/admin`** dashboard
4. Programmes: **`/admin/programmes`** — full CRUD for own tenant

**Not automatic:** self-register does not create `AdminUser`.  
**Docs:** [SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md), [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)

---

## 4. Programme customization (school admins)

| Feature | Status |
|---------|--------|
| Create/edit/delete programmes | Yes |
| Fee lines (tuition + functional, recurrence) | Yes |
| Duration years / semesters per year | Yes |
| CSV import | Yes |
| Track (regular / in-service) | Yes |
| TON wallet, FX, platform fee | Master only |
| Pending/rejected tenant edit | Blocked (403) |

See [SCHOOL_ADMIN_PROGRAMMES.md](./SCHOOL_ADMIN_PROGRAMMES.md).

---

## 5. UI/UX vs codebase

### Aligned

- Pay flow → public checkout APIs
- Register → verify → school login banners
- Tuition admin shell nav matches hub pages

### Fixed this pass

- Payments page honors `?status=pending` and `?highlight=<id>` from dashboard
- Logout / gate redirects use `/school/login`
- Org admin settings no longer link to inaccessible master org screen
- Verification email expanded with ODEL HUB platform details

### Remaining backlog

See **[BACKLOG.md](./BACKLOG.md)** for the full prioritized list. Highlights:

| Item | Priority |
|------|----------|
| `AdminGlobalSearch` + missing `/api/admin/search`; docs reference missing `AdminWorkspaceBar` | Medium |
| Master `?orgSlug=` only on dashboard; reports not tenant-scoped | Medium |
| Student portal: no LivePay; branding copy drift | Medium |
| Invite email sends plaintext password | Medium |
| Consolidate master org mobile/desktop cards | Low |

### Implemented (2026-06-04)

| Item | Detail |
|------|--------|
| Org admin invite email | `POST /api/master/admins` → Resend with `/school/login` credentials |
| Master `?orgSlug=` dashboard | `GET /api/admin/summary?organizationSlug=` + UI banner |
| Re-open rejected tenants | `PATCH` `{ action: "reopen" }` on master organizations |
| LivePay Uganda | `livepay-start`, webhook, PayWizard when `LIVEPAY_*` set |

---

## 6. Gaps, bugs, robustness

| Category | Status |
|----------|--------|
| API error handling (tuition) | `lib/api-error.ts` on major routes |
| Receipt access | HMAC `?t=` + rate limits |
| Middleware Edge | `lib/admin-session-edge.ts` (no Node crypto) |
| Webhook amount verify | MoMo/Mbiyo |
| Rate limits | Register, verify, auth, receipts |
| Legacy `/api/collect/*` | Deprecated; checkout preferred |

**CI:** `npm run verify` — lint, vitest, tsc, prisma validate.

---

## 7. Deployment readiness

| Check | Command / doc |
|-------|----------------|
| Env completeness | `PRODUCTION_GO_LIVE.md`, `.env.example` |
| Schema | `npm run db:push` |
| Template org `default` | Required for approve clone |
| Email | `RESEND_API_KEY`, `RESEND_FROM`, `NEXT_PUBLIC_APP_URL` |
| Build | `npm run build` |
| Smoke | Health, `/school/login`, test payin |

---

## 8. LivePay & virtual cards

- **MoMo collect:** implemented — [LIVEPAY_INTEGRATION_ASSESSMENT.md](./LIVEPAY_INTEGRATION_ASSESSMENT.md)
- **Virtual card (Visa/MC issuing or checkout acquiring):** not implemented — holistic options in [VIRTUAL_CARD_INVESTIGATION.md](./VIRTUAL_CARD_INVESTIGATION.md)

---

## 9. App synchronization

| Artifact | Regenerate |
|----------|------------|
| API inventory | `npm run docs:inventory` |
| UI routes / UI_VS_CODEBASE | Same script |
| Prisma client | `npm run db:generate` after schema change |

**Docs updated:** `APP_STATUS_AUDIT.md`, this file, LivePay assessment, school login flow.

---

## Key commands

```bash
npm run dev:clean      # clean .next + dev (Turbopack)
npm run verify         # full CI gate
npm run docs:inventory # sync route/API CSVs
npm run seed           # demo tenant + admins
npm run admin:ensure   # sync admin password from env
```
