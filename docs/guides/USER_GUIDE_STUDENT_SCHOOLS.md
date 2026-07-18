# User Guide: Students & Parents (K–12 / Primary–Secondary Schools)

**Audience:** Learners enrolled in a primary or secondary school workspace, and parents/guardians who pay on their behalf.  
**Product line:** OdelPay — Schools (`institutionTier: school`)  
**Last updated:** 2026-07-18

Schools use **Term** language (Term 1–3), **class / stream**, and a **School Code** for quick pay. Higher-institution guides use Year/Semester and programmes instead — see [USER_GUIDE_STUDENT_HIGHER.md](./USER_GUIDE_STUDENT_HIGHER.md).

---

## Overview

With ODEL HUB Pay / OpenPayGB for schools you can:

- Sign in to the student portal with **admission number + password** (or email / Google).
- Check **fees balance** by term.
- Pay school fees via **School Code**, school slug checkout (`/pay`), or the logged-in portal.
- Open and download **receipts** (school letterhead + platform branding).
- Share a **student card QR** so parents can pay without guessing the school slug.
- Optionally use an **OpenPayGB virtual card** when the school and platform enable it.

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| Schools lobby (find your school) | `/OdelPaySchools` |
| Pay fees (pick school) | `/pay` |
| Pay with School Code | `/pay` → **Pay with School Code** |
| Pay one school directly | `/pay/<school-slug>` |
| Student login (schools) | `/student/login?segment=schools` |
| Student register | `/student/register` |
| Claim portal after guest pay | `/student/claim` |
| Student home | `/student` |
| Fees balance | `/student/balance` |
| Pay (logged in) | `/student/pay` |
| Virtual card | `/student/card` |
| Public student card (QR target) | `/student/card/<studentId>` |
| My receipts | `/my/receipts` |
| Single receipt | `/receipt/<paymentId>` |
| Help center | `/help` |

Demo school (local seed): `/pay/riverside-demo` · School Code is shown to bursars under **Students / bills**.

---

## 1) Get ready: School Code and admission number

Before you pay or log in, collect from the bursar or admission letter:

1. **School Code** — usually 6 digits (SchoolPay-style). Parents use this on `/pay`.
2. **Admission / registration number** — e.g. `RIV-2026-0001` (format set by the school).
3. Optional: school **slug** (URL short name) if you prefer `/pay/<slug>` instead of School Code.
4. Portal **password** if the school created your account (or set one via claim/register).

---

## 2) Register a portal account

### Option A — Continue with Google

1. Open `/student/register`.
2. Click **Continue with Google**.
3. Complete Google consent.
4. Select your school and finish onboarding.

### Option B — Email + password

1. Open `/student/register`.
2. Enter full name, email, and password.
3. Submit and confirm via the email link (in development a confirm link may appear on-screen).
4. Continue into the student portal.

