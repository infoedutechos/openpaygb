"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ModalHeader } from "@/components/nav/ModalHeader";
import { PROGRAMME_TRACK_LABEL, type ProgrammeTrack } from "@/lib/programme-track";

type SchoolDetail = {
  organization: {
    id: string;
    name: string;
    slug: string;
    tenantStatus: string;
    destinationWallet: string;
    registrationContactEmail: string;
    registrationNote: string;
    checkoutPlatformFeeUgx: number;
    effectivePlatformFeeUgx: number;
    hasFavicon: boolean;
    createdAt: string;
    updatedAt: string;
  };
  counts: {
    students: number;
    programmes: number;
    payments: number;
    confirmedPayments: number;
    adminUsers: number;
  };
  programmes: Array<{
    id: string;
    code: string;
    name: string;
    track: ProgrammeTrack;
    duration?: {
      durationYears: number;
      semestersPerYear: number;
      totalSemesters: number;
      source: "configured" | "fee_schedule" | "empty";
    };
    feeCount: number;
    fees: Array<{
      id: string;
      year: number;
      semester: number;
      recurrence: string;
      feeKey: string;
      tuitionUgx: number;
      functionalFeesUgx: number;
    }>;
  }>;
  recentPayments: Array<{
    id: string;
    status: string;
    amountUgx: number;
    createdAt: string;
    studentName: string;
    programmeCode: string;
  }>;
  fxRate: { ugxPerTon: number; source: string; effectiveAt: string } | null;
};

