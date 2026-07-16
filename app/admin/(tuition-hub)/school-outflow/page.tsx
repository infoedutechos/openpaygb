"use client";



import { useCallback, useEffect, useState } from "react";

import { formatUgx } from "@/components/admin/school/SchoolContextBar";

import { SchoolVoucherLineItems, type VoucherLine } from "@/components/admin/school/SchoolVoucherLineItems";

import { useSchoolAdminApi } from "@/hooks/useSchoolAdminApi";



type Account = { id: string; name: string };

type Voucher = { id: string; payee: string; accountName: string; totalUgx: number; disbursedAt: string };

type SalaryRow = { id: string; staffCode: string; staffName: string; monthKey: string; grossUgx: number; deductionUgx: number; netUgx: number; paidAt: string | null };

type Balance = { accountId: string; accountName: string; availableUgx: number };



export default function SchoolOutflowPage() {

  const { schoolFetch, organizationSlug, needsOrgSlug } = useSchoolAdminApi();

  const [hubTab, setHubTab] = useState<"voucher" | "history" | "salary">("voucher");

  const [accounts, setAccounts] = useState<Account[]>([]);

  const [balances, setBalances] = useState<Balance[]>([]);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);

  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);

  const [staff, setStaff] = useState<{ id: string; name: string; staffCode: string; salaryUgx: number }[]>([]);

  const [term, setTerm] = useState(1);

  const [error, setError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);

  const [voucherForm, setVoucherForm] = useState({

    accountId: "",

    payee: "",

    payer: "",

    notes: "",

    lineItems: [{ particular: "", amountUgx: 0 }] as VoucherLine[],

  });

  const [salaryForm, setSalaryForm] = useState({ staffId: "", monthKey: "", deductionUgx: 0 });



  const load = useCallback(async () => {

    if (needsOrgSlug) return;

    const [accR, outR, staffR, balR, salR, sessR] = await Promise.all([

      schoolFetch("/api/admin/school/accounts", undefined, { kind: "expenditure" }),

      schoolFetch("/api/admin/school/outflow"),

      schoolFetch("/api/admin/school/staff", undefined, { status: "active" }),

      schoolFetch("/api/admin/school/account-balances", undefined, { term }),

      schoolFetch("/api/admin/school/outflow", undefined, { kind: "salary" }),

      schoolFetch("/api/admin/school/sessions"),

    ]);

    if (accR.ok) {

      const j = (await accR.json()) as { accounts?: Account[] };

      setAccounts(j.accounts ?? []);

    }

    if (outR.ok) {

      const j = (await outR.json()) as { vouchers?: Voucher[] };

      setVouchers(j.vouchers ?? []);

    }

    if (staffR.ok) {

      const j = (await staffR.json()) as { staff?: typeof staff };

      setStaff(j.staff ?? []);

    }

    if (balR.ok) {

      const j = (await balR.json()) as { balances?: Balance[] };

      setBalances(j.balances ?? []);

    }

    if (salR.ok) {

      const j = (await salR.json()) as { salaryPayments?: SalaryRow[] };

      setSalaryRows(j.salaryPayments ?? []);

    }

    if (sessR.ok) {

      const j = (await sessR.json()) as { context?: { activeTerm?: number } };

      if (j.context?.activeTerm) setTerm(j.context.activeTerm);

    }

  }, [needsOrgSlug, schoolFetch, term]);



  useEffect(() => {

    void load();

  }, [load]);



  const availableForAccount = balances.find((b) => b.accountId === voucherForm.accountId)?.availableUgx ?? null;

  const salaryBalance = balances.find((b) => /salary/i.test(b.accountName))?.availableUgx ?? null;

  const selectedStaff = staff.find((s) => s.id === salaryForm.staffId);

  const netPreview = selectedStaff ? Math.max(0, selectedStaff.salaryUgx - salaryForm.deductionUgx) : 0;



  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-2xl font-semibold text-white">Cash outflow</h1>

        <p className="text-sm text-slate-400">Voucher disbursements and salary payments against expenditure accounts.</p>

      </div>

      {error ? <p className="text-sm text-rose-400">{error}</p> : null}

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}



      <div className="flex flex-wrap gap-2">

        {(["voucher", "history", "salary"] as const).map((t) => (

          <button

            key={t}

            type="button"

            onClick={() => setHubTab(t)}

            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${hubTab === t ? "bg-rose-900/50 text-rose-100" : "text-slate-400"}`}

          >

            {t === "history" ? "Payment history" : t === "salary" ? "Salary payment" : "Make payment"}

          </button>

        ))}

      </div>



      {hubTab === "voucher" ? (

        <form

          className="space-y-4 rounded-xl border border-white/10 bg-[#0a101f] p-4"

          onSubmit={(e) => {

            e.preventDefault();

            setError(null);

            setMessage(null);

            const lines = voucherForm.lineItems.filter((l) => l.particular.trim() && l.amountUgx > 0);

            if (lines.length === 0) return;

            if (!confirm("Disburse this voucher?")) return;

            void (async () => {

              const r = await schoolFetch("/api/admin/school/outflow", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({

                  organizationSlug,

                  term,

                  accountId: voucherForm.accountId,

                  payee: voucherForm.payee,

                  payer: voucherForm.payer,

                  notes: voucherForm.notes,

                  lineItems: lines,

                }),

              });

              const j = (await r.json()) as { error?: string };

              if (!r.ok) {

                setError(j.error ?? "Disbursement failed");

                return;

              }

              setMessage("Voucher disbursed.");

              setVoucherForm({ accountId: "", payee: "", payer: "", notes: "", lineItems: [{ particular: "", amountUgx: 0 }] });

              await load();

            })();

          }}

        >

          <div className="grid gap-2 sm:grid-cols-2">

            <select value={term} onChange={(e) => setTerm(Number(e.target.value))} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white">

              <option value={1}>Term 1</option>

              <option value={2}>Term 2</option>

              <option value={3}>Term 3</option>

            </select>

            <select value={voucherForm.accountId} onChange={(e) => setVoucherForm({ ...voucherForm, accountId: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" required>

              <option value="">Expenditure account</option>

              {accounts.map((a) => (

                <option key={a.id} value={a.id}>{a.name}</option>

              ))}

            </select>

          </div>

          {availableForAccount != null ? (

            <p className="text-sm text-emerald-300">Available fund: {formatUgx(availableForAccount)}</p>

          ) : null}

          <input placeholder="Payee" required value={voucherForm.payee} onChange={(e) => setVoucherForm({ ...voucherForm, payee: e.target.value })} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

          <input placeholder="Payer" value={voucherForm.payer} onChange={(e) => setVoucherForm({ ...voucherForm, payer: e.target.value })} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

          <SchoolVoucherLineItems lines={voucherForm.lineItems} onChange={(lineItems) => setVoucherForm({ ...voucherForm, lineItems })} />

          <textarea placeholder="Notes" value={voucherForm.notes} onChange={(e) => setVoucherForm({ ...voucherForm, notes: e.target.value })} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" rows={2} />

          <button type="submit" className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Disburse voucher</button>

        </form>

      ) : null}



      {hubTab === "salary" ? (

        <form

          className="grid gap-2 rounded-xl border border-white/10 bg-[#0a101f] p-4 sm:grid-cols-2"

          onSubmit={(e) => {

            e.preventDefault();

            setError(null);

            setMessage(null);

            const s = staff.find((x) => x.id === salaryForm.staffId);

            if (!s) return;

            if (!confirm(`Pay salary of ${formatUgx(netPreview)} to ${s.name}?`)) return;

            void (async () => {

              const r = await schoolFetch("/api/admin/school/outflow?kind=salary", {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({

                  organizationSlug,

                  staffId: salaryForm.staffId,

                  monthKey: salaryForm.monthKey,

                  grossUgx: s.salaryUgx,

                  deductionUgx: salaryForm.deductionUgx,

                }),

              });

              const j = (await r.json()) as { error?: string };

              if (!r.ok) {

                setError(j.error ?? "Salary payment failed");

                return;

              }

              setMessage("Salary paid.");

              await load();

            })();

          }}

        >

          {salaryBalance != null ? (

            <p className="sm:col-span-2 text-sm text-emerald-300">Salary account available: {formatUgx(salaryBalance)}</p>

          ) : null}

          <select value={salaryForm.staffId} onChange={(e) => setSalaryForm({ ...salaryForm, staffId: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" required>

            <option value="">Staff member</option>

            {staff.map((s) => (

              <option key={s.id} value={s.id}>{s.name} ({s.staffCode}) — {formatUgx(s.salaryUgx)}</option>

            ))}

          </select>

          <input type="month" required value={salaryForm.monthKey} onChange={(e) => setSalaryForm({ ...salaryForm, monthKey: e.target.value })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

          <input type="number" placeholder="Deduction UGX" value={salaryForm.deductionUgx || ""} onChange={(e) => setSalaryForm({ ...salaryForm, deductionUgx: Number(e.target.value) })} className="rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-white" />

          {selectedStaff ? (

            <p className="sm:col-span-2 text-sm text-slate-300">

              Gross: {formatUgx(selectedStaff.salaryUgx)} · Net: {formatUgx(netPreview)}

            </p>

          ) : null}

          <button type="submit" className="sm:col-span-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white">Pay salary</button>

        </form>

      ) : null}



      {hubTab === "history" ? (

        <div className="overflow-x-auto rounded-xl border border-white/10">

          <table className="min-w-full text-sm">

            <thead className="bg-white/5 text-left text-slate-400">

              <tr>

                <th className="px-4 py-2">Payee</th>

                <th className="px-4 py-2">Account</th>

                <th className="px-4 py-2">Amount</th>

                <th className="px-4 py-2">Date</th>

              </tr>

            </thead>

            <tbody>

              {vouchers.map((v) => (

                <tr key={v.id} className="border-t border-white/10 text-slate-200">

                  <td className="px-4 py-2">{v.payee}</td>

                  <td className="px-4 py-2">{v.accountName}</td>

                  <td className="px-4 py-2">{formatUgx(v.totalUgx)}</td>

                  <td className="px-4 py-2">{v.disbursedAt.slice(0, 10)}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      ) : null}



      {salaryRows.length > 0 ? (

        <div>

          <h2 className="text-sm font-semibold text-slate-300">Salary payment history</h2>

          <div className="mt-2 overflow-x-auto rounded-xl border border-white/10">

            <table className="min-w-full text-sm">

              <thead className="bg-white/5 text-left text-slate-400">

                <tr>

                  <th className="px-4 py-2">Staff</th>

                  <th className="px-4 py-2">Month</th>

                  <th className="px-4 py-2">Net</th>

                  <th className="px-4 py-2">Paid</th>

                </tr>

              </thead>

              <tbody>

                {salaryRows.map((r) => (

                  <tr key={r.id} className="border-t border-white/10 text-slate-200">

                    <td className="px-4 py-2">{r.staffName} ({r.staffCode})</td>

                    <td className="px-4 py-2">{r.monthKey}</td>

                    <td className="px-4 py-2">{formatUgx(r.netUgx)}</td>

                    <td className="px-4 py-2">{r.paidAt?.slice(0, 10) ?? "—"}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      ) : null}

    </div>

  );

}
