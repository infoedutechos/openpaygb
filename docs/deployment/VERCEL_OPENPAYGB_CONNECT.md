# Connect OpenPayGB on Vercel

**Broken filter (deleted GitHub repo):**  
`https://vercel.com/odeldevelopers-projects?repo=https%3A%2F%2Fgithub.com%2Fopenpayglobal%2Fopenpaygb`

**Working filter after Git is fixed (infoedutechos mirror):**  
`https://vercel.com/odeldevelopers-projects?repo=https%3A%2F%2Fgithub.com%2Finfoedutechos%2Fopenpaygb`

**Project:** [openpaygb](https://vercel.com/odeldevelopers-projects/openpaygb) · Team: [odeldevelopers-projects](https://vercel.com/odeldevelopers-projects)  
**Live wallet (Mode A on monolith):** `https://odelpay.vercel.app/opgb` · host pattern `opgb.odelpay.vercel.app`  
**GitHub mirror:** [infoedutechos/openpaygb](https://github.com/infoedutechos/openpaygb)  
**Monolith source of truth:** [infoedutechos/ODELHUBPay](https://github.com/infoedutechos/ODELHUBPay)

---

## Why the old link broke

| Fact | Detail |
|------|--------|
| Vercel project `odelpay` Git credential | Bound to GitHub user **`openpayglobal`** |
| Linked repo | `openpayglobal/openpaygb` (repo **deleted**; account still exists, 0 repos) |
| Current CLI login | **`infoedutechos`** — owns `ODELHUBPay` and the new `openpaygb` mirror |
| Result | Vercel cannot see `infoedutechos/*` through the `openpayglobal` GitHub App install, so CLI/`git connect` to the mirror fails with “no write access” / “repo not found” |

---

## Fix A — Restore original `openpayglobal/openpaygb` (keeps old Vercel filter)

1. Sign in to GitHub as **`openpayglobal`** (not `infoedutechos`).
2. Create public repo **`openpaygb`** (empty is fine).
3. From this workspace:

```powershell
cd E:\ODELHUB-Pay
git remote add openpayglobal https://github.com/openpayglobal/openpaygb.git
git push -u openpayglobal HEAD:main
```

4. Accept the collaborator invite on [infoedutechos/openpaygb](https://github.com/infoedutechos/openpaygb/invitations) if you want both remotes.
5. Confirm [odelpay → Settings → Git](https://vercel.com/odeldevelopers-projects/odelpay/settings/git) shows `openpayglobal/openpaygb`.
6. Open the original filter URL — it should list **odelpay** again.

---

## Fix B — Point Vercel Git at `infoedutechos` (recommended long-term)

1. In Vercel (logged in as `info.edutechos@gmail.com`): [Team → Settings → Git](https://vercel.com/odeldevelopers-projects/~/settings/git) → connect / reconnect **GitHub** as **`infoedutechos`**.
2. On GitHub: [Applications → Vercel](https://github.com/settings/installations) → grant **ODELHUBPay** and **openpaygb** (or all repos).
3. Relink projects:
   - `odelpay` → `infoedutechos/ODELHUBPay`
   - `openpaygb` → `infoedutechos/openpaygb`
4. Use the **working filter** URL at the top of this doc.

---

## Mode B project `openpaygb`

Standalone project already created under the team. Production env should include:

```env
STANDALONE_APP=openpaygb
NEXT_PUBLIC_APP_URL=https://openpaygb.vercel.app
```

Copy the same DB/JWT/payment secrets as `odelpay` (or share via Vercel shared env). Until Git is fixed (A or B), deploy with CLI from a linked checkout:

```powershell
vercel link --yes --project openpaygb --scope odeldevelopers-projects
vercel --prod --scope odeldevelopers-projects
```

Or use `.github/workflows/vercel-deploy.yml` with `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` secrets on `infoedutechos/ODELHUBPay`.

---

## Related

- [STANDALONE_APPS.md](../platform/STANDALONE_APPS.md)
- [VERCEL_ODELPAY_DEPLOY.md](./VERCEL_ODELPAY_DEPLOY.md)
