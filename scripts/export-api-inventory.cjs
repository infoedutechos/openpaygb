/**
 * Writes docs/API_INVENTORY.csv, docs/UI_ROUTES.csv, and docs/UI_VS_CODEBASE.md
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

function inferPayApis(uiRoute) {
  if (uiRoute === "/") {
    return ["(marketing shell; may call /api/programmes, /api/fx/rate from client)"];
  }
  if (uiRoute === "/pay" || uiRoute === "/pay/[orgSlug]") {
    return [
      "/api/programmes",
      "/api/programmes/[code]/quote",
      "/api/public/checkout/student",
      "/api/public/checkout/payment",
      "/api/public/checkout/ton-pay-transfer",
      "/api/payments/[id]/public",
      "/api/payments",
      "/api/payments/[id]",
      "/api/manifest/tonconnect",
      "/api/collect/momo",
    ];
  }
  if (uiRoute.startsWith("/receipt/")) {
    return ["/api/receipts/[paymentId]", "/api/receipts/[paymentId]/pdf"];
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
fs.writeFileSync(path.join(root, "docs", "API_INVENTORY.csv"), apiRows.join("\n") + "\n", "utf8");

// --- UI pages CSV ---
const pageFiles = walkFiles(appDir, (fp, n) => n === "page.tsx").sort((a, b) => relPosix(a).localeCompare(relPosix(b)));
const uiRows = [["ui_route", "relative_file"].map(csvEscape).join(",")];
for (const file of pageFiles) {
  uiRows.push([csvEscape(pageFileToUiRoute(file)), csvEscape(relPosix(file))].join(","));
}
fs.writeFileSync(path.join(root, "docs", "UI_ROUTES.csv"), uiRows.join("\n") + "\n", "utf8");

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
lines.push("npm run docs:tree:write   # optional: refresh ASCII tree → docs/FOLDER_TREE_SNAPSHOT.txt");
lines.push("npm run docs:inventory   # writes API_INVENTORY.csv, UI_ROUTES.csv, and this file");
lines.push("```");
lines.push("");
lines.push("## Exported machine-readable inventories");
lines.push("");
lines.push("| File | Contents |");
lines.push("|------|-----------|");
lines.push("| [API_INVENTORY.csv](./API_INVENTORY.csv) | Every `app/api/**/route.ts` URL, file path, exported HTTP methods |");
lines.push("| [UI_ROUTES.csv](./UI_ROUTES.csv) | Every `app/**/page.tsx` UI path and file path |");
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

for (const pf of adminPageFiles) {
  const ui = pageFileToUiRoute(pf);
  let apis = [];
  const notes = [];
  if (ui === "/admin/login") {
    apis = ["/api/admin/login", "/api/admin/logout"];
  } else if (ui === "/admin") {
    apis = ["/api/admin/summary"];
  } else if (ui === "/admin/payments") {
    apis = ["/api/payments", "/api/payments/[id]", "/api/payments/export"];
  } else if (ui === "/admin/students") {
    apis = ["/api/students"];
  } else if (/^\/admin\/students\//.test(ui)) {
    apis = ["/api/students/[id]"];
  } else if (ui === "/admin/export") {
    apis = ["/api/admin/export"];
  } else {
    const seg = /^\/admin\/([^/]+)/.exec(ui);
    if (seg) {
      const files = apisUnderAdminSegment(seg[1]);
      apis = files.map(routeFileToUrl);
      if (!apis.length) apis = [`(none under /api/admin/${seg[1]}/)`];
    }
  }
  const resolved = apis.filter((u) => !u.startsWith("("));
  const exists = (u) => apiUrlSet.has(u);
  const match =
    resolved.length && resolved.every(exists) ? "yes" : resolved.some(exists) ? "partial" : "no";
  if (ui === "/admin/login") notes.push("Logout is POST-only; login uses `/api/admin/login`.");
  if (ui.startsWith("/admin/students")) notes.push("Student APIs under `/api/students`, not `/api/admin/students`.");
  if (ui === "/admin/payments") notes.push("Payments under `/api/payments`; CSV export at `/api/payments/export`.");
  if (ui === "/admin/notifications") {
    notes.push("Middleware allows this path with URA `admin_session` cookie (see `middleware.ts`).");
  }
  const noteStr = notes.length ? ` — ${notes.join(" ")}` : "";
  lines.push(`| ${ui} | ${apis.join("<br>")} | ${match}${noteStr} |`);
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

fs.writeFileSync(path.join(root, "docs", "UI_VS_CODEBASE.md"), lines.join("\n") + "\n", "utf8");

console.log("Wrote docs/API_INVENTORY.csv");
console.log("Wrote docs/UI_ROUTES.csv");
console.log("Wrote docs/UI_VS_CODEBASE.md");
