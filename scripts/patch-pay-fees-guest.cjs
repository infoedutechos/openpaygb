const fs = require("fs");
const p = "components/pay/PayFeesBreakdown.tsx";
let s = fs.readFileSync(p, "utf8");
if (s.includes("{!hideGuestIdentity ? (")) {
  console.log("already patched");
  process.exit(0);
}
const marker = '      <motion-safe:motion-safe:motion-safe:motion-safe:motion-safe:motion-safe:motion-safe:motion-safe:motion-safe:div className="space-y-2 rounded-xl border border-slate-600/60 bg-slate-950/50 p-4">';
const realStart = s.indexOf('      <div className="space-y-2 rounded-xl border border-slate-600/60 bg-slate-950/50 p-4">');
if (realStart < 0) throw new Error("guest fields block not found");
const btn = s.indexOf("        disabled={busy || !studentName.trim()", realStart);
if (btn < 0) throw new Error("button disabled line not found");
const btnEnd = s.indexOf("\n", s.indexOf("feePool.length === 0", btn));
const block = `      {!hideGuestIdentity ? (
        <div className="space-y-2 rounded-xl border border-slate-600/60 bg-slate-950/50 p-4">
        <label className="text-xs text-slate-400">Full name (required)</label>
        <input
          placeholder="As on your student record"
          value={studentName}
          onChange={(e) => onStudentName(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
        <label className="text-xs text-slate-400">Email (required — portal & receipts)</label>
        <input
          type="email"
          required
          placeholder="Same email you will use for student portal"
          value={studentEmail}
          onChange={(e) => onStudentEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white"
        />
      </motion-safe:motion-safe:motion-safe:div>
      ) : null}

      <button
        type="button"
        onClick={onContinue}
        disabled={
          busy ||
          feePool.length === 0 ||
          (!hideGuestIdentity && (!studentName.trim() || !studentEmail.trim()))
        }`;
s = s.slice(0, realStart) + block + s.slice(btnEnd + 1);
fs.writeFileSync(p, s.replace(/motion-safe:motion-safe:motion-safe:div/g, "motion-safe:motion-safe:div").replace(/motion-safe:motion-safe:div/g, "div"));
console.log("patched", p);
