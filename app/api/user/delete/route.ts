import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { validateTelegramWebAppData } from '@/utils/server-checks';
import { deleteUsersCascade } from '@/utils/delete-users-cascade';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const REQUIRED_CONFIRMATION = 'DELETE';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const telegramInitData =
      (typeof body.telegramInitData === 'string' ? body.telegramInitData : null) ??
      (typeof body.initData === 'string' ? body.initData : null);
    const confirmation =
      typeof body.confirmation === 'string' ? body.confirmation.trim() : '';

    if (!telegramInitData) {
      return NextResponse.json(
        { error: 'Missing telegram init data' },
        { status: 400 }
      );
    }

    const { validatedData, user: telegramUser, message: validationMessage } =
      validateTelegramWebAppData(telegramInitData);

    if (!validatedData || !telegramUser) {
      return NextResponse.json(
        {
          error: 'Invalid Telegram data',
          message: validationMessage || 'Please open the game from the Telegram app.',
        },
        { status: 403 }
      );
    }

    const telegramId = telegramUser.id?.toString();
    if (!telegramId) {
      return NextResponse.json({ error: 'Invalid user data' }, { status: 400 });
    }

    if (confirmation !== REQUIRED_CONFIRMATION) {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          message: `Type ${REQUIRED_CONFIRMATION} exactly to confirm account deletion.`,
        },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await deleteUsersCascade(prisma, [dbUser.id]);

    return NextResponse.json({ success: true, message: 'Account deleted permanently' });
  } catch (err) {
    console.error('User self-delete error:', err);
    const msg = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: 'Could not delete account. ' + msg }, { status: 500 });
  }
}
