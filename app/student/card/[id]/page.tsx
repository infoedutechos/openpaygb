import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidObjectId } from "@/lib/object-id";
import { ensureSchoolPayCode } from "@/lib/school-pay-code";
import { StudentShareCard } from "@/components/admin/StudentShareCard";
import { appBaseUrl } from "@/lib/root-metadata";
import { studentCardPath } from "@/lib/admission-no";

/**
 * Public student identity card — safe fields only (no email/phone).
 * Parents scan the QR or open the shared link to see admission number + School Code.
 */
export default async function PublicStudentCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isValidObjectId(id)) notFound();

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      admissionNo: true,
      programmeCode: true,
      year: true,
      semester: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          institutionTier: true,
        },
      },
    },
  });
  if (!student || !student.admissionNo.trim()) notFound();

  const schoolPayCode = await ensureSchoolPayCode(student.organization.id);
  const base = appBaseUrl();
  const cardUrl = `${base}${studentCardPath(student.id)}`;
  const periodLabel = student.organization.institutionTier === "school" ? "Term" : "Semester";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <StudentShareCard
        student={{
          id: student.id,
          name: student.name,
          admissionNo: student.admissionNo,
          programmeCode: student.programmeCode,
          year: student.year,
          semester: student.semester,
          organizationName: student.organization.name,
          organizationSlug: student.organization.slug,
          schoolPayCode,
          cardUrl,
          periodLabel,
        }}
      />
      <p className="mt-6 text-center text-xs text-slate-500">
        Keep this card until the school confirms enrollment and fee payments.
      </p>
    </div>
  );
}
