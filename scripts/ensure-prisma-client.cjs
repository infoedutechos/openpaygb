/* eslint-disable no-console */
/** Regenerate Prisma Client when schema.prisma is newer or known fields are missing from generated types. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SCHEMA_FIELD_MARKERS = ["platformLogoUploadedAt", "fxOverrideKind", "socialLinkIcons"];

function paths(root) {
  return {
    schema: path.join(root, "prisma", "schema.prisma"),
    clientTypes: path.join(root, "node_modules", ".prisma", "client", "index.d.ts"),
    clientJs: path.join(root, "node_modules", ".prisma", "client", "index.js"),
  };
}

function needsRegenerate(root) {
  const { schema, clientTypes, clientJs } = paths(root);
  if (!fs.existsSync(schema)) return false;
  if (!fs.existsSync(clientTypes) || !fs.existsSync(clientJs)) return true;

  try {
    const schemaMtime = fs.statSync(schema).mtimeMs;
    const clientMtime = fs.statSync(clientTypes).mtimeMs;
    if (schemaMtime > clientMtime + 500) return true;
  } catch {
    return true;
  }

  let schemaText = "";
  let typesText = "";
  try {
    schemaText = fs.readFileSync(schema, "utf8");
    typesText = fs.readFileSync(clientTypes, "utf8");
  } catch {
    return true;
  }

  for (const marker of SCHEMA_FIELD_MARKERS) {
    if (schemaText.includes(marker) && !typesText.includes(marker)) return true;
  }
  return false;
}

/**
 * @param {string} [rootDir]
 * @returns {{ regenerated: boolean }}
 */
function ensurePrismaClient(rootDir) {
  const root = rootDir || path.join(__dirname, "..");
  if (!needsRegenerate(root)) return { regenerated: false };

  console.log("[prisma] Schema changed — running prisma generate…");
  try {
    const stampPath = path.join(root, ".prisma-client-stamp");
    execSync("npx prisma generate", {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, PRISMA_CLIENT_STAMP: String(Date.now()) },
      shell: process.platform === "win32",
    });
    fs.writeFileSync(stampPath, String(Date.now()), "utf8");
    return { regenerated: true };
  } catch (e) {
    console.error("[prisma] generate failed. Stop dev servers and run: npx prisma generate");
    throw e;
  }
}

module.exports = { ensurePrismaClient, needsRegenerate, SCHEMA_FIELD_MARKERS };

if (require.main === module) {
  const root = path.join(__dirname, "..");
  const { regenerated } = ensurePrismaClient(root);
  process.exit(regenerated ? 0 : 0);
}
