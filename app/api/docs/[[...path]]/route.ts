import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DOCS_ROOT = path.join(process.cwd(), "docs");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function resolveDocsPath(segments: string[] | undefined): string | null {
  const rel = segments?.length ? segments.join("/") : "index.html";
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(DOCS_ROOT, normalized);
  if (!full.startsWith(DOCS_ROOT)) return null;
  return full;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await params;
  const filePath = resolveDocsPath(segments);
  if (!filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const info = await stat(filePath);
    const target = info.isDirectory() ? path.join(filePath, "index.html") : filePath;
    const content = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
