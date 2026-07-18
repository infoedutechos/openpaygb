import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/auth";
import { resolveOrgAdminOrganization } from "@/lib/admin-school-org";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import {
  clampSeqDigits,
  clampSeqStart,
  normalizeYearSource,
  orgToAdmissionFormatConfig,
  previewAdmissionFormat,
  sanitizeAdmissionPrefix,
  sanitizeAdmissionSeparator,
} from "@/lib/admission-format";
import {
  orgToStaffFormatConfig,
  previewStaffFormat,
  sanitizeStaffPrefix,
} from "@/lib/staff-format";

const PatchBody = z.object({
  currentAcademicYearLabel: z.string().max(40).optional(),
  admissionFormatConfigured: z.boolean().optional(),
  admissionPrefix: z.string().max(12).optional(),
  admissionIncludeYear: z.boolean().optional(),
  admissionYearSource: z.enum(["calendar", "academic", "none"]).optional(),
  admissionSeqDigits: z.number().int().min(3).max(6).optional(),
  admissionSeparator: z.string().max(3).optional(),
  admissionSeqStart: z.number().int().min(1).max(999999).optional(),
  staffFormatConfigured: z.boolean().optional(),
  staffPrefix: z.string().max(12).optional(),
  staffIncludeYear: z.boolean().optional(),
  staffYearSource: z.enum(["calendar", "academic", "none"]).optional(),
  staffSeqDigits: z.number().int().min(3).max(6).optional(),
  staffSeparator: z.string().max(3).optional(),
  staffSeqStart: z.number().int().min(1).max(999999).optional(),
  letterheadPhone: z.string().max(40).optional(),
  letterheadEmail: z.string().max(120).optional(),
  letterheadAddress: z.string().max(240).optional(),
});

function serializeOrgSettings(org: {
  slug: string;
  name: string;
  institutionTier: string;
  currentAcademicYearLabel: string | null;
  faviconUploadedAt: Date | null;
  registrationWebsiteUrl: string | null;
  admissionFormatConfigured: boolean;
  admissionPrefix: string;
  admissionIncludeYear: boolean;
  admissionYearSource: string;
  admissionSeqDigits: number;
  admissionSeparator: string;
  admissionSeqStart: number;
  staffFormatConfigured: boolean;
  staffPrefix: string;
  staffIncludeYear: boolean;
  staffYearSource: string;
  staffSeqDigits: number;
  staffSeparator: string;
  staffSeqStart: number;
  letterheadPhone: string;
  letterheadEmail: string;
  letterheadAddress: string;
  letterheadLogoUploadedAt: Date | null;
}) {
  const admission = orgToAdmissionFormatConfig(org);
  const preview = previewAdmissionFormat(admission);
  const staff = orgToStaffFormatConfig(org);
  const staffPreview = previewStaffFormat(staff);
  return {
    slug: org.slug,
    name: org.name,
    institutionTier: org.institutionTier,
    currentAcademicYearLabel: org.currentAcademicYearLabel?.trim() ?? "",
    hasFavicon: Boolean(org.faviconUploadedAt),
    faviconUploadedAt: org.faviconUploadedAt?.toISOString() ?? null,
    faviconUrl: org.faviconUploadedAt
      ? `/api/org/${encodeURIComponent(org.slug)}/favicon?v=${encodeURIComponent(org.faviconUploadedAt.toISOString())}`
      : null,
    registrationWebsiteUrl: org.registrationWebsiteUrl?.trim() ?? "",
    admissionFormatConfigured: admission.configured,
    admissionPrefix: org.admissionPrefix?.trim() ?? "",
    admissionIncludeYear: admission.includeYear,
    admissionYearSource: admission.yearSource,
    admissionSeqDigits: admission.seqDigits,
    admissionSeparator: admission.separator,
    admissionSeqStart: admission.seqStart,
    admissionPreview: preview.example,
    admissionResolvedPrefix: admission.prefix,
    staffFormatConfigured: staff.configured,
    staffPrefix: org.staffPrefix?.trim() ?? "",
    staffIncludeYear: staff.includeYear,
    staffYearSource: staff.yearSource,
    staffSeqDigits: staff.seqDigits,
    staffSeparator: staff.separator,
    staffSeqStart: staff.seqStart,
    staffPreview: staffPreview.example,
    staffResolvedPrefix: staff.prefix,
    letterheadPhone: org.letterheadPhone?.trim() ?? "",
    letterheadEmail: org.letterheadEmail?.trim() ?? "",
    letterheadAddress: org.letterheadAddress?.trim() ?? "",
    hasLetterheadLogo: Boolean(org.letterheadLogoUploadedAt),
    letterheadLogoUploadedAt: org.letterheadLogoUploadedAt?.toISOString() ?? null,
    letterheadLogoUrl: org.letterheadLogoUploadedAt
      ? `/api/org/${encodeURIComponent(org.slug)}/letterhead-logo?v=${encodeURIComponent(org.letterheadLogoUploadedAt.toISOString())}`
      : null,
  };
}

