/**
 * Writes docs/api-reference/API_INVENTORY.csv, docs/api-reference/UI_ROUTES.csv,
 * and docs/architecture/UI_VS_CODEBASE.md
 * Run: node scripts/export-api-inventory.cjs
 */

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const appDir = path.join(root, "app");
const apiRoot = path.join(appDir, "api");

const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory() && SKIP_DIRS.has(name.name)) continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, predicate, out);
    else if (predicate(p, name.name)) out.push(p);
  }
  return out;
}

function relPosix(fromRoot) {
  return path.relative(root, fromRoot).replace(/\\/g, "/");
}

function routeFileToUrl(routeFile) {
  const rel = relPosix(routeFile);
  const without = rel.replace(/^app\//, "").replace(/\/route\.ts$/, "");
  return "/" + without;
}

function extractHttpMethods(content) {
  const methods = new Set();
  let m;
  const reAsync = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  const reSync = /export\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  const reConst = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/g;
  while ((m = reAsync.exec(content))) methods.add(m[1]);
  while ((m = reSync.exec(content))) methods.add(m[1]);
  while ((m = reConst.exec(content))) methods.add(m[1]);
  return [...methods].sort();
}

function csvEscape(s) {
  const t = String(s);
  if (/[",\r\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function pageFileToUiRoute(pageFile) {
  const rel = relPosix(pageFile);
  let dir = path.dirname(rel).replace(/^app/, "") || "/";
  /** Next.js route groups `(segment)` are not URL segments — strip for docs/UI_ROUTES.csv */
  dir = dir.replace(/\/\([^)]+\)/g, "");
  if (dir === "/" || dir === "") return "/";
  return dir.replace(/\\/g, "/");
}

/** All route.ts under app/api/admin/{segment}/ */
function apisUnderAdminSegment(segment) {
  const base = path.join(apiRoot, "admin", segment);
  if (!fs.existsSync(base)) return [];
  return walkFiles(base, (fp, n) => n === "route.ts").sort();
}

const PAY_CHECKOUT_APIS = [
  "/api/programmes",
  "/api/programmes/[code]/quote",
  "/api/public/checkout/session",
  "/api/public/checkout/student",
  "/api/public/checkout/payment",
  "/api/public/checkout/ton-pay-transfer",
  "/api/public/checkout/mbiyo-start",
  "/api/public/checkout/livepay-start",
  "/api/public/checkout/relworx-start",
  "/api/public/checkout/vixonpay-start",
  "/api/public/checkout/openpay-card-pay",
  "/api/public/checkout/openpay-card-eligibility",
  "/api/public/checkout/balance",
  "/api/payments/[id]/public",
  "/api/payments",
  "/api/payments/[id]",
  "/api/manifest/tonconnect",
];

/** Explicit UI → API mappings (segment heuristics miss cross-namespace routes). */
const UI_API_MAP = {
  "/admin/login": ["/api/auth/login", "/api/auth/logout", "/api/auth/forgot-password", "/api/auth/reset-password"],
  "/admin/profile": ["/api/auth/me", "/api/auth/admin/profile", "/api/auth/admin/profile-image"],
  "/admin/tuition-balance": ["/api/admin/tuition-balances"],
  "/admin/virtual-cards": ["/api/admin/openpay-cards"],
  "/admin/users": ["/api/admin/org-users"],
  "/admin/payment-requests": ["/api/admin/payment-requests", "/api/public/payment-requests/[id]"],
  "/admin/receipts": ["/api/receipts/[paymentId]", "/api/receipts/[paymentId]/pdf"],
  "/admin/reports": ["/api/admin/summary", "/api/payments/export"],
  "/admin/programmes": ["/api/admin/programmes", "/api/admin/programmes/[id]", "/api/admin/programmes/[id]/fees"],
  "/admin/settings": ["/api/auth/me", "/api/fx/rate"],
  "/school/workspace-status": ["/api/public/workspace-status"],
  "/school/login": ["/api/auth/login"],
  "/dex": [
    "/api/public/dex/amm-quote",
    "/api/public/dex/buy-quote",
    "/api/public/dex/p2p",
  ],
  "/dex/buy": ["/api/public/dex/buy-quote", "/api/public/dex/buy"],
  "/dex/amm": ["/api/public/dex/amm-quote", "/api/student/dex/amm-swap"],
  "/dex/p2p": [
    "/api/public/dex/p2p",
    "/api/student/dex/p2p/escrow",
    "/api/student/dex/p2p/offers",
  ],
  "/student": ["/api/student/opgb-wallet", "/api/student/openpay-card", "/api/auth/me"],
  "/student/card": [
    "/api/student/openpay-card",
    "/api/student/openpay-card/opt-in",
    "/api/student/openpay-card/issue/transfer",
    "/api/student/openpay-card/issue/momo-start",
    "/api/student/openpay-card/fund/transfer",
    "/api/student/openpay-card/fund/momo-start",
  ],
};

function inferPayApis(uiRoute) {
  if (uiRoute === "/") {
    return ["(marketing shell; may call /api/programmes, /api/fx/rate from client)"];
  }
  if (uiRoute === "/pay" || uiRoute === "/pay/[orgSlug]") {
    return PAY_CHECKOUT_APIS;
  }
  if (uiRoute.startsWith("/receipt/")) {
    return ["/api/receipts/[paymentId]", "/api/receipts/[paymentId]/pdf"];
  }
  return [];
}

function apisForAdminUi(ui, allApiUrls) {
  if (UI_API_MAP[ui]) return UI_API_MAP[ui];
  if (ui === "/admin") return ["/api/admin/summary"];
  if (ui === "/admin/payments") return ["/api/payments", "/api/payments/[id]", "/api/payments/export"];
  if (ui === "/admin/students") return ["/api/students"];
  if (/^\/admin\/students\//.test(ui)) return ["/api/students/[id]"];
  if (ui === "/admin/export") return ["/api/admin/export"];
  if (ui.startsWith("/admin/master")) {
    return allApiUrls.filter((u) => u.startsWith("/api/master/"));
  }
  const seg = /^\/admin\/([^/]+)/.exec(ui);
  if (seg) {
    const files = apisUnderAdminSegment(seg[1]);
    const apis = files.map(routeFileToUrl);
    if (apis.length) return apis;
    return [`(none under /api/admin/${seg[1]}/ — see UI_API_MAP in export-api-inventory.cjs)`];
  }
  return [];
}

// --- API CSV ---
const routeFiles = walkFiles(apiRoot, (fp, n) => n === "route.ts").sort();
const apiRows = [["url_path", "relative_file", "http_methods", "method_count"].map(csvEscape).join(",")];
for (const file of routeFiles) {
  const content = fs.readFileSync(file, "utf8");
  const methods = extractHttpMethods(content);
  apiRows.push(
    [
      csvEscape(routeFileToUrl(file)),
      csvEscape(relPosix(file)),
      csvEscape(methods.join(";")),
      methods.length,
    ].join(",")
  );
}
fs.mkdirSync(path.join(root, "docs", "api-reference"), { recursive: true });
fs.mkdirSync(path.join(root, "docs", "architecture"), { recursive: true });
fs.writeFileSync(path.join(root, "docs", "api-reference", "API_INVENTORY.csv"), apiRows.join("\n") + "\n", "utf8");
fs.writeFileSync(path.join(root, "docs", "API_INVENTORY.csv"), "Moved to api-reference/API_INVENTORY.csv\n", "utf8");

// --- UI pages CSV ---
const pageFiles = walkFiles(appDir, (fp, n) => n === "page.tsx").sort((a, b) => relPosix(a).localeCompare(relPosix(b)));
const uiRows = [["ui_route", "relative_file"].map(csvEscape).join(",")];
for (const file of pageFiles) {
  uiRows.push([csvEscape(pageFileToUiRoute(file)), csvEscape(relPosix(file))].join(","));
}
fs.writeFileSync(path.join(root, "docs", "api-reference", "UI_ROUTES.csv"), uiRows.join("\n") + "\n", "utf8");
fs.writeFileSync(path.join(root, "docs", "UI_ROUTES.csv"), "Moved to api-reference/UI_ROUTES.csv\n", "utf8");

// --- UI vs codebase markdown ---
const apiUrlSet = new Set(routeFiles.map(routeFileToUrl));

const lines = [];
lines.push("# UI vs codebase");
lines.push("");
lines.push("This file is **generated** by `npm run docs:inventory`. It compares App Router **pages** to **API route handlers** and calls out integration-only routes.");
lines.push("");
lines.push("## Regenerate");
lines.push("");
lines.push("```bash");
lines.push("npm run docs:tree:write   # optional: refresh ASCII tree → docs/architecture/FOLDER_TREE_SNAPSHOT.txt");
lines.push("npm run docs:inventory   # writes api-reference CSVs + architecture/UI_VS_CODEBASE.md");
lines.push("```");
lines.push("");
lines.push("## Exported machine-readable inventories");
lines.push("");
lines.push("| File | Contents |");
lines.push("|------|-----------|");
lines.push("| [API_INVENTORY.csv](../api-reference/API_INVENTORY.csv) | Every `app/api/**/route.ts` URL, file path, exported HTTP methods |");
lines.push("| [UI_ROUTES.csv](../api-reference/UI_ROUTES.csv) | Every `app/**/page.tsx` UI path and file path |");
lines.push("");
lines.push("## Public / pay UI → typical APIs");
lines.push("");
lines.push("| UI route | Typical or dedicated APIs |");
lines.push("|----------|---------------------------|");
for (const r of ["/", "/pay", "/pay/[orgSlug]", "/receipt/[paymentId]", "/clicker"]) {
  const apis =
    r === "/clicker"
      ? [
          "(URA Telegram mini-app shell; uses `components/*`, `utils/consts` `WALLET_MANIFEST_URL`, TonConnect in `app/clicker/layout.tsx`)",
        ]
      : inferPayApis(r);
  lines.push(`| ${r} | ${apis.join(", ")} |`);
}
lines.push("");
lines.push("## Admin UI → API coverage");
lines.push("");
lines.push("| UI route | Mapped API paths (under `app/api`) | Match |");
lines.push("|----------|----------------------------------------|-------|");

const adminPageFiles = pageFiles
  .filter((pf) => pageFileToUiRoute(pf).startsWith("/admin"))
  .sort((a, b) => pageFileToUiRoute(a).localeCompare(pageFileToUiRoute(b)));

const allApiUrls = routeFiles.map(routeFileToUrl);

for (const pf of adminPageFiles) {
  const ui = pageFileToUiRoute(pf);
  const apis = apisForAdminUi(ui, allApiUrls);
  const notes = [];
  const resolved = apis.filter((u) => !u.startsWith("("));
  const exists = (u) => apiUrlSet.has(u);
  const match =
    resolved.length && resolved.every(exists) ? "yes" : resolved.some(exists) ? "partial" : "no";
  if (ui === "/admin/login") notes.push("Tuition login uses `POST /api/auth/login` (not legacy `/api/admin/login` URA game shell).");
  if (ui.startsWith("/admin/students")) notes.push("Student APIs under `/api/students`, not `/api/admin/students`.");
  if (ui === "/admin/payments") notes.push("Payments under `/api/payments`; CSV export at `/api/payments/export`.");
  if (ui.startsWith("/admin/master")) notes.push("Master console uses `/api/master/*`, not `/api/admin/master/*`.");
  if (ui === "/admin/notifications") {
    notes.push("URA game admin surface; requires `admin_session` cookie per `middleware.ts` (not a public bypass).");
  }
  const noteStr = notes.length ? ` — ${notes.join(" ")}` : "";
  lines.push(`| ${ui} | ${apis.join("<br>")} | ${match}${noteStr} |`);
}

lines.push("");
lines.push("## Dex / student / school UI → typical APIs");
lines.push("");
lines.push("| UI route | Mapped API paths | Match |");
lines.push("|----------|------------------|-------|");
for (const ui of [
  "/dex",
  "/dex/buy",
  "/dex/amm",
  "/dex/p2p",
  "/student",
  "/student/card",
  "/school/workspace-status",
  "/school/login",
]) {
  const apis = UI_API_MAP[ui] ?? [];
  const exists = (u) => apiUrlSet.has(u);
  const match = apis.length && apis.every(exists) ? "yes" : apis.some(exists) ? "partial" : "no";
  lines.push(`| ${ui} | ${apis.join("<br>")} | ${match} |`);
}

lines.push("");
lines.push("## `/api/*` routes outside `/api/admin/*`");
lines.push("");
lines.push(
  "These handlers are not namespaced under `/api/admin/`. Several are still used from **admin** pages (e.g. `/admin/payments` → `/api/payments`, `/admin/students` → `/api/students`). Others are **integration-only** (cron, webhooks, TON manifest) or **public pay**."
);
lines.push("");
for (const file of routeFiles) {
  const u = routeFileToUrl(file);
  if (!u.startsWith("/api/")) continue;
  if (u.startsWith("/api/admin/")) continue;
  lines.push(`- \`${u}\` — \`${relPosix(file)}\``);
}

lines.push("");
lines.push("## Documentation vs tree (manual)");
lines.push("");
lines.push("| `docs/README.md` claims | This repo |");
lines.push("|----------------------------|-----------|");
lines.push("| Student portal `/student`, `/student/login` | **Yes** — `app/student/**/page.tsx` |");
lines.push("| Master console `/admin/master` | **Yes** — `app/admin/master/`; verify `/api/master/*` against `app/api/master/` |");
lines.push("");
lines.push("*Align README or add routes so product and code match.*");

fs.writeFileSync(path.join(root, "docs", "architecture", "UI_VS_CODEBASE.md"), lines.join("\n") + "\n", "utf8");
fs.writeFileSync(
  path.join(root, "docs", "UI_VS_CODEBASE.md"),
  "# Moved\n\n**New location:** [`architecture/UI_VS_CODEBASE.md`](./architecture/UI_VS_CODEBASE.md)\n",
  "utf8",
);

console.log("Wrote docs/api-reference/API_INVENTORY.csv");
console.log("Wrote docs/api-reference/UI_ROUTES.csv");
console.log("Wrote docs/architecture/UI_VS_CODEBASE.md");
