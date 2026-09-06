import "server-only";

import { prisma } from "@/lib/prisma";
import { PLATFORM_SITE_UI_KEY } from "@/lib/site-ui-shared";
import {
  type ProductLogoId,
  PRODUCT_LOGO_IDS,
  PRODUCT_LOGO_LABELS,
} from "@/lib/platform-brand";
import { platformLogoContentType, type PlatformLogoContentType } from "@/lib/validate-platform-logo";

export { PRODUCT_LOGO_IDS, PRODUCT_LOGO_LABELS, type ProductLogoId };

/** Public path for a product logo (hub reuses platform logo endpoint for favicon/PWA). */
export function productLogoPath(product: ProductLogoId): string {
  if (product === "hub") return "/api/platform/logo";
  return `/api/public/product-logo/${product}`;
}

export function productLogoUrl(
  product: ProductLogoId,
  uploadedAt: Date | string | null | undefined,
): string | null {
  if (!uploadedAt) return null;
  const t = typeof uploadedAt === "string" ? uploadedAt : uploadedAt.toISOString();
  return `${productLogoPath(product)}?v=${encodeURIComponent(t)}`;
}

type LogoFieldPair = {
  bytesKey: "platformLogo" | "odelPayHigherLogo" | "odelPaySchoolsLogo" | "openPayGbLogo";
  atKey:
    | "platformLogoUploadedAt"
    | "odelPayHigherLogoUploadedAt"
    | "odelPaySchoolsLogoUploadedAt"
    | "openPayGbLogoUploadedAt";
};

const FIELD_MAP: Record<ProductLogoId, LogoFieldPair> = {
  hub: { bytesKey: "platformLogo", atKey: "platformLogoUploadedAt" },
  higher: { bytesKey: "odelPayHigherLogo", atKey: "odelPayHigherLogoUploadedAt" },
  schools: { bytesKey: "odelPaySchoolsLogo", atKey: "odelPaySchoolsLogoUploadedAt" },
  openpaygb: { bytesKey: "openPayGbLogo", atKey: "openPayGbLogoUploadedAt" },
};

export function productLogoFields(product: ProductLogoId): LogoFieldPair {
  return FIELD_MAP[product];
}

export async function getProductLogoRecord(product: ProductLogoId): Promise<{
  bytes: Buffer | null;
  uploadedAt: Date | null;
  contentType: PlatformLogoContentType | null;
}> {
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: {
      platformLogo: true,
      platformLogoUploadedAt: true,
      odelPayHigherLogo: true,
      odelPayHigherLogoUploadedAt: true,
      odelPaySchoolsLogo: true,
      odelPaySchoolsLogoUploadedAt: true,
      openPayGbLogo: true,
      openPayGbLogoUploadedAt: true,
    },
  });
  if (!row) return { bytes: null, uploadedAt: null, contentType: null };

  let bytesRaw: Uint8Array | Buffer | null = null;
  let uploadedAt: Date | null = null;
  switch (product) {
    case "hub":
      bytesRaw = row.platformLogo;
      uploadedAt = row.platformLogoUploadedAt;
      break;
    case "higher":
      bytesRaw = row.odelPayHigherLogo;
      uploadedAt = row.odelPayHigherLogoUploadedAt;
      break;
    case "schools":
      bytesRaw = row.odelPaySchoolsLogo;
      uploadedAt = row.odelPaySchoolsLogoUploadedAt;
      break;
    case "openpaygb":
      bytesRaw = row.openPayGbLogo;
      uploadedAt = row.openPayGbLogoUploadedAt;
      break;
  }
  if (!bytesRaw?.length || !uploadedAt) {
    return { bytes: null, uploadedAt: null, contentType: null };
  }
  const bytes = Buffer.from(bytesRaw);
  return { bytes, uploadedAt, contentType: platformLogoContentType(bytes) };
}

export async function getProductLogoPublicUrls(): Promise<Record<ProductLogoId, string | null>> {
  try {
    const row = await prisma.siteUiSettings.findUnique({
      where: { key: PLATFORM_SITE_UI_KEY },
      select: {
        platformLogoUploadedAt: true,
        odelPayHigherLogoUploadedAt: true,
        odelPaySchoolsLogoUploadedAt: true,
        openPayGbLogoUploadedAt: true,
      },
    });
    return {
      hub: productLogoUrl("hub", row?.platformLogoUploadedAt),
      higher: productLogoUrl("higher", row?.odelPayHigherLogoUploadedAt),
      schools: productLogoUrl("schools", row?.odelPaySchoolsLogoUploadedAt),
      openpaygb: productLogoUrl("openpaygb", row?.openPayGbLogoUploadedAt),
    };
  } catch {
    return { hub: null, higher: null, schools: null, openpaygb: null };
  }
}

export async function getProductLogoStatus(): Promise<
  Record<ProductLogoId, { label: string; hasLogo: boolean; publicUrl: string | null; uploadedAt: string | null }>
> {
  const urls = await getProductLogoPublicUrls();
  const row = await prisma.siteUiSettings.findUnique({
    where: { key: PLATFORM_SITE_UI_KEY },
    select: {
      platformLogoUploadedAt: true,
      odelPayHigherLogoUploadedAt: true,
      odelPaySchoolsLogoUploadedAt: true,
      openPayGbLogoUploadedAt: true,
    },
  });
  const at: Record<ProductLogoId, Date | null | undefined> = {
    hub: row?.platformLogoUploadedAt,
    higher: row?.odelPayHigherLogoUploadedAt,
    schools: row?.odelPaySchoolsLogoUploadedAt,
    openpaygb: row?.openPayGbLogoUploadedAt,
  };
  const out = {} as Record<
    ProductLogoId,
    { label: string; hasLogo: boolean; publicUrl: string | null; uploadedAt: string | null }
  >;
  for (const id of PRODUCT_LOGO_IDS) {
    const uploaded = at[id] ?? null;
    out[id] = {
      label: PRODUCT_LOGO_LABELS[id],
      hasLogo: Boolean(uploaded),
      publicUrl: urls[id],
      uploadedAt: uploaded?.toISOString() ?? null,
    };
  }
  return out;
}
