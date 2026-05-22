/** Quick HTTP probe for local dev — run while `npm run dev` is up. */
const routes = [
  "/",
  "/api/student/session",
  "/pay/default",
  "/admin/register",
  "/admin",
  "/student/pay",
];

const base = process.env.PROBE_BASE ?? "http://localhost:3000";

async function probe(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const loc = res.headers.get("location");
    let body = "";
    if (path.startsWith("/api/")) {
      body = await res.text();
    }
    const extra = loc ? ` → ${loc}` : body ? ` ${body.slice(0, 80)}` : "";
    console.log(`${path} ${res.status}${extra}`);
  } catch (e) {
    console.log(`${path} ERR ${e instanceof Error ? e.message : String(e)}`);
  }
}

for (const path of routes) {
  await probe(path);
}
