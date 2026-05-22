/**
 * Client-safe mirror of Prisma `ProgrammeTrack`.
 * Do not import `@prisma/client` from UI / client components — use this module instead.
 */
export const ProgrammeTrack = {
  inservice: "inservice",
  regular: "regular",
} as const;

export type ProgrammeTrack = (typeof ProgrammeTrack)[keyof typeof ProgrammeTrack];

export const PROGRAMME_TRACK_LABEL: Record<ProgrammeTrack, string> = {
  inservice: "In-service",
  regular: "Regular",
};

export function normalizeProgrammeTrack(raw: unknown): ProgrammeTrack {
  if (raw === ProgrammeTrack.inservice || raw === ProgrammeTrack.regular) return raw;
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "inservice" || s === "in-service" || s === "in_service") return ProgrammeTrack.inservice;
  if (s === "regular") return ProgrammeTrack.regular;
  return ProgrammeTrack.regular;
}

/** Aliases used by pay checkout (legacy `programme-track-client` imports). */
export type ProgrammeTrackValue = ProgrammeTrack;
export const PROGRAMME_TRACK_INSERVICE = ProgrammeTrack.inservice;
export const PROGRAMME_TRACK_REGULAR = ProgrammeTrack.regular;
