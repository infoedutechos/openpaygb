# Footer & header navigation layout

**Date:** 2026-07-13 · **Reference:** Atlantis Pro footer (multi-column exchange pattern)

This doc captures how we organize global navigation — a **single-row header** for product lines and quick links, plus a structured footer grid.

---

## Reference: Atlantis Pro footer pattern

The Atlantis Pro footer uses a **four-column grid** on a light background:

| Column | Role | Content style |
|--------|------|----------------|
| **1 — Brand** | Trust & community | Logo/title, short platform blurb, “Be part of our community” + social icons |
| **2 — About & products** | Two stacked sections | Bold headings (`About Us`, `Products`) with vertical link lists |
| **3 — Services & policies** | Compliance & ops | `Services` + `Policies` headings with related links |
| **4 — Ecosystem** | Long product map | Single `Ecosystem` heading with many deep links (chain, pay, wallet, Web3, etc.) |

**Design takeaways for ODEL HUB:**

- Use **bold section headings** and **vertical lists** — not a single flat row of chips.
- Keep **brand + social** in the first column on wide screens.
- Group links by **product line** (OdelPay Higher, OdelPay Schools) and **settlement layer** (OpenPayGB / Dex).
- Put **admin, help, and policy** links under Services.

---

## ODEL HUB implementation

### Config (single source of truth)

`lib/ecosystem/site-nav-menus.ts`

- `SITE_HEADER_MENUS` — five product-line / hub dropdown buttons
- `SITE_HEADER_UTILITY_LINKS` — flat links after the dropdowns
- `SITE_FOOTER_COLUMNS` — footer columns matching the reference layout

### Header — desktop (`lg+`) single row

`components/pay/SiteHeader.tsx` + `components/pay/SiteHeaderNavDropdown.tsx`

| Order | Label | Type | Primary href |
|------:|-------|------|--------------|
| 1 | OdelPay — Higher Institutions | Dropdown | `/OdelPayUniversities` |
| 2 | OdelPay — Schools | Dropdown | `/OdelPaySchools` |
| 3 | OPGB | Dropdown | `/opgb` |
| 4 | Developers | Dropdown | `/developers` |
| 5 | Hubs | Dropdown | `/dex` |
| 6 | Pay tuition | Link | `/pay` |
| 7 | Register school | Link | `/admin/register` |
| 8 | Student portal | Link | `/student/login` (→ **My dashboard** when signed in) |
| 9 | Admin | Link | `/admin` |

On desktop (fine pointer), **hover** opens the menu and leaving closes it after a short delay so you can move into the panel. **Click** still toggles. Menus render in a **body portal** (fixed position). Escape or outside click closes.

### Header — mobile (Atlantis Pro pattern)

Below `lg`, product nav is **not** in the top bar. Reference: Atlantis Exchange Pro mobile header.

| Left | Right |
|------|--------|
| Brand (OH + ODEL HUB) | **Log in** → `/student/login` (or **My dashboard** when signed in) · **Sign up** (pill) → `/admin/register` · **Hamburger** |

`components/pay/SiteHeaderMobileDrawer.tsx` opens a right-side sheet with accordion sections for each `SITE_HEADER_MENUS` entry, then the utility links (Pay tuition, Register school, Student portal / My dashboard, Admin). Escape, backdrop tap, route change, or close icon dismisses the drawer.

### Header dropdown highlights

| Button | Dropdown highlights |
|--------|---------------------|
| **OdelPay — Higher Institutions** | Pay, programmes, receipts, institution admin, register |
| **OdelPay — Schools** | Term checkout, workspace request/status, school admin, demo |
| **OPGB** | Dex Hub, buy / sell / convert, student wallet, OpenPayGB card |
| **Developers** | Partner API, app registry, Dex integration FAQ |
| **Hubs** | Dex Hub, Play Hub |

### Footer grid

`components/SiteFooter.tsx`

| Column | Heading |
|--------|---------|
| 1 (brand) | ODEL HUB + intro blurb + community socials |
| 2 | OdelPay — Higher |
| 3 | OdelPay — Schools |
| 4 | Services |
| 5 | OpenPayGB & Dex |
| 6 | Policies — `/policies/terms`, `/policies/privacy`, `/policies/risk-disclosure`, `/policies/payment-providers`, `/help` |

On small screens columns stack; from `lg` upward they use a seven-column grid (brand spans two).

**Community strip:** “Be part of our community” uses bright cyan heading, circular brand icons (via `/api/notification-social-icon` when no custom upload), and a violet **Share ODEL HUB** button (`ShareButton` primary variant).

---

## Related docs

- [PRODUCT_LINES_AND_SCHOOL_TERMS.md](./PRODUCT_LINES_AND_SCHOOL_TERMS.md) — product line routes and term fees
- [PAYMENT_SYSTEM_ARCHITECTURE.md](./PAYMENT_SYSTEM_ARCHITECTURE.md) — OdelPay vs OpenPayGB architecture
