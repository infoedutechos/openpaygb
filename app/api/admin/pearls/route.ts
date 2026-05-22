import { NextResponse } from 'next/server';
import { PearlActivityStatus, PearlAuditEventType, PearlType, PearlWithdrawalStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { BLUE_TO_GOLDISH_RATE, createPearlAudit, convertBlueToGoldish } from '@/utils/pearls';

export async function GET(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const [pendingBlueActivities, receiptRushActivities, pendingWithdrawals, users, audits] = await Promise.all([
    prisma.pearlActivity.findMany({
      where: { pearlType: PearlType.BLUE, status: PearlActivityStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        sourceKey: true,
        sourceLabel: true,
        amount: true,
        createdAt: true,
        user: { select: { id: true, telegramId: true, name: true } },
      },
      take: 200,
    }),
    prisma.pearlActivity.findMany({
      where: { sourceKey: 'receipt_rush' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sourceKey: true,
        sourceLabel: true,
        amount: true,
        status: true,
        createdAt: true,
        approvedAt: true,
        rejectionReason: true,
        user: { select: { id: true, telegramId: true, name: true } },
      },
      take: 100,
    }),
    prisma.pearlWithdrawal.findMany({
      where: { status: PearlWithdrawalStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, telegramId: true, name: true } } },
      take: 200,
    }),
    prisma.user.findMany({
      select: {
        id: true,
        telegramId: true,
        name: true,
        whitePearls: true,
        bluePearlsPending: true,
        bluePearlsApprovedTotal: true,
        goldishPearls: true,
      },
      orderBy: { goldishPearls: 'desc' },
      take: 200,
    }),
    prisma.pearlAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: { select: { telegramId: true, name: true } } },
    }),
  ]);

  const totals = users.reduce(
    (acc, u) => {
      acc.white += u.whitePearls;
      acc.bluePending += u.bluePearlsPending;
      acc.blueApproved += u.bluePearlsApprovedTotal;
      acc.goldish += u.goldishPearls;
      return acc;
    },
    { white: 0, bluePending: 0, blueApproved: 0, goldish: 0 }
  );

  return NextResponse.json({
    conversionRules: { whiteToGoldish: 50, blueToGoldish: BLUE_TO_GOLDISH_RATE },
    totals,
    users,
    pendingBlueActivities,
    receiptRushActivities,
    pendingWithdrawals,
    recentAudits: audits,
  });
}

