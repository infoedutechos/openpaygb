# School admin — programme customization

After a workspace is **active** and the school admin signs in at **`/school/login`**, programme management lives at **`/admin/programmes`**.

---

## What org admins can customize

| Capability | Route / API |
|------------|-------------|
| **School favicon** | **`/admin/settings`** → Upload favicon · `POST/DELETE /api/admin/organization/favicon` |
| **Academic year label** | **`/admin/school-structure`** · `PATCH /api/admin/organization/settings` (`currentAcademicYearLabel`, e.g. `2025/2026`) |
| **Classes & streams (K–12)** | **`/admin/school-structure`** · `GET/POST /api/admin/school/classes`, `POST /api/admin/school/streams` |
| List programmes and fee rows | `GET /api/admin/programmes` |
| Create programme (code, name, track, duration) | `POST /api/admin/programmes` |
| Update programme metadata | `PATCH /api/admin/programmes/[id]` |
| Delete programme (blocked if payments exist) | `DELETE /api/admin/programmes/[id]` |
| Add / edit / delete fee slots (year, term index, tuition, functional) | `.../fees`, `.../fees/[feeId]` |
| CSV import (up to 250 rows) | `POST /api/admin/programmes/import` |
| Enroll students by class + stream | **`/admin/students`** · `POST /api/students` with `schoolClassId` + `schoolStreamId` |
| Update student enrollment | `PATCH /api/students/[id]` |

**UI:** `components/admin/SchoolStructureManager.tsx`, `components/admin/AdminProgrammesManager.tsx`, `components/admin/OrgFaviconSettings.tsx`

**Scope:** `org_admin` is limited to their **`organizationId`**. APIs return **403** while the tenant is **pending** or **rejected**.

### K–12 workflow (primary / secondary)

1. **`/admin/school-structure`** — set academic year, add classes (P1–P7, S1–S6) and streams (A, B, Science…), or **Load K–12 template**.
2. Each stream auto-creates a checkout **programme** (`P7-STREAM`, etc.).
3. **`/admin/programmes`** — add **Term 1–3** fee rows per programme year.
4. **`/admin/students`** — enroll by class + stream + year + term.
5. Parents pay at **`/pay/<slug>`** with term-based checkout.

---

## What remains platform-master only

| Item | Why |
|------|-----|
| Initial clone from template on approve | Master **Approve workspace** runs `cloneProgrammesAndFxFromTemplate` from slug **`default`** |
| Destination TON wallet | Master → Organizations |
| Per-tenant FX override | Master → Organizations |
| Checkout platform / processing fee | Master → Organizations |
| Tenant lifecycle (approve / reject) | Master only |

School admins upload their own **favicon**; master can still override via Organizations.

---

## Typical lifecycle

1. Master approves pending school → programmes + FX copied from **`default`** (if the new org has no programmes yet).
2. School admin signs in → **`/admin/school-structure`** → classes/streams → **`/admin/programmes`** → term fees → **`/admin/settings`** → favicon.
3. Guest pay goes live at **`/pay/<slug>`** for payers.

See **[ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md)**, **[PRODUCT_LINES_AND_SCHOOL_TERMS.md](../platform/PRODUCT_LINES_AND_SCHOOL_TERMS.md)**, and **[ADMIN_FLOW.md](../flows/ADMIN_FLOW.md)**.
