# Post-fees priority roadmap (Uwais → full SMIS)

**Purpose:** Decide what to build **after** school fees are working.  
**Anchor tenant:** Uwais Qur'an Memorisation & Junior School (`uwais`)  
**Already done (fees foundation):** tenant + spreadsheet import + student fee ledger (`/admin/fee-ledger`) + existing OdelPay Schools ERP (dashboard, bills, receipts, defaulters, staff, outflow, inventory, reports)

**Commands + login details:** see **[PLATFORM_UPDATE_2026-09.md](./PLATFORM_UPDATE_2026-09.md)** and **[LOCAL_DEV_AND_CREDENTIALS.md](./LOCAL_DEV_AND_CREDENTIALS.md)**.

### Quick start (Uwais)

```bash
npm run db:push
npm run seed:uwais
npm run dev
```

| Field | Value |
|-------|--------|
| Admin email | `uwais.admin@odelhub.local` |
| Admin password | `ChangeMe_Admin123!` (or `SEED_UWAIS_ADMIN_PASSWORD`) |
| Sign-in | http://localhost:3000/admin/login?school=1 |
| Slug / checkout | `uwais` · `/pay/uwais` |
| Fee ledger | `/admin/fee-ledger` |
| Parent portal | `/parent` (School Pay Code from seed console + admission no.) |
| Sample CSV | `data/uwais-fee-ledger-sample.csv` |

Use this as a **build order**, not a wish list. Finish each phase before starting the next unless a blocker forces a jump.

---

## Status snapshot (2026-09)

| Phase | Status |
|-------|--------|
| P0.1 Import | Live (`/admin/fee-ledger` CSV + `npm run seed:uwais`) |
| P0.2 Fee heads | Live (`/admin/fee-structure`) |
| P0.3 Discounts/waivers | Live (Fee ledger → Adjust; `discountUgx` on bill charges) |
| P0.4 Receipt PDF/share | Live (ledger row PDF + Share) |
| P0.5 Defaulters parity | Live (uses fee ledger outstanding) |
| P0.6 Go-live checklist | Live (`/admin/school-golive`) |
| P1.7 Parent portal | Live (`/parent`) |
| P1.8 Online pay | Live (`/pay/uwais`) |
| P1.9 Reminders | Partial (Telegram cron; SMS/WhatsApp TBD) |
| P1.10 Partial-pay | Live (allocation + ledger status) |
| P2 Cashbook | Live (`/admin/school-cashbook`) |
| P2 Audit | Pilot UI (`/admin/school-audit`) |
| P3 Attendance / Qur'an / Exams | Pilot UI modules |
| P4 OpenPayGB for apps | Live (`/opgb` + charges/payouts + white-label fees + `/admin/master/opgb-ops` console) |

---

## How to read this list

| Priority | Meaning |
|----------|---------|
| **P0** | Needed for daily school use of fees (replace the spreadsheet fully) |
| **P1** | Parents & collection channels (money in, less chasing) |
| **P2** | Finance office depth (cashbook / statements) |
| **P3** | Full SMIS expansion (beyond fees) |
| **P4** | Multi-school platform / scale |

---

## P0 — Finish fees (replace the spreadsheet)

| # | Item | Why next | Rough outcome |
|---|------|----------|---------------|
| 1 | **Full Uwais CSV import** of the real sheet (all students, not sample) | Live data replaces Excel | One import → ledger matches paper |
| 2 | **Fee structure UI** (Tuition, Boarding, Feeding, Uniform, Transport, Qur’an, custom) | Spreadsheet “PAYS” becomes named fee heads | Assign bills by class/term without guessing |
| 3 | **Discounts / scholarships / waivers** on ledger | School already adjusts balances by hand | Clear audit of why balance dropped |
| 4 | **Receipt PDF + share** (WhatsApp/SMS/email link) from fee ledger pay | Parents need proof | One click after cash/MoMo |
| 5 | **Defaulters ↔ fee ledger parity** | Same formula as spreadsheet | No two “truths” for outstanding |
| 6 | **Uwais go-live checklist** (admin login, School Pay Code, term active, letterhead) | Production readiness | School can stop using the sheet |

**Exit criteria:** Bursar runs term entirely in `/admin/fee-ledger` + receipts; Excel is backup only.

---

## P1 — Parents & collection rails

