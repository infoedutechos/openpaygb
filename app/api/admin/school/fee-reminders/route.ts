import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse } from "@/lib/api-error";
import { requireSchoolAdminScope } from "@/lib/school-admin-api";
import { sendTelegramTuitionDueReminder } from "@/lib/telegram/notify-extended";
import { isSmsConfigured, isWhatsAppConfigured, sendSms, sendWhatsApp } from "@/lib/sms/send";

function orgSlug(req: NextRequest) {
  return req.nextUrl.searchParams.get("organizationSlug");
}

/** List recent reminder logs + channel readiness. */
export async function GET(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const [logs, withTelegram, withPhone] = await Promise.all([
      prisma.schoolFeeReminderLog.findMany({
        where: { organizationId: gate.scope.organizationId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.student.count({
        where: {
          organizationId: gate.scope.organizationId,
          telegramId: { not: "" },
        },
      }),
      prisma.student.count({
        where: {
          organizationId: gate.scope.organizationId,
          phone: { not: "" },
        },
      }),
    ]);

    return NextResponse.json({
      telegramLinkedStudents: withTelegram,
      phoneStudents: withPhone,
      channels: {
        telegram: true,
        sms: isSmsConfigured(),
        whatsapp: isWhatsAppConfigured(),
      },
      logs: logs.map((l) => ({
        id: l.id,
        channel: l.channel,
        recipient: l.recipient,
        message: l.message,
        success: l.success,
        error: l.error || null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "GET /api/admin/school/fee-reminders" });
  }
}

const Body = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  channels: z.array(z.enum(["telegram", "sms", "whatsapp"])).optional(),
});

async function logReminder(opts: {
  organizationId: string;
  studentId: string;
  channel: string;
  recipient: string;
  message: string;
  success: boolean;
  error?: string;
}) {
  await prisma.schoolFeeReminderLog.create({
    data: {
      organizationId: opts.organizationId,
      studentId: opts.studentId,
      channel: opts.channel,
      recipient: opts.recipient,
      message: opts.message,
      success: opts.success,
      error: opts.error ?? "",
    },
  });
}

/** Send due reminders via Telegram / SMS / WhatsApp (when configured). */
export async function POST(req: NextRequest) {
  try {
    const gate = await requireSchoolAdminScope(orgSlug(req));
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    const limit = parsed.success ? parsed.data.limit ?? 25 : 25;
    const channels: Array<"telegram" | "sms" | "whatsapp"> = parsed.success && parsed.data.channels?.length
      ? parsed.data.channels
      : ["telegram", "sms"];

    const students = await prisma.student.findMany({
      where: { organizationId: gate.scope.organizationId },
      take: Math.max(limit * 2, 50),
      select: {
        id: true,
        telegramId: true,
        phone: true,
        name: true,
        admissionNo: true,
      },
    });

    let sent = 0;
    let failed = 0;
    let attempted = 0;
    const orgId = gate.scope.organizationId;

    for (const s of students) {
      if (attempted >= limit) break;
      const label = s.name || s.admissionNo || "student";
      const msg = `Fee reminder for ${label}: please settle outstanding school fees via your school pay link or parent portal.`;

      if (channels.includes("telegram") && s.telegramId) {
        attempted += 1;
        try {
          const ok = await sendTelegramTuitionDueReminder(s.id);
          await logReminder({
            organizationId: orgId,
            studentId: s.id,
            channel: "telegram",
            recipient: s.telegramId,
            message: msg,
            success: ok,
            error: ok ? undefined : "send returned false",
          });
          if (ok) sent += 1;
          else failed += 1;
        } catch (e) {
          failed += 1;
          await logReminder({
            organizationId: orgId,
            studentId: s.id,
            channel: "telegram",
            recipient: s.telegramId,
            message: msg,
            success: false,
            error: e instanceof Error ? e.message : "send failed",
          });
        }
        if (attempted >= limit) break;
      }

      if (channels.includes("sms") && s.phone) {
        attempted += 1;
        const result = await sendSms({ to: s.phone, message: msg });
        await logReminder({
          organizationId: orgId,
          studentId: s.id,
          channel: "sms",
          recipient: s.phone,
          message: msg,
          success: result.ok,
          error: result.error,
        });
        if (result.ok) sent += 1;
        else failed += 1;
        if (attempted >= limit) break;
      }

      if (channels.includes("whatsapp") && s.phone) {
        attempted += 1;
        const result = await sendWhatsApp({ to: s.phone, message: msg });
        await logReminder({
          organizationId: orgId,
          studentId: s.id,
          channel: "whatsapp",
          recipient: s.phone,
          message: msg,
          success: result.ok,
          error: result.error,
        });
        if (result.ok) sent += 1;
        else failed += 1;
      }
    }

    return NextResponse.json({
      attempted,
      sent,
      failed,
      channelsRequested: channels,
      note: "Telegram uses student.telegramId; SMS/WhatsApp use student.phone when provider env is set.",
    });
  } catch (e) {
    return apiErrorResponse(e, { route: "POST /api/admin/school/fee-reminders" });
  }
}
