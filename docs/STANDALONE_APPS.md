# Standalone apps — OdelPay Universities, Schools, OpenPayGB, Dex Hub, Play, OdelHub Devs

Six product surfaces can run as **true standalone apps** from the same Next.js codebase: isolated chrome, root `/` → lobby, path isolation, and app-specific metadata.

| App | Lobby | Env (`STANDALONE_APP`) | Example host |
|-----|-------|------------------------|--------------|
| OdelPay Universities | `/OdelPayUniversities` | `odelpay_universities` | `universities.odelpay.vercel.app` |
| OdelPay Schools | `/OdelPaySchools` | `odelpay_schools` | `schools.odelpay.vercel.app` |
| OpenPayGB | `/opgb` | `openpaygb` | `opgb.odelpay.vercel.app` |
| Dex Hub | `/dex` | `dex` | `dex.odelpay.vercel.app` |
| Play Hub | `/clicker` | `play` | `play.odelpay.vercel.app` |
| OdelHub Devs | `/developers` | `odelhub_devs` | `developers.odelpay.vercel.app` |

Registry: `lib/standalone-apps.ts`. Middleware sets `x-standalone-app` and enforces allowed routes.

---

## Mode A — Subdomains on one Vercel project (recommended)

1. Deploy the monolith as today (`odelpay.vercel.app`).
2. In [Vercel → odelpay → Domains](https://vercel.com/odeldevelopers-projects/odelpay/settings/domains), add each subdomain (e.g. `universities.odelpay.vercel.app` or custom DNS).
3. No extra env vars — middleware resolves the app from `Host`.
4. Visiting `/` on that domain rewrites to the lobby; cross-app paths (e.g. `/clicker` on the universities host) redirect back to the lobby.

---

## Mode B — Separate Vercel projects (strict isolation)

Create one project per app, same repo, different production env:

```env
STANDALONE_APP=play
NEXT_PUBLIC_APP_URL=https://play.odelpay.vercel.app
```

`STANDALONE_APP` overrides host detection. Use when you want separate scaling, env, or cron scope.

---

## Local development

```bash
# Play only — root / → /clicker, no ODEL HUB header
STANDALONE_APP=play npm run dev

# Universities lobby
STANDALONE_APP=odelpay_universities npm run dev
```

Or open path lobbies on the default dev server without env:

- http://localhost:3000/OdelPayUniversities
- http://localhost:3000/OdelPaySchools
- http://localhost:3000/opgb
- http://localhost:3000/dex
- http://localhost:3000/clicker
- http://localhost:3000/developers

Subdomain simulation locally requires `/etc/hosts` or a reverse proxy; `STANDALONE_APP` is simpler.

---

## UX when standalone

- Global ODEL HUB header, footer, and bottom nav are hidden.
- Branded top bar shows app title (from registry).
- Tuition / Dex / Play bottom navs drop cross-hub links (Play, Dex, Pay tuition, etc.).
- Universities vs schools register links use `?segment=higher` / `?segment=schools`.

---

## Allowed routes (summary)

| App | Key prefixes |
|-----|----------------|
| Universities | `/OdelPayUniversities`, `/pay`, `/receipt`, `/admin`, `/school`, `/help` |
| Schools | `/OdelPaySchools`, same tuition/admin flows |
| OpenPayGB | `/opgb`, `/student`, `/my`, `/dex`, `/receipt` |
| Dex | `/dex`, `/student`, `/my`, `/opgb` |
| Play | `/clicker`, `/playhub` |
| OdelHub Devs | `/developers`, `/help`, `/docs` |

`/api`, `/_next`, static assets always pass through.

---

## Verify

```bash
npm run verify
```

Tests: `lib/__tests__/standalone-apps.test.ts`.

---

## Related docs

- [PRODUCT_LINES_AND_SCHOOL_TERMS.md](./PRODUCT_LINES_AND_SCHOOL_TERMS.md) — product line lobbies on the monolith home
- [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md) — production deploy
