# Access surfaces — user vs developer

**Last updated:** 2026-07-18

ODEL HUB Pay separates **user-facing** product portals from the **developer-facing** builder portal. Developers (and platform masters) can **navigate every side**; each gated portal still requires its own audience sign-in cookie.

## Principles

| Rule | Meaning |
|------|---------|
| User portals are strict | Student, staff, and org admin cookies cannot open each other’s dashboards |
| Developer portal is builder-scoped | Partner API keys, webhooks, app registry at `/developers` |
| Developers face all sides | Builder UI links into `/login`, `/student`, `/staff`, `/admin`, pay, lobbies, Dex — without merging cookies |
| Masters face all sides | Master console includes the same “all product sides” shortcuts plus platform ops |

Source of truth: `lib/access-surfaces.ts`.

## User-facing (role-locked)

| Audience | Entry | Cookie / role |
|----------|-------|----------------|
| Students | `/student/login` | `odelhub_student` |
| Staff (employees) | `/staff/login` | `odelhub_staff` (`typ: staff`) |
| School / institution admin | `/admin/login` | `odelhub_admin` (`org_admin`) |
| Public pay / receipts | `/pay`, `/receipt` | None (receipt owner/admin token for private JSON) |

Login chooser: `/login` (user cards only in the top section).

## Developer-facing

| Surface | Path | Gate |
|---------|------|------|
| Developer hub | `/developers` | Public |
| Register app | `/developers/register` | Public |
| API dashboard | `/developers/dashboard` | `odelhub_developer` |
| Partner HTTP API | `/api/partner/v1/*` | API key |

Standalone host `odelhub_devs` allows developer paths **and** all user product prefixes so builders can open every side on the developers deployment.

## Operator shortcuts

`OPERATOR_ALL_SIDES_LINKS` powers:

- `/login` builder section
- `DevelopersShell` “All sides” strip
- `MasterManagerShell` sidebar / mobile menu

## Enforcement

- Middleware: `middleware.ts` (student / staff / admin / developer dashboard)
- JWT hygiene: student verify rejects `typ: "staff"` (`lib/student-jwt-verify.ts`)
- Master layout: `app/admin/master/layout.tsx` + `requireMaster`
- Tenant APIs: `organizationWhereForSession` / `requireSchoolAdminScope` / `requireStaffHrAdminScope`

## Related docs

- [STANDALONE_APPS.md](./STANDALONE_APPS.md)
- [USER_GUIDE_INDEX.md](./guides/USER_GUIDE_INDEX.md)
- [USER_GUIDE_PARTNER_INTEGRATOR.md](./guides/USER_GUIDE_PARTNER_INTEGRATOR.md)
