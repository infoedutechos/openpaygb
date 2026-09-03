# Dual admin authentication

ODEL HUB Pay runs **two** admin session systems in the same Next.js app:

| System | Cookie | Login API | Used for |
|--------|--------|-----------|----------|
| **Tuition hub** | `odelhub_admin` (JWT) | `POST /api/auth/login` | School admins, platform masters — `/admin` tuition hub, `/school/login` |
| **URA / game** | `admin_session` | `POST /api/admin/login` | Legacy Telegram game operator pages under `/admin/*` (tasks, bot-users, shop, …) |

## Operator guidance

- **Schools and tuition:** always **`/school/login`** → tuition JWT.
- **Game / Telegram ops:** URA login when `ACCESS_ADMIN` / game tooling is enabled — do not mix credentials across shells.
- **Middleware** (`app/admin/layout.tsx`): allows tuition JWT **or** URA session **or** localhost `ACCESS_ADMIN` bypass.

## Item password gate

URA-only paths (accounts, bot-users, tasks, …) may require a second **`admin_item`** cookie when `ADMIN_ITEM_PASSWORD` is set. Tuition JWT (`odelhub_admin`) **bypasses** the item gate.

## JWT secrets (tuition)

Prefer split secrets in production (all fall back to `JWT_SECRET`):

- `JWT_SECRET_ADMIN` — `odelhub_admin`
- `JWT_SECRET_STUDENT` — student + signup cookies
- `JWT_SECRET_CHECKOUT` — guest checkout session
- `JWT_SECRET_RECEIPT` — receipt HMAC links (optional; falls back to checkout secret)

See `lib/jwt-secrets.ts`.
