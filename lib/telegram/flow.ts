import { PaymentRail } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createPendingPayment } from "@/lib/create-payment";
import { assertCanStartCheckoutPayment } from "@/lib/tuition-balance";
import { getTelegramOrganizationId } from "@/lib/telegram/org";
import { findProgrammeByCode, getFeeLineFromProgramme } from "@/lib/programmes";
import { getActiveUgxPerTon } from "@/lib/fx";
import { feeTotal, ugxToTon, tonToNanotonString } from "@/lib/money";
import { defaultTonWallet } from "@/lib/constants";
import { createReceiptAccessToken } from "@/lib/receipt-access";
import { absoluteUrl } from "@/lib/public-url";
import {
  buildStudentProgrammeProgress,
  getProgrammeDurationSummary,
  type StudentProgrammeProgress,
} from "@/lib/tuition-progress";
import {
  answerCallbackQuery,
  editMessageTextHtml,
  sendMessageHtml,
} from "@/lib/telegram/client";
import { escapeHtml } from "@/lib/telegram/escape";
import type { CallbackQuery, ReplyMarkup, TelegramUpdate } from "@/lib/telegram/types";

function displayName(from: { first_name?: string; last_name?: string; username?: string; id: number }) {
  const n = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
  if (n) return n;
  if (from.username) return `@${from.username}`;
  return `Student ${from.id}`;
}

async function buildFeeSummary(programmeCode: string, year: number, semester: number, organizationId: string) {
  const p = await findProgrammeByCode(programmeCode, organizationId);
  if (!p) return null;
  const line = getFeeLineFromProgramme(p.fees, year, semester);
  if (!line) return null;
  const totalUgx = feeTotal(line.tuitionUgx, line.functionalFeesUgx);
  const { ugxPerTon } = await getActiveUgxPerTon();
  const tonAmount = ugxToTon(totalUgx, ugxPerTon);
  const duration = getProgrammeDurationSummary(p);
  return {
    programmeName: p.name,
    programmeCode: p.code,
    year,
    semester,
    tuitionUgx: line.tuitionUgx,
    functionalFeesUgx: line.functionalFeesUgx,
    totalUgx,
    ugxPerTon,
    tonAmount,
    duration,
  };
}

async function loadProgress(
  studentId: string,
  programmeCode: string,
  organizationId: string,
): Promise<StudentProgrammeProgress | null> {
  const programme = await prisma.programme.findUnique({
    where: { organizationId_code: { organizationId, code: programmeCode } },
    include: { fees: true },
  });
  if (!programme) return null;
  const payments = await prisma.payment.findMany({
    where: { studentId, programmeCode, organizationId },
  });
  return buildStudentProgrammeProgress(programme, payments);
}

function tonTransferUrl(wallet: string, tonAmount: number, memo: string) {
  const amount = tonToNanotonString(tonAmount);
  const q = new URLSearchParams({ amount, text: memo.slice(0, 120) });
  return `ton://transfer/${wallet}?${q.toString()}`;
}

function mainMenuKeyboard(): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: "📚 Programmes", callback_data: "m:pr" },
        { text: "👤 My Profile", callback_data: "m:pf" },
      ],
      [
        { text: "💳 Payments", callback_data: "m:ps" },
        { text: "❓ Help", callback_data: "m:hp" },
      ],
    ],
  };
}

async function programmesKeyboard(organizationId: string): Promise<ReplyMarkup> {
  const rows = await prisma.programme.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
  });
  const keys: { text: string; callback_data: string }[][] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const row: { text: string; callback_data: string }[] = [
      { text: rows[i].code, callback_data: `pr:${rows[i].code}` },
    ];
    if (rows[i + 1]) {
      row.push({ text: rows[i + 1].code, callback_data: `pr:${rows[i + 1].code}` });
    }
    keys.push(row);
  }
  keys.push([{ text: "« Main menu", callback_data: "m:mn" }]);
  return { inline_keyboard: keys };
}

function yearKeyboard(code: string): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Year 1", callback_data: `yr:${code}:1` },
        { text: "Year 2", callback_data: `yr:${code}:2` },
        { text: "Year 3", callback_data: `yr:${code}:3` },
      ],
      [{ text: "« Programmes", callback_data: "m:pr" }],
    ],
  };
}

