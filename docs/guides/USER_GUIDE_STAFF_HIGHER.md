# User Guide: Staff (Higher Institutions)

**Audience:** Employees with a Staff ID at a university / tertiary workspace.  
**Product line:** OdelPay — Higher Institutions  
**Last updated:** 2026-07-18

For institution admins who manage programmes and staff HR, see [USER_GUIDE_ADMIN_HIGHER.md](./USER_GUIDE_ADMIN_HIGHER.md).

---

## Overview

Institution **staff** sign in with a **Staff ID** and portal password to view profile and salary history. Admins manage Staff IDs under **Staff** in the Tuition Hub and configure format under Settings.

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| Login chooser | `/login` → **Staff Login for Higher Institutions** |
| Staff login | `/staff/login?segment=higher` |
| Staff dashboard | `/staff` |
| My profile | `/staff/profile` |
| Salary history | `/staff/salary` |
| Help | `/help/guide-staff-higher` |

---

## Sign in

1. Open `/staff/login?segment=higher`.
2. Select your institution.
3. Enter **Staff ID** + portal password.
4. Open the staff dashboard at `/staff`.

---

## What you can do

| Area | Details |
|------|---------|
| Dashboard | Duty, contract salary, recent payments |
| Profile | Read-only HR fields |
| Salary history | Month / gross / deduction / net |

You do **not** manage programmes, students, or tuition payments — that is the admin portal (`/admin/login?segment=higher`).

---

## Staff ID format

Admins configure auto Staff IDs under `/admin/settings#staff-id` (prefix, year, sequence), mirroring admission numbers.

---

## Support

- Help: `/help`
- Admin portal: `/admin/login?segment=higher`
