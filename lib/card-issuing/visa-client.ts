import "server-only";

import https from "node:https";
import { readFileSync } from "node:fs";
import { deploymentEnv } from "@/lib/deployment-env-resolve";
import type { IssueNetworkCardInput, IssueNetworkCardResult } from "@/lib/card-issuing/types";

function visaBaseUrl(): string {
  const env = deploymentEnv("VISA_ENV").toLowerCase();
  if (env === "production" || env === "prod") return "https://api.visa.com";
  return deploymentEnv("VISA_API_BASE_URL") || "https://sandbox.api.visa.com";
}

function loadPem(envPath: string, envInline: string): string | null {
  const inline = deploymentEnv(envInline).trim();
  if (inline) return inline.replace(/\\n/g, "\n");
  const path = deploymentEnv(envPath).trim();
  if (!path) return null;
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function visaHttpsAgent(): https.Agent | null {
  const cert = loadPem("VISA_CERT_PATH", "VISA_CERT_PEM");
  const key = loadPem("VISA_KEY_PATH", "VISA_KEY_PEM");
  if (!cert || !key) return null;
  const ca = loadPem("VISA_CA_PATH", "VISA_CA_PEM") || undefined;
  return new https.Agent({
    cert,
    key,
    ca,
    rejectUnauthorized: deploymentEnv("VISA_TLS_INSECURE") !== "1",
  });
}

function basicAuthHeader(): string {
  const user = deploymentEnv("VISA_USER_ID");
  const pass = deploymentEnv("VISA_PASSWORD");
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
}

function httpsJson(
  method: string,
  urlStr: string,
  body: unknown | null,
  agent: https.Agent,
): Promise<{ status: number; text: string; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const payload = body == null ? null : JSON.stringify(body);
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        agent,
        headers: {
          Accept: "application/json",
          Authorization: basicAuthHeader(),
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let json: Record<string, unknown> = {};
          try {
            json = JSON.parse(text) as Record<string, unknown>;
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode || 0, text, json });
        });
      },
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Visa Developer Platform hello-world / connectivity probe (mTLS + Basic).
 * Full VCPE / DPS issuance requires a BIN-sponsor program — this validates your developer.visa.com project.
 */
export async function visaVdpHelloWorld(): Promise<{ ok: boolean; status: number; body: string }> {
  const agent = visaHttpsAgent();
  if (!agent) {
    throw new Error("Visa mTLS cert/key missing (VISA_CERT_PATH or VISA_CERT_PEM + key).");
  }
  const { status, text } = await httpsJson("GET", `${visaBaseUrl()}/vdp/helloworld`, null, agent);
  return { ok: status >= 200 && status < 300, status, body: text.slice(0, 2000) };
}

/**
 * Issue (or enroll) a network card via Visa partner APIs.
 * Default path calls optional VISA_ISSUE_PATH (program-specific). Without it, returns a clear config error.
 */
export async function visaVdpIssueCard(input: IssueNetworkCardInput): Promise<IssueNetworkCardResult> {
  const path = deploymentEnv("VISA_ISSUE_PATH").trim();
  if (!path) {
    throw new Error(
      "VISA_ISSUE_PATH not set. After BIN-sponsor approval, set the VCPE/DPS path from your Visa project " +
        "(e.g. /vcpe/v2/pan/enrollment). Use LivePay issuing as an interim BIN partner.",
    );
  }

  const agent = visaHttpsAgent();
  if (!agent) {
    throw new Error("Visa mTLS cert/key missing.");
  }

  const url = `${visaBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const payload = {
    updateReferenceID: input.clientReference.slice(0, 36),
    operationType: "UPDATE",
    enrollmentInfo: {
      cardholderInfo: {
        firstName: input.holderName.split(/\s+/)[0] || input.holderName,
        lastName: input.holderName.split(/\s+/).slice(1).join(" ") || "Cardholder",
        email: input.email,
        phone: input.phoneE164,
      },
      meta: {
        studentId: input.studentId,
        organizationId: input.organizationId,
        currency: input.currency || "UGX",
      },
    },
  };

  const { status, json } = await httpsJson("POST", url, payload, agent);
  if (status < 200 || status >= 300) {
    const msg =
      (typeof json.message === "string" && json.message) ||
      (typeof json.responseStatus === "object" &&
        json.responseStatus &&
        typeof (json.responseStatus as { message?: string }).message === "string" &&
        (json.responseStatus as { message: string }).message) ||
      `Visa issue failed (${status})`;
    throw new Error(msg);
  }

  const providerCardId =
    (typeof json.cardId === "string" && json.cardId) ||
    (typeof json.updateReferenceID === "string" && json.updateReferenceID) ||
    input.clientReference;
  const last4 =
    (typeof json.last4 === "string" && json.last4) ||
    (typeof json.lastFour === "string" && json.lastFour) ||
    "****";

  return {
    provider: "visa_vdp",
    providerCardId,
    last4: last4.replace(/\D/g, "").slice(-4) || "****",
    network: "visa",
    status: "pending",
    providerToken: typeof json.token === "string" ? json.token : undefined,
    rawMessage: "Submitted to Visa partner API",
  };
}