function semesterKeyboard(code: string, year: number): ReplyMarkup {
  return {
    inline_keyboard: [
      [
        { text: "Sem 1", callback_data: `se:${code}:${year}:1` },
        { text: "Sem 2", callback_data: `se:${code}:${year}:2` },
        { text: "Sem 3", callback_data: `se:${code}:${year}:3` },
      ],
      [{ text: "« Year", callback_data: `pr:${code}` }],
    ],
  };
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message?.text?.startsWith("/start")) {
    const chatId = update.message.chat.id;
    const text = [
      "<b>Welcome to ODEL Hub</b>",
      "",
      "<b>Tuition Waiver Program</b> — pay your fees in <b>TON</b> with on-chain receipts.",
      "",
      "Use the menu below or tap <b>Programmes</b> to choose your cohort, year, and semester.",
    ].join("\n");
    await sendMessageHtml(chatId, text, mainMenuKeyboard());
    return;
  }

  if (!update.callback_query) return;

  const cq = update.callback_query;
  const data = cq.data?.trim() ?? "";
  const chatId = cq.message?.chat.id;
  const messageId = cq.message?.message_id;

  if (!chatId || !messageId) {
    await answerCallbackQuery(cq.id);
    return;
  }

  try {
    await dispatchCallback(cq, data, chatId, messageId);
  } finally {
    await answerCallbackQuery(cq.id).catch(() => {});
  }
}

