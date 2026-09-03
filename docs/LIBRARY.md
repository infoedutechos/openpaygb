# Documentation library map

**Interactive hub:** [`index.html`](./index.html) — run `npm run docs:serve` then open http://localhost:8787  
**Rebuild manifest:** `npm run docs:build-index`  
**Reorganize (already applied):** `node scripts/reorganize-docs-library.cjs`

---

## How to access

| Method | Steps |
|--------|--------|
| **Web interface** | `npm run docs:serve` → browse, search, filter, **🖨 Print**, hide/show sidebar |
| **Direct files** | Open any `.md` under the folders below (printer-friendly markdown) |
| **Deep link** | `http://localhost:8787/#doc=platform-platform-update-2026-09` (IDs from hub) |
| **Legacy paths** | Root stubs like `docs/PARTNER_API.md` redirect to the new folder path |

---

## Folder layout (canonical)

| Folder | Contents |
|--------|----------|
| [`platform/`](./platform/) | OPGB provider, credentials, partner API, Uwais roadmap, developer ecosystem |
| [`guides/`](./guides/) | Role-based user guides |
| [`flows/`](./flows/) | User / admin / master / multi-tenant flows |
| [`school/`](./school/) | School admin, fees, admission, receipts, registration |
| [`architecture/`](./architecture/) | Structure, payment architecture, UI↔codebase |
| [`deployment/`](./deployment/) | Vercel, Telegram, webhooks, LivePay/Relworx/VixonPay |
| [`operations/`](./operations/) | Security, backup, hardening |
| [`economics/`](./economics/) | UGX / TON / FX |
| [`product/`](./product/) | Project description, audits, backlog, stories |
| [`api-reference/`](./api-reference/) | OpenAPI + inventory CSVs |
| [`upstream-ura-pearl/`](./upstream-ura-pearl/) | Upstream Pearl runbooks |
| [`upstream-ura-game/`](./upstream-ura-game/) | Upstream game docs |
| [`contract-build/`](./contract-build/) | Contract build notes |

Root keeps: `index.html`, `README.md`, `LIBRARY.md`, `.nojekyll`, and **stub redirects** for old flat paths.

---

## Library features (hub)

- Real-time search  
- Category filters  
- Hideable sidebar (persisted in `localStorage`)  
- One-click print (print CSS strips chrome)  
- Mobile responsive layout  
- Stats: document count + size KB  
- Mermaid diagrams in markdown  

---

## Key entry docs

| Doc | Path |
|-----|------|
| Sep 2026 update pack | [`platform/PLATFORM_UPDATE_2026-09.md`](./platform/PLATFORM_UPDATE_2026-09.md) |
| Local credentials | [`platform/LOCAL_DEV_AND_CREDENTIALS.md`](./platform/LOCAL_DEV_AND_CREDENTIALS.md) |
| OPGB payment provider | [`platform/OPENPAYGB_PAYMENT_PROVIDER.md`](./platform/OPENPAYGB_PAYMENT_PROVIDER.md) |
| Partner API | [`platform/PARTNER_API.md`](./platform/PARTNER_API.md) |
| User guide index | [`guides/USER_GUIDE_INDEX.md`](./guides/USER_GUIDE_INDEX.md) |
| Docs README | [`README.md`](./README.md) |
