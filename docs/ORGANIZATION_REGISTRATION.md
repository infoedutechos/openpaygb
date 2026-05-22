# How schools and organizations register and get a dashboard

This document describes the tenant lifecycle in ODELHUB Pay: from **pending workspace** to **active school** with an **org admin** who can use the **School & organization dashboard** at `/admin`.

For sign-in URLs, login page UX, and where links appear in the product, see **[SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md)**.

---

## 1. Create a pending tenant (workspace record)

An `Organization` row must exist; it starts as **`tenantStatus: pending`**.

### Self-service

1. Open **`/admin/register`** (“Request a school workspace”).
2. Submit **school name**, URL **slug** (unique), optional contact email and note.
3. The form calls **`POST /api/public/organization-register`**, which uses `createPendingOrganization` in `lib/organization-intake.ts` and creates the org with **`tenantStatus: pending`**.

### Master-created (same outcome)

A **platform master** can create a pending tenant from **Manager → Organizations** using **“Create pending tenant”** — **`POST /api/master/organizations`** — with the same validated body shape.

**While pending:**

- The org exists in the database.
- **Public tuition checkout is not live** for that slug: guest pay routes expect **`tenantStatus: active`** (e.g. `/pay/[orgSlug]`).

---

## 2. Approve or reject (master only)

Only a **platform master** (`role: master`) completes provisioning:

1. Go to **`/admin/master/organizations`**.
2. Find the tenant in **pending** status.
3. **Approve** or **Reject**.

**Approve** — **`PATCH /api/master/organizations/[id]`** with `{ "action": "approve" }`:

- Runs **`cloneProgrammesAndFxFromTemplate`** (`lib/org-provision.ts`) so the new school gets programme/fee/FX structure cloned from the **`default`** template organization.
- Sets **`tenantStatus: active`**.

**Reject** — same route with `{ "action": "reject" }` → **`tenantStatus: rejected`**.

The template org **slug `default`** is reserved and is not approved/rejected through this flow like a normal school.

---

## 3. Org admin account (dashboard sign-in)

The **School & organization dashboard** (`TuitionAdminShell`, routes under `/admin` with the tuition-hub group) is used by **`AdminUser`** records with:

- **`role: org_admin`**
- **`organizationId`** pointing at the school’s org

**Creation:** a master creates these users after the org is **active**:

- **Manager → Organizations → “Create org admin”**
- **`POST /api/master/admins`** (`app/api/master/admins/route.ts`)

The API **returns 400** if the organization is not **active** (“Organization must be active before assigning an org admin”).

**Sign-in:** org admins use **`/school/login`** (alias of **`/admin/login?school=1`**). After authentication they land in **`/admin`** (Tuition Hub dashboard), scoped to their organization. **`/school-admin`** also rewrites to **`/admin`**.

---

## 4. Summary flow

| Step | Who | Result |
|------|-----|--------|
| Request workspace | School (self-serve) or master | `Organization` with **`pending`** |
| Approve | Master | **`active`**, programmes/FX cloned from **`default`** |
| Create org admin | Master | **`AdminUser`** `org_admin` linked to org |
| Operate school | Org admin | Dashboard at **`/admin`**, pay at **`/pay/<slug>`** when configured |

---

## 5. Local / demo: seed

For development, **`npm run seed`** (`scripts/seed.ts`) can create an **`active`** default organization and admin users according to environment variables — this bypasses the pending → approve flow for that environment only.

---

## Related code and routes

| Item | Location |
|------|----------|
| Public registration UI | `app/admin/register/page.tsx` |
| Public register API | `app/api/public/organization-register/route.ts` |
| Pending org creation | `lib/organization-intake.ts` |
| Master org list / create / approve | `app/admin/master/organizations/page.tsx`, `app/api/master/organizations/**`, `app/api/master/organizations/[id]/route.ts` |
| Master creates org admin | `app/api/master/admins/route.ts` |
| Master overview | `app/admin/master/page.tsx` |

See also: **[FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)** (admin routes), **[PRISMA_COMMANDS.md](./PRISMA_COMMANDS.md)** (schema/DB).
