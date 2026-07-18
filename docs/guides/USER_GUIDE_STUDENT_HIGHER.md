# User Guide: Students (Universities & Higher Institutions)

**Audience:** Students enrolled in a university, polytechnic, or other tertiary workspace.  
**Product line:** OdelPay — Higher Institutions (`institutionTier: university`)  
**Last updated:** 2026-07-18

Higher institutions use **Year / Semester**, **programmes**, and the student portal at `/student`. For primary–secondary (Term, School Code, class/stream), see [USER_GUIDE_STUDENT_SCHOOLS.md](./USER_GUIDE_STUDENT_SCHOOLS.md).

---

## Overview

The higher-institution student portal lets you:

- Register and sign in (email, **admission number**, or Google).
- View **tuition balance** and programme progress by year/semester.
- Pay tuition in full or by installments (when enabled).
- Use **OpenPayGB virtual card** features when available.
- Access **receipts** and payment history.
- Share a **student card** link for identity (admission number + institution).

---

## Primary URLs

| Purpose | URL |
|---------|-----|
| Higher institutions lobby | `/OdelPayUniversities` |
| Pay tuition (pick institution) | `/pay` |
| Pay one institution | `/pay/<orgSlug>` |
| Student login (higher) | `/student/login?segment=higher` |
| Student register | `/student/register` |
| Claim account after guest pay | `/student/claim` |
| Student home | `/student` |
| Tuition balance | `/student/balance` |
| Pay tuition | `/student/pay` |
| Virtual card | `/student/card` |
| Public student card | `/student/card/<studentId>` |
| Receipts / history | `/my/receipts` |
| Single receipt | `/receipt/<paymentId>` |
| Settings / password | `/my/settings` |
| Help center | `/help` |

Demo tenant (local seed): `/pay/default`.

---

## 1) Register your account

### Option A — Continue with Google

1. Open `/student/register`.
2. Click **Continue with Google**.
3. Complete Google consent.
4. Continue into institution selection / portal onboarding.

### Option B — Email + password

1. Open `/student/register`.
2. Enter full name, email, and password.
3. Submit to receive a confirmation link.
4. Open the email and click confirm.
5. Continue to the student dashboard flow.

If email delivery is unavailable in development, a confirmation link may be shown on-screen.

If your institution already issued an **admission number** and portal password, skip to login.

---

## 2) Login

1. Go to `/student/login?segment=higher` (or `/student/login` and choose your institution).
2. Choose your institution (slug dropdown).
3. Enter **email or admission number**, plus portal password.
4. Click sign in → `/student`.

Alternative:

- If you registered with Google, use **Continue with Google**.

If login says password is not set:

- use `/student/claim` (if you paid as guest), or
- contact the registrar / fees office to enable a portal password.

---

## 3) Claim your portal after paying as guest

Use this when you paid from `/pay/<orgSlug>` without a portal account.

1. Open `/student/claim`.
2. Select the **same institution** used at checkout.
3. Enter the **same email** used when paying.
4. Set a new portal password.
5. Submit and continue to `/my/dashboard` (or student home).

---

## 4) Student home and dashboard

At `/student` you can see:

- Your **programme / year / semester** identity
- Recent payments
- Quick links to receipts and password settings
- Virtual card panel
- Embedded tuition balance panel with installment cues

---

## 5) Tuition balance page

Open `/student/balance` to view:

- Total paid vs remaining
- Period-level details by **year / semester**
- Installment plans (next due installment)
- Programme progress (completed vs remaining semesters/years)

Use **Pay tuition** to continue to `/student/pay`.

---

## 6) Pay tuition (full or installments)

Payment starts from the student flow (`/student/pay`) or direct checkout (`/pay/<orgSlug>`).

Typical steps:

1. Select **programme / year / semester** context.
2. Choose fee selection mode:
   - semester
   - year
   - full programme
3. If allowed, choose installment count.
4. Select payment method.
5. Complete payment and wait for confirmation.
6. Open the receipt.

From the lobby: `/OdelPayUniversities` → your institution → `/pay/<slug>`.

---

## 7) Payment methods

Supported rails in this product:

| Method | Typical flow |
|--------|----------------|
| TON | On-chain transfer with memo/reference |
| Mbiyo | Mobile money collect via Mbiyo |
| LivePay | UGX mobile money collect |
| Relworx | East Africa mobile money collect |
| VixonPay | UGX mobile money collect |
| OpenPayGB card | Pay from your activated card balance |

Notes:

- Rail availability depends on platform/institution configuration.
- Pending payments confirm asynchronously via rail webhooks.

---

## 8) OpenPayGB virtual card (activation and funding)

Open `/student/card`.

Card lifecycle:

1. Opt in / reserve card.
2. Activate pending card by paying the issue fee:
   - TON activation transfer, or
   - Mobile money issue collect (LivePay / Relworx / VixonPay).
3. Fund active card:
   - TON top-up transfer, or
   - Mobile money top-up.
4. Pay tuition using card balance.

Student APIs behind this flow:

- `/api/student/openpay-card`
- `/api/student/openpay-card/opt-in`
- `/api/student/openpay-card/issue/transfer`
- `/api/student/openpay-card/issue/momo-start`
- `/api/student/openpay-card/fund/transfer`
- `/api/student/openpay-card/fund/momo-start`

---

## 9) Student card share

Your institution may share `/student/card/<studentId>` — a public identity card with admission number, programme, year, and semester (no private contact fields). Use it to confirm enrollment details with sponsors.

---

## 10) Receipts and payment history

Use:

- `/my/receipts` for all your payments
- `/receipt/<paymentId>` for a single receipt page
- PDF download via the UI (`/api/receipts/<paymentId>/pdf`)

Confirmed payments show receipt links and downloadable proofs. Receipts include **platform + institution letterhead** when configured — see [../RECEIPT_BRANDING.md](../RECEIPT_BRANDING.md).

---

## 11) Password and security

Password settings:

- `/my/settings`
- Change password endpoint: `/api/auth/student/change-password`

Best practices:

- Use a unique password.
- Rotate password if you suspect account sharing or compromise.
- Keep institution and email details accurate for account recovery.

---

## Troubleshooting

| Problem | Likely reason | Fix |
|---------|---------------|-----|
| “Signed out” messages | Session expired | Re-login at `/student/login?segment=higher` |
| Balance not showing | No fee setup or no payment context | Contact fees office to verify programme fees |
| Paid but not reflected yet | Webhook confirmation delay | Wait briefly, then check receipts/history |
| Cannot claim account | Institution/email mismatch | Use exact org slug and checkout email |
| Admission number login fails | Typo or wrong institution | Re-select institution; paste admission no exactly |
| Cannot activate card | Card disabled or not opted in | Check `/student/card`, reserve card first |
| MoMo top-up fails | Invalid number/network/config | Re-enter Uganda number and retry selected rail |
| No confirmation email on register | Provider/domain config issue | Check spam; retry or use Google sign-in |

---

## Support

1. Open the help center: **[/help](/help)**.
2. Use the Knowledge base copilot on tuition pages when available.
3. Contact your institution’s fees office / registrar for programme, year/semester, and portal password issues.
4. For payments debited externally but unresolved in the portal, provide payment reference + receipt URL to school admin.

Related: [USER_GUIDE_INDEX.md](./USER_GUIDE_INDEX.md) · [USER_GUIDE_GUEST_PAYER.md](./USER_GUIDE_GUEST_PAYER.md) · [USER_GUIDE_ADMIN_HIGHER.md](./USER_GUIDE_ADMIN_HIGHER.md)
