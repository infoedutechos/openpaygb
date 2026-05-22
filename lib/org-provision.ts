import { prisma } from "@/lib/prisma";
import { normalizeProgrammeTrack } from "@/lib/programme-track";

const DEFAULT_TEMPLATE_SLUG = "default";

/** Template clone can include many programmes + fee rows; default Prisma tx timeout is 5s. */
const PROVISION_TX_OPTIONS = { maxWait: 15_000, timeout: 60_000 } as const;

/**
 * Copy programmes (with fee lines), latest FX template row, and destination wallet from the template org
 * into a target tenant. No-op if the target already has at least one programme.
 */
export async function cloneProgrammesAndFxFromTemplate(
  organizationId: string,
  templateSlug: string = DEFAULT_TEMPLATE_SLUG
): Promise<void> {
  const template = await prisma.organization.findUnique({
    where: { slug: templateSlug },
    include: {
      programmes: { include: { fees: true } },
      fxRates: { orderBy: { effectiveAt: "desc" }, take: 1 },
    },
  });
  if (!template) {
    throw new Error(`Template organization "${templateSlug}" not found`);
  }

  const existingProgrammes = await prisma.programme.count({ where: { organizationId } });
  if (existingProgrammes > 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const prog of template.programmes) {
      await tx.programme.create({
        data: {
          organizationId,
          code: prog.code,
          name: prog.name,
          track: normalizeProgrammeTrack(prog.track),
          ...(prog.fees.length > 0
            ? {
                fees: {
                  createMany: {
                    data: prog.fees.map((f) => ({
                      year: f.year,
                      semester: f.semester,
                      recurrence: f.recurrence,
                      feeKey: f.feeKey,
                      tuitionUgx: f.tuitionUgx,
                      functionalFeesUgx: f.functionalFeesUgx,
                    })),
                  },
                },
              }
            : {}),
        },
      });
    }

    const fx = template.fxRates[0];
    if (fx) {
      await tx.fxRate.create({
        data: {
          organizationId,
          ugxPerTon: fx.ugxPerTon,
          source: fx.source || "template",
          effectiveAt: new Date(),
        },
      });
    }

    await tx.organization.update({
      where: { id: organizationId },
      data: {
        destinationWallet: template.destinationWallet ?? "",
        checkoutPlatformFeeUgx: template.checkoutPlatformFeeUgx,
      },
    });
  }, PROVISION_TX_OPTIONS);
}