export async function POST(req: Request) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: string };
  if (!action) return NextResponse.json({ error: 'Missing action' }, { status: 400 });

  if (action === 'approve_blue_activity') {
    const { activityId, adminLabel } = body as { activityId?: string; adminLabel?: string };
    if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 });

    const activity = await prisma.pearlActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.pearlType !== PearlType.BLUE || activity.status !== PearlActivityStatus.PENDING) {
      return NextResponse.json({ error: 'Activity not found or not pending blue activity' }, { status: 404 });
    }

    const conversion = convertBlueToGoldish(activity.amount);
    const approvedBlue = conversion.blueConsumed;

    await prisma.$transaction(async (tx) => {
      await tx.pearlActivity.update({
        where: { id: activity.id },
        data: {
          status: PearlActivityStatus.APPROVED,
          approvedByAdmin: true,
          approvedAt: new Date(),
          approvedByAdminLabel: adminLabel?.slice(0, 120) || 'admin',
          convertedGoldish: conversion.goldish,
        },
      });

      await tx.user.update({
        where: { id: activity.userId },
        data: {
          bluePearlsPending: { decrement: activity.amount },
          bluePearlsApprovedTotal: { increment: activity.amount },
          goldishPearls: { increment: conversion.goldish },
        },
      });

      await tx.pearlConversion.create({
        data: {
          userId: activity.userId,
          fromType: PearlType.BLUE,
          toType: PearlType.GOLDISH,
          fromAmount: approvedBlue,
          toAmount: conversion.goldish,
          trigger: 'auto_admin_approval',
          referenceId: activity.id,
        },
      });

      await createPearlAudit(tx, {
        userId: activity.userId,
        eventType: PearlAuditEventType.APPROVE_BLUE,
        pearlType: PearlType.BLUE,
        amount: activity.amount,
        meta: { activityId: activity.id, convertedGoldish: conversion.goldish, blueConsumed: approvedBlue },
      });
      if (conversion.goldish > 0) {
        await createPearlAudit(tx, {
          userId: activity.userId,
          eventType: PearlAuditEventType.CONVERT_BLUE_TO_GOLDISH,
          pearlType: PearlType.GOLDISH,
          amount: conversion.goldish,
          meta: { activityId: activity.id, blueConsumed: approvedBlue },
        });
      }
    });

    return NextResponse.json({ success: true, conversion });
  }

  if (action === 'reject_blue_activity') {
    const { activityId, rejectionReason, adminLabel } = body as {
      activityId?: string;
      rejectionReason?: string;
      adminLabel?: string;
    };
    if (!activityId) return NextResponse.json({ error: 'Missing activityId' }, { status: 400 });
    const activity = await prisma.pearlActivity.findUnique({ where: { id: activityId } });
    if (!activity || activity.pearlType !== PearlType.BLUE || activity.status !== PearlActivityStatus.PENDING) {
      return NextResponse.json({ error: 'Activity not found or not pending blue activity' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pearlActivity.update({
        where: { id: activity.id },
        data: {
          status: PearlActivityStatus.REJECTED,
          approvedByAdmin: false,
          approvedAt: new Date(),
          approvedByAdminLabel: adminLabel?.slice(0, 120) || 'admin',
          rejectionReason: rejectionReason?.slice(0, 300) || 'Rejected by admin',
        },
      });
      await tx.user.update({
        where: { id: activity.userId },
        data: { bluePearlsPending: { decrement: activity.amount } },
      });
      await createPearlAudit(tx, {
        userId: activity.userId,
        eventType: PearlAuditEventType.REJECT_BLUE,
        pearlType: PearlType.BLUE,
        amount: activity.amount,
        meta: { activityId: activity.id, rejectionReason: rejectionReason || null },
      });
    });

    return NextResponse.json({ success: true });
  }

  if (action === 'approve_withdrawal' || action === 'reject_withdrawal' || action === 'mark_withdrawal_paid') {
    const { withdrawalId, reason, adminLabel } = body as {
      withdrawalId?: string;
      reason?: string;
      adminLabel?: string;
    };
    if (!withdrawalId) return NextResponse.json({ error: 'Missing withdrawalId' }, { status: 400 });
    const withdrawal = await prisma.pearlWithdrawal.findUnique({ where: { id: withdrawalId } });
    if (!withdrawal) return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 });

    if (action === 'approve_withdrawal') {
      await prisma.$transaction(async (tx) => {
        await tx.pearlWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: PearlWithdrawalStatus.APPROVED,
            reviewedAt: new Date(),
            reviewedBy: adminLabel?.slice(0, 120) || 'admin',
            rejectionReason: null,
          },
        });
        await createPearlAudit(tx, {
          userId: withdrawal.userId,
          eventType: PearlAuditEventType.WITHDRAW_APPROVED,
          pearlType: PearlType.GOLDISH,
          amount: withdrawal.goldishAmount,
          meta: { withdrawalId: withdrawal.id },
        });
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'reject_withdrawal') {
      await prisma.$transaction(async (tx) => {
        await tx.pearlWithdrawal.update({
          where: { id: withdrawal.id },
          data: {
            status: PearlWithdrawalStatus.REJECTED,
            reviewedAt: new Date(),
            reviewedBy: adminLabel?.slice(0, 120) || 'admin',
            rejectionReason: reason?.slice(0, 300) || 'Rejected by admin',
          },
        });
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { goldishPearls: { increment: withdrawal.goldishAmount } },
        });
        await createPearlAudit(tx, {
          userId: withdrawal.userId,
          eventType: PearlAuditEventType.WITHDRAW_REJECTED,
          pearlType: PearlType.GOLDISH,
          amount: withdrawal.goldishAmount,
          meta: { withdrawalId: withdrawal.id, reason: reason || null },
        });
      });
      return NextResponse.json({ success: true });
    }

    await prisma.pearlWithdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: PearlWithdrawalStatus.PAID,
        paidAt: new Date(),
        reviewedBy: adminLabel?.slice(0, 120) || 'admin',
      },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
