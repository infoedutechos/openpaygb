/**
 * Admin: Fees collection (treasury) panel
 * GET: List all transactions to the fee/treasury wallet, with by-date totals and grand total.
 */

import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { getOrCreateFeeRecipientUser } from '@/utils/fee-recipient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });
  try {
    const feeRecipient = await getOrCreateFeeRecipientUser(prisma);

    const [transfers, treasuryTxns] = await Promise.all([
      prisma.transfer.findMany({
        where: { recipientId: feeRecipient.id },
        include: { sender: { select: { name: true, telegramId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.treasuryTransaction.findMany({
        include: { user: { select: { name: true, telegramId: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    type TxRow = {
      id: string;
      amount: number;
      senderName: string;
      senderTelegramId: string;
      createdAt: string;
      type: 'transfer_fee' | 'donation' | 'multitap' | 'mine' | 'energy_limit' | 'league_commitment' | 'team_commitment';
    };

    const transferRows: TxRow[] = transfers.map((t) => ({
      id: t.id,
      amount: Math.floor(t.amount),
      senderName: t.sender.name ?? `User ${t.sender.telegramId.slice(-4)}`,
      senderTelegramId: t.sender.telegramId,
      createdAt: t.createdAt.toISOString(),
      type: (t.isDonation ? 'donation' : 'transfer_fee') as TxRow['type'],
    }));

    const treasuryRows: TxRow[] = treasuryTxns.map((t) => ({
      id: t.id,
      amount: Math.floor(t.amount),
      senderName: t.user.name ?? `User ${t.user.telegramId.slice(-4)}`,
      senderTelegramId: t.user.telegramId,
      createdAt: t.createdAt.toISOString(),
      type: t.type as 'multitap' | 'mine' | 'energy_limit' | 'league_commitment' | 'team_commitment',
    }));

    const transactions = [...transferRows, ...treasuryRows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const byDate: Record<string, { count: number; amount: number }> = {};
    for (const t of transactions) {
      const dateKey = t.createdAt.slice(0, 10);
      if (!byDate[dateKey]) byDate[dateKey] = { count: 0, amount: 0 };
      byDate[dateKey].count += 1;
      byDate[dateKey].amount += t.amount;
    }
    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

    return NextResponse.json({
      feeRecipient: {
        telegramId: feeRecipient.telegramId,
        name: feeRecipient.name ?? 'Treasury',
        pointsBalance: Math.floor(feeRecipient.pointsBalance ?? 0),
      },
      transactions,
      totalAmount,
      totalCount: transactions.length,
      byDate: sortedDates.map((date) => ({
        date,
        count: byDate[date].count,
        amount: Math.floor(byDate[date].amount),
      })),
    });
  } catch (e) {
    console.error('Fees collection API error:', e);
    return NextResponse.json({ error: 'Failed to load fees data' }, { status: 500 });
  }
}
