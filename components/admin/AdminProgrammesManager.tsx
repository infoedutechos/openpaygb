"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useAuthMe } from "@/hooks/useAuthMe";
import { PROGRAMME_TRACK_LABEL, ProgrammeTrack } from "@/lib/programme-track";
import { parseProgrammeFeeUploadCsv, programmeFeeCsvTemplate } from "@/lib/programme-fee-csv";
import { TuitionHubCheckoutExplainer } from "@/components/admin/TuitionHubCheckoutExplainer";
import { academicPeriodLabels, type AcademicPeriodLabels } from "@/lib/academic-period";

type FeeRow = {
  id: string;
  year: number;
  semester: number;
  recurrence: "once" | "per_semester" | "per_year";
  feeKey: string;
  tuitionUgx: number;
  functionalFeesUgx: number;
};

type ProgrammeRow = {
  id: string;
  code: string;
  name: string;
  track: ProgrammeTrack;
  durationYears: number;
  semestersPerYear: number;
  duration?: {
    durationYears: number;
    semestersPerYear: number;
    totalSemesters: number;
    source: "configured" | "fee_schedule" | "empty";
  };
  periods?: Array<{
    year: number;
    semester: number;
    feeLineCount: number;
    tuitionUgx: number;
    functionalFeesUgx: number;
    totalUgx: number;
    hasFeeSchedule: boolean;
  }>;
  fees: FeeRow[];
};

type OrgOption = { id: string; slug: string; name: string; tenantStatus: string };
type ApiErrorJson = { error?: string; hint?: string };

async function readJsonResponse<T extends object>(
  response: Response,
  fallbackError: string
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const raw = await response.text();
  if (!raw.trim()) return { ok: true, data: {} as T };

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    const snippet = raw.slice(0, 120).replace(/\s+/g, " ");
    return {
      ok: false,
      error: response.ok ? `${fallbackError}: invalid server response.` : `${fallbackError} (HTTP ${response.status}). ${snippet}`,
    };
  }
}

