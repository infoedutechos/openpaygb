# Ads platform — phased build plan

**Status:** Phases 1–5 foundation shipped (MAC + role dashboards + OPGB debit + targeting + cron + AdSlot).  
**Surfaces:** Website dashboards + Telegram (bot / channel / mini-app placements).  
**Billing:** OpenPayGB `ad_spend` ledger debit when `billingStudentId` is set.

---

## Vision

A seamless, multi-dimensional, robust, autonomous ads system used by **all user categories** to advertise from:

1. Their **website account dashboard**
2. **Telegram** (bot DMs, announcement channel, Mini App)

MAC owns inventory, approval policy, fees, and platform analytics.

---

## Phase 1 — Foundation ✅

| Deliverable | Location |
|-------------|----------|
| Schema + placements + creatives + campaigns | `prisma/schema.prisma` |
| MAC console | `components/admin/MasterAdsConsole.tsx` · `#ads-console` |
| Master APIs | `app/api/master/ads/` |
| Public serve | `app/api/public/ads/serve/` |
| Telegram on activate | `lib/notification-telegram.ts` |

---

## Phase 2 — Role dashboards ✅

| Category | Entry | API |
|----------|-------|-----|
| School / org | `/admin/school-advertise` | `GET/POST /api/admin/ads` |
| Student | `/my/advertise` | `GET/POST /api/student/ads` (live OPGB billing) |
| Staff | `/staff/advertise` | `GET/POST /api/staff/ads` |
| Partner | `POST /api/partner/v1/ads` (`ads:read` / `ads:write`) + `/developers/advertise` | Partner API |
| Master | MAC Ads console | `/api/master/ads` |

Shared UI: `components/ads/AdvertisePanel.tsx` (includes targeting fields).

---

## Phase 3 — OpenPayGB billing ✅

- `OpgbLedgerKind` includes `ad_spend`
- `recordAdSpend` debits wallet when `billingStudentId` + `organizationId` set
- Student campaigns set `billingStudentId` automatically
- Platform fee bps on `AdPlatformSettings`

---

## Phase 4 — Targeting + scheduling ✅

- Targeting JSON: hubs, roles, orgIds, geo, telegramOnly / webOnly
- AdvertisePanel + MAC create form
- `campaignMatchesTargeting` on public serve
- Schedule end + budget/daily cap via cron

---

## Phase 5 — Delivery + analytics ✅

- `AdSlot` on tuition, schools, student, staff shells
- Cron `/api/cron/ads-auto-pause` every 30m (`vercel.json`)
- Impression/click via public serve POST
- MAC analytics roll-up

---

## Related school ERP

- **Set Terms** is customisable like Session: New / Edit / Activate / Delete — `/admin/school-terms`
- Model: `SchoolTerm` · API: `/api/admin/school/terms`
- Context bar uses custom term labels

---

## Related

- Notifications: `MasterPlatformCommunicationsSettings`
- Plan history: this file
