# School admin — programme customization

After a workspace is **active** and the school admin signs in at **`/school/login`**, programme management lives at **`/admin/programmes`**.

---

## What org admins can customize

| Capability | Route / API |
|------------|-------------|
| List programmes and fee rows | `GET /api/admin/programmes` |
| Create programme (code, name, track, duration) | `POST /api/admin/programmes` |
| Update programme metadata | `PATCH /api/admin/programmes/[id]` |
| Delete programme (blocked if payments exist) | `DELETE /api/admin/programmes/[id]` |
| Add / edit / delete fee slots (year, semester, tuition, functional) | `.../fees`, `.../fees/[feeId]` |
| CSV import (up to 250 rows) | `POST /api/admin/programmes/import` |

**UI:** `components/admin/AdminProgrammesManager.tsx`

**Scope:** `org_admin` is limited to their **`organizationId`**. APIs return **403** while the tenant is **pending** or **rejected**.

---

## What remains platform-master only

| Item | Why |
|------|-----|
| Initial clone from template on approve | Master **Approve workspace** runs `cloneProgrammesAndFxFromTemplate` from slug **`default`** |
| Destination TON wallet | Master → Organizations |
| Per-tenant FX override | Master → Organizations |
| Checkout platform / processing fee | Master → Organizations |
| Favicon | Master upload |
| Tenant lifecycle (approve / reject) | Master only |

---

## Typical lifecycle

1. Master approves pending school → programmes + FX copied from **`default`** (if the new org has no programmes yet).
2. School admin signs in → **`/admin/programmes`** → adjust codes, names, tracks, and per-semester fees.
3. Guest pay goes live at **`/pay/<slug>`** for payers.

See **[ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)** and **[ADMIN_FLOW.md](./ADMIN_FLOW.md)**.
