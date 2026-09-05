"use client";

import { useCallback, useEffect, useState } from "react";
import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";
import { schoolTermLabel } from "@/lib/school-term";

export type SchoolTermOption = {
  id: string;
  label: string;
  termNumber: number;
  isActive: boolean;
};

type Props = {
  value: number;
  onChange: (termNumber: number, label: string) => void;
  className?: string;
  label?: string;
};

/**
 * Term dropdown from Set Terms (custom labels + term numbers including Term 4+).
 */
export function SchoolTermSelect({ value, onChange, className = "", label = "Term" }: Props) {
  const { schoolFetch } = useSchoolAdminApi();
  const [terms, setTerms] = useState<SchoolTermOption[]>([]);

  const load = useCallback(async () => {
    const r = await schoolFetch("/api/admin/school/terms");
    if (!r.ok) return;
    const j = (await r.json()) as { terms?: SchoolTermOption[] };
    setTerms(j.terms ?? []);
  }, [schoolFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const options =
    terms.length > 0
      ? terms
      : [1, 2, 3].map((termNumber) => ({
          id: String(termNumber),
          label: schoolTermLabel(termNumber),
          termNumber,
          isActive: false,
        }));

  const hasValue = options.some((t) => t.termNumber === value);
  const displayOptions = hasValue
    ? options
    : [
        ...options,
        {
          id: `n-${value}`,
          label: schoolTermLabel(value),
          termNumber: value,
          isActive: false,
        },
      ].sort((a, b) => a.termNumber - b.termNumber);

  const selected = displayOptions.find((t) => t.termNumber === value);

  return (
    <label className={`flex flex-col gap-1 text-sm text-slate-300 ${className}`}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          const opt = displayOptions.find((t) => t.termNumber === n);
          onChange(n, opt?.label ?? schoolTermLabel(n));
        }}
        className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-white"
      >
        {displayOptions.map((t) => (
          <option key={t.id} value={t.termNumber}>
            {t.label}
            {t.isActive ? " (active)" : ""}
          </option>
        ))}
      </select>
      {selected ? <span className="text-xs text-slate-500">Using {selected.label}</span> : null}
    </label>
  );
}
