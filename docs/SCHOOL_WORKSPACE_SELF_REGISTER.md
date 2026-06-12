# School workspace self-registration

Schools and training centres can request a workspace on the platform without contacting an operator first.

**Public URL:** [https://odelpay.vercel.app/admin/register](https://odelpay.vercel.app/admin/register)

---

## Applicant experience

1. **Choose product line** at `/admin/register` — **OdelPay — Higher Institutions** or **OdelPay — Schools** — then submit school name, URL slug, contact email, optional website, and notes.
2. **Confirm email** — ODEL HUB sends a verification link (Brevo or Resend when configured).
3. **Workspace activation**
   - When **auto-registration** is on (Master approval off): after email confirmation, the workspace becomes **active** automatically. Programmes and FX are cloned from the platform template (`default`).
   - When **master approval** is on (default): after email confirmation, the workspace stays **pending** until a platform master approves it on `/admin/master/organizations`.
4. **School admin access**
   - **Manual (default):** a platform operator creates the org admin at `/admin/master/organizations` and sends a password-set invite.
   - **Automatic (optional):** when **Auto-generate school admin logins** is enabled in Master Admin, the platform creates an `org_admin` for the registration contact email on activation and emails a secure password-set link. Admins can change their password later from the school admin dashboard.

**Status page:** `/school/workspace-status?slug=your-slug`  
**School sign-in:** `/school/login`

---

## Master Admin controls

**UI:** `/admin/master#school-workspace-registration`

| Setting | Default | Effect |
|---------|---------|--------|
| Require platform master approval | **On** | Pending until master approves (after email verified) |
| Auto-generate school admin logins | **Off** | On activation, create org admin + invite email for registration contact |

Email verification is **always required** regardless of these toggles.

---

## Optional school website → favicon

Applicants may provide an optional **school website** URL on the registration form. When the workspace is activated, the platform attempts to fetch `/favicon.ico` from that site and store it as the organization favicon (shown on `/pay/{slug}` pages).

Platform branding (logo, favicon, PWA) for `odelpay.vercel.app` is loaded from **Master Admin → Platform social & branding** (`SiteUiSettings`). Upload a logo there or rely on the default SVG favicon.

---

## ODEL HUB Copilot

The floating help copilot on the platform:

- Introduces itself as **ODEL HUB Copilot** (name configurable in Master site settings).
- Answers from the built-in knowledge base with **direct clickable links** (no “here’s what I found in the knowledge base” preamble).
- Suggests topics while you type (programmes, guest pay, school login, registration, etc.).
- Does not tell users about unpaid or missing external AI APIs — responses are platform-native.

**Master KB:** `/admin/master#platform-knowledge`

---

## API reference

```
POST   /api/public/organization-register
GET    /api/public/organization-register/verify?token=
POST   /api/public/organization-register/resend
GET    /api/public/workspace-status?slug=&email=
GET    /api/public/school-workspace-registration-policy
GET/PATCH /api/master/school-workspace-registration
PATCH  /api/master/organizations/[id]   { action: approve|reject|reopen }
POST   /api/master/admins               { email, password, organizationId, sendInviteEmail }
```

---

## Related docs

- [ORGANIZATION_REGISTRATION.md](./ORGANIZATION_REGISTRATION.md) — technical flow
- [SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md) — sign-in and password reset
- [SCHOOL_ADMIN_PROGRAMMES.md](./SCHOOL_ADMIN_PROGRAMMES.md) — programmes after activation
- [DEPLOYMENT_ENV_PRODUCTION.md](./DEPLOYMENT_ENV_PRODUCTION.md) — production env sync
