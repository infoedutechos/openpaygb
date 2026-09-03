# Receipt branding (dual letterhead)

**Last updated:** 2026-07-18  
**Audience:** Platform operators, school / higher-institution admins, support  
**School settings path:** `/admin/settings#receipt-letterhead`

Official fee receipts show **two letterhead blocks**:

1. **MAC / ODEL HUB platform** — platform display name, logo, support phone/email, site URL  
2. **School / institution** — org name, letterhead logo (or favicon fallback), phone, email, address, website  

Period labels on receipt lines use **Term** for school tenants and **Semester** for higher institutions (`getReceiptBranding` → `periodLabel`).

Implementation: `lib/receipt-branding.ts` · UI: `components/admin/OrgLetterheadSettings.tsx`

---

## Platform block (MAC)

| Field | Source |
|-------|--------|
| Name | Platform branding (`getPlatformBranding` / display name) |
| Logo | Platform logo from site UI settings (`platformLogoUrl`) |
| Phone | Site UI support phone (if `showSupportPhone`), else `NEXT_PUBLIC_SUPPORT_PHONE` |
| Email | Site UI support email (if `showSupportEmail`), else `NEXT_PUBLIC_SUPPORT_EMAIL` |
| Website | App base URL (`/`) |

Master operators configure platform logo and support contacts in the Master Console (site UI / platform branding sections). Those values appear on **every** tenant receipt’s platform block.

---

## School / institution block

| Field | Source |
|-------|--------|
| Name | `Organization.name` |
| Logo | Uploaded letterhead logo via `/api/org/<slug>/letterhead-logo`, else org favicon if present |
| Phone | `letterheadPhone` |
| Email | `letterheadEmail`, else registration contact email |
| Address | `letterheadAddress` |
| Website | `registrationWebsiteUrl` |

### Admin how-to

1. Sign in as org admin → open **`/admin/settings#receipt-letterhead`**.
2. **Upload letterhead logo** (preferred over favicon-only).
3. Enter phone, email, and address.
4. Click **Save letterhead contacts**.
5. Optionally remove/replace the logo via the same section.

APIs:

- `GET/PATCH /api/admin/organization/settings` — contacts and metadata  
- `POST/DELETE /api/admin/organization/letterhead-logo` — logo upload/remove  
- `GET /api/org/[slug]/letterhead-logo` — public image for receipts and share cards  

---

## Where branding appears

| Surface | Behavior |
|---------|----------|
| **Receipt Preview** (admin / payer UI) | Both letterhead blocks rendered |
| **PDF download** | `/api/receipts/[paymentId]/pdf` embeds dual branding |
| **Public receipt page** | `/receipt/[paymentId]` |
| **Receipt email** | When email delivery is configured, HTML follows the same branding helpers |

Payers should still see a recognizable **school** identity even when the payment rail is platform-operated.

---

## Verification checklist

1. Upload logo and save contacts under `/admin/settings#receipt-letterhead`.
2. Complete a test payment (or open an existing confirmed payment).
3. Open `/receipt/<paymentId>` — confirm platform + school names/logos/contacts.
4. Download PDF — confirm both blocks print cleanly (logo URLs must be absolute / reachable).
5. If logo missing: ensure `letterheadLogoUploadedAt` is set; otherwise favicon fallback; otherwise school name-only.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Only platform logo shows | Upload school letterhead; clear CDN/cache with `?v=` timestamp on logo URL |
| Wrong support phone on all receipts | Update Master site UI support fields / env defaults |
| Term vs Semester wording wrong | Check `Organization.institutionTier` (`school` → Term, else Semester) |
| Logo 404 | Confirm org slug and that logo bytes exist; hit `/api/org/<slug>/letterhead-logo` |

---

## Related

- [guides/USER_GUIDE_ADMIN_SCHOOLS.md](./guides/USER_GUIDE_ADMIN_SCHOOLS.md)
- [guides/USER_GUIDE_ADMIN_HIGHER.md](./guides/USER_GUIDE_ADMIN_HIGHER.md)
- [guides/USER_GUIDE_STUDENT_SCHOOLS.md](./guides/USER_GUIDE_STUDENT_SCHOOLS.md)
- [ADMISSION_NUMBER_FORMAT.md](./ADMISSION_NUMBER_FORMAT.md)
- [LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md](./LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md)
