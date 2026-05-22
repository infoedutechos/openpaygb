"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Org = { id: string; name: string; slug: string };
type Programme = { id: string; code: string; name: string };

const years = [1, 2, 3, 4, 5, 6];
const semesters = [1, 2, 3];

export default function StudentGuestDashboardPage() {
  const router = useRouter();
  const [signup, setSignup] = useState<{ email: string; name: string } | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [programmeCode, setProgrammeCode] = useState("");
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [sRes, oRes] = await Promise.all([
        fetch("/api/auth/student-signup/session", { credentials: "include" }),
        fetch("/api/public/organizations"),
      ]);
      if (!sRes.ok) {
        setLoadErr("session");
        return;
      }
      const sj = (await sRes.json()) as { signup?: { email: string; name: string } | null };
      if (!sj.signup) {
        setLoadErr("session");
        return;
      }
      setSignup(sj.signup);
      const oj = (await oRes.json()) as { organizations?: Org[] };
      setOrgs(Array.isArray(oj.organizations) ? oj.organizations : []);
    })();
  }, []);

  useEffect(() => {
    const slug = selectedSlug.trim().toLowerCase();
    if (!slug) {
      setProgrammes([]);
      setProgrammeCode("");
      return;
    }
    const q = new URLSearchParams({ orgSlug: slug });
    void fetch(`/api/programmes?${q.toString()}`)
      .then((r) => r.json())
      .then((j: { programmes?: Programme[] }) => {
        const list = Array.isArray(j.programmes) ? j.programmes : [];
        setProgrammes(list);
        setProgrammeCode(list[0]?.code ?? "");
      })
      .catch(() => setProgrammes([]));
  }, [selectedSlug]);

  async function onChooseSchool(e: React.FormEvent) {
    e.preventDefault();
    const slug = selectedSlug.trim().toLowerCase();
    if (!slug) {
      setError("Choose a school from the list.");
      return;
    }
    if (!programmeCode) {
      setError("Choose a programme.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/student-signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationSlug: slug,
          programmeCode,
          year,
          semester,
        }),
      });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? "Could not finish signup");
      router.replace("/student");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  if (loadErr) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center text-slate-300">
        <p className="text-rose-400">Your setup session expired or is invalid.</p>
        <p className="mt-2 text-sm text-slate-500">Open the confirmation link from your email again, or start over.</p>
        <Link href="/student/register" className="mt-6 inline-block text-sky-400 hover:underline">
          Register again
        </Link>
      </div>
    );
  }

  if (!signup) {
    return <p className="p-12 text-center text-slate-500">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-12 text-slate-200">
      <header className="space-y-2 border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-wider text-cyan-400/80">Guest student dashboard</p>
        <h1 className="text-2xl font-semibold text-white">Welcome, {signup.name}</h1>
        <p className="text-sm text-slate-400">
          Email confirmed: <span className="text-slate-200">{signup.email}</span>
        </p>
        <p className="text-sm text-slate-500">Choose your school and programme enrollment.</p>
      </header>

      <form onSubmit={onChooseSchool} className="space-y-4 rounded-2xl border border-white/10 bg-[#0d1526] p-6">
        <div>
          <label className="text-xs font-medium text-slate-400">Your school</label>
          <select
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
            required
            className="mt-2 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2.5 text-sm text-white"
          >
            <option value="">Select a school…</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.slug}>
                {o.name} ({o.slug})
              </option>
            ))}
          </select>
        </div>
        {selectedSlug ? (
          <>
            <div>
              <label className="text-xs font-medium text-slate-400">Programme</label>
              <select
                value={programmeCode}
                onChange={(e) => setProgrammeCode(e.target.value)}
                required
                className="mt-2 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2.5 text-sm text-white"
              >
                <option value="">Select programme…</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-slate-400">Year</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2.5 text-sm text-white"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      Year {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400">Semester</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="mt-2 w-full rounded-lg border border-[var(--border)] bg-black/40 px-3 py-2.5 text-sm text-white"
                >
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        ) : null}
        {orgs.length === 0 ? (
          <p className="text-sm text-amber-300">No active schools are listed yet. Contact support or your institution.</p>
        ) : null}
        {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !selectedSlug || !programmeCode || orgs.length === 0}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Continue to student home"}
        </button>
      </form>
    </div>
  );
}
