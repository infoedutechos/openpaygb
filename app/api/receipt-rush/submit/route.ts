import { NextResponse } from 'next/server';
import { PearlActivityStatus, PearlAuditEventType, PearlType } from '@prisma/client';
import prisma from '@/utils/prisma';
import { createPearlAudit, resolveUserFromInitData } from '@/utils/pearls';
import {
  findReceiptRushCategory,
  RECEIPT_RUSH_CATEGORIES,
  RECEIPT_RUSH_REWARD_BLUE,
} from '@/utils/receipt-rush';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    initData,
    categoryId,
    taxType,
    uraPortal,
    receiptNumber,
    receiptDate,
    amountPaid,
    notes,
    imageUrl,
    imageData,
    imageName,
    imageType,
  } = body as Record<string, unknown>;

  const init = typeof initData === 'string' ? initData : '';
  if (!init) return NextResponse.json({ error: 'Missing initData' }, { status: 400 });

  const category = findReceiptRushCategory(String(categoryId || ''));
  if (!category) {
    return NextResponse.json(
      { error: 'Invalid category', categories: RECEIPT_RUSH_CATEGORIES },
      { status: 400 }
    );
  }
  const tax = String(taxType || '').trim();
  if (!tax || !category.taxTypes.includes(tax)) {
    return NextResponse.json({ error: 'Invalid tax type for selected category' }, { status: 400 });
  }

  const portal = (String(uraPortal || '').trim() || 'Not specified').slice(0, 80);
  const receiptNo = (String(receiptNumber || '').trim() || 'Not provided').slice(0, 80);
  const date = (String(receiptDate || '').trim() || 'Not provided').slice(0, 40);
  const amountRaw = Math.floor(Number(amountPaid || 0));
  const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0;
  const img = String(imageUrl || '').trim();
  const embeddedImage = String(imageData || '').trim();
  const imgName = String(imageName || '').trim().slice(0, 120);
  const imgType = String(imageType || '').trim().slice(0, 80);
  const memo = String(notes || '').trim().slice(0, 180);
  const hasUploadedImage = img.startsWith('/uploads/receipts/');
  const hasEmbeddedImage = embeddedImage.startsWith('data:image/') && embeddedImage.length <= 8_000_000;

  if (!hasUploadedImage && !hasEmbeddedImage) {
    const error = embeddedImage.startsWith('data:image/')
      ? 'Receipt image is too large. Please upload or scan a clearer smaller image.'
      : 'Please upload or scan a receipt image before submitting.';
    return NextResponse.json({ error }, { status: 400 });
  }

  const user = await resolveUserFromInitData(init);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const result = await prisma.$transaction(async (tx) => {
    const imageRef = hasUploadedImage ? img : 'embedded';
    const sourceLabel = `Receipt Rush · Category:${category.label} · Tax:${tax} · Portal:${portal} · Ref:${receiptNo} · Date:${date} · Paid:${amount} · Image:${imageRef}${memo ? ` · Notes:${memo}` : ''}`;
    const activity = await tx.pearlActivity.create({
      data: {
        userId: user.id,
        sourceKey: 'receipt_rush',
        sourceLabel: sourceLabel.slice(0, 2000),
        pearlType: PearlType.BLUE,
        amount: RECEIPT_RUSH_REWARD_BLUE,
        status: PearlActivityStatus.PENDING,
        approvedByAdmin: false,
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { bluePearlsPending: { increment: RECEIPT_RUSH_REWARD_BLUE } },
    });

    await createPearlAudit(tx, {
      userId: user.id,
      eventType: PearlAuditEventType.EARN_BLUE_PENDING,
      pearlType: PearlType.BLUE,
      amount: RECEIPT_RUSH_REWARD_BLUE,
      meta: {
        sourceKey: 'receipt_rush',
        categoryId: category.id,
        categoryLabel: category.label,
        taxType: tax,
        uraPortal: portal,
        receiptNumber: receiptNo,
        receiptDate: date,
        amountPaid: amount,
        imageUrl: imageRef,
        imageData: hasEmbeddedImage ? embeddedImage : undefined,
        imageName: imgName || undefined,
        imageType: imgType || undefined,
        activityId: activity.id,
      },
    });

    return activity;
  });

  return NextResponse.json({
    success: true,
    rewardBluePearls: RECEIPT_RUSH_REWARD_BLUE,
    status: 'PENDING_APPROVAL',
    activityId: result.id,
  });
}
