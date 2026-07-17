/**
 * Client-safe mirror of Prisma `ProgrammeTrack`.
 * Do not import `@prisma/client` from UI / client components — use this module instead.
 */
export const ProgrammeTrack = {
  inservice: "inservice",
  regular: "regular",
} as const;

export type ProgrammeTrack = (typeof ProgrammeTrack)[keyof typeof ProgrammeTrack];

/**
 * Display labels (2026-07): tracks are shown as **Day** / **Boarding**.
 * Stored enum values stay `inservice` / `regular` — no data migration needed.
 */
export const PROGRAMME_TRACK_LABEL: Record<ProgrammeTrack, string> = {
  inservice: "Day",
  regular: "Boarding",
};

export function normalizeProgrammeTrack(raw: unknown): ProgrammeTrack {
  if (raw === ProgrammeTrack.inservice || raw === ProgrammeTrack.regular) return raw;
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "inservice" || s === "in-service" || s === "in_service" || s === "day") {
    return ProgrammeTrack.inservice;
  }
  if (s === "regular" || s === "boarding") return ProgrammeTrack.regular;
  return ProgrammeTrack.regular;
}

/** Aliases used by pay checkout (legacy `programme-track-client` imports). */
export type ProgrammeTrackValue = ProgrammeTrack;
export const PROGRAMME_TRACK_INSERVICE = ProgrammeTrack.inservice;
export const PROGRAMME_TRACK_REGULAR = ProgrammeTrack.regular;
