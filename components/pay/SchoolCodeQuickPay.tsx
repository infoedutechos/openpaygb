"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readJsonResponse } from "@/utils/read-json-response";

type LookupResponse = {
  organizationSlug: string;
  organizationName: string;
  payUrl: string;
  student: { name: string; admissionNo: string } | null;
  studentNotFound?: boolean;
};

/** SchoolPay-style entry: School Code (+ optional admission number) → school checkout. */
export function SchoolCodeQuickPay() {
  const router = useRouter();
  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNo, setAdmissionNo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<LookupResponse | null>(null);

  async function lookup() {
    setBusy(true);
    setError(null);
    setMatch(null);
    try {
      const r = await fetch("/api/public/school-code-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolCode: schoolCode.trim(),
          ...(admissionNo.trim() ? { admissionNo: admissionNo.trim() } : {}),
        }),
      });
      const parsed = await readJsonResponse<LookupResponse>(r);
      if (!parsed.ok) throw new Error(parsed.error);
      setMatch(parsed.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-4">
      <h2 className="text-sm font-semibold text-emerald-100">Pay with School Code</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">
        Have a School Code from the bursar or admission letter? Enter it (and the student&apos;s
        admission number to confirm the name) to jump straight to that school&apos;s checkout.
      </p>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
      >
        <input
          value={schoolCode}
          onChange={(e) => setSchoolCode(e.target.value)}
          inputMode="numeric"
          placeholder="School Code (6 digits)"
          required
          className="rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 font-mono text-sm text-white sm:w-44"
        />
        <input
          value={admissionNo}
          onChange={(e) => setAdmissionNo(e.target.value)}
          placeholder="Admission no. (optional)"
          className="flex-1 rounded-md border border-[var(--border)] bg-black/30 px-3 py-2 text-sm text-white"
        />
        <button
          type="submit"
          disabled={busy || schoolCode.trim().length < 4}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Checking…" : "Find school"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-rose-400">{error}</p> : null}
      {match ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/25 p-3 text-sm">
          <p className="font-semibold text-white">{match.organizationName}</p>
          {match.student ? (
            <p className="mt-1 text-xs text-emerald-300">
              Student confirmed: {match.student.name} · Admission {match.student.admissionNo}
            </p>
          ) : match.studentNotFound ? (
            <p className="mt-1 text-xs text-amber-300">
              No student found with that admission number — you can still continue and pick the
              student at checkout.
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.push(match.payUrl)}
            className="mt-3 rounded-md bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
          >
            Continue to checkout →
          </button>
        </div>
      ) : null}
    </section>
  );
}
