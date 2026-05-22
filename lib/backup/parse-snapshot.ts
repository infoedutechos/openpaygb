import type { BackupCollectionCounts, TuitionBackupSnapshot } from "@/lib/backup/tuition-snapshot";

export const TUITION_BACKUP_COLLECTIONS = [
  "organizations",
  "programmes",
  "programmeFees",
  "students",
  "payments",
  "fxRates",
  "siteUiSettings",
  "adminUsers",
  "processedWebhooks",
  "studentSignupTokens",
  "partnerApiKeys",
  "partnerWebhookEndpoints",
  "mobileMoneyProviders",
  "partnerWebhookDeliveries",
] as const;

export type TuitionBackupCollection = (typeof TUITION_BACKUP_COLLECTIONS)[number];

export type ParsedSnapshot = TuitionBackupSnapshot & {
  collections: Record<TuitionBackupCollection, unknown[]>;
};

export type SnapshotValidationIssue = {
  level: "error" | "warn";
  code: string;
  message: string;
};

export function parseTuitionBackupSnapshot(raw: unknown):
  | { ok: true; snapshot: ParsedSnapshot }
  | { ok: false; issues: SnapshotValidationIssue[] } {
  const issues: SnapshotValidationIssue[] = [];

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      issues: [{ level: "error", code: "invalid_root", message: "Backup must be a JSON object" }],
    };
  }

  const o = raw as Record<string, unknown>;
  const meta = o.meta;
  const data = o.data;

  if (!meta || typeof meta !== "object") {
    issues.push({ level: "error", code: "missing_meta", message: "Missing meta block" });
  } else {
    const m = meta as Record<string, unknown>;
    if (m.app !== "ODELHUB Pay") {
      issues.push({ level: "warn", code: "foreign_app", message: `Unexpected app name: ${String(m.app)}` });
    }
    if (m.scope !== "tuition") {
      issues.push({ level: "error", code: "wrong_scope", message: `Expected scope "tuition", got ${String(m.scope)}` });
    }
    const version = Number(m.version ?? 1);
    if (version > 2) {
      issues.push({
        level: "warn",
        code: "newer_version",
        message: `Backup version ${version} is newer than this restore engine (supports ≤2)`,
      });
    }
  }

  if (!data || typeof data !== "object") {
    issues.push({ level: "error", code: "missing_data", message: "Missing data block" });
    return { ok: false, issues };
  }

  const collections = {} as Record<TuitionBackupCollection, unknown[]>;
  const d = data as Record<string, unknown>;

  for (const key of TUITION_BACKUP_COLLECTIONS) {
    const block = d[key];
    if (block === undefined) {
      collections[key] = [];
      continue;
    }
    if (!Array.isArray(block)) {
      issues.push({ level: "error", code: "invalid_collection", message: `data.${key} must be an array` });
      collections[key] = [];
    } else {
      collections[key] = block;
    }
  }

  if (issues.some((i) => i.level === "error")) {
    return { ok: false, issues };
  }

  const snapshot: ParsedSnapshot = {
    meta: meta as TuitionBackupSnapshot["meta"],
    data: d as TuitionBackupSnapshot["data"],
    collections,
  };

  return { ok: true, snapshot };
}

export function countCollections(collections: Record<TuitionBackupCollection, unknown[]>): BackupCollectionCounts {
  const counts: BackupCollectionCounts = {};
  for (const key of TUITION_BACKUP_COLLECTIONS) {
    counts[key] = collections[key]?.length ?? 0;
  }
  return counts;
}
