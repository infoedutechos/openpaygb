# Flow documentation (index)

Canonical narratives for how people and data move through ODEL HUB TON Pay:

| Document | Audience / topic |
|----------|------------------|
| [USER_FLOW.md](./USER_FLOW.md) | Payers & public UX — home, checkout, payment, receipt |
| [MULTI_TENANT_FLOW.md](./MULTI_TENANT_FLOW.md) | Workspaces (organizations), slugs, isolation, Telegram tenant |
| [SCHOOL_ADMIN_LOGIN.md](./SCHOOL_ADMIN_LOGIN.md) | **How school staff sign in** — `/school/login`, provisioning, vs master |
| [MBIYO_WEBHOOK_SETUP.md](./MBIYO_WEBHOOK_SETUP.md) | Mbiyo webhook URL, Live/Test API & public keys, webhook secret |
| [PRODUCTION_GO_LIVE.md](./PRODUCTION_GO_LIVE.md) | Vercel deploy, env sync, smoke tests |
| [ADMIN_FLOW.md](./ADMIN_FLOW.md) | School **org admin** — dashboard, students, payments, search |
| [MASTER_ADMIN_FLOW.md](./MASTER_ADMIN_FLOW.md) | Platform **master** — tenants, approvals, org admins, drill-down |

Related: [USER_STORIES.md](./USER_STORIES.md) (acceptance-style epics), [openapi.yaml](./openapi.yaml) (HTTP shapes), [ECONOMICS.md](./ECONOMICS.md) (UGX / TON / FX).

**Interactive library:** open [index.html](./index.html) via a static server (`npm run docs:serve`) — searchable hub with print support.
