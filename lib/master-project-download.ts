import "server-only";

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { PassThrough } from "node:stream";
import { ZipArchive, type Archiver } from "archiver";
import { buildTuitionBackupSnapshot } from "@/lib/backup/tuition-snapshot";
import { buildVercelEnvExport } from "@/lib/deployment-env-export";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import { buildDemoLoginsExport } from "@/lib/demo-logins";
import {
  isProjectDownloadPart,
  partsForCategoryZip,
  type ProjectDownloadPart,
} from "@/lib/master-download-catalogue";
import { prisma } from "@/lib/prisma";
import {
  appendDocumentationToArchive,
  buildFullDocumentationDownload,
  buildProjectDescriptionDownload,
  buildUserGuidesDownload,
} from "@/lib/project-documentation";

export type { ProjectDownloadPart } from "@/lib/master-download-catalogue";
export { isProjectDownloadPart, PROJECT_DOWNLOAD_PART_IDS } from "@/lib/master-download-catalogue";

const SOURCE_SKIP = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "coverage",
  ".turbo",
  "terminals",
]);

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function gitArchiveBuffer(): Buffer | null {
  try {
    if (!fs.existsSync(path.join(process.cwd(), ".git"))) return null;
    const buf = execSync("git archive --format=zip HEAD", {
      cwd: process.cwd(),
      maxBuffer: 64 * 1024 * 1024,
    });
    return Buffer.isBuffer(buf) ? buf : null;
  } catch {
    return null;
  }
}

