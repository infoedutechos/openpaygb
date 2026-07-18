/**
 * Single source of truth for Master Admin Console project downloadables.
 * Safe for client + server (no Prisma / fs).
 */

export const PROJECT_DOWNLOAD_PART_IDS = [
  "full",
  "documentation",
  "project-description",
  "user-guides",
  "tuition",
  "organizations",
  "programmes",
  "payments",
  "knowledge-base",
  "notifications",
  "master-admins",
  "demo-logins",
  "env",
  "source",
  /** Category bundle ZIPs — organised multi-part downloads */
  "cat-documentation",
  "cat-data",
  "cat-credentials",
  "cat-source",
] as const;

export type ProjectDownloadPart = (typeof PROJECT_DOWNLOAD_PART_IDS)[number];

export type ProjectDownloadCategoryId =
  | "bundle"
  | "documentation"
  | "data"
  | "credentials"
  | "source";

export type ProjectDownloadPartMeta = {
  id: ProjectDownloadPart;
  label: string;
  description: string;
  /** Emphasise in UI (primary downloads). */
  highlight?: boolean;
  /** Hide from per-item grid when only offered as category ZIP (rare). */
  hideInGrid?: boolean;
};

export type ProjectDownloadCategory = {
  id: ProjectDownloadCategoryId;
  title: string;
  description: string;
  /** Individual downloadable parts shown in this section. */
  parts: ProjectDownloadPart[];
  /**
   * Optional one-click ZIP of every part in this category
   * (registered as its own ProjectDownloadPart).
   */
  categoryZipPart?: ProjectDownloadPart;
  categoryZipLabel?: string;
};

export const PROJECT_DOWNLOAD_PART_META: Record<ProjectDownloadPart, ProjectDownloadPartMeta> = {
  full: {
    id: "full",
    label: "Whole project bundle",
    description:
      "ZIP: tuition data, master admins, demo logins, env, KB, notifications, full docs library, and source when available.",
    highlight: true,
  },
  documentation: {
    id: "documentation",
    label: "Full documentation library",
    description: "All docs/**/*.md — project description, user guides, flows, deployment, runbooks.",
    highlight: true,
  },
  "project-description": {
    id: "project-description",
    label: "Project description",
    description: "Complete product & technical specification (PROJECT_DESCRIPTION.md).",
    highlight: true,
  },
  "user-guides": {
    id: "user-guides",
    label: "User guides pack",
    description: "All role guides (master, admin, staff, student, guest, partner) as a ZIP.",
    highlight: true,
  },
  tuition: {
    id: "tuition",
    label: "Tuition data (full)",
    description: "All tuition collections JSON (same payload as System backup).",
  },
  organizations: {
    id: "organizations",
    label: "Organizations only",
    description: "Schools + platform UI settings.",
  },
  programmes: {
    id: "programmes",
    label: "Programmes & fees",
    description: "Organizations, programmes, fee rows.",
  },
  payments: {
    id: "payments",
    label: "Students & payments",
    description: "Organizations, students, payment records.",
  },
  "knowledge-base": {
    id: "knowledge-base",
    label: "Knowledge base",
    description: "Help / Copilot articles JSON export.",
  },
  notifications: {
    id: "notifications",
    label: "Notifications",
    description: "Platform notification history JSON (latest 500).",
  },
  "master-admins": {
    id: "master-admins",
    label: "Master & school admins",
    description: "Admin accounts (emails, roles, orgs — no password hashes).",
    highlight: true,
  },
  "demo-logins": {
    id: "demo-logins",
    label: "Demo Schools & Universities logins",
    description:
      "Credentials sheet ZIP (JSON + CSV + Markdown) — same directory as MAC Demo logins; auto-updates public lobbies.",
    highlight: true,
  },
  env: {
    id: "env",
    label: "Environment variables",
    description: "Merged .env for Vercel import (contains secrets — store securely).",
    highlight: true,
  },
  source: {
    id: "source",
    label: "Source code",
    description: "Git archive or GitHub zip of the repository.",
    highlight: true,
  },
  "cat-documentation": {
    id: "cat-documentation",
    label: "All documentation (category ZIP)",
    description: "Project description + user guides + full docs library in one ZIP.",
    hideInGrid: true,
  },
  "cat-data": {
    id: "cat-data",
    label: "All live data (category ZIP)",
    description: "Tuition, orgs, programmes, payments, KB, and notifications in one ZIP.",
    hideInGrid: true,
  },
  "cat-credentials": {
    id: "cat-credentials",
    label: "All credentials & access (category ZIP)",
    description: "Master admins + demo logins + environment variables in one ZIP.",
    hideInGrid: true,
  },
  "cat-source": {
    id: "cat-source",
    label: "Source category ZIP",
    description: "Repository source archive.",
    hideInGrid: true,
  },
};

/** Organised catalogue rendered in MAC `#project-download`. */
export const PROJECT_DOWNLOAD_CATALOGUE: ProjectDownloadCategory[] = [
  {
    id: "bundle",
    title: "1 · Whole project",
    description:
      "One archive of the platform as operated today — data, credentials sheets, docs, and source when available.",
    parts: ["full"],
  },
  {
    id: "documentation",
    title: "2 · Documentation & guides",
    description:
      "Product specification, per-audience user guides, and the full docs/ markdown library.",
    parts: ["project-description", "user-guides", "documentation"],
    categoryZipPart: "cat-documentation",
    categoryZipLabel: "Download entire documentation category",
  },
  {
    id: "data",
    title: "3 · Live platform data",
    description:
      "Tuition snapshot and scoped JSON exports (organizations, programmes, payments, KB, notifications).",
    parts: ["tuition", "organizations", "programmes", "payments", "knowledge-base", "notifications"],
    categoryZipPart: "cat-data",
    categoryZipLabel: "Download entire data category",
  },
  {
    id: "credentials",
    title: "4 · Access & credentials",
    description:
      "Admin roster, demo Schools/Universities login directory, and deployment environment export.",
    parts: ["master-admins", "demo-logins", "env"],
    categoryZipPart: "cat-credentials",
    categoryZipLabel: "Download entire credentials category",
  },
  {
    id: "source",
    title: "5 · Source code",
    description: "Application repository archive for offline review or disaster recovery.",
    parts: ["source"],
    categoryZipPart: "cat-source",
    categoryZipLabel: "Download source category",
  },
];

export const PROJECT_DOWNLOAD_PART_SET = new Set<string>(PROJECT_DOWNLOAD_PART_IDS);

export function isProjectDownloadPart(value: string): value is ProjectDownloadPart {
  return PROJECT_DOWNLOAD_PART_SET.has(value);
}

/** Atomic parts that make up a category ZIP (excludes nested cat-* and full). */
export function partsForCategoryZip(categoryZipPart: ProjectDownloadPart): ProjectDownloadPart[] {
  const cat = PROJECT_DOWNLOAD_CATALOGUE.find((c) => c.categoryZipPart === categoryZipPart);
  if (!cat) return [];
  return cat.parts.filter((p) => p !== "full" && !p.startsWith("cat-"));
}

/** Every atomic part that should appear somewhere in the catalogue UI. */
export function listCatalogueGridParts(): ProjectDownloadPartMeta[] {
  const seen = new Set<string>();
  const out: ProjectDownloadPartMeta[] = [];
  for (const cat of PROJECT_DOWNLOAD_CATALOGUE) {
    for (const id of cat.parts) {
      if (seen.has(id)) continue;
      seen.add(id);
      const meta = PROJECT_DOWNLOAD_PART_META[id];
      if (meta && !meta.hideInGrid) out.push(meta);
    }
  }
  return out;
}
