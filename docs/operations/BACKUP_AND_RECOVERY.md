# Backup, disaster recovery & migration

## Overview

| Tier | Mechanism | Scope | Restore |
|------|-----------|-------|---------|
| **1 — Primary DR** | MongoDB Atlas backups / point-in-time recovery (PITR) | Full database (tuition + game) | Atlas console or support |
| **2 — App export** | Master Admin → **Download backup** (`GET /api/master/backup`) | Tuition v2 JSON | CLI or Master UI restore |
| **3 — Dev reset** | `npm run seed` | Demo data only | Wipes tuition tables |

---

## Export (backup v2)

**Who:** Platform master (`/admin/master` → System backup).

**Collections included:**

- `organizations`, `programmes`, `programmeFees`, `students`, `payments`, `fxRates`
- `siteUiSettings` (incl. platform logo as base64)
- `adminUsers` — **no `passwordHash`**
- `processedWebhooks`, `studentSignupTokens` — **no token/password hashes**
- `partnerApiKeys` — **no `keyHash`** (metadata only)
- `partnerWebhookEndpoints`, `mobileMoneyProviders` — **secrets redacted**
- `partnerWebhookDeliveries`

**Not included:** URA Play Hub game collections (`User`, pearls, leagues, …).

**CLI equivalent:** download via browser or call the API with master session cookie.

---

## Restore modes

| Mode | Behavior | When to use |
|------|----------|-------------|
| `dryRun` | Validate JSON, referential integrity, warn about existing data | Before any destructive step |
| `replaceTuition` | **Delete all tuition-scoped rows**, then insert backup (preserves document `_id`s) | Empty staging DB or full tuition rebuild |
| `mergeUpsert` | Upsert organizations by **slug**; programmes by org+code; students/payments/etc. by **id** | Import into DB that already has some data |

### After restore

1. `npm run master:set-login` — master admin password (exported admins have no password hash).
2. Re-create **partner API keys** and **PSP webhook secrets** in Master Admin (redacted in export).
3. Verify `NEXT_PUBLIC_APP_URL`, webhooks, and cron env on the target deployment.

---

## Master Admin UI

1. **Download backup** — live export.
2. **Restore from file** — choose `.json`, select mode, type `RESTORE` for destructive modes, run.

API: `POST /api/master/backup/restore` (multipart: `file`, `mode`, `confirm`).

---

## CLI restore

```bash
# Validate only
npm run backup:restore -- --file ./odelhub-tuition-backup.json --dry-run

# Full tuition replace (destructive)
npm run backup:restore -- --file ./odelhub-tuition-backup.json --replace --confirm RESTORE

# Merge into existing DB
npm run backup:restore -- --file ./odelhub-tuition-backup.json --merge --confirm RESTORE
```

Requires `DATABASE_URL` in `.env.local`.

---

## Production safety

- Restore writes are **blocked in production** unless `ALLOW_TUITION_RESTORE=true` on Vercel.
- Prefer **Atlas PITR** for production incidents.
- Use app restore on **staging** clones to test migration.

---

## Migration playbooks

### A. Move tuition to a new MongoDB cluster

1. Export from source: Master **Download backup**.
2. `prisma db push` on target cluster.
3. `npm run backup:restore -- --file backup.json --replace --confirm RESTORE`
4. Update `DATABASE_URL`, deploy, `npm run master:set-login`, reconfigure integrations.

### B. Clone one school (partial)

Use **mergeUpsert** with a backup filtered to one org (manual JSON edit) or use org approval + template clone (`default` slug) for greenfield schools.

### C. Programmes only

`POST /api/admin/programmes/import` (CSV, max 250 rows) — no full snapshot needed.

### D. Payments to ERP

`GET /api/payments/export` (CSV) or Partner API `GET /api/partner/v1/payments`.

---

## JSON format

```json
{
  "meta": {
    "exportedAt": "ISO-8601",
    "app": "ODELHUB Pay",
    "version": 2,
    "scope": "tuition",
    "counts": { "organizations": 1, "payments": 0 }
  },
  "data": {
    "organizations": [ { "id": "…", "slug": "default", … } ],
    "programmes": [],
    …
  }
}
```

Binary fields: `{ "__type": "bytes", "base64": "…" }`.

---

## Related

- [DEPLOYMENT_ARCHITECTURE.md](../architecture/DEPLOYMENT_ARCHITECTURE.md) — Atlas connection
- [PARTNER_API.md](../platform/PARTNER_API.md) — incremental sync
- [SIS_INTEGRATION_COOKBOOK.md](../platform/SIS_INTEGRATION_COOKBOOK.md) — checkout integration