const orgSelect = {
  slug: true,
  name: true,
  institutionTier: true,
  currentAcademicYearLabel: true,
  faviconUploadedAt: true,
  registrationWebsiteUrl: true,
  admissionFormatConfigured: true,
  admissionPrefix: true,
  admissionIncludeYear: true,
  admissionYearSource: true,
  admissionSeqDigits: true,
  admissionSeparator: true,
  admissionSeqStart: true,
  staffFormatConfigured: true,
  staffPrefix: true,
  staffIncludeYear: true,
  staffYearSource: true,
  staffSeqDigits: true,
  staffSeparator: true,
  staffSeqStart: true,
  letterheadPhone: true,
  letterheadEmail: true,
  letterheadAddress: true,
  letterheadLogoUploadedAt: true,
} as const;


export async function GET() {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const org = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: orgSelect,
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(serializeOrgSettings(org));
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/organization/settings" });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminFromCookies();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = await resolveOrgAdminOrganization(admin);
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status });
    }

    const json = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { institutionTier: true, slug: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.currentAcademicYearLabel !== undefined) {
      if (org.institutionTier !== "school") {
        return NextResponse.json(
          { error: "Academic year label is only editable for school workspaces." },
          { status: 403 },
        );
      }
      data.currentAcademicYearLabel = parsed.data.currentAcademicYearLabel.trim();
    }

    const touchingAdmission =
      parsed.data.admissionFormatConfigured !== undefined ||
      parsed.data.admissionPrefix !== undefined ||
      parsed.data.admissionIncludeYear !== undefined ||
      parsed.data.admissionYearSource !== undefined ||
      parsed.data.admissionSeqDigits !== undefined ||
      parsed.data.admissionSeparator !== undefined ||
      parsed.data.admissionSeqStart !== undefined;

    if (touchingAdmission) {
      if (parsed.data.admissionPrefix !== undefined) {
        data.admissionPrefix = sanitizeAdmissionPrefix(parsed.data.admissionPrefix, org.slug);
        if (!parsed.data.admissionPrefix.trim()) data.admissionPrefix = "";
      }
      if (parsed.data.admissionIncludeYear !== undefined) {
        data.admissionIncludeYear = parsed.data.admissionIncludeYear;
      }
      if (parsed.data.admissionYearSource !== undefined) {
        data.admissionYearSource = normalizeYearSource(parsed.data.admissionYearSource);
      }
      if (parsed.data.admissionSeqDigits !== undefined) {
        data.admissionSeqDigits = clampSeqDigits(parsed.data.admissionSeqDigits);
      }
      if (parsed.data.admissionSeparator !== undefined) {
        data.admissionSeparator = sanitizeAdmissionSeparator(parsed.data.admissionSeparator);
      }
      if (parsed.data.admissionSeqStart !== undefined) {
        data.admissionSeqStart = clampSeqStart(parsed.data.admissionSeqStart);
      }
      data.admissionFormatConfigured =
        parsed.data.admissionFormatConfigured !== undefined
          ? parsed.data.admissionFormatConfigured
          : true;
    }

    const touchingStaff =
      parsed.data.staffFormatConfigured !== undefined ||
      parsed.data.staffPrefix !== undefined ||
      parsed.data.staffIncludeYear !== undefined ||
      parsed.data.staffYearSource !== undefined ||
      parsed.data.staffSeqDigits !== undefined ||
      parsed.data.staffSeparator !== undefined ||
      parsed.data.staffSeqStart !== undefined;

    if (touchingStaff) {
      if (parsed.data.staffPrefix !== undefined) {
        data.staffPrefix = sanitizeStaffPrefix(parsed.data.staffPrefix, org.slug);
        if (!parsed.data.staffPrefix.trim()) data.staffPrefix = "";
      }
      if (parsed.data.staffIncludeYear !== undefined) {
        data.staffIncludeYear = parsed.data.staffIncludeYear;
      }
      if (parsed.data.staffYearSource !== undefined) {
        data.staffYearSource = normalizeYearSource(parsed.data.staffYearSource);
      }
      if (parsed.data.staffSeqDigits !== undefined) {
        data.staffSeqDigits = clampSeqDigits(parsed.data.staffSeqDigits);
      }
      if (parsed.data.staffSeparator !== undefined) {
        data.staffSeparator = sanitizeAdmissionSeparator(parsed.data.staffSeparator);
      }
      if (parsed.data.staffSeqStart !== undefined) {
        data.staffSeqStart = clampSeqStart(parsed.data.staffSeqStart);
      }
      data.staffFormatConfigured =
        parsed.data.staffFormatConfigured !== undefined ? parsed.data.staffFormatConfigured : true;
    }

    if (parsed.data.letterheadPhone !== undefined) {
      data.letterheadPhone = parsed.data.letterheadPhone.trim();
    }
    if (parsed.data.letterheadEmail !== undefined) {
      data.letterheadEmail = parsed.data.letterheadEmail.trim();
    }
    if (parsed.data.letterheadAddress !== undefined) {
      data.letterheadAddress = parsed.data.letterheadAddress.trim();
    }

    const updated = await prisma.organization.update({
      where: { id: scope.organizationId },
      data,
      select: orgSelect,
    });

    return NextResponse.json(serializeOrgSettings(updated));
  } catch (e) {
    return apiErrorResponse(e, { route: "PATCH /api/admin/organization/settings" });
  }
}
