/**
 * Fee / treasury account – same recipient as transfer fees.
 * Used for upgrade costs (multitap, mine, energy limit) and transfer fees.
 */

import type { PrismaClient } from '@prisma/client';
import { TRANSFER_FEE_RECIPIENT_TELEGRAM_ID } from '@/utils/consts';

export async function getOrCreateFeeRecipientUser(prisma: PrismaClient) {
  let user = await prisma.user.findUnique({
    where: { telegramId: TRANSFER_FEE_RECIPIENT_TELEGRAM_ID },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: TRANSFER_FEE_RECIPIENT_TELEGRAM_ID,
        name: 'Treasury',
      },
    });
  }
  return user;
}
