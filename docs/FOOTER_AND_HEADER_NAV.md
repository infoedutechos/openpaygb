# Footer & header navigation layout

**Date:** 2026-06-03 · **Reference:** Atlantis Pro footer (multi-column exchange pattern)

This doc captures how we organize global navigation — header dropdowns for product lines and a structured footer grid.

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

- `SITE_HEADER_MENUS` — dropdown items for the three header product buttons
- `SITE_FOOTER_COLUMNS` — four footer columns matching the reference layout

### Header dropdowns

`components/pay/SiteHeaderNavDropdown.tsx` + `components/pay/SiteHeader.tsx`

| Button | Primary href | Dropdown highlights |
|--------|--------------|---------------------|
| **OdelPay — Higher Institutions** | `/OdelPayUniversities` | Pay, programmes, receipts, institution admin, register |
| **OdelPay — Schools** | `/OdelPaySchools` | Term checkout, workspace request/status, school admin, demo |
| **OPGB** | `/opgb` | Dex Hub, buy / sell / convert, student wallet, OpenPayGB card |

Click the button to open the menu; **Open …** at the top goes to the lobby route. Escape or outside click closes.

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
