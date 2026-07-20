import { describe, expect, it, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const fallbackPath = join(process.cwd(), "scripts/mongodb-srv-fallback.cjs");

describe("mongodb-srv-fallback", () => {
  afterEach(() => {
    delete process.env.MONGODB_SRV_FALLBACK;
    delete process.env.MONGODB_FORCE_NON_SRV;
  });

  it("leaves non-srv URLs unchanged", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureNonSrvDatabaseUrl } = require(fallbackPath);
    const r = ensureNonSrvDatabaseUrl("mongodb://u:p@host:27017/db");
    expect(r.converted).toBe(false);
    expect(r.url).toBe("mongodb://u:p@host:27017/db");
  });

  it("honors MONGODB_SRV_FALLBACK=0", () => {
    process.env.MONGODB_SRV_FALLBACK = "0";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureNonSrvDatabaseUrl } = require(fallbackPath);
    const srv = "mongodb+srv://u:p@cluster0.example.net/odelhub_pay";
    const r = ensureNonSrvDatabaseUrl(srv);
    expect(r.converted).toBe(false);
    expect(r.reason).toBe("disabled");
    expect(r.url).toBe(srv);
  });

  it("parses SRV hostname from Atlas-style URL", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseSrvUrl } = require(fallbackPath);
    const p = parseSrvUrl(
      "mongodb+srv://user%40x:pass@cluster0.zimtvpl.mongodb.net/odelhub_pay?retryWrites=true",
    );
    expect(p?.hostname).toBe("cluster0.zimtvpl.mongodb.net");
    expect(p?.credentials).toContain("user");
  });

  it("can expand live Atlas SRV via system DNS when forced", () => {
    const probe = spawnSync(
      "nslookup",
      ["-type=SRV", "_mongodb._tcp.cluster0.zimtvpl.mongodb.net"],
      {
        encoding: "utf8",
        windowsHide: true,
        shell: true,
        timeout: 15000,
      },
    );
    const out = `${probe.stdout || ""}${probe.stderr || ""}`;
    if (!/svr hostname/i.test(out)) {
      return;
    }

    process.env.MONGODB_FORCE_NON_SRV = "1";
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ensureNonSrvDatabaseUrl } = require(fallbackPath);
    const r = ensureNonSrvDatabaseUrl("mongodb+srv://u:p@cluster0.zimtvpl.mongodb.net/odelhub_pay", {
      quiet: true,
    });
    expect(r.converted).toBe(true);
    expect(r.url.startsWith("mongodb://")).toBe(true);
    expect(r.url).toContain("ac-");
    expect(r.url).toContain("replicaSet=");
    expect(r.url).not.toContain("mongodb+srv://");
  });
});
