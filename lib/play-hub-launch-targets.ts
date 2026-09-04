export type PlayHubLaunchKind = "internal" | "telegram_webapp" | "external" | "iframe";
export type PlayHubOpenMode = "same_tab" | "new_tab" | "telegram" | "iframe";

export type PlayHubLaunchTarget = {
  id: string;
  label: string;
  url: string;
  kind: PlayHubLaunchKind;
  /** Soft visibility in switcher; inactive targets stay listed if enabled. */
  enabled: boolean;
  /** Exactly one active primary launch target across the list. */
  isActive: boolean;
  openMode: PlayHubOpenMode;
  notes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const BUILTIN_PLAY_HUB_TARGET_ID = "builtin-urapearls";

export function defaultPlayHubLaunchTargets(now = new Date().toISOString()): PlayHubLaunchTarget[] {
  return [
    {
      id: BUILTIN_PLAY_HUB_TARGET_ID,
      label: "URAPearls (built-in /clicker)",
      url: "/clicker",
      kind: "internal",
      enabled: true,
      isActive: true,
      openMode: "same_tab",
      notes: "Default in-app Play Hub SPA.",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function newId(): string {
  const bytes =
    typeof globalThis.crypto?.getRandomValues === "function"
      ? globalThis.crypto.getRandomValues(new Uint8Array(6))
      : Uint8Array.from({ length: 6 }, () => Math.floor(Math.random() * 256));
  return `play_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function isValidPlayHubUrl(url: string, kind: PlayHubLaunchKind): boolean {
  const u = url.trim();
  if (!u) return false;
  if (kind === "internal") {
    return u.startsWith("/") && !u.startsWith("//");
  }
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function parsePlayHubLaunchTargets(raw: unknown): PlayHubLaunchTarget[] {
  let arr: unknown[] = [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw || "[]");
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      arr = [];
    }
  } else if (Array.isArray(raw)) {
    arr = raw;
  }

  const now = new Date().toISOString();
  const out: PlayHubLaunchTarget[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = (String(row.kind || "external") as PlayHubLaunchKind) || "external";
    const url = String(row.url || "").trim();
    const label = String(row.label || "").trim() || url || "Untitled";
    if (!url) continue;
    const openModeRaw = String(row.openMode || "");
    const openMode = (["same_tab", "new_tab", "telegram", "iframe"].includes(openModeRaw)
      ? openModeRaw
      : kind === "iframe"
        ? "iframe"
        : kind === "telegram_webapp"
          ? "telegram"
          : kind === "internal"
            ? "same_tab"
            : "new_tab") as PlayHubOpenMode;

    out.push({
      id: String(row.id || newId()),
      label,
      url,
      kind: ["internal", "telegram_webapp", "external", "iframe"].includes(kind) ? kind : "external",
      enabled: row.enabled !== false,
      isActive: Boolean(row.isActive),
      openMode,
      notes: String(row.notes || "").slice(0, 500),
      sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : out.length,
      createdAt: String(row.createdAt || now),
      updatedAt: String(row.updatedAt || now),
    });
  }

  if (out.length === 0) return defaultPlayHubLaunchTargets(now);

  // Ensure exactly one active among enabled (prefer existing active; else first enabled).
  const enabled = out.filter((t) => t.enabled);
  const actives = enabled.filter((t) => t.isActive);
  if (actives.length !== 1) {
    for (const t of out) t.isActive = false;
    const pick = enabled[0] ?? out[0]!;
    pick.isActive = true;
  } else {
    // Clear active on disabled rows
    for (const t of out) {
      if (!t.enabled) t.isActive = false;
    }
  }

  return out.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function serializePlayHubLaunchTargets(targets: PlayHubLaunchTarget[]): string {
  return JSON.stringify(targets);
}

export type PlayHubLaunchUpsertInput = {
  id?: string;
  label: string;
  url: string;
  kind?: PlayHubLaunchKind;
  enabled?: boolean;
  openMode?: PlayHubOpenMode;
  notes?: string;
  sortOrder?: number;
  /** When true, activate this target (deactivates others). */
  activate?: boolean;
};

export function upsertPlayHubLaunchTarget(
  current: PlayHubLaunchTarget[],
  input: PlayHubLaunchUpsertInput,
): PlayHubLaunchTarget[] {
  const now = new Date().toISOString();
  const kind = (input.kind || "external") as PlayHubLaunchKind;
  const url = input.url.trim();
  if (!isValidPlayHubUrl(url, kind)) {
    throw new Error(
      kind === "internal"
        ? "Internal URL must start with / (e.g. /clicker)"
        : "URL must be a valid http(s) address",
    );
  }
  const label = input.label.trim() || url;
  const openMode =
    input.openMode ||
    (kind === "iframe"
      ? "iframe"
      : kind === "telegram_webapp"
        ? "telegram"
        : kind === "internal"
          ? "same_tab"
          : "new_tab");

  let list = [...current];
  const existingIdx = input.id ? list.findIndex((t) => t.id === input.id) : -1;

  if (existingIdx >= 0) {
    const prev = list[existingIdx]!;
    list[existingIdx] = {
      ...prev,
      label,
      url,
      kind,
      enabled: input.enabled ?? prev.enabled,
      openMode,
      notes: (input.notes ?? prev.notes).slice(0, 500),
      sortOrder: input.sortOrder ?? prev.sortOrder,
      updatedAt: now,
    };
  } else {
    list.push({
      id: input.id?.trim() || newId(),
      label,
      url,
      kind,
      enabled: input.enabled !== false,
      isActive: false,
      openMode,
      notes: (input.notes || "").slice(0, 500),
      sortOrder: input.sortOrder ?? list.length,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (input.activate) {
    const id = existingIdx >= 0 ? list[existingIdx]!.id : list[list.length - 1]!.id;
    list = activatePlayHubLaunchTarget(list, id);
  }

  return parsePlayHubLaunchTargets(list);
}

export function activatePlayHubLaunchTarget(
  current: PlayHubLaunchTarget[],
  id: string,
): PlayHubLaunchTarget[] {
  const now = new Date().toISOString();
  const list = current.map((t) => ({
    ...t,
    isActive: t.id === id,
    enabled: t.id === id ? true : t.enabled,
    updatedAt: t.id === id ? now : t.updatedAt,
  }));
  if (!list.some((t) => t.isActive)) {
    throw new Error("Unknown launch target");
  }
  return parsePlayHubLaunchTargets(list);
}

export function deletePlayHubLaunchTarget(
  current: PlayHubLaunchTarget[],
  id: string,
): PlayHubLaunchTarget[] {
  if (id === BUILTIN_PLAY_HUB_TARGET_ID && current.length <= 1) {
    throw new Error("Cannot delete the last built-in Play Hub target");
  }
  const next = current.filter((t) => t.id !== id);
  if (next.length === 0) return defaultPlayHubLaunchTargets();
  return parsePlayHubLaunchTargets(next);
}

export function publicPlayHubLaunchPayload(targets: PlayHubLaunchTarget[]) {
  const enabled = targets.filter((t) => t.enabled);
  const active = enabled.find((t) => t.isActive) ?? enabled[0] ?? null;
  return {
    active,
    targets: enabled.map((t) => ({
      id: t.id,
      label: t.label,
      url: t.url,
      kind: t.kind,
      isActive: t.isActive,
      openMode: t.openMode,
      notes: t.notes,
    })),
    botFatherHint:
      "Set BotFather Web App URL to the active https://… launch target (or keep /clicker for built-in URAPearls).",
  };
}
