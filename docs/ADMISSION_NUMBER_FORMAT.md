# Admission / registration number format

**Last updated:** 2026-07-18  
**Audience:** School and higher-institution `org_admin`  
**Settings path:** `/admin/settings#admission-number`

Admission (registration) numbers identify learners for portal login, School Code checkout, receipts, and student share cards. Each organization customizes how new numbers are generated.

---

## What you can customize

| Setting | Purpose | Notes |
|---------|---------|--------|
| **Prefix** | Leading letters/digits | Blank → derived from org slug initials (e.g. `riverside-demo` → `RIV`). Max 12 alphanumeric. |
| **Separator** | Between parts | Typically `-`, `_`, `.`, or `/` (max 3 chars). Default `-`. |
| **Include year** | Whether a year token appears | Off → prefix + sequence only. |
| **Year source** | How the year token is chosen | `calendar` (e.g. `2026`), `academic` (parsed from academic year label, e.g. `2025` from `2025/2026`), or `none`. |
| **Sequence digits** | Zero-padded width | 3–6 (default 4). Example: `0001`. |
| **Start sequence from** | Baseline when no matches exist yet | Default `1`. Used with registered-first logic below. |

**Example formats:**

- `RIV-2026-0001` — prefix + calendar year + 4-digit sequence  
- `TU-00042` — prefix + sequence only  
- `ABC/2025/001` — academic year token from label `2025/2026`

Live preview is shown in Settings after load/save (`admissionPreview`).

---

## Registered-first sequencing

Allocation is implemented in `lib/admission-no.ts` → `allocateAdmissionNo()`.

1. Load the org’s format config (or defaults if not yet configured).
2. Resolve the year token from calendar / academic label / none.
3. Scan **all students already registered** for that organization.
4. Find the highest sequence that matches the current stem (prefix + year + separator rules).
5. If no matching numbers exist yet, baseline is `max(seqStart - 1, existingStudentCount)`.
6. Next number = baseline + 1 (with clash retries).

**Implications:**

- Importing or creating students first advances the sequence even before format is “configured.”
- Changing prefix/year mid-year starts a new stem; old numbers remain valid on existing records.
- Manual overrides on create must still be unique per organization.

---

## Settings UI

1. Sign in as org admin → `/admin/settings`.
2. Scroll to **Admission / registration number format** (`#admission-number`), or open `/admin/settings#admission-number` directly.
3. Edit fields → **Save**.
4. Saving sets `admissionFormatConfigured: true` on the organization.

Component: `components/admin/AdmissionFormatSettings.tsx`  
APIs: `GET/PATCH /api/admin/organization/settings`

Constant: `ADMISSION_FORMAT_SETTINGS_PATH` = `/admin/settings#admission-number` (`lib/admission-format.ts`).

---

## Create student + Configure CTA

On `/admin/students` (create student form):

1. The form can call **next admission** to fill the field automatically.
2. If `admissionFormatConfigured` is false, a callout appears with a link:

   **Configure admission number format** → `/admin/settings#admission-number`

3. Defaults still work without configuration (slug-based prefix + calendar year), but schools should configure explicitly for branding consistency.
4. Optionally set a **portal password** so the learner signs in with **admission number + password** at `/student/login`.

---

## API: next admission

```http
GET /api/students/next-admission
```

- Auth: admin cookie session (`org_admin` or `master`).
- Master may pass `?organizationSlug=<slug>` to target a tenant.
- Response includes:
  - `admissionNo` — newly allocated unique number (persisted only when you create the student with that value / when create allocates)
  - `admissionFormatConfigured`
  - `formatPreview` — example string from current config

Implementation: `app/api/students/next-admission/route.ts` (calls `allocateAdmissionNo`).

Student create (`POST /api/students`) also allocates via `allocateAdmissionNo` when no admission number is supplied.

---

## Where admission numbers appear

| Surface | Role |
|---------|------|
| `/student/login` | Identifier (email **or** admission number) + password |
| `/pay` School Code flow | Optional admission number to resolve the learner |
| `/student/card/<id>` | Public share card + QR |
| Receipts / PDF | Student identity on fee particulars |
| Admin students table | Search and display (especially school tenants) |

---

## Best practices

- Configure format **before** bulk student import.
- Prefer academic year source when sessions are labeled `YYYY/YYYY`.
- Do not reuse admission numbers after a student leaves — allocate next instead.
- Communicate the format on admission letters together with **School Code** (schools) or org slug (higher).

## Related

- [guides/USER_GUIDE_ADMIN_SCHOOLS.md](./guides/USER_GUIDE_ADMIN_SCHOOLS.md)
- [guides/USER_GUIDE_ADMIN_HIGHER.md](./guides/USER_GUIDE_ADMIN_HIGHER.md)
- [guides/USER_GUIDE_STUDENT_SCHOOLS.md](./guides/USER_GUIDE_STUDENT_SCHOOLS.md)
- [PRODUCT_LINES_AND_SCHOOL_TERMS.md](./PRODUCT_LINES_AND_SCHOOL_TERMS.md)
