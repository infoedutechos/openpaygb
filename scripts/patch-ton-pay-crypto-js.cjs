/**
 * @ton-pay/api ships a single dist bundle with AMD `define(["./aes", ...])` deps,
 * but tsup never emitted those chunk files. Copy crypto-js modules into dist so
 * Turbopack/Webpack can resolve relative imports.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const TON_PAY_DIST = path.join(ROOT, "node_modules", "@ton-pay", "api", "dist");
const CRYPTO_JS = path.join(ROOT, "node_modules", "crypto-js");

const MODULES = [
  "core",
  "x64-core",
  "lib-typedarrays",
  "enc-utf16",
  "enc-base64",
  "enc-base64url",
  "md5",
  "sha1",
  "sha256",
  "sha224",
  "sha512",
  "sha384",
  "sha3",
  "ripemd160",
  "hmac",
  "pbkdf2",
  "evpkdf",
  "cipher-core",
  "mode-cfb",
  "mode-ctr",
  "mode-ctr-gladman",
  "mode-ofb",
  "mode-ecb",
  "pad-ansix923",
  "pad-iso10126",
  "pad-iso97971",
  "pad-zeropadding",
  "pad-nopadding",
  "format-hex",
  "aes",
  "tripledes",
  "rc4",
  "rabbit",
  "rabbit-legacy",
  "blowfish",
];

function main() {
  if (!fs.existsSync(TON_PAY_DIST)) {
    console.warn("[patch-ton-pay-crypto-js] @ton-pay/api dist missing, skipping");
    return;
  }
  if (!fs.existsSync(CRYPTO_JS)) {
    console.warn("[patch-ton-pay-crypto-js] crypto-js missing, skipping");
    return;
  }

  let copied = 0;
  for (const mod of MODULES) {
    const src = path.join(CRYPTO_JS, `${mod}.js`);
    const dest = path.join(TON_PAY_DIST, `${mod}.js`);
    if (!fs.existsSync(src)) {
      console.warn(`[patch-ton-pay-crypto-js] missing crypto-js/${mod}.js`);
      continue;
    }
    fs.copyFileSync(src, dest);
    copied += 1;
  }
  console.log(`[patch-ton-pay-crypto-js] copied ${copied} crypto-js modules into @ton-pay/api/dist`);
}

main();
