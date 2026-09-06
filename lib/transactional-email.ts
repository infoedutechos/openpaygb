import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";

export type TransactionalEmailProvider = "brevo" | "resend" | "none";

export type SendTransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Log prefix e.g. `[receipt-email]` */
  logTag?: string;
};

/** Parse `ODELPay HUB <noreply@domain.com>` or plain `noreply@domain.com`. */
export function parseFromAddress(from: string): { name: string; email: string } {
  const trimmed = from.trim();
  const m = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: "ODELPay HUB", email: trimmed };
}

export function resolveTransactionalEmailProvider(opts: {
  emailProvider?: string;
  brevoApiKey?: string;
  resendApiKey?: string;
}): TransactionalEmailProvider {
  const mode = (opts.emailProvider ?? "auto").trim().toLowerCase();
  const hasBrevo = Boolean(opts.brevoApiKey?.trim());
  const hasResend = Boolean(opts.resendApiKey?.trim());

  if (mode === "brevo") return hasBrevo ? "brevo" : "none";
  if (mode === "resend") return hasResend ? "resend" : "none";
  if (hasBrevo) return "brevo";
  if (hasResend) return "resend";
  return "none";
}

export function transactionalEmailFromAddress(): string | null {
  const from =
    deploymentEnv("TRANSACTIONAL_EMAIL_FROM") ||
    deploymentEnv("RESEND_FROM") ||
    deploymentEnv("BREVO_FROM");
  return from?.trim() || null;
}

export function getTransactionalEmailConfig(): {
  provider: TransactionalEmailProvider;
  from: string | null;
  brevoApiKey: string | null;
  resendApiKey: string | null;
} {
  const brevoApiKey = deploymentEnv("BREVO_API_KEY")?.trim() || null;
  const resendApiKey = deploymentEnv("RESEND_API_KEY")?.trim() || null;
  const from = transactionalEmailFromAddress();
  const provider = resolveTransactionalEmailProvider({
    emailProvider: deploymentEnv("EMAIL_PROVIDER"),
    brevoApiKey: brevoApiKey ?? undefined,
    resendApiKey: resendApiKey ?? undefined,
  });
  return { provider, from, brevoApiKey, resendApiKey };
}

export function isTransactionalEmailConfigured(): boolean {
  const { provider, from } = getTransactionalEmailConfig();
  return provider !== "none" && Boolean(from);
}

async function sendViaBrevo(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<Response> {
  const sender = parseFromAddress(opts.from);
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": opts.apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: opts.to }],
      subject: opts.subject,
      htmlContent: opts.html,
      textContent: opts.text,
    }),
  });
}

async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<Response> {
  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
}

/**
 * Sends transactional mail via Brevo (preferred when `BREVO_API_KEY` is set) or Resend.
 * Set `EMAIL_PROVIDER=brevo|resend|auto` (default auto). From: `TRANSACTIONAL_EMAIL_FROM` or `RESEND_FROM`.
 */
export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<boolean> {
  await warmDeploymentEnvCache();
  const tag = input.logTag ?? "[email]";
  const { provider, from, brevoApiKey, resendApiKey } = getTransactionalEmailConfig();

  if (provider === "none" || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`${tag} Email provider not configured (BREVO_API_KEY or RESEND_API_KEY + from address)`);
    } else {
      console.error(`${tag} Transactional email not configured`);
    }
    return false;
  }

  let res: Response;
  if (provider === "brevo" && brevoApiKey) {
    res = await sendViaBrevo({
      apiKey: brevoApiKey,
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } else if (provider === "resend" && resendApiKey) {
    res = await sendViaResend({
      apiKey: resendApiKey,
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  } else {
    console.error(`${tag} Email provider misconfigured (${provider})`);
    return false;
  }

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error(tag, provider, res.status, err.slice(0, 500));
    return false;
  }
  return true;
}