function maskWallet(addr: string): string {
  const t = addr.trim();
  if (!t) return "Not configured";
  if (t.length <= 12) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

function formatUgx(n: number): string {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function Stat({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-100 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-sm font-semibold text-slate-800 ${mono ? "font-mono text-xs font-normal" : ""}`}>{value}</p>
    </div>
  );
}

export function SchoolDetailModal({
  organizationSlug,
  open,
  isMaster,
  onClose,
}: {
  organizationSlug: string | null;
  open: boolean;
  isMaster: boolean;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<SchoolDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedProgramme, setExpandedProgramme] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organizationSlug) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(
        `/api/admin/organizations/${encodeURIComponent(organizationSlug)}/detail`,
        { credentials: "include" }
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not load school");
      setDetail(j as SchoolDetail);
    } catch (e) {
      setDetail(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [organizationSlug]);

  useEffect(() => {
    if (open && organizationSlug) {
      setExpandedProgramme(null);
      void load();
    }
    if (!open) {
      setDetail(null);
      setError(null);
    }
  }, [open, organizationSlug, load]);

  if (!open) return null;

  const org = detail?.organization;
  const payUrl = org ? `/pay/${org.slug}` : "#";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-200/80 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="school-detail-title"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1">
          <ModalHeader variant="light" onBack={onClose} title={org?.name ?? "School details"} />
          <h2 id="school-detail-title" className="sr-only">
            {org?.name ?? "School details"}
          </h2>
        </div>

        <div className="mt-4 max-h-[min(70vh,32rem)] space-y-5 overflow-y-auto">
          {loading && <p className="text-sm text-slate-500">Loading school profile…</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {org && detail && (
            <>
              <header className="space-y-1 border-b border-slate-100 pb-4">
                <p className="font-mono text-xs text-slate-500">{org.slug}</p>
                <p className="text-xs capitalize text-slate-600">
                  Status: <span className="font-medium">{org.tenantStatus}</span>
                  {org.hasFavicon ? " · Custom favicon" : null}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={payUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Public pay page
                  </a>
                  <Link
                    href="/admin/programmes"
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    Manage programmes
                  </Link>
                  {isMaster ? (
                    <Link
                      href="/admin/master/organizations"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Master org console
                    </Link>
                  ) : null}
                </div>
              </header>

              <section className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Stat label="Students" value={detail.counts.students} />
                <Stat label="Programmes" value={detail.counts.programmes} />
                <Stat
                  label="Payments"
                  value={`${detail.counts.confirmedPayments} / ${detail.counts.payments}`}
                />
                <Stat label="Admin users" value={detail.counts.adminUsers} />
                <Stat label="Checkout fee" value={`${formatUgx(org.effectivePlatformFeeUgx)} UGX`} />
                <Stat label="TON treasury" value={maskWallet(org.destinationWallet)} mono />
              </section>

              {(org.registrationContactEmail || org.registrationNote) && (
                <section className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  {org.registrationContactEmail ? (
                    <p>
                      <span className="font-medium text-slate-700">Contact:</span> {org.registrationContactEmail}
                    </p>
                  ) : null}
                  {org.registrationNote ? (
                    <p className="mt-1 whitespace-pre-wrap">
                      <span className="font-medium text-slate-700">Note:</span> {org.registrationNote}
                    </p>
                  ) : null}
                </section>
              )}

              {detail.fxRate && (
                <p className="text-xs text-slate-500">
                  Latest FX: 1 TON ≈ {detail.fxRate.ugxPerTon.toLocaleString()} UGX ({detail.fxRate.source},{" "}
                  {formatDate(detail.fxRate.effectiveAt)})
                </p>
              )}

              <section>
                <h3 className="text-sm font-semibold text-slate-900">
                  Programmes ({detail.programmes.length})
                </h3>
                {detail.programmes.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    No programmes yet. Schools configure these under Admin → Programmes.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                    {detail.programmes.map((p) => (
                      <li key={p.id} className="rounded-lg border border-slate-100 text-xs">
                        <button
                          type="button"
                          className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
                          onClick={() => setExpandedProgramme((id) => (id === p.id ? null : p.id))}
                        >
                          <span>
                            <span className="font-mono font-medium text-slate-800">{p.code}</span>
                            <span className="ml-2 text-slate-600">{p.name}</span>
                          </span>
                          <span className="shrink-0 text-slate-400">
                            {PROGRAMME_TRACK_LABEL[p.track]} ·{" "}
                            {p.duration && p.duration.totalSemesters > 0
                              ? `${p.duration.durationYears} year(s), ${p.duration.totalSemesters} semester(s) · `
                              : ""}
                            {p.feeCount} fee line{p.feeCount === 1 ? "" : "s"}
                          </span>
                        </button>
                        {expandedProgramme === p.id && p.fees.length > 0 && (
                          <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-2">
                            <ul className="space-y-2 md:hidden">
                              {p.fees.map((f) => (
                                <li
                                  key={f.id}
                                  className="rounded-md border border-slate-200/80 bg-white px-2.5 py-2 text-[11px] text-slate-600"
                                >
                                  <p className="font-medium text-slate-700">
                                    Y{f.year} S{f.semester}
                                    {f.feeKey ? (
                                      <span className="ml-1 font-mono font-normal text-slate-500">· {f.feeKey}</span>
                                    ) : null}
                                  </p>
                                  <p className="mt-1">
                                    Fees {formatUgx(f.tuitionUgx)} · Other Requirements {formatUgx(f.functionalFeesUgx)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            <div className="hidden overflow-x-auto md:block">
                            <table className="w-full text-[11px] text-slate-600">
                              <thead>
                                <tr className="text-left text-slate-400">
                                  <th className="pr-2">Yr/Sem</th>
                                  <th className="pr-2">Key</th>
                                  <th className="pr-2">Fees</th>
                                  <th>Other Reqs</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.fees.map((f) => (
                                  <tr key={f.id}>
                                    <td className="py-0.5 pr-2">
                                      Y{f.year} S{f.semester}
                                    </td>
                                    <td className="py-0.5 pr-2 font-mono">{f.feeKey || "—"}</td>
                                    <td className="py-0.5 pr-2">{formatUgx(f.tuitionUgx)}</td>
                                    <td className="py-0.5">{formatUgx(f.functionalFeesUgx)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {detail.recentPayments.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-900">Recent payments</h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {detail.recentPayments.map((p) => (
                      <li key={p.id} className="flex justify-between gap-2 border-b border-slate-50 py-1">
                        <span>
                          {p.studentName} · {p.programmeCode}
                        </span>
                        <span className="shrink-0 text-right">
                          {formatUgx(p.amountUgx)} UGX ·{" "}
                          <span className={p.status === "confirmed" ? "text-emerald-600" : "text-amber-600"}>
                            {p.status}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="text-[10px] text-slate-400">
                Created {formatDate(org.createdAt)} · Updated {formatDate(org.updatedAt)}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
