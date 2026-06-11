/* eslint-disable no-console */
/** Run `next dev` via Node (avoids fragile .bin on some Windows shells) and fail with a clear hint if deps are missing. */
const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const { cleanNext, killDevPorts, isPortListening } = require("./clean-next.cjs");
const { ensurePrismaClient, needsRegenerate } = require("./ensure-prisma-client.cjs");

const root = path.join(__dirname, "..");
const nextPkg = path.join(root, "node_modules", "next", "package.json");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");

if (!fs.existsSync(nextPkg) || !fs.existsSync(nextCli)) {
  console.error("");
  console.error("Next.js is not installed (missing node_modules/next).");
  console.error("Fix: close this IDE, end all node.exe in Task Manager, then in external PowerShell:");
  console.error("  npm run clean:win");
  console.error("  npm install --no-audit --no-fund");
  console.error("");
  process.exit(1);
}

const nextDir = path.join(root, ".next");
const manifestPath = path.join(nextDir, "routes-manifest.json");
const devPort = Number(process.env.PORT) || 3000;

/** Next leaves folders behind if compile was interrupted; ENOENT routes-manifest then breaks every route. */
function routesManifestLooksValid() {
  if (!fs.existsSync(manifestPath)) return false;
  try {
    const raw = fs.readFileSync(manifestPath, "utf8");
    if (!raw.trim()) return false;
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/** Turbopack on Windows can leave _buildManifest.js.tmp.* without the final manifest (ENOENT spam). */
function devBuildManifestCorrupted() {
  const devStatic = path.join(nextDir, "static", "development");
  if (!fs.existsSync(devStatic)) return false;
  try {
    const entries = fs.readdirSync(devStatic);
    const tmpManifests = entries.filter((n) => /^_buildManifest\.js\.tmp\./.test(n));
    const hasManifest = fs.existsSync(path.join(devStatic, "_buildManifest.js"));
    const serverExists = fs.existsSync(path.join(nextDir, "server"));
    if (tmpManifests.length >= 3) return true;
    if (serverExists && !hasManifest && tmpManifests.length > 0) return true;
  } catch {
    return false;
  }
  return false;
}

/** Partial server compile — route tree exists but per-route app-paths-manifest.json is missing. */
function appPathsManifestIncomplete() {
  const serverApp = path.join(nextDir, "server", "app");
  if (!fs.existsSync(serverApp)) return false;
  const suspect = path.join(
    serverApp,
    "api",
    "platform",
    "notifications",
    "[__metadata_id__]",
    "route",
    "app-paths-manifest.json",
  );
  const metaDir = path.dirname(suspect);
  return fs.existsSync(metaDir) && !fs.existsSync(suspect);
}

function hasDamagedNext() {
  if (!fs.existsSync(nextDir)) return false;
  if (devBuildManifestCorrupted() || appPathsManifestIncomplete()) return true;
  if (routesManifestLooksValid()) return false;
  let entries = [];
  try {
    entries = fs.readdirSync(nextDir);
  } catch {
    return false;
  }
  return entries.some((e) => ["server", "static", "types", "cache", "dev"].includes(e));
}

if (hasDamagedNext()) {
  console.warn("");
  console.warn("[dev] Damaged or incomplete .next (stale Turbopack manifests or invalid routes-manifest.json). Cleaning…");
  console.warn("[dev] Common causes: dev stopped mid-compile, two dev servers, antivirus locking files, or paths with spaces on Windows.");
  const ok = cleanNext({ killDevPort: true });
  if (!ok) {
    console.error("[dev] Could not remove .next. Run: npm run dev:reset");
    process.exit(1);
  }
  console.warn("");
}

function prismaNextCacheStale() {
  const nextDir = path.join(root, ".next");
  const clientTypes = path.join(root, "node_modules", ".prisma", "client", "index.d.ts");
  if (!fs.existsSync(nextDir) || !fs.existsSync(clientTypes)) return false;
  try {
    return fs.statSync(clientTypes).mtimeMs > fs.statSync(nextDir).mtimeMs + 1000;
  } catch {
    return false;
  }
}

/** Stale Prisma client → `Unknown field` validation errors; regenerate and clear .next when schema drifted. */
function ensurePrismaClientFresh() {
  const schemaDrift = needsRegenerate(root);
  const cacheStale = prismaNextCacheStale();
  try {
    const { regenerated, skippedDueToLock } = ensurePrismaClient(root);
    if (skippedDueToLock) {
      console.warn("[dev] Continuing with existing Prisma client (generate was file-locked).");
    }
    if ((regenerated || schemaDrift || cacheStale) && fs.existsSync(path.join(root, ".next"))) {
      console.warn("[dev] Prisma/schema sync — clearing .next (Turbopack caches old Prisma DMMF)…");
      cleanNext({ killDevPort: false });
    }
  } catch {
    console.warn("[dev] prisma generate failed. Stop dev, then: npm run dev:reset");
  }
}

ensurePrismaClientFresh();

if (isPortListening(devPort) || isPortListening(devPort + 1)) {
  if (process.env.DEV_NO_KILL_PORT === "1") {
    console.error("");
    console.error(`[dev] Port ${devPort} (or ${devPort + 1}) is in use. Stop the other server or run: npm run dev:reset`);
    console.error("");
    process.exit(1);
  }
  console.warn("");
  console.warn(`[dev] Port ${devPort} is in use — stopping old next dev (avoids EADDRINUSE / stale bundles)…`);
  killDevPorts();
  console.warn("");
}

/**
 * Turbopack is faster but races on Windows (ENOENT _buildManifest.js.tmp.*).
 * Default: Webpack on win32; Turbopack elsewhere. Override with NEXT_DEV_TURBO=1 or =0.
 */
const turboEnv = process.env.NEXT_DEV_TURBO;
const useTurbo =
  turboEnv === "1" || (turboEnv !== "0" && process.platform !== "win32");
const devArgs = ["dev", "-p", String(devPort)];
if (useTurbo) devArgs.push("--turbo");
if (useTurbo) {
  console.log("[dev] Using Turbopack (NEXT_DEV_TURBO=0 for Webpack)\n");
} else if (process.platform === "win32" && turboEnv !== "0") {
  console.log("[dev] Using Webpack on Windows (stable; set NEXT_DEV_TURBO=1 to force Turbopack)\n");
}

function prismaStampForChildEnv() {
  const stampPath = path.join(root, ".prisma-client-stamp");
  try {
    if (fs.existsSync(stampPath)) return fs.readFileSync(stampPath, "utf8").trim();
  } catch {
    /* ignore */
  }
  return process.env.PRISMA_CLIENT_STAMP?.trim() || "";
}

const child = spawn(process.execPath, [nextCli, ...devArgs], {
  cwd: root,
  stdio: "inherit",
  shell: false,
  env: {
    ...process.env,
    PORT: String(devPort),
    PRISMA_CLIENT_STAMP: prismaStampForChildEnv() || String(Date.now()),
  },
});

child.on("exit", (code) => process.exit(code == null ? 1 : code));