async function dispatchCallback(
  cq: CallbackQuery,
  data: string,
  chatId: number,
  messageId: number
): Promise<void> {
  const tg = String(cq.from.id);
  const organizationId = await getTelegramOrganizationId();

  if (data === "m:mn" || data === "m:hp") {
    if (data === "m:hp") {
      const help = [
        "<b>Help</b>",
        "",
        "• <b>Programmes</b> — select course, year, and semester; see UGX fees and TON estimate.",
        "• <b>My Profile</b> — details we have on file for your Telegram account.",
        "• <b>Payments</b> — your recent payment attempts.",
        "",
        "After you send TON with the shown memo, the platform <b>automatically</b> matches on-chain activity (TonAPI + scheduled job) and marks your payment <b>confirmed</b>.",
        "Then your digital receipt unlocks on the web link.",
      ].join("\n");
      await editMessageTextHtml(chatId, messageId, help, mainMenuKeyboard());
      return;
    }
    await editMessageTextHtml(
      chatId,
      messageId,
      "<b>ODEL Hub — main menu</b>\n\nChoose an option:",
      mainMenuKeyboard()
    );
    return;
  }

  if (data === "m:pr") {
    const kb = await programmesKeyboard(organizationId);
    await editMessageTextHtml(chatId, messageId, "<b>Select your programme</b>", kb);
    return;
  }

  if (data === "m:pf") {
    const student = await prisma.student.findFirst({
      where: { telegramId: tg },
      orderBy: { updatedAt: "desc" },
    });
    if (!student) {
      await editMessageTextHtml(
        chatId,
        messageId,
        "<b>My Profile</b>\n\nNo profile yet. Tap <b>Programmes</b> to start a payment journey.",
        mainMenuKeyboard()
      );
      return;
    }
    const progress = await loadProgress(student.id, student.programmeCode, organizationId);
    const text = [
      "<b>My Profile</b>",
      "",
      `<b>Name:</b> ${escapeHtml(student.name)}`,
      `<b>Programme:</b> ${escapeHtml(student.programmeCode)}`,
      progress && progress.totalSemesters > 0
        ? `<b>Year:</b> ${student.year} of ${progress.durationYears}`
        : `<b>Year:</b> ${student.year}`,
      progress && progress.semestersPerYear > 0
        ? `<b>Semester:</b> ${student.semester} of ${progress.semestersPerYear}`
        : `<b>Semester:</b> ${student.semester}`,
      progress && progress.totalSemesters > 0
        ? `<b>Completed:</b> ${progress.completedSemesters} of ${progress.totalSemesters} semesters (${progress.completedYears} of ${progress.durationYears} year${progress.durationYears === 1 ? "" : "s"})`
        : "",
      student.email ? `<b>Email:</b> ${escapeHtml(student.email)}` : "",
      student.phone ? `<b>Phone:</b> ${escapeHtml(student.phone)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await editMessageTextHtml(chatId, messageId, text, mainMenuKeyboard());
    return;
  }

  if (data === "m:ps") {
    const student = await prisma.student.findFirst({ where: { telegramId: tg } });
    if (!student) {
      await editMessageTextHtml(
        chatId,
        messageId,
        "<b>Payments</b>\n\nNo payments yet. Start from <b>Programmes</b>.",
        mainMenuKeyboard()
      );
      return;
    }
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    });
    const progress = await loadProgress(student.id, student.programmeCode, organizationId);
    const lines = payments.map((p) => {
      const st = p.status === "confirmed" ? "✅" : p.status === "pending" ? "⏳" : "⚠️";
      return `${st} <code>${escapeHtml(p.programmeCode)}</code> Y${p.year} S${p.semester} — ${p.tonAmount} TON`;
    });
    const summary =
      progress && progress.totalSemesters > 0
        ? [
            "",
            `<b>${escapeHtml(student.programmeCode)}</b> progress: ${progress.completedSemesters} of ${progress.totalSemesters} semesters confirmed`,
            `Remaining: ${progress.remainingSemesters} semester${progress.remainingSemesters === 1 ? "" : "s"} · ${progress.remainingYears} year${progress.remainingYears === 1 ? "" : "s"}`,
          ]
        : [];
    const body = ["<b>Your payments</b>", "", ...lines, ...summary].join("\n");
    await editMessageTextHtml(chatId, messageId, body, mainMenuKeyboard());
    return;
  }

  if (data.startsWith("pr:")) {
    const code = data.slice(3).toUpperCase();
    const kb = yearKeyboard(code);
    await editMessageTextHtml(chatId, messageId, `<b>${escapeHtml(code)}</b>\nSelect year:`, kb);
    return;
  }

  if (data.startsWith("yr:")) {
    const rest = data.slice(3);
    const [code, y] = rest.split(":");
    const year = Number(y);
    if (!code || !Number.isFinite(year)) return;
    const kb = semesterKeyboard(code.toUpperCase(), year);
    await editMessageTextHtml(
      chatId,
      messageId,
      `<b>${escapeHtml(code.toUpperCase())}</b> · Year ${year}\nSelect semester:`,
      kb
    );
    return;
  }

  if (data.startsWith("se:")) {
    const parts = data.split(":");
    if (parts.length !== 4) return;
    const code = parts[1].toUpperCase();
    const year = Number(parts[2]);
    const semester = Number(parts[3]);
    const sum = await buildFeeSummary(code, year, semester, organizationId);
    if (!sum) {
      await editMessageTextHtml(
        chatId,
        messageId,
        "Could not load fees for this selection. Try again or run <code>npm run seed</code>.",
        mainMenuKeyboard()
      );
      return;
    }
    const memo = `ODEL Hub - ${sum.programmeCode} Yr${year} Sem ${semester}`;
    const durationLine =
      sum.duration.durationYears > 0
        ? `<b>Year:</b> ${year} of ${sum.duration.durationYears} · <b>Semester:</b> ${semester} of ${sum.duration.semestersPerYear}`
        : `<b>Year:</b> ${year} · <b>Semester:</b> ${semester}`;
    const text = [
      "<b>Fee summary</b>",
      "",
      `<b>Programme:</b> ${escapeHtml(sum.programmeName)} (${escapeHtml(sum.programmeCode)})`,
      durationLine,
      "",
      `<b>Tuition:</b> UGX ${sum.tuitionUgx.toLocaleString()}`,
      `<b>Functional fees:</b> UGX ${sum.functionalFeesUgx.toLocaleString()}`,
      `<b>Total UGX:</b> UGX ${sum.totalUgx.toLocaleString()}`,
      "",
      `<b>Estimated TON</b> @ 1 TON = UGX ${sum.ugxPerTon.toLocaleString()}: <b>${sum.tonAmount} TON</b>`,
      "",
      `<i>${escapeHtml(memo)}</i>`,
    ].join("\n");

    const payData = `ok:${code}:${year}:${semester}`;
    const kb: ReplyMarkup = {
      inline_keyboard: [
        [{ text: "✅ Yes, pay in TON", callback_data: payData }],
        [{ text: "« Change programme", callback_data: "m:pr" }],
      ],
    };
    await editMessageTextHtml(chatId, messageId, text, kb);
    return;
  }

  if (data.startsWith("ok:")) {
    const parts = data.split(":");
    if (parts.length !== 4) return;
    const code = parts[1].toUpperCase();
    const year = Number(parts[2]);
    const semester = Number(parts[3]);

    const name = displayName(cq.from);
    let student = await prisma.student.findFirst({ where: { telegramId: tg, organizationId } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          organizationId,
          name,
          telegramId: tg,
          programmeCode: code,
          year,
          semester,
        },
      });
    } else {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { name, programmeCode: code, year, semester },
      });
    }

    const guard = await assertCanStartCheckoutPayment({
      studentId: student.id,
      programmeCode: code,
      year,
      semester,
      feeSelectionMode: "semester",
    });
    if (!guard.ok) {
      await editMessageTextHtml(
        chatId,
        messageId,
        `<b>Cannot start payment</b>\n\n${escapeHtml(guard.error)}`,
        mainMenuKeyboard(),
      );
      return;
    }

    const payment = await createPendingPayment({
      studentId: student.id,
      programmeCode: code,
      year,
      semester,
      rail: PaymentRail.telegram,
    });

    const wallet = payment.destinationWallet || defaultTonWallet();
    const memo = payment.memo;
    const tonLink = tonTransferUrl(wallet, payment.tonAmount, memo);
    const receiptUrl = absoluteUrl(`/receipt/${payment.id}`);

    const payLines = [
      "<b>TON payment</b>",
      "",
      `Send <b>${payment.tonAmount} TON</b> to:`,
      `<code>${escapeHtml(wallet)}</code>`,
      "",
      `<b>Memo / comment:</b> <code>${escapeHtml(memo)}</code>`,
      "",
      `After sending, tap <b>I have paid</b> to acknowledge. Confirmation is <b>automatic</b> once the chain transfer matches (memo ref or amount); your receipt unlocks when status is confirmed.`,
      "",
      `<a href="${escapeHtml(tonLink)}">Open TON Wallet (ton://)</a>`,
      receiptUrl.startsWith("http")
        ? `\n<a href="${escapeHtml(receiptUrl)}">View receipt page</a> (unlock when confirmed)`
        : "",
    ];

    const kb: ReplyMarkup = {
      inline_keyboard: [
        [{ text: "📲 Open TON transfer", url: tonLink }],
        [{ text: "✅ I have paid", callback_data: `dn:${payment.id}` }],
        ...(receiptUrl.startsWith("http")
          ? [[{ text: "🧾 Receipt (web)", url: receiptUrl }]]
          : []),
        [{ text: "« Main menu", callback_data: "m:mn" }],
      ],
    };

    await editMessageTextHtml(chatId, messageId, payLines.filter(Boolean).join("\n"), kb);
    return;
  }

  if (data.startsWith("dn:")) {
    const paymentId = data.slice(3);
    const pay = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { student: true },
    });
    if (!pay || pay.student.telegramId !== tg) {
      await editMessageTextHtml(
        chatId,
        messageId,
        "Payment not found for your account.",
        mainMenuKeyboard()
      );
      return;
    }
    const receiptToken = createReceiptAccessToken({
      id: pay.id,
      studentId: pay.studentId,
      confirmedAt: pay.confirmedAt,
    });
    const receiptQs = receiptToken ? `?t=${encodeURIComponent(receiptToken)}` : "";
    const receiptUrl = absoluteUrl(`/receipt/${pay.id}${receiptQs}`);
    const note = [
      "<b>Thanks — recorded</b>",
      "",
      `Payment <code>${escapeHtml(pay.id)}</code> is <b>${escapeHtml(pay.status)}</b>.`,
      pay.status === "pending"
        ? "When funds land on-chain with the correct memo/amount, confirmation is automatic; your receipt will show the transaction hash."
        : "",
      receiptUrl.startsWith("http") ? `\n<a href="${escapeHtml(receiptUrl)}">Receipt</a>` : "",
    ]
      .filter(Boolean)
      .join("\n");
    await editMessageTextHtml(chatId, messageId, note, mainMenuKeyboard());
    return;
  }

  await editMessageTextHtml(
    chatId,
    messageId,
    "Unknown action. Open the menu:",
    mainMenuKeyboard()
  );
}
