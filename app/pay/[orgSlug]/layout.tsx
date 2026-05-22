import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug } = await params;
  const slug = orgSlug.trim().toLowerCase();
  if (!slug) return { title: "Tuition checkout" };

  try {
    const org = await prisma.organization.findFirst({
      where: { slug, tenantStatus: "active" },
      select: { name: true, faviconUploadedAt: true },
    });

    const title = org?.name ? `${org.name} — Tuition checkout` : "Tuition checkout";
    const hasFavicon = Boolean(org?.faviconUploadedAt);

    const icons = hasFavicon
      ? { icon: [{ url: `/api/org/${encodeURIComponent(slug)}/favicon`, type: "image/x-icon", sizes: "any" }] }
      : undefined;

    return { title, icons };
  } catch {
    return { title: "Tuition checkout" };
  }
}

export default function PayOrgSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