async function githubSourceBuffer(): Promise<Buffer | null> {
  const owner =
    deploymentEnv("VERCEL_GIT_REPO_OWNER") ||
    process.env.VERCEL_GIT_REPO_OWNER ||
    deploymentEnv("GITHUB_REPO_OWNER");
  const slug =
    deploymentEnv("VERCEL_GIT_REPO_SLUG") ||
    process.env.VERCEL_GIT_REPO_SLUG ||
    deploymentEnv("GITHUB_REPO_SLUG");
  const sha =
    deploymentEnv("VERCEL_GIT_COMMIT_SHA") ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    "HEAD";
  const repo = deploymentEnv("GITHUB_REPOSITORY");
  const [repoOwner, repoSlug] = repo.includes("/") ? repo.split("/") : ["", ""];

  const ghOwner = owner || repoOwner;
  const ghSlug = slug || repoSlug || "openpaygb";
  if (!ghOwner) return null;

  const url = `https://codeload.github.com/${ghOwner}/${ghSlug}/zip/${sha}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function localSourceWalkZip(archive: Archiver): boolean {
  const root = process.cwd();
  let added = 0;

  function walk(rel: string) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
      if (/\.(ts|tsx|js|jsx|json|md|prisma|css|mjs|cjs)$/.test(rel) || rel === "package.json") {
        archive.append(fs.createReadStream(abs), { name: `source/${rel.replace(/\\/g, "/")}` });
        added += 1;
      }
      return;
    }
    for (const name of fs.readdirSync(abs)) {
      if (SOURCE_SKIP.has(name)) continue;
      walk(path.join(rel, name));
    }
  }

  for (const entry of ["app", "lib", "components", "hooks", "utils", "prisma", "docs", "public", "scripts"]) {
    walk(entry);
  }
  for (const f of ["package.json", "next.config.ts", "middleware.ts", "tsconfig.json", "README.md"]) {
    walk(f);
  }
  return added > 0;
}

export async function buildTuitionPartial(scope: "organizations" | "programmes" | "payments") {
  const snapshot = await buildTuitionBackupSnapshot();
  const data = snapshot.data;
  if (scope === "organizations") {
    return {
      meta: { ...snapshot.meta, scope: "organizations", partial: true },
      data: {
        organizations: data.organizations ?? [],
        siteUiSettings: data.siteUiSettings ?? [],
      },
    };
  }
  if (scope === "programmes") {
    return {
      meta: { ...snapshot.meta, scope: "programmes", partial: true },
      data: {
        organizations: data.organizations ?? [],
        programmes: data.programmes ?? [],
        programmeFees: data.programmeFees ?? [],
      },
    };
  }
  return {
    meta: { ...snapshot.meta, scope: "payments", partial: true },
    data: {
      organizations: data.organizations ?? [],
      students: data.students ?? [],
      payments: data.payments ?? [],
    },
  };
}

export async function buildKnowledgeBaseExport() {
  const articles = await prisma.knowledgeArticle.findMany({
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return {
    exportedAt: new Date().toISOString(),
    total: articles.length,
    articles,
  };
}

export async function buildNotificationsExport() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return {
    exportedAt: new Date().toISOString(),
    total: notifications.length,
    notifications,
  };
}

export async function buildMasterAdminsExport() {
  const admins = await prisma.adminUser.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { slug: true, name: true, tenantStatus: true },
      },
    },
  });
  return {
    exportedAt: new Date().toISOString(),
    total: admins.length,
    note:
      "Master and school admin accounts (no password hashes). Re-issue passwords with npm run master:set-login or POST /api/master/admins after restore.",
    admins: admins.map((a) => ({
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      organizationId: a.organizationId,
      organizationSlug: a.organization?.slug ?? null,
      organizationName: a.organization?.name ?? null,
      organizationTenantStatus: a.organization?.tenantStatus ?? null,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
  };
}

export type DownloadPayload = {
  body: Buffer | string;
  contentType: string;
  filename: string;
};

async function buildDemoLoginsPack(): Promise<DownloadPayload> {
  const s = stamp();
  const [json, csv, md] = await Promise.all([
    buildDemoLoginsExport("json"),
    buildDemoLoginsExport("csv"),
    buildDemoLoginsExport("md"),
  ]);
  const body = await new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(stream);
    archive.append(json.body, { name: json.filename });
    archive.append(csv.body, { name: csv.filename });
    archive.append(md.body, { name: md.filename });
    archive.append(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          bundle: "demo-logins",
          note: "Same directory as Master Admin → Demo logins. Public lobbies auto-update when publishPublic is enabled.",
          files: [json.filename, csv.filename, md.filename],
        },
        null,
        2,
      ),
      { name: "MANIFEST.json" },
    );
    void archive.finalize();
  });
  return {
    body,
    contentType: "application/zip",
    filename: `odelhub-demo-logins-${s}.zip`,
  };
}

async function zipPayloads(
  entries: Array<{ archivePath: string; payload: DownloadPayload }>,
  filename: string,
): Promise<DownloadPayload> {
  const body = await new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(stream);
    for (const entry of entries) {
      const content =
        typeof entry.payload.body === "string" ? entry.payload.body : entry.payload.body;
      archive.append(content, { name: entry.archivePath });
    }
    archive.append(
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          files: entries.map((e) => e.archivePath),
        },
        null,
        2,
      ),
      { name: "MANIFEST.json" },
    );
    void archive.finalize();
  });
  return { body, contentType: "application/zip", filename };
}

async function buildAtomicPart(part: ProjectDownloadPart): Promise<DownloadPayload> {
  const s = stamp();

  if (part === "tuition") {
    const snapshot = await buildTuitionBackupSnapshot();
    return {
      body: JSON.stringify(snapshot, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `odelhub-tuition-${s}.json`,
    };
  }

  if (part === "organizations" || part === "programmes" || part === "payments") {
    const partial = await buildTuitionPartial(part);
    return {
      body: JSON.stringify(partial, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `odelhub-${part}-${s}.json`,
    };
  }

  if (part === "master-admins") {
    const admins = await buildMasterAdminsExport();
    return {
      body: JSON.stringify(admins, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `odelhub-master-admins-${s}.json`,
    };
  }

  if (part === "demo-logins") {
    return buildDemoLoginsPack();
  }

  if (part === "env") {
    const envText = await buildVercelEnvExport();
    return {
      body: envText,
      contentType: "text/plain; charset=utf-8",
      filename: `odelhub-env-${s}.env`,
    };
  }

  if (part === "knowledge-base") {
    const kb = await buildKnowledgeBaseExport();
    return {
      body: JSON.stringify(kb, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `odelhub-knowledge-base-${s}.json`,
    };
  }

  if (part === "notifications") {
    const notes = await buildNotificationsExport();
    return {
      body: JSON.stringify(notes, null, 2),
      contentType: "application/json; charset=utf-8",
      filename: `odelhub-notifications-${s}.json`,
    };
  }

  if (part === "project-description") {
    return buildProjectDescriptionDownload();
  }

  if (part === "user-guides") {
    return buildUserGuidesDownload();
  }

  if (part === "documentation") {
    return buildFullDocumentationDownload();
  }

  if (part === "source" || part === "cat-source") {
    const gitZip = gitArchiveBuffer();
    if (gitZip) {
      return {
        body: gitZip,
        contentType: "application/zip",
        filename: `odelhub-source-${s}.zip`,
      };
    }
    const ghZip = await githubSourceBuffer();
    if (ghZip) {
      return {
        body: ghZip,
        contentType: "application/zip",
        filename: `odelhub-source-github-${s}.zip`,
      };
    }
    throw new Error("Source archive unavailable — no local .git and GitHub codeload fetch failed.");
  }

  throw new Error(`Atomic part not handled: ${part}`);
}

async function buildCategoryBundle(categoryZipPart: ProjectDownloadPart): Promise<DownloadPayload> {
  const s = stamp();
  const parts = partsForCategoryZip(categoryZipPart);
  if (!parts.length) {
    throw new Error(`Unknown category zip: ${categoryZipPart}`);
  }
  const entries: Array<{ archivePath: string; payload: DownloadPayload }> = [];
  for (const p of parts) {
    const payload = await buildAtomicPart(p);
    entries.push({ archivePath: `${p}/${payload.filename}`, payload });
  }
  return zipPayloads(entries, `odelhub-category-${categoryZipPart.replace(/^cat-/, "")}-${s}.zip`);
}

export async function buildProjectDownload(part: ProjectDownloadPart): Promise<DownloadPayload> {
  if (!isProjectDownloadPart(part)) {
    throw new Error(`Invalid project download part: ${part}`);
  }

  if (
    part === "cat-documentation" ||
    part === "cat-data" ||
    part === "cat-credentials" ||
    part === "cat-source"
  ) {
    return buildCategoryBundle(part);
  }

  if (part !== "full") {
    return buildAtomicPart(part);
  }

  const s = stamp();
  const tuition = await buildTuitionBackupSnapshot();
  const envText = await buildVercelEnvExport();
  const kb = await buildKnowledgeBaseExport();
  const notes = await buildNotificationsExport();
  const admins = await buildMasterAdminsExport();
  const [demoJson, demoCsv, demoMd] = await Promise.all([
    buildDemoLoginsExport("json"),
    buildDemoLoginsExport("csv"),
    buildDemoLoginsExport("md"),
  ]);

  const manifest = {
    exportedAt: new Date().toISOString(),
    app: "ODELPay HUB Pay",
    bundle: "full",
    catalogue: "Master Admin → Docs & downloads (#project-download)",
    contents: [
      "data/tuition-backup.json",
      "data/master-admins.json",
      "data/demo-logins.json",
      "data/demo-logins.csv",
      "data/demo-logins.md",
      "data/deployment-env.env",
      "data/knowledge-base.json",
      "data/notifications.json",
      "documentation/ (full docs/ markdown library)",
      "source/ (code archive when available)",
      "MANIFEST.json",
    ],
    git: {
      owner: process.env.VERCEL_GIT_REPO_OWNER ?? null,
      slug: process.env.VERCEL_GIT_REPO_SLUG ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  };

  const body = await new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(stream);

    archive.append(JSON.stringify(manifest, null, 2), { name: "MANIFEST.json" });
    archive.append(JSON.stringify(tuition, null, 2), { name: "data/tuition-backup.json" });
    archive.append(JSON.stringify(admins, null, 2), { name: "data/master-admins.json" });
    archive.append(demoJson.body, { name: "data/demo-logins.json" });
    archive.append(demoCsv.body, { name: "data/demo-logins.csv" });
    archive.append(demoMd.body, { name: "data/demo-logins.md" });
    archive.append(envText, { name: "data/deployment-env.env" });
    archive.append(JSON.stringify(kb, null, 2), { name: "data/knowledge-base.json" });
    archive.append(JSON.stringify(notes, null, 2), { name: "data/notifications.json" });
    appendDocumentationToArchive(archive);

    void (async () => {
      try {
        const gitZip = gitArchiveBuffer();
        if (gitZip) {
          archive.append(gitZip, { name: "source/git-archive.zip" });
        } else {
          const ghZip = await githubSourceBuffer();
          if (ghZip) {
            archive.append(ghZip, { name: "source/github-archive.zip" });
          } else if (!localSourceWalkZip(archive)) {
            archive.append(
              "Clone the repository from GitHub for a full source tree.\n",
              { name: "source/README.txt" },
            );
          }
        }
        await archive.finalize();
      } catch (err) {
        reject(err);
      }
    })();
  });

  return {
    body,
    contentType: "application/zip",
    filename: `odelhub-project-full-${s}.zip`,
  };
}
