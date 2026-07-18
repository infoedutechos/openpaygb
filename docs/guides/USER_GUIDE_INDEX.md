# ODEL HUB Pay / OpenPayGB — User guides index

**Last updated:** 2026-07-18  
**Product:** Multi-tenant tuition payments (TON, mobile money, OpenPayGB virtual card) for schools and higher institutions in Uganda and East Africa.

Download from **Master Admin → Docs & downloads** (`/admin/master#project-download`) — organised catalogue:

| Category | Contents |
|----------|----------|
| **Whole project** | Full ZIP (data + demo logins + env + docs + source) |
| **Documentation & guides** | Project description, user guides pack, full `docs/` library |
| **Live platform data** | Tuition / orgs / programmes / payments / KB / notifications |
| **Access & credentials** | Master admins, demo Schools/Universities logins, environment |
| **Source code** | Repository archive |

Each category supports a one-click category ZIP plus individual part downloads.

---

## Choose your guide

| Role | Guide | Sign-in / entry URL |
|------|-------|---------------------|
| **Platform master admin** | [USER_GUIDE_MASTER_ADMIN.md](./USER_GUIDE_MASTER_ADMIN.md) | `/admin/login?master=1` → `/admin/master` |
| **School admin** (K–12 / primary–secondary) | [USER_GUIDE_ADMIN_SCHOOLS.md](./USER_GUIDE_ADMIN_SCHOOLS.md) | `/school/login` → `/admin` · register `/admin/register?segment=schools` |
| **Higher institution admin** (university / tertiary) | [USER_GUIDE_ADMIN_HIGHER.md](./USER_GUIDE_ADMIN_HIGHER.md) | `/school/login` → `/admin` · register `/admin/register?segment=higher` |
| **Staff (schools)** | [USER_GUIDE_STAFF_SCHOOLS.md](./USER_GUIDE_STAFF_SCHOOLS.md) | `/staff/login?segment=schools` · Staff ID + portal password |
| **Staff (higher institutions)** | [USER_GUIDE_STAFF_HIGHER.md](./USER_GUIDE_STAFF_HIGHER.md) | `/staff/login?segment=higher` · Staff ID + portal password |
| **Student / parent (schools)** | [USER_GUIDE_STUDENT_SCHOOLS.md](./USER_GUIDE_STUDENT_SCHOOLS.md) | `/student/login?segment=schools` · pay `/pay` (School Code) |
| **Student (higher institutions)** | [USER_GUIDE_STUDENT_HIGHER.md](./USER_GUIDE_STUDENT_HIGHER.md) | `/student/login?segment=higher` · lobby `/OdelPayUniversities` |
| **Guest payer** (no account) | [USER_GUIDE_GUEST_PAYER.md](./USER_GUIDE_GUEST_PAYER.md) | `/pay` or `/pay/<orgSlug>` |
| **Partner / SIS integrator** | [USER_GUIDE_PARTNER_INTEGRATOR.md](./USER_GUIDE_PARTNER_INTEGRATOR.md) | API keys from Master Admin |

### Deprecated generic guides (pointers only)

These files remain for download compatibility and old links. Prefer the tier-specific guides above:

| Deprecated file | Redirects readers to |
|-----------------|----------------------|
| [USER_GUIDE_STUDENT.md](./USER_GUIDE_STUDENT.md) | [USER_GUIDE_STUDENT_SCHOOLS.md](./USER_GUIDE_STUDENT_SCHOOLS.md) · [USER_GUIDE_STUDENT_HIGHER.md](./USER_GUIDE_STUDENT_HIGHER.md) |
| [USER_GUIDE_SCHOOL_ADMIN.md](./USER_GUIDE_SCHOOL_ADMIN.md) | [USER_GUIDE_ADMIN_SCHOOLS.md](./USER_GUIDE_ADMIN_SCHOOLS.md) · [USER_GUIDE_ADMIN_HIGHER.md](./USER_GUIDE_ADMIN_HIGHER.md) |

---

## Quick URLs (all roles)

| Purpose | URL |
|---------|-----|
| Public home | `/` |
| Schools lobby | `/OdelPaySchools` |
| Higher institutions lobby | `/OdelPayUniversities` |
| OpenPayGB lobby | `/opgb` |
| Pay tuition (pick school) | `/pay` |
| Pay tuition (one org) | `/pay/<orgSlug>` |
| Receipt | `/receipt/<paymentId>` |
| School workspace register | `/admin/register` |
| School / org admin login | `/school/login` |
| Student login | `/student/login` |
| Student tuition balance | `/student/balance` |
| Student pay | `/student/pay` |
| Virtual card | `/student/card` |
| Public student card | `/student/card/<studentId>` |
| Master console | `/admin/master` |
| Tuition hub (org admin) | `/admin` |
| Admission number settings | `/admin/settings#admission-number` |
| Receipt letterhead settings | `/admin/settings#receipt-letterhead` |
| Help center | `/help` |
| Docs library | `/docs` (static) or in-app Knowledge base |

---

## Related operator docs

| Topic | Doc |
|-------|-----|
| Admission number customization | [../ADMISSION_NUMBER_FORMAT.md](../ADMISSION_NUMBER_FORMAT.md) |
| Dual receipt branding | [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md) |
| Product lines & Term vs Semester | [../PRODUCT_LINES_AND_SCHOOL_TERMS.md](../PRODUCT_LINES_AND_SCHOOL_TERMS.md) |

---

## Support inside the product

- **Help center** — [/help](/help)
- **Knowledge base copilot** — bubble on tuition and play hubs; articles seeded from platform KB (Master Admin → Knowledge base).
- **Talk to an agent** — when configured (Telegram / support links in platform social settings).
- **Receipt email** — after confirmed payment when Resend or Brevo is configured.

For operators: see [../PROJECT_DESCRIPTION.md](../PROJECT_DESCRIPTION.md) and [../PRODUCTION_GO_LIVE.md](../PRODUCTION_GO_LIVE.md).
