import prisma from '@/utils/prisma';

/** Whether the Shop (Match 2 Earn) is visible in the user app Market tab. Default true. */
export async function getShopEnabled(): Promise<boolean> {
  const row = await prisma.shopSettings.findFirst();
  return row?.enabled ?? true;
}

/** Set whether the Shop is visible in the user app. */
export async function setShopEnabled(enabled: boolean): Promise<void> {
  const existing = await prisma.shopSettings.findFirst();
  if (existing) {
    await prisma.shopSettings.update({
      where: { id: existing.id },
      data: { enabled },
    });
  } else {
    await prisma.shopSettings.create({
      data: { enabled },
    });
  }
}
