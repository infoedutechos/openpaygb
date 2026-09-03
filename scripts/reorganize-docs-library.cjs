/**
 * Move docs/*.md (and related inventory files) into category folders.
 * Leaves stub redirect files at old paths so legacy links keep working.
 * Usage: node scripts/reorganize-docs-library.cjs
 */
const fs = require("fs");
const path = require("path");

const docsRoot = path.resolve(__dirname, "..", "docs");

/** @type {Record<string, string>} basename -> folder */
const MAP = {
  // flows
  "FLOWS.md": "flows",
  "ADMIN_FLOW.md": "flows",
  "MASTER_ADMIN_FLOW.md": "flows",
  "MULTI_TENANT_FLOW.md": "flows",
  "USER_FLOW.md": "flows",
  "PLATFORM_FLOWS.md": "flows",

  // economics
  "ECONOMICS.md": "economics",

  // architecture / structure
  "PAYMENT_SYSTEM_ARCHITECTURE.md": "architecture",
  "DEPLOYMENT_ARCHITECTURE.md": "architecture",
  "STRUCTURE.md": "architecture",
  "STRUCTURE_ALIGNMENT_URA_PEARL.md": "architecture",
  "FOLDER_STRUCTURE.md": "architecture",
  "FOLDER_TREE_SNAPSHOT.txt": "architecture",
  "UI_VS_CODEBASE.md": "architecture",
  "FOOTER_AND_HEADER_NAV.md": "architecture",
  "ACCESS_SURFACES.md": "architecture",

  // platform / OPGB / credentials
  "PLATFORM_UPDATE_2026-09.md": "platform",
  "LOCAL_DEV_AND_CREDENTIALS.md": "platform",
  "OPENPAYGB_PAYMENT_PROVIDER.md": "platform",
  "OPENPAYGB_PLATFORM_CARD.md": "platform",
  "OPGB_CHECKOUT_CARD.md": "platform",
  "OPGB_TOKEN_ECOSYSTEM.md": "platform",
  "DEVELOPER_ECOSYSTEM.md": "platform",
  "PARTNER_API.md": "platform",
  "SIS_INTEGRATION_COOKBOOK.md": "platform",
  "UWAIS_SMIS_PRIORITY_ROADMAP.md": "platform",
  "PRODUCT_LINES_AND_SCHOOL_TERMS.md": "platform",
  "STANDALONE_APPS.md": "platform",
  "VIRTUAL_CARD_INVESTIGATION.md": "platform",

  // school / tuition product
  "SCHOOL_ADMIN_LOGIN.md": "school",
  "SCHOOL_ADMIN_PROGRAMMES.md": "school",
  "SCHOOL_FEES_PAYMENTS_REFERENCE.md": "school",
  "SCHOOL_WORKSPACE_SELF_REGISTER.md": "school",
  "ORGANIZATION_REGISTRATION.md": "school",
  "ADMISSION_NUMBER_FORMAT.md": "school",
  "LEDGER_RECEIPTS_AND_SCHOOL_UNITS.md": "school",
  "RECEIPT_BRANDING.md": "school",

  // deployment
  "VERCEL_AUTO_DEPLOY.md": "deployment",
  "VERCEL_BUILD_FAILURES.md": "deployment",
  "VERCEL_CONNECT_NOW.md": "deployment",
  "VERCEL_ENV_SETUP.md": "deployment",
  "VERCEL_ODELHUB_PAY_DEPLOY.md": "deployment",
  "VERCEL_ODELPAY_DEPLOY.md": "deployment",
  "PRODUCTION_GO_LIVE.md": "deployment",
  "DEPLOYMENT_ENV_PRODUCTION.md": "deployment",
  "DEPLOYMENT_VERSION.txt": "deployment",
  "TELEGRAM_BOT_DEPLOYMENT.md": "deployment",
  "TELEGRAM_MINI_APP.md": "deployment",
  "MBIYO_WEBHOOK_SETUP.md": "deployment",
  "WEBHOOK_SECRETS_ALIGNMENT.md": "deployment",
  "LIVEPAY_INTEGRATION_ASSESSMENT.md": "deployment",
  "RELWORX_INVESTIGATION.md": "deployment",
  "VIXONPAY_VIRTUAL_CARD_AND_DEV.md": "deployment",
  "PRISMA_COMMANDS.md": "deployment",

  // operations
  "SECURITY_HARDENING.md": "operations",
  "ERROR_HARDENING.md": "operations",
  "INTEGRATION_HARDENING.md": "operations",
  "BACKUP_AND_RECOVERY.md": "operations",
  "DUAL_ADMIN_AUTH.md": "operations",

  // product / audits
  "PROJECT_DESCRIPTION.md": "product",
  "BACKLOG.md": "product",
  "USER_STORIES.md": "product",
  "APP_STATUS_AUDIT.md": "product",
  "HOLISTIC_APP_AUDIT.md": "product",
  "DEEP_SCAN_2026-07-16.md": "product",
  "DEEP_SCAN_2026-07-19.md": "product",
  "ECOSYSTEM_TEST_REPORT.md": "product",

  // api reference
  "openapi.yaml": "api-reference",
  "API_INVENTORY.csv": "api-reference",
  "UI_ROUTES.csv": "api-reference",
};

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

function stubMarkdown(fromName, toRel) {
  return `# Moved

This document was relocated into the documentation library category folders.

**New location:** [\`${toRel}\`](./${toRel})

Open the interactive hub: [\`docs/index.html\`](./index.html) (via \`npm run docs:serve\`) and search for the title, or open the new path directly.

---
*Stub kept so older links to \`docs/${fromName}\` still resolve.*
`;
}

function stubText(fromName, toRel) {
  return `Moved to ${toRel}\nSee docs/index.html (npm run docs:serve).\nFormer path: docs/${fromName}\n`;
}

let moved = 0;
let skipped = 0;

for (const [name, folder] of Object.entries(MAP)) {
  const src = path.join(docsRoot, name);
  if (!fs.existsSync(src)) {
    skipped++;
    continue;
  }
  const destDir = path.join(docsRoot, folder);
  ensureDir(destDir);
  const dest = path.join(destDir, name);
  if (fs.existsSync(dest)) {
    console.warn(`[skip] already exists: ${folder}/${name}`);
    skipped++;
    continue;
  }
  fs.renameSync(src, dest);
  const toRel = `${folder}/${name}`;
  const stub =
    path.extname(name).toLowerCase() === ".md"
      ? stubMarkdown(name, toRel)
      : stubText(name, toRel);
  fs.writeFileSync(src, stub, "utf8");
  moved++;
  console.log(`moved ${name} → ${toRel}`);
}

// README stays at root but point to library
const readmePath = path.join(docsRoot, "README.md");
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, "utf8");
  if (!readme.includes("Documentation library layout")) {
    readme =
      `> **Documentation library layout (2026-09):** category folders under \`docs/\` (\`flows/\`, \`platform/\`, \`school/\`, \`deployment/\`, …). Interactive hub: [\`index.html\`](./index.html) via \`npm run docs:serve\`. Full map: [\`LIBRARY.md\`](./LIBRARY.md).\n\n` +
      readme;
    fs.writeFileSync(readmePath, readme, "utf8");
  }
}

console.log(`[reorganize-docs] moved=${moved} skipped=${skipped}`);
