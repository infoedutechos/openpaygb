import "server-only";

import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { ZipArchive, type Archiver } from "archiver";

export type DocDownloadPayload = {
  body: Buffer | string;
  contentType: string;
  filename: string;
};

const DOCS_ROOT = path.join(process.cwd(), "docs");

export const PROJECT_DESCRIPTION_REL = "PROJECT_DESCRIPTION.md";

export const USER_GUIDE_FILES = [
  "guides/USER_GUIDE_INDEX.md",
  "guides/USER_GUIDE_MASTER_ADMIN.md",
  "guides/USER_GUIDE_ADMIN_SCHOOLS.md",
  "guides/USER_GUIDE_ADMIN_HIGHER.md",
  "guides/USER_GUIDE_STAFF_SCHOOLS.md",
  "guides/USER_GUIDE_STAFF_HIGHER.md",
  "guides/USER_GUIDE_STUDENT_SCHOOLS.md",
  "guides/USER_GUIDE_STUDENT_HIGHER.md",
  "guides/USER_GUIDE_SCHOOL_ADMIN.md",
  "guides/USER_GUIDE_STUDENT.md",
  "guides/USER_GUIDE_GUEST_PAYER.md",
  "guides/USER_GUIDE_PARTNER_INTEGRATOR.md",
] as const;

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function readDoc(rel: string): string {
  const abs = path.join(DOCS_ROOT, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`Documentation file missing: docs/${rel}`);
  }
  return fs.readFileSync(abs, "utf8");
}

/** All markdown files under docs/ (recursive), relative paths using forward slashes. */
export function listAllDocumentationMarkdown(): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      const stat = fs.statSync(abs);
      if (stat.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!name.endsWith(".md")) continue;
      const rel = path.relative(DOCS_ROOT, abs).replace(/\\/g, "/");
      out.push(rel);
    }
  }
  walk(DOCS_ROOT);
  return out.sort();
}

async function zipFiles(
  entries: Array<{ archivePath: string; content: string | Buffer }>,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const stream = new PassThrough();
    const chunks: Buffer[] = [];
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", reject);
    archive.pipe(stream);

    for (const entry of entries) {
      archive.append(entry.content, { name: entry.archivePath });
    }
    void archive.finalize();
  });
}

export async function buildProjectDescriptionDownload(): Promise<DocDownloadPayload> {
  const s = stamp();
  const body = readDoc(PROJECT_DESCRIPTION_REL);
  return {
    body,
    contentType: "text/markdown; charset=utf-8",
    filename: `odelhub-project-description-${s}.md`,
  };
}

export async function buildUserGuidesDownload(): Promise<DocDownloadPayload> {
  const s = stamp();
  const manifest = {
    exportedAt: new Date().toISOString(),
    app: "ODELPay HUB Pay / OpenPayGB",
    bundle: "user-guides",
    files: [...USER_GUIDE_FILES],
  };
  const entries: Array<{ archivePath: string; content: string | Buffer }> = [
    { archivePath: "MANIFEST.json", content: JSON.stringify(manifest, null, 2) },
  ];
  for (const rel of USER_GUIDE_FILES) {
    entries.push({ archivePath: rel, content: readDoc(rel) });
  }
  const body = await zipFiles(entries);
  return {
    body,
    contentType: "application/zip",
    filename: `odelhub-user-guides-${s}.zip`,
  };
}

export async function buildFullDocumentationDownload(): Promise<DocDownloadPayload> {
  const s = stamp();
  const files = listAllDocumentationMarkdown();
  const manifest = {
    exportedAt: new Date().toISOString(),
    app: "ODELPay HUB Pay / OpenPayGB",
    bundle: "documentation",
    totalFiles: files.length,
    includes: [
      "PROJECT_DESCRIPTION.md (full product specification)",
      "guides/ (per-role user guides)",
      "reference flows, deployment, API notes, and operational runbooks",
    ],
    files,
  };
  const entries: Array<{ archivePath: string; content: string | Buffer }> = [
    { archivePath: "MANIFEST.json", content: JSON.stringify(manifest, null, 2) },
  ];
  for (const rel of files) {
    entries.push({ archivePath: rel, content: readDoc(rel) });
  }
  const body = await zipFiles(entries);
  return {
    body,
    contentType: "application/zip",
    filename: `odelhub-documentation-${s}.zip`,
  };
}

/** Append documentation files to an existing archiver (for full project bundle). */
export function appendDocumentationToArchive(archive: Archiver): void {
  const files = listAllDocumentationMarkdown();
  for (const rel of files) {
    archive.append(readDoc(rel), { name: `documentation/${rel}` });
  }
}