| # | Item | Why | Outcome |
|---|------|-----|---------|
| 7 | **Parent portal** (view balance, history, download receipts) | Cuts office queues | Guardian login or School Code + admission no. |
| 8 | **Online pay** for Uwais (MoMo via existing checkout `/pay/uwais`) | Already on platform | Parents clear balances without visiting school |
| 9 | **Due reminders** (Telegram / SMS / WhatsApp) | Spreadsheet “Nxt wk” becomes automated | Fewer defaulters |
| 10 | **Partial-pay UX polish** on parent + desk | Matches PAID/DEBT vs PAID/N.T | Debt cleared before term fees (already allocation order) |

**Exit criteria:** Parent can see “you owe X” and pay without calling the school.

---

## P2 — Finance module (office accounting)

| # | Item | Why | Outcome |
|---|------|-----|---------|
| 11 | **Cashbook** (daily collections vs banked) | Spreadsheet TOTAL row → formal books | Day close report |
| 12 | **Expenses + bank deposits** (deeper than current outflow) | Full money story | Income − expense − deposit trail |
| 13 | **Term / month income statements** (PDF polish) | Board / proprietor reporting | Printable P&L style |
| 14 | **Audit log** of who changed bills/payments | Trust + multi-user | Who edited Hamiim’s balance |

**Exit criteria:** Finance can answer “what came in this week and where did it go?” without Excel.

---

## P3 — Expand to School Management (SMIS)

Build only after fees + parent pay are stable. Order by school pain:

| # | Module | Depends on fees? | Notes for Uwais |
|---|--------|------------------|-----------------|
| 15 | **Student Information (SIS) depth** — photo, guardian contacts, Active/Inactive, LEFT status | Light | Status notes already on ledger; promote to real fields |
| 16 | **Attendance** (optional biometric later) | No | Classes exist; add daily mark |
| 17 | **Qur’an memorisation progress** | No | Differentiator for this school |
| 18 | **Examinations / results** | No | Results import already partially exists |
| 19 | **Timetable** | No | After classes/streams solid |
| 20 | **Library** | No | Lower urgency |
| 21 | **Transport** | Fees (transport fee head) | Tie to fee structure |
| 22 | **HR / payroll depth** | Staff module exists | Payslips, allowances |
| 23 | **Inventory depth** | Basic CRUD exists | Stock movements, low-stock alerts |
| 24 | **QR student ID cards** | SIS photos | Gate / exam use |
| 25 | **Parent mobile app** (Flutter/RN) | Parent portal APIs | After web parent portal works |

**Exit criteria:** School uses one login for fees + at least attendance or Qur’an tracking.

---

## P4 — Multi-tenant platform (OIPTECH / many schools)

| # | Item | Why |
|---|------|-----|
| 26 | **Multi-campus reporting** (parent org → branches) | Hierarchy already in schema |
| 27 | **Self-serve school onboarding** polish | Already have workspace registration |
| 28 | **OpenPayGB charges** for non-school products | Merchant gateway already started on `/opgb` |
| 29 | **Offline sync / mobile desk collection** | Field bursars |
| 30 | **Bank acquiring / card pay-in** (beyond closed-loop OpenPayGB) | Broader PSP |

---

## Recommended “next 90 days” (only)

If capacity is limited, do **only** this sequence:

1. Full Uwais spreadsheet import  
2. Fee heads + discounts/waivers  
3. Receipt share from ledger  
4. Parent balance view + `/pay/uwais`  
5. Due reminders (Telegram first — already on platform)  
6. Cashbook / daily collections report  

Everything in P3–P4 waits until those six are done.

---

## Explicitly later (do not start yet)

- Biometric attendance hardware  
- Full library / timetable as first modules  
- Separate FastAPI + PostgreSQL rewrite (extend this Next.js/Mongo stack)  
- Parallel greenfield SFMS outside OdelPay Schools  

---

## Decision prompts (pick when ready)

Ask the team one question at a time:

1. **After P0:** “Parents online pay next, or cashbook next?”  
2. **After P1:** “Qur’an progress or attendance as first non-fee module?”  
3. **After one SMIS module:** “Mobile parent app or multi-campus?”  

---

*Related:* fee ledger `/admin/fee-ledger` · school ERP `/admin/school-dashboard` · OpenPayGB provider `/opgb` · Partner charges `docs/platform/OPENPAYGB_PAYMENT_PROVIDER.md`
