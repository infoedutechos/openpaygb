# User Guide: Student Portal

## Overview

The student portal lets you:

- register/sign in,
- view tuition balance and programme progress,
- pay tuition (full or installments depending on setup),
- use OpenPayGB virtual card features,
- access receipts and payment history.

Primary URLs:

- Login: `/student/login`
- Register: `/student/register`
- Claim account after guest pay: `/student/claim`
- Student home: `/student`
- Tuition balance: `/student/balance`
- Pay tuition: `/student/pay`
- Virtual card: `/student/card`
- Receipts/history: `/my/receipts`

## 1) Register your account

### Option A: Continue with Google

1. Open `/student/register`.
2. Click "Continue with Google."
3. Complete Google consent.
4. Continue into school selection/portal onboarding flow.

### Option B: Email + password

1. Open `/student/register`.
2. Enter full name, email, and password.
3. Submit to receive a confirmation link.
4. Open the email and click confirm.
5. Continue to student/guest dashboard flow.

If email delivery is unavailable in development, a dev confirmation link may be shown.

## 2) Login

1. Go to `/student/login`.
2. Choose your school (slug dropdown).
3. Enter email and portal password.
4. Click sign in.

Alternative:

- If you registered with Google, use "Continue with Google."

If login says password is not set:

- use `/student/claim` (if you paid as guest), or
- contact school admin to enable portal password.

## 3) Claim your portal after paying as guest

Use this when you paid from `/pay/[orgSlug]` without a portal account.

1. Open `/student/claim`.
2. Select the same school used at checkout.
3. Enter the same email used when paying.
4. Set a new portal password.
5. Submit and continue to `/my/dashboard`.

## 4) Student home and dashboard

At `/student` you can see:

- your programme/year/semester identity,
- recent payments,
- quick links to receipts and password settings,
- virtual card panel,
- embedded tuition balance panel with installment cues.

## 5) Tuition balance page

Open `/student/balance` to view:

- total paid vs remaining,
- period-level details by year/semester,
- installment plans (next due installment),
- programme progress (completed vs remaining semesters/years).

Use "Pay tuition" button to continue to `/student/pay`.

## 6) Pay tuition (full or installments)

Payment starts from student flow (`/student/pay`) or direct checkout (`/pay/[orgSlug]`).

Typical steps:

1. Select programme/year/semester context.
2. Choose fee selection mode:
   - semester
   - year
   - full programme
3. If allowed, choose installment count.
4. Select payment method.
5. Complete payment and wait for confirmation.
6. Open receipt.

## 7) Payment methods

Supported rails in this codebase:

| Method | Typical flow |
|---|---|
| TON | On-chain transfer with memo/reference |
| Mbiyo | Mobile money collect via Mbiyo integration |
| LivePay | UGX mobile money collect |
| Relworx | East Africa mobile money collect |
| VixonPay | UGX mobile money collect |
| OpenPayGB card | Pay from your activated card balance |

Notes:

- Rail availability depends on platform/school configuration.
- Pending payments confirm asynchronously via rail webhooks.

## 8) OpenPayGB virtual card (activation and funding)

Open `/student/card`.

Card lifecycle:

1. Opt in/reserve card.
2. Activate pending card by paying issue fee:
   - TON activation transfer, or
   - Mobile money issue collect (LivePay/Relworx/VixonPay).
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

## 9) Receipts and payment history

Use:

- `/my/receipts` for all your payments
- `/receipt/[paymentId]` for a single receipt page
- `/api/receipts/[paymentId]/pdf` (via UI download action) for PDF copy

Confirmed payments show receipt links and downloadable proofs.

## 10) Password and security

Password settings:

- `/my/settings`
- Change password endpoint: `/api/auth/student/change-password`

Best practices:

- Use a unique password.
- Rotate password if you suspect account sharing or compromise.
- Keep school and email details accurate for account recovery.

## Troubleshooting

| Problem | Likely reason | Fix |
|---|---|---|
| "Signed out" messages | Session expired | Re-login at `/student/login` |
| Balance not showing | No fee setup or no payment context | Contact school admin to verify programme fees |
| Paid but not reflected yet | Webhook confirmation delay | Wait briefly, then check receipts/history |
| Cannot claim account | School/email mismatch | Use exact school slug and checkout email |
| Cannot activate card | Card disabled or not opted in | Check `/student/card`, reserve card first |
| MoMo top-up fails | Invalid number/network/config | Re-enter Uganda number and retry selected rail |
| No confirmation email on register | Provider/domain config issue | Check spam; retry or use Google sign-in |

## When to contact support

Contact school admin or platform support if:

- payment is debited externally but remains unresolved in portal,
- wrong programme/year/semester appears in your record,
- card status is stuck pending after successful payment evidence,
- you cannot access receipts for confirmed payments.
