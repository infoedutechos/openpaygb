# User Guide: Guest Payer (No Account Required)

## What guest checkout is

Guest checkout lets you pay tuition without creating a full student portal account first.

Entry points:

- `/pay` -> choose school
- `/pay/[orgSlug]` -> checkout for one school directly

After payment, you can later claim a portal account at `/student/claim` using the same school and email.

## 1) Choose school workspace

1. Open `/pay`.
2. Select your school from active organizations.
3. You are routed to `/pay/[orgSlug]`.

If your school is not listed:

- it may still be pending approval,
- or slug may be incorrect.

Use `/admin/register` to request a workspace if needed.

## 2) Checkout steps in `/pay/[orgSlug]`

Typical flow in the checkout wizard:

1. Confirm school context.
2. Select or enter student identity details.
3. Choose programme, year, and semester.
4. Choose fee selection mode:
   - semester
   - year
   - full programme
5. If available, choose installment count.
6. Select payment method.
7. Submit payment.
8. Track completion and open receipt.

## 3) Guest identity details

For guest pay, you usually provide:

- name
- email
- mobile number (for MoMo rails)
- programme/year/semester context

Important:

- Use your real email if you plan to claim portal access later.
- Keep the same school slug + email combination for claim flow.

## 4) Payment methods available to guests

| Method | How it works |
|---|---|
| TON | Transfer to school/platform wallet with memo/reference |
| Mbiyo | Mobile money collect flow through Mbiyo |
| LivePay | Uganda mobile money collect |
| Relworx | Mobile money collect integration |
| VixonPay | Uganda mobile money collect integration |
| OpenPayGB card pay | If eligible and configured, pay from virtual card balance |

Availability depends on platform and tenant configuration.

## 5) Installments in guest checkout

If enabled for the selected fee context:

- you may split payment into installments,
- each installment creates its own payment slice/index,
- remaining dues appear in tuition balance and future checkout.

## 6) Receipts

After successful payment:

- open receipt at `/receipt/[paymentId]`,
- download PDF receipt where available,
- keep payment id/reference for support.

## 7) Claim your portal account later

To convert guest payments into a full student portal account:

1. Open `/student/claim`.
2. Select the same school.
3. Enter the same email used in guest checkout.
4. Set a portal password.
5. Sign in at `/student/login`.

## Common issues and fixes

| Issue | Why it happens | What to do |
|---|---|---|
| School page says unavailable | Workspace pending/inactive or wrong slug | Return to `/pay` and reselect active school |
| Number rejected on MoMo | Invalid E.164/Uganda number format | Re-enter with correct format/rules |
| Payment pending too long | Provider callback delay | Wait a few minutes, then recheck receipt |
| Paid but cannot claim portal | Email mismatch from checkout | Use exact checkout email; contact school admin |
| Installment button missing | School/fee context does not allow installments | Continue with full/available plan |
| OpenPay card option missing | Card disabled/not eligible | Use another rail or activate card via student portal |

## Guest payer best practices

- Screenshot confirmation screen and keep payment id.
- Use a valid email for recoverability and receipts.
- Do not submit duplicate payments while one is still pending.
- Confirm school slug before final submit.

## Support escalation details to share

When contacting support, provide:

- school slug (`[orgSlug]` from URL),
- payment id (if generated),
- rail used (TON, LivePay, etc.),
- timestamp and amount,
- phone/email entered during checkout.
