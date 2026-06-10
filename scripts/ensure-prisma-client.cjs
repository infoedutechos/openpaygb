/* eslint-disable no-console */
/** Regenerate Prisma Client when schema.prisma is newer or known fields are missing from generated types. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const SCHEMA_FIELD_MARKERS = [
  "platformLogoUploadedAt",
  "fxOverrideKind",
  "socialLinkIcons",
  "checkoutPlatformFeeDefaultKind",
  "checkoutPlatformFeeDefaultPercent",
  "checkoutPlatformFeeKind",
  "DeploymentEnvOverride",
  "KnowledgeArticle",
  "ChatConversation",
  "NotificationRead",
  "PlatformAudience",
  "copilotBubbleImage",
  "copilotAssistantName",
  "schoolWorkspaceAutoGenerateAdminLogin",
  "registrationWebsiteUrl",
  "unitKind",
  "operatesUnitKinds",
  "parentOrganizationId",
  "externalParentName",
];

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

function isWindowsFileLockError(e) {
  const msg = String(e?.message ?? e ?? "");
  return msg.includes("EPERM") || msg.includes("operation not permitted");
}

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* busy wait — short delays only */
  }
}

/**
 * @param {string} [rootDir]
 * @returns {{ regenerated: boolean; skippedDueToLock?: boolean }}
 */
function ensurePrismaClient(rootDir) {
  const root = rootDir || path.join(__dirname, "..");
  if (!needsRegenerate(root)) return { regenerated: false };

  const { clientTypes } = paths(root);
  const stampPath = path.join(root, ".prisma-client-stamp");
  console.log("[prisma] Schema changed — running prisma generate…");

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      execSync("npx prisma generate", {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, PRISMA_CLIENT_STAMP: String(Date.now()) },
        shell: process.platform === "win32",
      });
      fs.writeFileSync(stampPath, String(Date.now()), "utf8");
      return { regenerated: true };
    } catch (e) {
      const locked = isWindowsFileLockError(e);
      if (!locked || attempt >= maxAttempts) {
        if (locked && fs.existsSync(clientTypes)) {
          console.warn(
            "[prisma] generate blocked (file locked). Stop all `node` / dev servers, then: npx prisma generate",
          );
          return { regenerated: false, skippedDueToLock: true };
        }
        console.error("[prisma] generate failed. Stop dev servers and run: npx prisma generate");
        throw e;
      }
      console.warn(`[prisma] generate locked (attempt ${attempt}/${maxAttempts}), retrying in 2s…`);
      sleepMs(2000);
    }
  }
  return { regenerated: false };
}

module.exports = { ensurePrismaClient, needsRegenerate, SCHEMA_FIELD_MARKERS };

if (require.main === module) {
  const root = path.join(__dirname, "..");
  ensurePrismaClient(root);
}
