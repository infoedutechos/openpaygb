/**
 * Smoke-test TON Connect for /clicker, /pay/default, /dex.
 * Usage: node scripts/test-tonconnect-routes.mjs
 */
const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

const ROUTES = [
  { name: "root-layout", path: "/" },
  { name: "clicker", path: "/clicker" },
  { name: "pay-default", path: "/pay/default" },
  { name: "dex", path: "/dex" },
  { name: "student", path: "/student" },
];

async function fetchText(url, opts) {
  const res = await fetch(url, { redirect: "follow", ...opts });
  const text = await res.text();
  return { res, text, finalUrl: res.url };
}

function hasTonConnect(js) {
  return /tonconnect|TonConnectShell|TonConnectUIProvider|TonConnectButton/i.test(js);
}

const DEX_WALLET_PAGES = ["/dex", "/dex/onramp", "/dex/offramp"];
const DEX_WALLET_PATTERN = /DexWalletConnect/;

function pageChunkFor(path) {
  const segments = path.replace(/^\//, "").split("/");
  return `/_next/static/chunks/app/${segments.join("/")}/page.js`;
}

/** Assert a symbol appears in the route HTML/RSC or its Next page chunk. */
async function assertInPageBundle(path, pattern, label) {
  const { res, text } = await fetchText(`${BASE}${path}`);
  if (res.status !== 200) throw new Error(`${path} status ${res.status}`);

  if (pattern.test(text)) return { via: "html-rsc", path };

  const guess = pageChunkFor(path);
  try {
    const { res: chunkRes, text: chunkText } = await fetchText(`${BASE}${guess}`);
    if (chunkRes.ok && pattern.test(chunkText)) return { via: guess, path };
  } catch {
    /* fall through to script scan */
  }

  const scripts = [...new Set([...text.matchAll(/\/_next\/static\/[^"'\\s]+\.js/g)].map((m) => m[0]))];
  for (const script of scripts) {
    try {
      const { text: js } = await fetchText(`${BASE}${script}`);
      if (pattern.test(js)) return { via: script, path };
    } catch {
      /* skip failed chunk */
    }
  }

  throw new Error(`${label} not found in ${path} HTML or JS chunks`);
}

async function testDexWalletConnect() {
  for (const path of DEX_WALLET_PAGES) {
    const info = await assertInPageBundle(path, DEX_WALLET_PATTERN, "DexWalletConnect");
    console.log(`PASS ${path} DexWalletConnect (${info.via})`);
  }
}

async function testManifest() {
  const { res, text } = await fetchText(`${BASE}/api/manifest/tonconnect`);
  if (res.status !== 200) throw new Error(`manifest status ${res.status}`);
  const body = JSON.parse(text);
  if (body.url?.replace(/\/$/, "") !== BASE.replace(/\/$/, "")) {
    throw new Error(`manifest url mismatch: ${body.url} vs ${BASE}`);
  }
  if (!body.iconUrl?.includes("/manifest/tonconnect-icon")) {
    throw new Error(`bad iconUrl: ${body.iconUrl}`);
  }
  const icon = await fetch(body.iconUrl);
  if (!icon.ok) throw new Error(`icon ${icon.status}`);
  return body;
}

/** Node fetch cannot set forbidden `Host` header; verified separately via curl/PowerShell. */
async function testManifestHost() {
  if (process.env.SKIP_HOST_HEADER_TEST === "1") return;
  console.log("SKIP manifest Host header (Node fetch cannot set Host; use PowerShell test)");
}

async function testPage(route) {
  const info = await assertInPageBundle(route.path, /tonconnect|TonConnectShell|TonConnectAppProvider|TonConnectUIProvider|TonConnectButton/i, "TonConnect");
  return { via: info.via };
}

async function main() {
  console.log(`TON Connect smoke test @ ${BASE}\n`);

  const manifest = await testManifest();
  console.log("PASS manifest", manifest.url);

  await testManifestHost();

  for (const route of ROUTES) {
    const info = await testPage(route);
    console.log(`PASS ${route.path} (${info.via})`);
  }

  await testDexWalletConnect();

  console.log("\nAll automated smoke tests passed.");
  console.log("Manual: open each route in Telegram, tap Connect wallet, confirm no App Manifest Error.");
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
