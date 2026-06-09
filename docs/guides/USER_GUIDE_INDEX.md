# ODEL HUB Pay / OpenPayGB — User guides index

**Last updated:** 2026-06-03  
**Product:** Multi-tenant tuition payments (TON, mobile money, OpenPayGB virtual card) for schools and students in Uganda and East Africa.

Download these guides from **Master Admin → Project download** (`/admin/master#project-download`):

| Download | Contents |
|----------|----------|
| **Project description** | Full technical & product specification (`PROJECT_DESCRIPTION.md`) |
| **User guides (ZIP)** | All role guides below in one archive |
| **Full documentation (ZIP)** | Entire `docs/` library including flows, deployment, and runbooks |

---

## Choose your guide

| Role | Guide | Sign-in URL |
|------|-------|-------------|
| **Platform master admin** | [USER_GUIDE_MASTER_ADMIN.md](./USER_GUIDE_MASTER_ADMIN.md) | `/admin/login?master=1` → `/admin/master` |
| **School admin** (org_admin) | [USER_GUIDE_SCHOOL_ADMIN.md](./USER_GUIDE_SCHOOL_ADMIN.md) | `/school/login` → `/admin` |
| **Student** | [USER_GUIDE_STUDENT.md](./USER_GUIDE_STUDENT.md) | `/student/login` → `/student` |
| **Guest payer** (no account) | [USER_GUIDE_GUEST_PAYER.md](./USER_GUIDE_GUEST_PAYER.md) | `/pay` or `/pay/<school-slug>` |
| **Partner / SIS integrator** | [USER_GUIDE_PARTNER_INTEGRATOR.md](./USER_GUIDE_PARTNER_INTEGRATOR.md) | API keys from Master Admin |

---

## Quick URLs (all roles)

| Purpose | URL |
|---------|-----|
| Public home | `/` |
| Pay tuition (pick school) | `/pay` |
| Pay tuition (one school) | `/pay/<orgSlug>` |
| Receipt | `/receipt/<paymentId>` |
| School workspace register | `/admin/register` |
| School login | `/school/login` |
| Student login | `/student/login` |
| Student tuition balance | `/student/balance` |
| Student pay | `/student/pay` |
| Virtual card | `/student/card` |
| Master console | `/admin/master` |
| Tuition hub (school admin) | `/admin` |
| Tuition balance (admin) | `/admin/tuition-balance` |
| Help / docs library | `/docs` (static) or in-app Knowledge base |

---

## Support inside the product

- **Knowledge base copilot** — bubble on tuition and play hubs; articles seeded from platform KB (Master Admin → Knowledge base).
- **Talk to an agent** — when configured (Telegram / support links in platform social settings).
- **Receipt email** — after confirmed payment when Resend or Brevo is configured.

For operators: see [../PROJECT_DESCRIPTION.md](../PROJECT_DESCRIPTION.md) and [../PRODUCTION_GO_LIVE.md](../PRODUCTION_GO_LIVE.md).
