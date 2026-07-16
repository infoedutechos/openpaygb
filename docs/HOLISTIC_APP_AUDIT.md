# Holistic app audit (deep scan)

**Date:** 2026-07-16 · **App:** ODEL HUB Pay (Next.js 15 + Prisma/MongoDB + merged URA game surface) · **Backlog:** [BACKLOG.md](./BACKLOG.md) · **Deep scan detail:** [DEEP_SCAN_2026-07-16.md](./DEEP_SCAN_2026-07-16.md)

---

## Executive summary

| Area | Grade | Notes |
|------|-------|-------|
| Tuition product (pay + admin) | **Production-capable** | Needs `RESEND_*`/`BREVO_*`, `JWT_SECRET`, `DATABASE_URL`, PSP keys for live rails |
| School workspace onboarding | **Complete** | Register → email verify → `/school/workspace-status` → master approve → `/school/login` |
| School ERP (12 modules) | **Production** | Session, accounts, bills, allocation, reports, inventory valuation |
| Programme customization (org admin) | **Complete** | CRUD + fees + CSV at `/admin/programmes` (also in school ERP nav) |
| UI vs codebase | **Aligned** | Regenerated inventories after OPGB ops + this scan |
| OPGB / Dex Hub | **Phase 4 + ops desk** | Custodial ledger/AMM/P2P; master `/admin/master/opgb-ops`; Phase 5 live send/on-chain open |
| LivePay | **UG integrated** | Non-UG stubbed; Mbiyo covers multi-country collect when configured |
| Telegram / TMA | **Production** | Multi-org student link + schools browse; bot + cron reminders |
| Mongo sync | **Production** | Single Prisma singleton; hot indexes added 2026-07-16 |
| Deployment | **Live** | https://odelpay.vercel.app — crons match docs |

---

## 1. App architecture

- **Tenants:** `Organization` with `tenantStatus` pending | active | rejected; `institutionTier` university | school
- **Auth:** Tuition JWT (`odelhub_admin`) + legacy URA `admin_session` + student JWT + TMA session cookies
- **APIs / UI:** See `docs/API_INVENTORY.csv` and `docs/UI_ROUTES.csv` (regenerate: `npm run docs:inventory`)
- **Game/URA:** Legacy `/admin/*` game pages coexist; tuition hub is `(tuition-hub)` group

---

## 2. School workspace approval (two modes)

| Mode | Master setting | Flow |
|------|----------------|------|
| **Email verify + master approval** (default) | `schoolWorkspaceRequireMasterApproval: true` | Register → email → `/school/workspace-status?verified=1` → master approves → org admin → `/school/login` |
| **Email verify + auto-activate** | `requireMasterApproval: false` | Verify may activate immediately → `/school/workspace-status?activated=1` |

Master toggle: `components/admin/MasterSchoolWorkspaceRegistrationSettings.tsx`  
Policy API: `GET/PATCH /api/master/school-workspace-registration`

---

## 3. School admin login (after master approval)

1. Master activates org and creates **org admin** (`POST /api/master/admins`) — or auto-provision when enabled
2. School opens **`/school/login`**
3. **`POST /api/auth/login`** → cookie → school ERP sidebar (dashboard, session, programmes, students/bills, …)

**Docs:** [SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md), [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md), [LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)

---

## 4. Programme customization (school admins)

| Feature | Status |
|---------|--------|
| Create/edit/delete programmes | Yes |
| Fee lines (tuition + functional, recurrence) | Yes |
| Duration years / semesters per year | Yes |
| CSV import | Yes |
| Visible in school ERP nav | Yes (2026-07-16) |
| TON wallet, FX, platform fee | Master only |

---

## 5. UI/UX vs codebase

### Aligned

- Pay flow → public checkout APIs
- School ERP pages ↔ `/api/admin/school/*`
- Master OPGB ops ↔ dispute + withdraw APIs
- Site header / mobile drawer / Hubs menu ↔ Dex routes

### Fixed this scan (2026-07-16)

- School ERP sidebar: Profile, Fee programmes, Payment requests, Users
- Dex honesty: onramp / convert / sell / offramp copy
- Play Hub: removed dead Action Center tiles without routes
- Deleted unused `StudentDashboardShell`
- Inventories regenerated

### Remaining UX debt

- ~23 Play/URA admin pages reachable by URL, not tuition sidebar (dual-auth surface)
- Master may still show stacked org pickers on some university pages (workspace bar is canonical)

---

## 6. Gaps, bugs, robustness

See **[DEEP_SCAN_2026-07-16.md](./DEEP_SCAN_2026-07-16.md)** §4 and **[BACKLOG.md](./BACKLOG.md)**.

**Shipped ops:** master dispute resolve, withdraw queue (no fake auto-complete), production P2P demo-offer gate, LivePay UG-only API gate, Mongo hot indexes, cron schedule truth.

**External:** card acquiring, LivePay multi-country product, on-chain delivery, live PSP send-money.

---

## 7. Deployment readiness

| Item | Status |
|------|--------|
| Production | **READY** — https://odelpay.vercel.app |
| Crons | confirm-ton */5 · expire hourly · dex-settle */15 · telegram Mon 09:00 |
| Checklist | [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md), [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md) |
| Ops paste | `B-OPS-03` PSP webhook secrets into provider dashboards |

---

## 8. MongoDB + Telegram (pointers)

- Mongo deep notes: [DEEP_SCAN_2026-07-16.md](./DEEP_SCAN_2026-07-16.md) §6
- Telegram / TMA: [TELEGRAM_MINI_APP.md](./TELEGRAM_MINI_APP.md) + scan §8
