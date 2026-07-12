import { z } from "zod";

const ExternalClassRow = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  levelKind: z.enum(["primary", "secondary", "a_level", "nursery"]).optional(),
  streams: z.array(z.object({ code: z.string(), name: z.string() })).optional(),
});

const ExternalStudentRow = z.object({
  name: z.string().min(1),
  admissionNo: z.string().optional(),
  classCode: z.string().min(1),
  streamCode: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  sex: z.string().optional(),
});

export type ResultsAppClassRow = z.infer<typeof ExternalClassRow>;
export type ResultsAppStudentRow = z.infer<typeof ExternalStudentRow>;

function resultsAppBaseUrl(): string {
  const url = process.env.RESULTS_APP_IMPORT_URL?.trim();
  if (!url) throw new Error("Results App integration not configured (set RESULTS_APP_IMPORT_URL)");
  return url.replace(/\/$/, "");
}

function resultsAppHeaders(): HeadersInit {
  const key = process.env.RESULTS_APP_API_KEY?.trim();
  return key ? { Authorization: `Bearer ${key}`, Accept: "application/json" } : { Accept: "application/json" };
}

export async function fetchResultsAppClasses(input: {
  organizationSlug: string;
  sessionLabel?: string;
}): Promise<ResultsAppClassRow[]> {
  const base = resultsAppBaseUrl();
  const qp = new URLSearchParams({ organizationSlug: input.organizationSlug });
  if (input.sessionLabel) qp.set("session", input.sessionLabel);
  const r = await fetch(`${base}/classes?${qp}`, { headers: resultsAppHeaders() });
  if (!r.ok) throw new Error(`Results App classes fetch failed (${r.status})`);
  const j = (await r.json()) as { classes?: unknown[] };
  return z.array(ExternalClassRow).parse(j.classes ?? []);
}

export async function fetchResultsAppStudents(input: {
  organizationSlug: string;
  sessionLabel?: string;
  classCode?: string;
}): Promise<ResultsAppStudentRow[]> {
  const base = resultsAppBaseUrl();
  const qp = new URLSearchParams({ organizationSlug: input.organizationSlug });
  if (input.sessionLabel) qp.set("session", input.sessionLabel);
  if (input.classCode) qp.set("classCode", input.classCode);
  const r = await fetch(`${base}/students?${qp}`, { headers: resultsAppHeaders() });
  if (!r.ok) throw new Error(`Results App students fetch failed (${r.status})`);
  const j = (await r.json()) as { students?: unknown[] };
  return z.array(ExternalStudentRow).parse(j.students ?? []);
}

export function isResultsAppConfigured(): boolean {
  return Boolean(process.env.RESULTS_APP_IMPORT_URL?.trim());
}
