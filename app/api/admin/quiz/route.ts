/**
 * Admin API for Quiz questions.
 * GET: list all questions (ordered)
 * POST: create, update, delete, or reorder
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getAdminAuthError } from '@/utils/admin-session';
import { MITROLABS_QUIZ_MAX_OPTIONS, MITROLABS_QUIZ_REWARD_POINTS } from '@/utils/consts';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const [questions, branches, settings] = await Promise.all([
      prisma.quizQuestion.findMany({
        orderBy: [{ branch: { order: 'asc' } }, { order: 'asc' }],
        include: { branch: { select: { id: true, name: true, order: true } } },
      }),
      prisma.quizBranch.findMany({ orderBy: { order: 'asc' } }),
      prisma.quizSettings.findFirst(),
    ]);
    return NextResponse.json({
      questions,
      branches,
      completionBonusPoints: settings?.completionBonusPoints ?? 0,
      autoRotationEnabled: settings?.autoRotationEnabled ?? false,
      autoRotationWeekdays: settings?.autoRotationWeekdays ?? '1,4',
      lastAutoRotationUtcDate: settings?.lastAutoRotationUtcDate ?? null,
      autoRotationQuestionCount: settings?.autoRotationQuestionCount ?? 5,
    });
  } catch (error) {
    console.error('Admin quiz GET error:', error);
    return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = getAdminAuthError(req);
  if (authError) return NextResponse.json(authError.body, { status: authError.status });

  try {
    const body = await req.json().catch(() => ({}));
    const { action, id, questionText, options, correctIndex, order, isActive, points, branchId } = body;

    if (action === 'create') {
      const opts = (Array.isArray(options) ? options.filter((o: unknown) => typeof o === 'string') : []).slice(0, MITROLABS_QUIZ_MAX_OPTIONS);
      if (opts.length < 2) return NextResponse.json({ error: 'At least 2 options required' }, { status: 400 });
      const correct = typeof correctIndex === 'number' && correctIndex >= 0 && correctIndex < opts.length ? correctIndex : 0;
      const maxOrder = await prisma.quizQuestion.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
      const newOrder = typeof order === 'number' ? order : (maxOrder?.order ?? 0) + 1;
      const questionPoints = typeof points === 'number' && points >= 0 ? points : 0;
      const qBranchId = typeof branchId === 'string' && branchId.trim() ? branchId.trim() : null;

      const created = await prisma.quizQuestion.create({
        data: {
          questionText: typeof questionText === 'string' ? questionText : 'Question',
          options: opts,
          correctIndex: correct,
          points: questionPoints,
          order: newOrder,
          isActive: isActive !== false,
          branchId: qBranchId,
        },
      });
      return NextResponse.json({ success: true, question: created });
    }

    if (action === 'update' && id) {
      const updateData: { questionText?: string; options?: string[]; correctIndex?: number; order?: number; isActive?: boolean; points?: number; branchId?: string | null } = {};
      if (typeof questionText === 'string') updateData.questionText = questionText;
      if (Array.isArray(options)) {
        const opts = options.filter((o: unknown) => typeof o === 'string').slice(0, MITROLABS_QUIZ_MAX_OPTIONS);
        if (opts.length >= 2) {
          updateData.options = opts;
          if (typeof correctIndex === 'number' && correctIndex >= 0 && correctIndex < opts.length) {
            updateData.correctIndex = correctIndex;
          }
        }
      }
      if (typeof order === 'number') updateData.order = order;
      if (typeof isActive === 'boolean') updateData.isActive = isActive;
      if (typeof points === 'number' && points >= 0) updateData.points = points;
      if (branchId !== undefined) updateData.branchId = typeof branchId === 'string' && branchId.trim() ? branchId.trim() : null;

      const updated = await prisma.quizQuestion.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json({ success: true, question: updated });
    }

    if (action === 'delete' && id) {
      await prisma.quizQuestion.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'reorder' && Array.isArray(body.orders)) {
      const orders = body.orders as { id: string; order: number }[];
      for (const { id: qId, order: o } of orders) {
        if (qId && typeof o === 'number') {
          await prisma.quizQuestion.update({
            where: { id: qId },
            data: { order: o },
          });
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'createBranch') {
      const name = typeof body.name === 'string' ? body.name.trim() : 'Branch';
      const branchOrder = typeof body.order === 'number' ? body.order : 0;
      const branch = await prisma.quizBranch.create({
        data: { name: name || 'Branch', order: branchOrder },
      });
      return NextResponse.json({ success: true, branch });
    }

    if (action === 'updateBranch' && body.branchId) {
      const updateBranch: { name?: string; order?: number } = {};
      if (typeof body.name === 'string') updateBranch.name = body.name.trim() || 'Branch';
      if (typeof body.order === 'number') updateBranch.order = body.order;
      const branch = await prisma.quizBranch.update({
        where: { id: body.branchId },
        data: updateBranch,
      });
      return NextResponse.json({ success: true, branch });
    }

    if (action === 'deleteBranch' && body.branchId) {
      await prisma.quizQuestion.updateMany({ where: { branchId: body.branchId }, data: { branchId: null } });
      await prisma.quizBranch.delete({ where: { id: body.branchId } });
      return NextResponse.json({ success: true });
    }

    if (action === 'setCompletionBonus') {
      const completionBonusPoints = typeof body.completionBonusPoints === 'number' && body.completionBonusPoints >= 0 ? body.completionBonusPoints : 0;
      let settings = await prisma.quizSettings.findFirst();
      if (settings) {
        settings = await prisma.quizSettings.update({
          where: { id: settings.id },
          data: { completionBonusPoints },
        });
      } else {
        settings = await prisma.quizSettings.create({ data: { completionBonusPoints } });
      }
      return NextResponse.json({ success: true, completionBonusPoints: settings.completionBonusPoints });
    }

    if (action === 'updateAutoRotation') {
      const autoRotationEnabled = Boolean(body.autoRotationEnabled);
      const rawWd = typeof body.autoRotationWeekdays === 'string' ? body.autoRotationWeekdays.trim() : '1,4';
      const autoRotationWeekdays = rawWd || '1,4';
      const autoRotationQuestionCount = Math.min(
        20,
        Math.max(1, typeof body.autoRotationQuestionCount === 'number' ? body.autoRotationQuestionCount : 5),
      );
      let settings = await prisma.quizSettings.findFirst();
      if (settings) {
        settings = await prisma.quizSettings.update({
          where: { id: settings.id },
          data: { autoRotationEnabled, autoRotationWeekdays, autoRotationQuestionCount },
        });
      } else {
        settings = await prisma.quizSettings.create({
          data: {
            completionBonusPoints: 0,
            autoRotationEnabled,
            autoRotationWeekdays,
            autoRotationQuestionCount,
          },
        });
      }
      return NextResponse.json({
        success: true,
        autoRotationEnabled: settings.autoRotationEnabled,
        autoRotationWeekdays: settings.autoRotationWeekdays,
        autoRotationQuestionCount: settings.autoRotationQuestionCount,
      });
    }

    if (action === 'runAutoRotationNow') {
      const settings = await prisma.quizSettings.findFirst();
      const count = Math.min(
        20,
        Math.max(1, typeof body.count === 'number' ? body.count : settings?.autoRotationQuestionCount ?? 5),
      );
      const all = await prisma.quizQuestion.findMany({ select: { id: true } });
      const ids = all.map((q) => q.id);
      if (ids.length === 0) {
        return NextResponse.json({ success: true, activeCount: 0, totalQuestions: 0 });
      }
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      const activeIds = shuffled.slice(0, Math.min(count, ids.length));
      const inactiveIds = ids.filter((id) => !activeIds.includes(id));
      const ops = [
        prisma.quizQuestion.updateMany({ where: { id: { in: activeIds } }, data: { isActive: true } }),
      ];
      if (inactiveIds.length > 0) {
        ops.push(prisma.quizQuestion.updateMany({ where: { id: { in: inactiveIds } }, data: { isActive: false } }));
      }
      await prisma.$transaction(ops);
      return NextResponse.json({ success: true, activeCount: activeIds.length, totalQuestions: ids.length });
    }

    if (action === 'seedBlockchainPool') {
      const { BLOCKCHAIN_QUIZ_QUESTIONS } = await import('@/data/quiz-blockchain-questions');
      const items = Array.isArray(BLOCKCHAIN_QUIZ_QUESTIONS) ? BLOCKCHAIN_QUIZ_QUESTIONS : [];
      const branchNames = [...new Set(items.map((q: { branchName: string }) => q.branchName).filter(Boolean))];
      const branchMap: Record<string, string> = {};
      const existingBranches = await prisma.quizBranch.findMany({ select: { id: true, name: true } });
      for (const b of existingBranches) {
        branchMap[b.name] = b.id;
      }
      for (const name of branchNames) {
        if (!branchMap[name]) {
          const created = await prisma.quizBranch.create({
            data: { name, order: Object.keys(branchMap).length },
          });
          branchMap[name] = created.id;
        }
      }
      const maxOrder = await prisma.quizQuestion.findFirst({ orderBy: { order: 'desc' }, select: { order: true } }).then((r) => r?.order ?? 0);
      let order = maxOrder + 1;
      for (const q of items) {
        const options = Array.isArray(q.options) ? q.options.filter((o: unknown) => typeof o === 'string').slice(0, MITROLABS_QUIZ_MAX_OPTIONS) : [];
        if (options.length < 2) continue;
        const correctIndex = Math.min(Math.max(0, q.correctIndex ?? 0), options.length - 1);
        const points = typeof q.points === 'number' && q.points >= 0 ? q.points : MITROLABS_QUIZ_REWARD_POINTS;
        const branchId = q.branchName && branchMap[q.branchName] ? branchMap[q.branchName] : null;
        await prisma.quizQuestion.create({
          data: {
            questionText: typeof q.questionText === 'string' ? q.questionText : 'Question',
            options,
            correctIndex,
            points,
            order: order++,
            isActive: false,
            branchId,
          },
        });
      }
      return NextResponse.json({ success: true, seeded: items.length, branches: Object.keys(branchMap).length });
    }

    if (action === 'setRandomDaily') {
      const count = Math.min(5, Math.max(0, typeof body.count === 'number' ? body.count : 5));
      const all = await prisma.quizQuestion.findMany({ select: { id: true } });
      const ids = all.map((q) => q.id);
      const shuffled = [...ids].sort(() => Math.random() - 0.5);
      const activeIds = shuffled.slice(0, Math.min(count, ids.length));
      const inactiveIds = ids.filter((id) => !activeIds.includes(id));
      const ops = [
        prisma.quizQuestion.updateMany({ where: { id: { in: activeIds } }, data: { isActive: true } }),
      ];
      if (inactiveIds.length > 0) {
        ops.push(prisma.quizQuestion.updateMany({ where: { id: { in: inactiveIds } }, data: { isActive: false } }));
      }
      await prisma.$transaction(ops);
      return NextResponse.json({ success: true, activeCount: activeIds.length, totalQuestions: ids.length });
    }

    if (action === 'resetAllQuizAttempts') {
      const result = await prisma.userQuizAttempt.deleteMany({});
      return NextResponse.json({ success: true, deleted: result.count });
    }

    return NextResponse.json({ error: 'Invalid action or missing id' }, { status: 400 });
  } catch (error) {
    console.error('Admin quiz POST error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
