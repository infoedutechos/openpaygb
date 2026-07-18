# User Guide: Staff (Primary–Secondary / K–12 Schools)

**Audience:** Teachers and non-teaching employees with a Staff ID at a school workspace.  
**Product line:** OdelPay — Schools  
**Last updated:** 2026-07-18

For bursars / school admins who manage staff records, see [USER_GUIDE_ADMIN_SCHOOLS.md](./USER_GUIDE_ADMIN_SCHOOLS.md).

---

## Overview

School **staff** (employees) sign in with a **Staff ID** and portal password. You can view your profile, contract salary, and salary payment history. Admins create your Staff ID and optional portal password under **Staff** in the Tuition Hub.

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| Login chooser | `/login` → **Staff Login for Schools** |
| Staff login | `/staff/login?segment=schools` |
| Staff dashboard | `/staff` |
| My profile | `/staff/profile` |
| Salary history | `/staff/salary` |
| Help | `/help/guide-staff-schools` |

---

## Sign in

1. Open `/staff/login?segment=schools` (or choose **Staff Login for Schools** on `/login`).
2. Select your school.
3. Enter your **Staff ID** (e.g. `STF-2026-0001`).
4. Enter the portal password set by your admin.
5. Continue to `/staff`.

If you see “No portal password on file”, ask your school admin to set one under **Admin → Staff**.

---

## Dashboard

At `/staff` you see:

- Your name, school, and Staff ID
- Duty / role
- Contract salary (UGX)
- Recent salary payments (net)

---

## Profile and salary

- **Profile** (`/staff/profile`) — contact and employment details (read-only; ask admin to update).
- **Salary history** (`/staff/salary`) — month, gross, deduction, net, paid date.

---

## Staff ID

Your Staff ID is allocated by the school using a format configured under **Admin → Settings → Staff ID** (same idea as student admission numbers). Keep it private with your password.

---

## Support

- In-product help: `/help`
- School admin login (bursars): `/admin/login?school=1`