If the school already created your record with an admission number and portal password, skip register and go to [Login](#3-login-admission-number--password).

---

## 3) Login (admission number + password)

1. Open `/student/login?segment=schools` (or `/student/login` and choose your school).
2. Select your **school** from the list.
3. In **Email or admission number**, enter either:
   - your school email, **or**
   - your **admission / registration number** (exact spelling).
4. Enter your **portal password**.
5. Click sign in → you land on `/student`.

Alternatives:

- **Continue with Google** if you registered that way.
- If you paid as a guest and never set a password, use `/student/claim` (same school + email used at checkout).

If login says password is not set: ask the bursar to set a portal password, or use claim after a guest payment.

---

## 4) Claim portal after paying as guest

Use this when a parent paid from `/pay` without a student login.

1. Open `/student/claim`.
2. Select the **same school** used at checkout.
3. Enter the **same email** used when paying.
4. Set a new portal password.
5. Submit → continue to the student / guest dashboard.

---

## 5) Student home and fees balance

### Home (`/student`)

You typically see:

- School, class/stream (or programme code), year, and **term**
- Recent payments
- Links to receipts, settings, and pay
- Virtual card panel (if enabled)
- Balance summary with installment cues

### Balance (`/student/balance`)

1. Open `/student/balance`.
2. Review total paid vs remaining.
3. Expand **term**-level rows (Term 1, Term 2, Term 3 as configured).
4. Note any installment “next due” amount.
5. Click **Pay tuition** / **Pay fees** to go to `/student/pay`.

---

## 6) Pay school fees

### A) Pay with School Code (recommended for parents)

1. Open `/pay`.
2. Under **Pay with School Code**, enter the **School Code** from the bursar.
3. Optionally enter the learner’s **admission number** so checkout pre-fills the student.
4. Continue → you are routed to that school’s checkout (`/pay/<slug>`).
5. Confirm learner identity, **class/stream** context, and **term**.
6. Choose fee selection (this term / year / full where offered).
7. If allowed, choose installment count.
8. Select payment method and complete payment.
9. Wait for confirmation, then open the receipt.

### B) Pay by school slug

1. Open `/pay/<school-slug>` (from the admission letter, student card, or `/OdelPaySchools`).
2. Follow the same checkout steps as above (identity → term → method → confirm).

### C) Pay while logged in

1. Sign in at `/student/login?segment=schools`.
2. Open `/student/pay` (or **Pay** from balance).
3. Confirm term and amount, choose method, complete payment.

### D) Guest pay without School Code

1. Open `/pay` → pick the school from the list, **or** open `/OdelPaySchools` and choose your school.
2. Complete checkout with name, email, mobile (for MoMo), class/term context.

**Tip:** Keep the same email for guest pay and later claim.

---

## 7) Student card QR share

Schools can open or print a **student identity card** with a QR code.

1. Ask the bursar for the share card, **or** open the public link `/student/card/<studentId>` if they sent it.
2. The card shows: name, school, **admission number**, **School Code**, class/programme, year, and **term**.
3. Parents scan the QR → same card URL → use **School Code** or **Pay** links to complete fees.
4. Share via copy link, WhatsApp, or other channels from the card UI when available.

The public card does **not** show email or phone — only safe identity fields.

---

## 8) Payment methods

Availability depends on platform and school configuration.

| Method | Typical flow |
|--------|----------------|
| TON | On-chain transfer with memo/reference |
| Mbiyo | Mobile money collect |
| LivePay | UGX mobile money collect |
| Relworx | East Africa mobile money collect |
| VixonPay | UGX mobile money collect |
| OpenPayGB card | Pay from activated card balance |

Pending payments confirm asynchronously via provider webhooks — refresh balance/receipts after a short wait.

---

## 9) OpenPayGB virtual card (if enabled)

1. Open `/student/card`.
2. Opt in / reserve a card if prompted.
3. Activate by paying the issue fee (TON or mobile money).
4. Fund the card (TON top-up or MoMo).
5. Pay school fees using card balance from `/student/pay` when the method is offered.

If the card panel is missing, the school or platform has not enabled OpenPayGB cards for your workspace.

---

## 10) Receipts and payment history

1. Open `/my/receipts` for all your payments.
2. Open `/receipt/<paymentId>` for a single official receipt.
3. Download PDF from the receipt UI when available (`/api/receipts/<paymentId>/pdf`).

Receipts show **dual branding**: MAC / ODEL HUB platform letterhead plus your **school letterhead** (logo and contacts) when the school configured them under admin settings.

---

## 11) Password and security

- Change password at `/my/settings`.
- Prefer a unique password for the portal.
- Parents: do not share the learner’s portal password on WhatsApp groups; share the **student card** or School Code instead.

---

## Troubleshooting

| Problem | Likely reason | What to do |
|---------|---------------|------------|
| School Code not found | Typo or inactive school | Re-check digits with bursar; try `/pay/<slug>` |
| Admission number login fails | Wrong school selected or typo | Select exact school; paste admission no carefully |
| “Password not set” | Portal never claimed | Use `/student/claim` or ask bursar to set password |
| Paid but balance unchanged | Webhook delay | Wait 1–2 minutes; check `/my/receipts` |
| Wrong term on receipt | Checkout period mismatch | Contact bursar; keep receipt id for correction |
| Student not listed under School Code | Admission no not registered | Confirm bursar created the learner record |
| Card activation stuck | Pending rail confirmation | Retry status on `/student/card`; contact support with evidence |

---

## Support

1. Start at the in-app help center: **[/help](/help)**.
2. Use the Knowledge base / chat bubble on tuition pages when available.
3. Contact your **school bursar** for admission numbers, School Code, class placement, and portal passwords.
4. Escalate unresolved paid-but-missing cases with payment reference + receipt URL to school admin, who can check `/admin/payments` and `/admin/receipts`.

Related docs: [USER_GUIDE_INDEX.md](./USER_GUIDE_INDEX.md) · [USER_GUIDE_GUEST_PAYER.md](./USER_GUIDE_GUEST_PAYER.md) · [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md)