export default function AdminProgrammesManager() {
  const { data: authMe, loading: authMeLoading } = useAuthMe();
  const periodLabels = useMemo(
    () => academicPeriodLabels(authMe?.admin?.organization?.institutionTier ?? "university"),
    [authMe?.admin?.organization?.institutionTier],
  );
  const pathname = usePathname() || "/admin/programmes";
  const editProgrammeDialogTitleId = useId();
  const addFeeItemDialogTitleId = useId();
  const [needsTuitionSignIn, setNeedsTuitionSignIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgSlug, setOrgSlug] = useState("");
  const [rows, setRows] = useState<ProgrammeRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newTrack, setNewTrack] = useState<ProgrammeTrack>(ProgrammeTrack.regular);
  const [newDurationYears, setNewDurationYears] = useState(0);
  const [newSemestersPerYear, setNewSemestersPerYear] = useState(0);
  const [importTrack, setImportTrack] = useState<ProgrammeTrack>(ProgrammeTrack.regular);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editTrack, setEditTrack] = useState<ProgrammeTrack>(ProgrammeTrack.regular);
  const [editDurationYears, setEditDurationYears] = useState(0);
  const [editSemestersPerYear, setEditSemestersPerYear] = useState(0);

  const [feeProgId, setFeeProgId] = useState<string | null>(null);
  const [feeYear, setFeeYear] = useState(1);
  const [feeSem, setFeeSem] = useState(1);
  const [feeRecurrence, setFeeRecurrence] = useState<FeeRow["recurrence"]>("per_semester");
  const [feeKeyInput, setFeeKeyInput] = useState("");
  const [feeCategory, setFeeCategory] = useState<"tuition" | "functional">("tuition");
  const [feeAmount, setFeeAmount] = useState("");

  const [importBusy, setImportBusy] = useState(false);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [feeBulkBusy, setFeeBulkBusy] = useState(false);
  const [feeBulkMessage, setFeeBulkMessage] = useState<string | null>(null);
  const feeCsvInputRef = useRef<HTMLInputElement>(null);
  const feeCsvTemplateHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(programmeFeeCsvTemplate())}`,
    []
  );

  const slugParam = useMemo(
    () => (orgSlug.trim() ? `organizationSlug=${encodeURIComponent(orgSlug.trim().toLowerCase())}` : ""),
    [orgSlug]
  );

  const { inserviceRows, regularRows } = useMemo(() => {
    const inserviceRows: ProgrammeRow[] = [];
    const regularRows: ProgrammeRow[] = [];
    for (const p of rows) {
      if (p.track === ProgrammeTrack.inservice) inserviceRows.push(p);
      else regularRows.push(p);
    }
    return { inserviceRows, regularRows };
  }, [rows]);

  const loadOrgs = useCallback(async () => {
    const r = await fetch("/api/master/organizations", { credentials: "include" });
    if (!r.ok) return;
    const parsed = await readJsonResponse<{ organizations?: OrgOption[] }>(r, "Failed to load schools");
    if (!parsed.ok) return;
    const j = parsed.data;
    const list = (j.organizations ?? []).filter((o) => o.tenantStatus === "active");
    setOrgs(list);
    if (list.length) {
      setOrgSlug((prev) => {
        if (prev.trim()) return prev;
        const def = list.find((o) => o.slug === "default") ?? list[0];
        return def.slug;
      });
    }
  }, []);

  const loadProgrammes = useCallback(async () => {
    setError(null);
    if (role === "master" && !orgSlug.trim()) {
      setRows([]);
      setLoading(false);
      return;
    }
    const q = role === "master" ? `?${slugParam}` : "";
    const r = await fetch(`/api/admin/programmes${q}`, { credentials: "include" });
    const parsed = await readJsonResponse<{ programmes?: ProgrammeRow[] } & ApiErrorJson>(r, "Failed to load programmes");
    if (!parsed.ok) {
      setError(parsed.error);
      setRows([]);
      setLoading(false);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? "Failed to load programmes");
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(
      ((j as { programmes: ProgrammeRow[] }).programmes ?? []).map((p) => ({
        ...p,
        track: p.track === ProgrammeTrack.inservice ? ProgrammeTrack.inservice : ProgrammeTrack.regular,
        durationYears: p.durationYears ?? 0,
        semestersPerYear: p.semestersPerYear ?? 0,
        fees: (p.fees ?? []).map((f) => ({
          ...f,
          recurrence: f.recurrence ?? "per_semester",
          feeKey: f.feeKey ?? "default",
        })),
      }))
    );
    setLoading(false);
  }, [role, slugParam, orgSlug]);

  useEffect(() => {
    if (authMeLoading) return;
    if (!authMe) {
      setError("Could not verify session.");
      setNeedsTuitionSignIn(false);
      setLoading(false);
      return;
    }
    if (!authMe.tuitionSession || !authMe.admin) {
      setRole(null);
      setNeedsTuitionSignIn(Boolean(authMe.adminShellAccess));
      if (!authMe.adminShellAccess) {
        setError("Your admin session has expired. Sign in again.");
      }
      setLoading(false);
      return;
    }
    setNeedsTuitionSignIn(false);
    setError(null);
    const r = authMe.admin.role ?? null;
    setRole(r);
    void (async () => {
      if (r === "master") {
        await loadOrgs();
      } else if (authMe.admin?.organization?.slug) {
        setOrgSlug(authMe.admin.organization.slug);
      }
    })();
  }, [authMe, authMeLoading, loadOrgs]);

  useEffect(() => {
    if (!role) return;
    if (role === "master" && !orgSlug.trim()) return;
    setLoading(true);
    void loadProgrammes();
  }, [role, orgSlug, loadProgrammes]);

  async function createProgramme(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body: {
      code: string;
      name: string;
      track: ProgrammeTrack;
      durationYears: number;
      semestersPerYear: number;
      organizationSlug?: string;
    } = {
      code: newCode.trim(),
      name: newName.trim(),
      track: newTrack,
      durationYears: Math.max(0, Math.min(6, Math.round(Number(newDurationYears)) || 0)),
      semestersPerYear: Math.max(0, Math.min(3, Math.round(Number(newSemestersPerYear)) || 0)),
    };
    if (role === "master") body.organizationSlug = orgSlug.trim().toLowerCase();
    const r = await fetch("/api/admin/programmes", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const parsed = await readJsonResponse<ApiErrorJson>(r, "Create failed");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? "Create failed");
      return;
    }
    setNewCode("");
    setNewName("");
    setNewTrack(ProgrammeTrack.regular);
    setNewDurationYears(0);
    setNewSemestersPerYear(0);
    await loadProgrammes();
  }

  async function importProgrammesFile(file: File) {
    setError(null);
    setImportSummary(null);
    if (role === "master" && !orgSlug.trim()) {
      setError("Pick a school before importing.");
      return;
    }
    setImportBusy(true);
    try {
      const csv = await file.text();
      const body: { csv: string; organizationSlug?: string; track: ProgrammeTrack } = {
        csv,
        track: importTrack,
      };
      if (role === "master") body.organizationSlug = orgSlug.trim().toLowerCase();
      const r = await fetch("/api/admin/programmes/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await r.text();
      type ImportJson = {
        error?: string;
        createdCount?: number;
        created?: string[];
        failed?: { code: string; line: number; reason: string }[];
        parseErrors?: { line: number; reason: string }[];
      };
      let j: ImportJson = {};
      try {
        j = raw ? (JSON.parse(raw) as ImportJson) : {};
      } catch {
        setError(
          r.ok
            ? "Import returned invalid response."
            : `Import failed (HTTP ${r.status}). ${raw.slice(0, 120).replace(/\s+/g, " ")}`
        );
        return;
      }
      if (!r.ok) {
        setError(j.error ?? "Import failed");
        return;
      }
      const lines: string[] = [];
      lines.push(`Created: ${j.createdCount ?? 0} (${(j.created ?? []).join(", ") || "—"})`);
      if ((j.failed ?? []).length) {
        lines.push(
          "Skipped / errors:",
          ...j.failed!.map((f) => `  Line ${f.line} · ${f.code}: ${f.reason}`)
        );
      }
      if ((j.parseErrors ?? []).length) {
        lines.push("Row issues:", ...j.parseErrors!.map((p) => `  Line ${p.line}: ${p.reason}`));
      }
      setImportSummary(lines.join("\n"));
      await loadProgrammes();
    } finally {
      setImportBusy(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError(null);
    const r = await fetch(`/api/admin/programmes/${encodeURIComponent(editId)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        code: editCode.trim(),
        track: editTrack,
        durationYears: Math.max(0, Math.min(6, Math.round(Number(editDurationYears)) || 0)),
        semestersPerYear: Math.max(0, Math.min(3, Math.round(Number(editSemestersPerYear)) || 0)),
      }),
    });
    const parsed = await readJsonResponse<ApiErrorJson>(r, "Update failed");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? "Update failed");
      return;
    }
    setEditId(null);
    await loadProgrammes();
  }

  async function removeProgramme(id: string, code: string) {
    if (!confirm(`Delete programme ${code}? Fee rows go with it. Fails if payments exist.`)) return;
    setError(null);
    const r = await fetch(`/api/admin/programmes/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    const parsed = await readJsonResponse<ApiErrorJson>(r, "Delete failed");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? j.hint ?? "Delete failed");
      return;
    }
    await loadProgrammes();
  }

  async function addFee(e: React.FormEvent) {
    e.preventDefault();
    if (!feeProgId) return;
    setError(null);
    setFeeBulkMessage(null);
    const key = feeKeyInput.trim();
    if (!key) {
      setError("Enter an item (short code) for this fee line.");
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
      setError("Item code: use letters, numbers, hyphens, or underscores only.");
      return;
    }
    const amt = Number(feeAmount.replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Enter a valid UGX amount.");
      return;
    }
    const y = Math.min(6, Math.max(1, Math.round(Number(feeYear)) || 1));
    const sem =
      feeRecurrence === "per_year" ? 0 : Math.min(3, Math.max(1, Math.round(Number(feeSem)) || 1));
    const rounded = Math.round(amt);
    const tuitionUgx = feeCategory === "tuition" ? rounded : 0;
    const functionalFeesUgx = feeCategory === "functional" ? rounded : 0;
    const r = await fetch(`/api/admin/programmes/${encodeURIComponent(feeProgId)}/fees`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: y,
        semester: sem,
        recurrence: feeRecurrence,
        feeKey: key,
        tuitionUgx,
        functionalFeesUgx,
      }),
    });
    const parsed = await readJsonResponse<ApiErrorJson>(r, "Could not add fee");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? "Could not add fee");
      return;
    }
    setFeeAmount("");
    setFeeKeyInput("");
    setFeeRecurrence("per_semester");
    setFeeCategory("tuition");
    setFeeProgId(null);
    await loadProgrammes();
  }

  async function importFeeCsvFile(file: File) {
    if (!feeProgId) return;
    setError(null);
    setFeeBulkMessage(null);
    setFeeBulkBusy(true);
    try {
      const text = await file.text();
      const parsed = parseProgrammeFeeUploadCsv(text);
      if (parsed.parseErrors.length) {
        setFeeBulkMessage(
          parsed.parseErrors.slice(0, 20).join("\n") + (parsed.parseErrors.length > 20 ? "\n…" : "")
        );
        return;
      }
      if (parsed.rows.length === 0) {
        setFeeBulkMessage("No data rows found after the header.");
        return;
      }
      let ok = 0;
      const postErrs: string[] = [];
      for (const row of parsed.rows) {
        const tuitionUgx = row.lineType === "tuition" ? row.amountUgx : 0;
        const functionalFeesUgx = row.lineType === "functional" ? row.amountUgx : 0;
        const r = await fetch(`/api/admin/programmes/${encodeURIComponent(feeProgId)}/fees`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            year: row.year,
            semester: row.semester,
            recurrence: row.recurrence,
            feeKey: row.feeKey,
            tuitionUgx,
            functionalFeesUgx,
          }),
        });
        const parsed = await readJsonResponse<ApiErrorJson>(r, "Could not add fee");
        const j = parsed.ok ? parsed.data : { error: parsed.error };
        if (!r.ok) {
          postErrs.push(`Source line ${row.sourceLine} (${row.feeKey}): ${j.error ?? `HTTP ${r.status}`}`);
        } else {
          ok++;
        }
      }
      const parts = [`Imported ${ok} of ${parsed.rows.length} row(s).`];
      if (postErrs.length) {
        parts.push("Issues:");
        parts.push(postErrs.slice(0, 25).join("\n"));
        if (postErrs.length > 25) parts.push("…");
      }
      setFeeBulkMessage(parts.join("\n"));
      if (ok > 0) await loadProgrammes();
      if (feeCsvInputRef.current) feeCsvInputRef.current.value = "";
    } catch {
      setFeeBulkMessage("Could not read the file.");
    } finally {
      setFeeBulkBusy(false);
    }
  }

  async function updateFee(progId: string, f: FeeRow, patch: Partial<FeeRow>) {
    setError(null);
    const r = await fetch(
      `/api/admin/programmes/${encodeURIComponent(progId)}/fees/${encodeURIComponent(f.id)}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }
    );
    const parsed = await readJsonResponse<ApiErrorJson>(r, "Update failed");
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const j = parsed.data;
    if (!r.ok) {
      setError(j.error ?? "Update failed");
      return;
    }
    await loadProgrammes();
  }

  async function deleteFee(progId: string, feeId: string) {
    if (!confirm("Remove this fee row?")) return;
    setError(null);
    const r = await fetch(
      `/api/admin/programmes/${encodeURIComponent(progId)}/fees/${encodeURIComponent(feeId)}`,
      { method: "DELETE", credentials: "include" }
    );
    if (!r.ok) {
      const parsed = await readJsonResponse<ApiErrorJson>(r, "Delete failed");
      setError(parsed.ok ? parsed.data.error ?? "Delete failed" : parsed.error);
      return;
    }
    await loadProgrammes();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Programs &amp; fee schedules</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">
          Every programme sits under <strong className="text-slate-300">In-service</strong> or{" "}
          <strong className="text-slate-300">Regular</strong>. Below, lists are grouped that way. Add or edit programmes and{" "}
          <strong className="text-slate-300">fee items</strong>: each line is an item code, whether it is{" "}
          <strong className="text-slate-300">tuition</strong> or <strong className="text-slate-300">functional</strong>, a single UGX amount, and how often it applies —{" "}
          <strong className="text-slate-300">{periodLabels.perPeriodRecurrence.toLowerCase()}</strong> (year +{" "}
          {periodLabels.periodSingular.toLowerCase()} 1–3), <strong className="text-slate-300">each year</strong> (same
          amount for any {periodLabels.periodSingular.toLowerCase()} in that year), or{" "}
          <strong className="text-slate-300">once</strong> (only when paying that exact year and{" "}
          {periodLabels.periodSingular.toLowerCase()}). Checkout builds a quote from the pool that matches the payer&apos;s
          coverage choice — <strong className="text-slate-300">{periodLabels.payForThisPeriodOnly.toLowerCase()}</strong>,{" "}
          <strong className="text-slate-300">
            the chosen year with all its {periodLabels.periodPlural.toLowerCase()}
          </strong>
          , or <strong className="text-slate-300">the whole programme</strong> (every year and{" "}
          {periodLabels.periodSingular.toLowerCase()}) — then they can
          include every applicable line or pick specific lines, before a separate processing UGX line is applied.
        </p>
        <TuitionHubCheckoutExplainer className="mt-4 max-w-4xl" />
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0a101f]/70 px-4 py-3 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Institution programme catalogue</p>
          <p className="mt-2 text-slate-400">
            <span className="font-medium text-slate-400">BEP</span> combinations:{" "}
            <span className="font-mono text-slate-400">BEP-ENG/RE</span>,{" "}
            <span className="font-mono text-slate-400">BEP-ENG/SST</span>,{" "}
            <span className="font-mono text-slate-400">BEP-MTC/SCIE</span>,{" "}
            <span className="font-mono text-slate-400">BEP-MTC/AGRIC</span> — Bachelor in Education Primary, with
            subject pair in parentheses (ENG/RE, ENG/SST, MTC/SCIE, MTC/AGRIC).
          </p>
          <p className="mt-2 text-slate-400">
            <span className="font-medium text-slate-300">DEP</span> combinations:{" "}
            <span className="font-mono text-slate-400">DEP-ENG/RE</span>,{" "}
            <span className="font-mono text-slate-400">DEP-ENG/SST</span>,{" "}
            <span className="font-mono text-slate-400">DEP-MTC/SCIE</span>,{" "}
            <span className="font-mono text-slate-400">DEP-MTC/AGRIC</span> — Diploma in Education Primary, same
            bracket pattern.
          </p>
          <p className="mt-2 text-slate-400">
            Other codes: <span className="font-mono text-slate-400">DEP-ECD</span> (DIPLOMA IN EDUCATION –PRIMARY
            -EARLY CHILDHOOD), <span className="font-mono text-slate-400">DNT</span> (DIPLOMA IN NURSERY TEACHING),{" "}
            <span className="font-mono text-slate-400">CECE</span> (CERTIFICATE IN EARLY CHILDHOOD EDUCATION),{" "}
            <span className="font-mono text-slate-400">CNT</span> (CERTIFICATE IN NURSEY TEACHING). Download CSV/TSV
            templates below for bulk import.
          </p>
        </div>
      </div>

      {needsTuitionSignIn ? (
        <div className="rounded-xl border border-cyan-500/35 bg-cyan-950/30 p-4 text-sm text-cyan-50">
          <p className="font-medium text-cyan-100">Tuition hub sign-in required</p>
          <p className="mt-2 text-slate-300">
            You are in the admin area with a different session. To load and edit programmes and fees, sign in with your
            ODEL HUB tuition admin account (email and password).
          </p>
          <Link
            href={`/admin/login?next=${encodeURIComponent(pathname)}`}
            className="mt-3 inline-flex rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
          >
            Open admin login
          </Link>
        </div>
      ) : null}

      {role === "master" ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-4">
          <label className="text-xs font-medium text-amber-100/90">Active school (tenant)</label>
          <select
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            className="mt-2 w-full max-w-md rounded-md border border-white/15 bg-[#0d1526] px-3 py-2 text-sm text-white"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.slug}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-slate-500">
            Platform masters must pick a tenant. Org admins only see their own school.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      <section
        className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-5${needsTuitionSignIn ? " pointer-events-none opacity-45" : ""}`}
      >
        <h2 className="text-sm font-semibold text-white">Add programme</h2>
        <p id="add-programme-hint" className="mt-2 max-w-2xl text-xs text-slate-500">
          Use a <span className="font-mono text-slate-400">code</span> from the institution catalogue above (slashes
          are allowed, e.g. <span className="font-mono text-slate-400">BEP-ENG/RE</span>). The{" "}
          <span className="font-mono text-slate-400">name</span> should match your official programme title, including
          brackets for combination courses.
        </p>
        <form
          onSubmit={createProgramme}
          className="mt-4 grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-end"
          aria-describedby="add-programme-hint"
        >
          <div className="w-full min-w-0 sm:w-auto">
            <label className="text-xs text-slate-500" htmlFor="new-programme-code">
              Code
            </label>
            <input
              id="new-programme-code"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              required
              placeholder="BEP-ENG/RE"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 font-mono text-sm text-white sm:max-w-[16rem] sm:min-w-[12.5rem]"
            />
          </div>
          <div className="w-full min-w-0 sm:min-w-[200px] sm:flex-1">
            <label className="text-xs text-slate-500" htmlFor="new-programme-name">
              Name
            </label>
            <input
              id="new-programme-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Bachelor in Education Primary (ENG/RE)"
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500" htmlFor="new-programme-track">
              Track
            </label>
            <select
              id="new-programme-track"
              value={newTrack}
              onChange={(e) => setNewTrack(e.target.value as ProgrammeTrack)}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:min-w-[10rem] sm:w-auto"
            >
              <option value={ProgrammeTrack.regular}>{PROGRAMME_TRACK_LABEL[ProgrammeTrack.regular]}</option>
              <option value={ProgrammeTrack.inservice}>{PROGRAMME_TRACK_LABEL[ProgrammeTrack.inservice]}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500" htmlFor="new-programme-duration-years">
              Years
            </label>
            <input
              id="new-programme-duration-years"
              type="number"
              min={0}
              max={6}
              value={newDurationYears}
              onChange={(e) => setNewDurationYears(Number(e.target.value))}
              title="Course length, 1–6 years (e.g. 5 for a five-year programme). Set 0 to infer from fee rows. Drives the Year picker and the ‘Whole programme’ bundle at checkout."
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:w-24"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500" htmlFor="new-programme-semesters-per-year">
              {periodLabels.periodsPerYear}
            </label>
            <input
              id="new-programme-semesters-per-year"
              type="number"
              min={0}
              max={3}
              value={newSemestersPerYear}
              onChange={(e) => setNewSemestersPerYear(Number(e.target.value))}
              title={`${periodLabels.periodPlural} per academic year (1–3). Set 0 to infer from fee rows. Drives the ${periodLabels.periodSingular} picker and the per-year bundle at checkout.`}
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-[#0d1526] px-3 py-2 text-sm text-white sm:w-28"
            />
          </div>
          <button
            type="submit"
            disabled={role === "master" && !orgSlug.trim()}
            className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-40"
          >
            Add programme
          </button>
        </form>

        <div className="mt-8 border-t border-white/10 pt-6">
          <h3 className="text-sm font-semibold text-white">Upload programs list</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-500">
            CSV or TSV file: one programme per line. Use columns <span className="font-mono text-slate-400">code</span>{" "}
            and <span className="font-mono text-slate-400">name</span>. Optional header row{" "}
            <span className="font-mono text-slate-400">code,name</span>. Example:{" "}
            <span className="font-mono text-slate-400">BEP-ENG/RE,Bachelor in Education Primary (ENG/RE)</span>.
            Existing codes are
            skipped. Choose whether imported rows are <strong className="text-slate-400">Regular</strong> or{" "}
            <strong className="text-slate-400">In-service</strong> before uploading.
          </p>
          <p className="mt-2 text-xs font-medium text-slate-400">Download blank formats</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <a
              href="/templates/programmes-import-template.csv"
              download="programmes-import-template.csv"
              className="inline-flex rounded-md border border-cyan-500/35 bg-cyan-950/25 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:border-cyan-400/50 hover:bg-cyan-950/40"
            >
              CSV template
            </a>
            <a
              href="/templates/programmes-import-template.tsv"
              download="programmes-import-template.tsv"
              className="inline-flex rounded-md border border-cyan-500/35 bg-cyan-950/25 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:border-cyan-400/50 hover:bg-cyan-950/40"
            >
              TSV template
            </a>
            <a
              href="/templates/programmes-import-instructions.txt"
              download="programmes-import-instructions.txt"
              className="inline-flex rounded-md border border-white/15 bg-[#0d1526] px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-white/25"
            >
              Instructions (TXT)
            </a>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium text-slate-400">Assign imported rows to</span>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-200">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="importTrack"
                  checked={importTrack === ProgrammeTrack.regular}
                  onChange={() => setImportTrack(ProgrammeTrack.regular)}
                  className="border-white/30 text-cyan-500"
                />
                {PROGRAMME_TRACK_LABEL[ProgrammeTrack.regular]}
              </label>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="importTrack"
                  checked={importTrack === ProgrammeTrack.inservice}
                  onChange={() => setImportTrack(ProgrammeTrack.inservice)}
                  className="border-white/30 text-cyan-500"
                />
                {PROGRAMME_TRACK_LABEL[ProgrammeTrack.inservice]}
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 bg-[#0d1526] px-3 py-2 text-sm text-slate-200 hover:border-cyan-500/40">
              <input
                type="file"
                accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
                disabled={importBusy || (role === "master" && !orgSlug.trim())}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void importProgrammesFile(f);
                }}
              />
              {importBusy ? "Importing…" : "Choose file"}
            </label>
          </div>
          {importSummary ? (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs text-slate-300">
              {importSummary}
            </pre>
          ) : null}
        </div>
      </section>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className={`space-y-10${needsTuitionSignIn ? " pointer-events-none opacity-45" : ""}`}>
          {(
            [
              [ProgrammeTrack.inservice, inserviceRows],
              [ProgrammeTrack.regular, regularRows],
            ] as [ProgrammeTrack, ProgrammeRow[]][]
          ).map(([tr, list]) => (
            <section key={tr} className="space-y-3">
              <h2 className="border-b border-white/10 pb-2 text-lg font-semibold tracking-tight text-white">
                <span className="text-cyan-200/90">{PROGRAMME_TRACK_LABEL[tr]}</span>
              </h2>
              {list.length === 0 ? (
                <p className="text-sm text-slate-500">No programmes in this track yet.</p>
              ) : (
                <div className="space-y-4">
                  {list.map((p) => (
                    <div key={p.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="flex flex-wrap items-center gap-2">
                            <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              {PROGRAMME_TRACK_LABEL[p.track]}
                            </span>
                            <span className="font-mono text-lg text-sky-300">{p.code}</span>
                          </p>
                          <p className="text-sm text-slate-300">{p.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{programmeDurationLabel(p, periodLabels)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                  >
                    {expanded === p.id ? "Hide fees" : "Fee schedule"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(p.id);
                      setEditName(p.name);
                      setEditCode(p.code);
                      setEditTrack(p.track);
                      setEditDurationYears(p.durationYears ?? 0);
                      setEditSemestersPerYear(p.semestersPerYear ?? 0);
                    }}
                    className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/5"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFeeProgId(p.id);
                      setFeeRecurrence("per_semester");
                      setFeeKeyInput("");
                      setFeeCategory("tuition");
                      setFeeAmount("");
                      setFeeYear(1);
                      setFeeSem(1);
                      setFeeBulkMessage(null);
                      if (feeCsvInputRef.current) feeCsvInputRef.current.value = "";
                    }}
                    className="rounded-md border border-cyan-500/30 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/10"
                  >
                    Add fee item
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeProgramme(p.id, p.code)}
                    className="rounded-md border border-rose-500/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950/40"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expanded === p.id ? (
                <div className="mt-4 border-t border-white/10 pt-4">
                  {p.periods?.length ? (
                    <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Completion periods
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {p.periods.map((period) => (
                          <div
                            key={`${period.year}-${period.semester}`}
                            className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-2 text-xs text-slate-300"
                          >
                            <p className="font-medium text-slate-200">
                              Year {period.year} · Sem {period.semester}
                            </p>
                            <p className="mt-0.5 text-slate-500">
                              {period.hasFeeSchedule
                                ? `${period.feeLineCount} line(s) · UGX ${period.totalUgx.toLocaleString()}`
                                : "No fee rows yet"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {p.fees.length === 0 ? (
                    <p className="py-3 text-sm text-slate-500">
                      No fee rows — add at least one applicable row for checkout to work.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-3 md:hidden">
                        {p.fees.map((f) => (
                          <FeeEditorMobileCard
                            key={f.id}
                            fee={f}
                            periodLabels={periodLabels}
                            onSave={(patch) => void updateFee(p.id, f, patch)}
                            onDelete={() => void deleteFee(p.id, f.id)}
                          />
                        ))}
                      </div>
                      <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full text-left text-sm text-slate-200">
                          <thead className="text-xs uppercase text-slate-500">
                            <tr>
                              <th className="py-2 pr-3">Item</th>
                              <th className="py-2 pr-3">Type</th>
                              <th className="py-2 pr-3">Fee charge</th>
                              <th className="py-2 pr-3">Year</th>
                              <th className="py-2 pr-3">{periodLabels.periodSingular} (1–3)</th>
                              <th className="py-2 pr-3">Amount UGX</th>
                              <th className="py-2" />
                            </tr>
                          </thead>
                          <tbody>
                            {p.fees.map((f) => (
                              <FeeEditorRow
                                key={f.id}
                                fee={f}
                                periodLabels={periodLabels}
                                onSave={(patch) => void updateFee(p.id, f, patch)}
                                onDelete={() => void deleteFee(p.id, f.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {editId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={editProgrammeDialogTitleId}
            onSubmit={saveEdit}
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] border-b-0 border-t-cyan-500/20 bg-[#0d1526] shadow-xl sm:max-h-[min(88vh,800px)] sm:rounded-xl sm:border-b sm:border-t-0"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
              <h3 id={editProgrammeDialogTitleId} className="text-lg font-semibold text-white">
                Edit programme
              </h3>
              <label className="mt-4 block text-xs font-medium text-slate-400">Code</label>
              <input
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 font-mono text-base text-white sm:py-2 sm:text-sm"
              />
              <label className="mt-4 block text-xs font-medium text-slate-400">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
              />
              <label className="mt-4 block text-xs font-medium text-slate-400">Track</label>
              <select
                value={editTrack}
                onChange={(e) => setEditTrack(e.target.value as ProgrammeTrack)}
                className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-sm text-white sm:py-2"
              >
                <option value={ProgrammeTrack.regular}>{PROGRAMME_TRACK_LABEL[ProgrammeTrack.regular]}</option>
                <option value={ProgrammeTrack.inservice}>{PROGRAMME_TRACK_LABEL[ProgrammeTrack.inservice]}</option>
              </select>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-slate-400">
                  Years to complete
                  <input
                    type="number"
                    min={0}
                    max={6}
                    value={editDurationYears}
                    onChange={(e) => setEditDurationYears(Number(e.target.value))}
                    className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
                  />
                </label>
                <label className="block text-xs font-medium text-slate-400">
                  Semesters per year
                  <input
                    type="number"
                    min={0}
                    max={3}
                    value={editSemestersPerYear}
                    onChange={(e) => setEditSemestersPerYear(Number(e.target.value))}
                    className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
                  />
                </label>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Use 0/0 to infer duration from fee rows. Set explicit values when the course length is known, even before
                every period has fee rows — these numbers drive the Year/Semester pickers at checkout and the size of the
                <span className="font-semibold text-slate-300"> Year with all its semesters</span> and{" "}
                <span className="font-semibold text-slate-300">Whole programme</span> bundles students see on{" "}
                <span className="font-mono text-slate-400">/student/pay</span>.
              </p>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/10 bg-[#0d1526] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-2 sm:border-t-0 sm:bg-transparent sm:p-0 sm:pb-5 sm:pl-5 sm:pr-5 sm:pt-0">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="min-h-[48px] w-full rounded-md border border-white/15 px-4 py-2.5 text-sm sm:min-h-0 sm:w-auto sm:py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[48px] w-full rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white sm:min-h-0 sm:w-auto sm:py-2"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {feeProgId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby={addFeeItemDialogTitleId}
            onSubmit={addFee}
            className="flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] border-b-0 border-t-cyan-500/20 bg-[#0d1526] shadow-xl sm:max-h-[min(88vh,800px)] sm:rounded-xl sm:border-b sm:border-t-0"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:px-5 sm:pb-5 sm:pt-5">
            <h3 id={addFeeItemDialogTitleId} className="text-lg font-semibold text-white">
              Add fee item
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              For each line: set the item, whether it is tuition or functional, the amount, then how often that amount
              applies — paid once, paid per semester (semesters 1–3 only), or paid per year (same charge for all three
              semesters in that year).
            </p>
            <div className="mt-4 rounded-lg border border-cyan-500/25 bg-cyan-950/25 p-3 sm:p-3.5">
              <p className="text-xs font-semibold text-cyan-100/95">Upload fee rows (CSV or TSV)</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Columns match the form:{" "}
                <span className="text-slate-400">
                  Item, Line Type (Tuition or Functional), Amount, Fee Charge Category, Academic Year, Semester
                </span>
                . Use the same wording as the dropdowns (e.g. Per semester, Per year, Paid once). For Per year, leave
                Semester empty or 0.
              </p>
              <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
                <a
                  href={feeCsvTemplateHref}
                  download="fee-items-template.csv"
                  className="inline-flex min-h-[44px] flex-shrink-0 items-center justify-center rounded-md border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-center text-[11px] font-medium text-cyan-100 hover:bg-cyan-900/50 sm:min-h-0 sm:justify-start sm:py-1.5"
                >
                  Download CSV template
                </a>
                <input
                  ref={feeCsvInputRef}
                  type="file"
                  accept=".csv,text/csv,.tsv,text/tab-separated-values"
                  disabled={feeBulkBusy}
                  className="min-h-[44px] w-full min-w-0 text-[11px] text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-xs file:text-slate-200 sm:min-h-0 sm:flex-1 sm:py-0"
                />
                <button
                  type="button"
                  disabled={feeBulkBusy}
                  onClick={() => {
                    const f = feeCsvInputRef.current?.files?.[0];
                    if (f) void importFeeCsvFile(f);
                    else setFeeBulkMessage("Choose a CSV or TSV file first.");
                  }}
                  className="min-h-[44px] w-full flex-shrink-0 rounded-md bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600 disabled:opacity-50 sm:min-h-0 sm:w-auto sm:py-1.5"
                >
                  {feeBulkBusy ? "Importing…" : "Import file"}
                </button>
              </div>
              {feeBulkMessage ? (
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded border border-white/10 bg-black/30 p-2 text-[11px] text-slate-300 sm:max-h-36">
                  {feeBulkMessage}
                </pre>
              ) : null}
            </div>
            <label className="mt-4 block text-xs font-medium text-slate-400">1. Item</label>
            <input
              value={feeKeyInput}
              onChange={(e) => setFeeKeyInput(e.target.value)}
              required
              placeholder="e.g. tuition_block or library_levy"
              className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 font-mono text-base text-white sm:py-2 sm:text-sm"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Short code — letters, numbers, hyphens, underscores. Unique with year, semester (when used), and fee
              charge rule.
            </p>
            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-slate-400">2. Line type (tuition or functional)</legend>
              <div className="mt-2 flex flex-col gap-3 text-sm text-slate-200 sm:flex-row sm:flex-wrap sm:gap-4">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 sm:min-h-0 sm:gap-2">
                  <input
                    type="radio"
                    name="feeCategory"
                    checked={feeCategory === "tuition"}
                    onChange={() => setFeeCategory("tuition")}
                    className="h-4 w-4 shrink-0 border-white/30 text-cyan-500"
                  />
                  Tuition
                </label>
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 sm:min-h-0 sm:gap-2">
                  <input
                    type="radio"
                    name="feeCategory"
                    checked={feeCategory === "functional"}
                    onChange={() => setFeeCategory("functional")}
                    className="h-4 w-4 shrink-0 border-white/30 text-cyan-500"
                  />
                  Functional
                </label>
              </div>
            </fieldset>
            <label className="mt-4 block text-xs font-medium text-slate-400">3. Amount (UGX)</label>
            <input
              value={feeAmount}
              onChange={(e) => setFeeAmount(e.target.value)}
              inputMode="decimal"
              required
              className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
            />
            <label className="mt-4 block text-xs font-medium text-slate-400">4. Fee charge category</label>
            <select
              value={feeRecurrence}
              onChange={(e) => setFeeRecurrence(e.target.value as FeeRow["recurrence"])}
              className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-sm text-white sm:py-2"
            >
              <option value="once">Paid once — only when the student pays this exact year and semester (1–3)</option>
              <option value="per_semester">
                Paid per semester — whenever that semester (1–3) is billed for the chosen year
              </option>
              <option value="per_year">Paid per year — one amount for semesters 1–3 together in the chosen year</option>
            </select>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="text-xs text-slate-500">Academic year (1–6)</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={feeYear}
                  onChange={(e) => setFeeYear(Number(e.target.value))}
                  className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-base text-white sm:py-2 sm:text-sm"
                />
              </div>
              <div className="min-w-0">
                <label className="text-xs text-slate-500">Semester (1–3)</label>
                {feeRecurrence === "per_year" ? (
                  <p className="mt-2 rounded-md border border-white/10 bg-black/20 px-3 py-2.5 text-xs leading-relaxed text-slate-400 sm:py-2">
                    Not used for “paid per year” — semesters 1–3 in year {feeYear} share this line.
                  </p>
                ) : (
                  <select
                    value={feeSem}
                    onChange={(e) => setFeeSem(Number(e.target.value))}
                    className="mt-1 w-full min-w-0 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2.5 text-sm text-white sm:py-2"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </select>
                )}
              </div>
            </div>
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-white/10 bg-[#0d1526] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-2 sm:border-t-0 sm:bg-transparent sm:p-0 sm:pb-5 sm:pl-5 sm:pr-5 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  setFeeProgId(null);
                  setFeeBulkMessage(null);
                  if (feeCsvInputRef.current) feeCsvInputRef.current.value = "";
                }}
                className="min-h-[48px] w-full rounded-md border border-white/15 px-4 py-2.5 text-sm sm:min-h-0 sm:w-auto sm:py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="min-h-[48px] w-full rounded-md bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white sm:min-h-0 sm:w-auto sm:py-2"
              >
                Add fee item
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <p className="text-xs text-slate-500">
        If <code className="text-cyan-200/80">/pay/default</code> shows “no active organization”, run{" "}
        <code className="text-cyan-200/80">npm run seed</code> after <code className="text-cyan-200/80">npm run db:push</code>{" "}
        so the <strong className="text-slate-400">default</strong> tenant and programmes exist.
      </p>
    </div>
  );
}

function chargeLabel(recurrence: FeeRow["recurrence"], periodLabels: AcademicPeriodLabels): string {
  switch (recurrence) {
    case "per_semester":
      return `Paid ${periodLabels.perPeriodRecurrence.toLowerCase()}`;
    case "per_year":
      return "Paid per year";
    case "once":
      return "Paid once";
    default:
      return recurrence;
  }
}

function periodIndexLabel(f: FeeRow, periodLabels: AcademicPeriodLabels): string {
  if (f.recurrence === "per_year") return "1–3";
  return periodLabels.periodShort(f.semester);
}

function programmeDurationLabel(p: ProgrammeRow, periodLabels: AcademicPeriodLabels): string {
  const duration = p.duration;
  if (!duration || duration.totalSemesters === 0) return "Duration not set";
  const source = duration.source === "configured" ? "configured" : "inferred from fees";
  const periods = duration.totalSemesters;
  return `${duration.durationYears} year${duration.durationYears === 1 ? "" : "s"} · ${periods} ${periodLabels.periodPlural.toLowerCase()} (${source})`;
}

function useFeeEditor(fee: FeeRow, onSave: (patch: Partial<FeeRow>) => void) {
  const mixed = fee.tuitionUgx > 0 && fee.functionalFeesUgx > 0;
  const [tuition, setTuition] = useState(String(fee.tuitionUgx));
  const [func, setFunc] = useState(String(fee.functionalFeesUgx));
  const [singleKind, setSingleKind] = useState<"tuition" | "functional">(
    fee.functionalFeesUgx > 0 && fee.tuitionUgx === 0 ? "functional" : "tuition"
  );

  useEffect(() => {
    setTuition(String(fee.tuitionUgx));
    setFunc(String(fee.functionalFeesUgx));
    setSingleKind(fee.functionalFeesUgx > 0 && fee.tuitionUgx === 0 ? "functional" : "tuition");
  }, [fee.id, fee.tuitionUgx, fee.functionalFeesUgx]);

  function save() {
    if (mixed) {
      const t = Number(tuition.replace(/,/g, ""));
      const fn = Number(func.replace(/,/g, ""));
      if (!Number.isFinite(t) || !Number.isFinite(fn)) return;
      onSave({ tuitionUgx: Math.round(t), functionalFeesUgx: Math.round(fn) });
      return;
    }
    const raw = singleKind === "tuition" ? tuition : func;
    const a = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(a) || a < 0) return;
    if (singleKind === "tuition") {
      onSave({ tuitionUgx: Math.round(a), functionalFeesUgx: 0 });
    } else {
      onSave({ tuitionUgx: 0, functionalFeesUgx: Math.round(a) });
    }
  }

  return { mixed, tuition, setTuition, func, setFunc, singleKind, setSingleKind, save };
}

const feeInputCls = "w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white";

function FeeEditorMobileCard({
  fee,
  periodLabels,
  onSave,
  onDelete,
}: {
  fee: FeeRow;
  periodLabels: AcademicPeriodLabels;
  onSave: (patch: Partial<FeeRow>) => void;
  onDelete: () => void;
}) {
  const { mixed, tuition, setTuition, func, setFunc, singleKind, setSingleKind, save } = useFeeEditor(fee, onSave);

  return (
    <article className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-slate-200">
      <p className="font-mono text-xs text-cyan-200/90">{fee.feeKey}</p>
      <p className="mt-1 text-xs text-slate-400">
        {chargeLabel(fee.recurrence, periodLabels)} · Year {fee.year} · {periodIndexLabel(fee, periodLabels)}
      </p>
      {!mixed ? (
        <label className="mt-3 block">
          <span className="text-[11px] text-slate-500">Type</span>
          <select
            value={singleKind}
            onChange={(e) => setSingleKind(e.target.value as "tuition" | "functional")}
            className={`mt-1 ${feeInputCls}`}
          >
            <option value="tuition">Tuition</option>
            <option value="functional">Functional</option>
          </select>
        </label>
      ) : (
        <p className="mt-2 text-xs text-amber-200/90">Both tuition & functional (legacy)</p>
      )}
      <div className="mt-3 space-y-2">
        {mixed ? (
          <>
            <label className="block">
              <span className="text-[11px] text-slate-500">Tuition UGX</span>
              <input value={tuition} onChange={(e) => setTuition(e.target.value)} className={`mt-1 ${feeInputCls}`} />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">Functional UGX</span>
              <input value={func} onChange={(e) => setFunc(e.target.value)} className={`mt-1 ${feeInputCls}`} />
            </label>
          </>
        ) : (
          <label className="block">
            <span className="text-[11px] text-slate-500">Amount UGX</span>
            <input
              value={singleKind === "tuition" ? tuition : func}
              onChange={(e) => {
                const v = e.target.value;
                if (singleKind === "tuition") setTuition(v);
                else setFunc(v);
              }}
              className={`mt-1 ${feeInputCls}`}
            />
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" onClick={save} className="min-h-[44px] text-xs font-semibold text-sky-400">
          Save
        </button>
        <button type="button" onClick={onDelete} className="min-h-[44px] text-xs text-rose-300">
          Remove
        </button>
      </div>
    </article>
  );
}

function FeeEditorRow({
  fee,
  periodLabels,
  onSave,
  onDelete,
}: {
  fee: FeeRow;
  periodLabels: AcademicPeriodLabels;
  onSave: (patch: Partial<FeeRow>) => void;
  onDelete: () => void;
}) {
  const { mixed, tuition, setTuition, func, setFunc, singleKind, setSingleKind, save } = useFeeEditor(fee, onSave);

  return (
    <tr className="border-b border-white/5">
      <td className="py-2 pr-3 font-mono text-xs text-slate-300">{fee.feeKey}</td>
      <td className="py-2 pr-3 text-xs text-slate-300">
        {mixed ? (
          <span className="text-amber-200/90">Both (legacy)</span>
        ) : (
          <select
            value={singleKind}
            onChange={(e) => setSingleKind(e.target.value as "tuition" | "functional")}
            className="max-w-[10rem] rounded border border-white/10 bg-black/30 px-1 py-0.5 text-xs text-white"
          >
            <option value="tuition">Tuition</option>
            <option value="functional">Functional</option>
          </select>
        )}
      </td>
      <td className="py-2 pr-3 text-xs capitalize text-slate-300">{chargeLabel(fee.recurrence, periodLabels)}</td>
      <td className="py-2 pr-3">{fee.year}</td>
      <td className="py-2 pr-3 text-slate-300">{periodIndexLabel(fee, periodLabels)}</td>
      <td className="py-2 pr-3 align-top">
        {mixed ? (
          <div className="flex flex-col gap-1 text-xs">
            <input
              value={tuition}
              onChange={(e) => setTuition(e.target.value)}
              placeholder="Tuition"
              className="w-28 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
            />
            <input
              value={func}
              onChange={(e) => setFunc(e.target.value)}
              placeholder="Functional"
              className="w-28 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
            />
          </div>
        ) : (
          <input
            value={singleKind === "tuition" ? tuition : func}
            onChange={(e) => {
              const v = e.target.value;
              if (singleKind === "tuition") setTuition(v);
              else setFunc(v);
            }}
            className="w-28 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
          />
        )}
      </td>
      <td className="space-x-2 py-2 align-top">
        <button type="button" onClick={save} className="text-xs text-sky-400 hover:underline">
          Save
        </button>
        <button type="button" onClick={onDelete} className="text-xs text-rose-300 hover:underline">
          Remove
        </button>
      </td>
    </tr>
  );
}
