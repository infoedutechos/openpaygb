/* eslint-disable no-console */
/**
 * Remove .next (and optional webpack cache). On Windows, trace/cache files are often locked
 * until Node processes exit — use npm run dev:reset to kill port 3000 first.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");

function sleep(ms) {
  if (process.platform === "win32") {
    try {
      execSync(`powershell -NoProfile -Command "Start-Sleep -Milliseconds ${ms}"`, { stdio: "ignore" });
      return;
    } catch {
      /* fallback */
    }
  }
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* brief wait for file locks */
  }
}

function killPort(port) {
  if (!port) return;
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore", shell: true });
          console.log(`[clean-next] Stopped process on port ${port} (PID ${pid})`);
        } catch {
          /* already gone */
        }
      }
      if (pids.size) sleep(1500);
      return;
    }
    execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null`, {
      stdio: "ignore",
      shell: true,
    });
    sleep(800);
  } catch {
    /* port free */
  }
}

function killDevPorts() {
  const base = Number(process.env.PORT) || 3000;
  killPort(base);
  killPort(base + 1);
}

/** Delete deepest paths first (helps ENOTEMPTY on Windows). */
function rmDirDeep(dir, retries = 12) {
  if (!fs.existsSync(dir)) return true;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      return !fs.existsSync(dir);
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
      if (code === "ENOENT") return true;
      if (attempt < retries - 1) {
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) rmDirDeep(full, 4);
            else {
              try {
                fs.chmodSync(full, 0o666);
                fs.unlinkSync(full);
              } catch {
                /* retry outer */
              }
            }
          }
        } catch {
          /* locked */
        }
        sleep(300 + attempt * 150);
        continue;
      }
      throw e;
    }
  }
  return !fs.existsSync(dir);
}

function unlinkIfExists(file) {
  try {
    if (fs.existsSync(file)) {
      fs.chmodSync(file, 0o666);
      fs.unlinkSync(file);
    }
  } catch {
    /* ignore */
  }
}

function removeTraceArtifacts() {
  for (const name of ["trace", "trace-build"]) {
    const target = path.join(nextDir, name);
    if (!fs.existsSync(target)) continue;
    try {
      const st = fs.statSync(target);
      if (st.isDirectory()) rmDirDeep(target, 6);
      else unlinkIfExists(target);
    } catch {
      /* retry in rmDirDeep */
    }
  }
}

function cleanNext({ killDevPort = false } = {}) {
  if (killDevPort) killDevPorts();

  if (!fs.existsSync(nextDir)) {
    console.log("[clean-next] No .next folder — nothing to remove.");
    return true;
  }

  removeTraceArtifacts();

  const ok = rmDirDeep(nextDir);
  if (ok) {
    console.log("[clean-next] Removed .next");
    return true;
  }
  return false;
}

module.exports = {
  cleanNext,
  killDevPorts,
  isPortListening: (port) => {
    try {
      if (process.platform === "win32") {
        const out = execSync(`netstat -ano -p tcp | findstr :${port}`, {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        });
        return /LISTENING/i.test(out);
      }
      execSync(`lsof -iTCP:${port} -sTCP:LISTEN`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      return true;
    } catch {
      return false;
    }
  },
};

if (require.main === module) {
  const killFlag = process.argv.includes("--kill-port") || process.env.CLEAN_NEXT_KILL_PORT === "1";
  const ok = cleanNext({ killDevPort: killFlag });

  if (!ok) {
    console.error("");
    console.error("[clean-next] FAILED — .next could not be deleted (files still in use).");
    console.error("[clean-next] This causes: missing/invalid routes-manifest.json → ENOENT / 500 on routes.");
    console.error("[clean-next] Fix:");
    console.error("  1. Ctrl+C every terminal running npm run dev");
    console.error("  2. npm run dev:reset   (kills port 3000, deletes .next, starts dev)");
    console.error("  Or: Task Manager → end all node.exe, then npm run dev:clean");
    console.error("");
    process.exit(1);
  }

  process.exit(0);
}
