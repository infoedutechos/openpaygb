const fs = require("fs");
const p = "components/student/StudentTuitionFlow.tsx";
let s = fs.readFileSync(p, "utf8");
if (s.includes("INSTALLMENTS_UI_STUDENT")) {
  console.log("UI already patched");
  process.exit(0);
}
const marker = '          <GlassPanel className="p-5 text-sm">\r\n            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Auto calculation</p>';
const markerLf = marker.replace(/\r\n/g, "\n");
const idx = s.indexOf(markerLf);
if (idx < 0) {
  const idx2 = s.indexOf('            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Auto calculation</p>');
  if (idx2 < 0) throw new Error("marker not found");
}
const insertAt = s.indexOf('            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/80">Auto calculation</p>');
const panelStart = s.lastIndexOf("<GlassPanel", insertAt);
const block = fs.readFileSync("scripts/installments-block.txt", "utf8");
if (!s.includes("INSTALLMENTS_UI_STUDENT")) {
  s =
    s.slice(0, panelStart) +
    block +
    s.slice(panelStart);
}
const oldTotal = '<span>Total due</span>';
const newTotal =
  '{installmentCount > 1 ? <span>Due now (installment 1)</span> : <span>Total due</span>}';
if (s.includes(oldTotal) && !s.includes("Due now (installment 1)")) {
  s = s.replace(oldTotal, newTotal, 1);
}
fs.writeFileSync(p, s);
console.log("patched", p);
