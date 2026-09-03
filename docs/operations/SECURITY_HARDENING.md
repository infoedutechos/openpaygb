# Security hardening (2026-06-03)

Autonomous pass covering auth gates, IDOR, receipts, webhooks, rate limits, XSS, and headers.

## Critical fixes

| Area | Change |
|------|--------|
| `POST /api/payments` | `org_admin` scoped to own tenant (was IDOR) |
| `/api/admin/notifications` GET | Requires tuition JWT or verified URA shell session |
| `/admin/notifications` UI | Removed middleware + layout bypass |
| Middleware | `admin_session` verified with HMAC, not cookie presence only |

## High

| Area | Change |
|------|--------|
| Receipts | HMAC `?t=` token; admin/student owner bypass; rate limits |
| Checkout session | No resume without email unless school admin; checkout JWT cookie-only for guests |
| MoMo / Mbiyo webhooks | UGX amount verification; Mbiyo requires `MBIYO_SECRET_KEY` in production |
| Production health | `HEALTH_CHECK_SECRET` required when `NODE_ENV=production` |
| URA dev bypass | `ACCESS_ADMIN` localhost bypass disabled in production |

## Medium

| Area | Change |
|------|--------|
| Rate limits | verify, quote, forgot/reset password, receipt, payment poll |
| Mbiyo instructions | Server strip HTML; client renders plain text (no `dangerouslySetInnerHTML`) |
| Headers | HSTS, CSP, `X-DNS-Prefetch-Control` |
| Admin item password | Zod + rate limit |

## Receipt links

Confirmed payments expose `receiptAccessToken` on `GET /api/payments/:id/public` (after confirm). Email and Pay success links include `?t=`.

## Remaining (operational)

- Enable **Upstash** (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) for distributed limits — see `lib/rate-limit-distributed.ts`
- Set split JWT env vars in production — see `lib/jwt-secrets.ts` and `docs/operations/DUAL_ADMIN_AUTH.md`
- Legacy `/api/collect/*` returns **410** — use `/api/public/checkout/*`
