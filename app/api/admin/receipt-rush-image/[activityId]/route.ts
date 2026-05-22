import { NextResponse } from 'next/server';
import { PearlAuditEventType } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';

type ReceiptAuditMeta = {
  activityId?: string;
  imageData?: string;
  imageType?: string;
};

export async function GET(req: Request, context: { params: Promise<{ activityId: string }> }) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const { activityId } = await context.params;
  const activity = await prisma.pearlActivity.findUnique({
    where: { id: activityId },
    select: { id: true, userId: true, sourceKey: true },
  });
  if (!activity || activity.sourceKey !== 'receipt_rush') {
    return NextResponse.json({ error: 'Receipt Rush activity not found' }, { status: 404 });
  }

  const audits = await prisma.pearlAudit.findMany({
    where: { userId: activity.userId, eventType: PearlAuditEventType.EARN_BLUE_PENDING },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { meta: true },
  });

  const match = audits
    .map((a) => a.meta as ReceiptAuditMeta | null)
    .find((meta) => meta?.activityId === activity.id && typeof meta.imageData === 'string');
  const imageData = match?.imageData;
  if (!imageData?.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Receipt image not found' }, { status: 404 });
  }

  const [header, encoded] = imageData.split(',', 2);
  if (!encoded) return NextResponse.json({ error: 'Receipt image is invalid' }, { status: 404 });

  const contentType = header.match(/^data:([^;]+);base64$/)?.[1] || match?.imageType || 'image/jpeg';
  const bytes = Buffer.from(encoded, 'base64');
  return new Response(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=300',
    },
  });
}
