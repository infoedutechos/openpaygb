import { DEPLOYMENT_ENV_GROUPS, type EnvGroupDefinition, type EnvVarDefinition } from "@/lib/deployment-env-registry";
import { listDeploymentEnvOverrideNames } from "@/lib/deployment-env-overrides";
import { deploymentEnv, warmDeploymentEnvCache } from "@/lib/deployment-env-resolve";
import { isProductionRuntime } from "@/lib/production-secrets";
import { isLivePayConfigured } from "@/lib/livepay/client";
import { getLivePayWebhookUrl } from "@/lib/livepay/webhook-url";
import { isRelworxConfigured } from "@/lib/relworx/client";
import { getRelworxWebhookUrl } from "@/lib/relworx/webhook-url";

export type EnvVarSource = "dashboard" | "process" | "unset";

export type EnvVarStatus = {
  name: string;
  label: string;
  description: string;
  sensitive: boolean;
  requirement: EnvVarDefinition["requirement"];
  set: boolean;
  source: EnvVarSource;
  maskedPreview: string | null;
  missingInProduction: boolean;
};

export type EnvGroupStatus = {
  id: string;
  title: string;
  description: string;
  docsPath?: string;
  masterUiAnchor?: string;
  configured: boolean;
  healthy: boolean | null;
  healthNote: string | null;
  webhookUrl: string | null;
  vars: EnvVarStatus[];
};

export type DeploymentEnvSummary = {
  production: boolean;
  appUrl: string | null;
  totalVars: number;
  setVars: number;
  dashboardOverrides: number;
  missingProduction: number;
  groupsReady: number;
  groupsTotal: number;
};

export type DeploymentEnvStatus = {
  summary: DeploymentEnvSummary;
  groups: EnvGroupStatus[];
  probedAt: string | null;
};

function envValue(name: string): string {
  return deploymentEnv(name);
}

function isSet(name: string): boolean {
  return Boolean(envValue(name));
}

function resolveSource(name: string, dashboardNames: Set<string>): EnvVarSource {
  if (dashboardNames.has(name)) return "dashboard";
  if (process.env[name]?.trim()) return "process";
  return envValue(name) ? "process" : "unset";
}

function maskValue(value: string, sensitive: boolean): string | null {
  if (!value) return null;
  if (!sensitive) {
    if (value.length <= 48) return value;
    return `${value.slice(0, 24)}…${value.slice(-8)}`;
  }
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function varStatus(def: EnvVarDefinition, dashboardNames: Set<string>): EnvVarStatus {
  const raw = envValue(def.name);
  const set = Boolean(raw);
  const source = set ? resolveSource(def.name, dashboardNames) : "unset";
  const missingInProduction =
    isProductionRuntime() &&
    def.requirement === "production" &&
    !set;
  return {
    name: def.name,
    label: def.label,
    description: def.description,
    sensitive: def.sensitive,
    requirement: def.requirement,
    set,
    source,
    maskedPreview: set ? maskValue(raw, def.sensitive) : null,
    missingInProduction,
  };
}

function groupConfigured(group: EnvGroupDefinition, vars: EnvVarStatus[]): boolean {
  const required = vars.filter((v) => v.requirement === "always");
  if (required.length > 0) return required.every((v) => v.set);
  return vars.some((v) => v.set);
}

function groupWebhookUrl(id: string): string | null {
  const appUrl = deploymentEnv("NEXT_PUBLIC_APP_URL") || "https://your-domain";
  switch (id) {
    case "livepay":
      return getLivePayWebhookUrl();
    case "relworx":
      return getRelworxWebhookUrl();
    case "mbiyo":
      return `${appUrl.replace(/\/$/, "")}/api/webhooks/mbiyo`;
    case "momo":
      return `${appUrl.replace(/\/$/, "")}/api/webhooks/momo`;
    default:
      return null;
  }
}

function defaultGroupHealth(id: string): { healthy: boolean | null; note: string | null } {
  switch (id) {
    case "core": {
      const ok = isSet("DATABASE_URL") && isSet("JWT_SECRET") && isSet("NEXT_PUBLIC_APP_URL");
      return { healthy: ok, note: ok ? null : "Set DATABASE_URL, JWT_SECRET, and NEXT_PUBLIC_APP_URL." };
    }
    case "checkout-fx": {
      const ok = isSet("ODELHUB_TON_WALLET_ADDRESS");
      return { healthy: ok, note: ok ? null : "Set ODELHUB_TON_WALLET_ADDRESS for TON checkout." };
    }
    case "livepay": {
      const configured = isLivePayConfigured();
      const webhook = isSet("LIVEPAY_WEBHOOK_SECRET");
      return {
        healthy: configured ? (isProductionRuntime() ? webhook : true) : null,
        note: configured
          ? isProductionRuntime() && !webhook
            ? "LivePay collect works; set LIVEPAY_WEBHOOK_SECRET for production webhooks."
            : null
          : "Optional — set LIVEPAY_API_KEY and LIVEPAY_ACCOUNT_NUMBER to enable.",
      };
    }
    case "relworx": {
      const configured = isRelworxConfigured();
      const webhook = isSet("RELWORX_WEBHOOK_KEY") || isSet("RELWORX_WEBHOOK_SECRET");
      const disabled = deploymentEnv("RELWORX_ENABLED") === "false";
      return {
        healthy: configured && !disabled ? (isProductionRuntime() ? webhook : true) : null,
        note: disabled
          ? "RELWORX_ENABLED=false hides the rail."
          : configured
            ? isProductionRuntime() && !webhook
              ? "Set RELWORX_WEBHOOK_KEY for production webhook verification."
              : null
            : "Optional — set RELWORX_API_KEY and RELWORX_ACCOUNT_NO to enable.",
      };
    }
    case "mbiyo": {
      const active = isSet("MBIYO_SECRET_KEY") && isSet("MBIYO_WEBHOOK_SECRET");
      return {
        healthy: active ? true : null,
        note: active ? null : "Optional — set MBIYO_SECRET_KEY and MBIYO_WEBHOOK_SECRET.",
      };
    }
    case "momo": {
      const active = isSet("MOMO_WEBHOOK_SECRET");
      return { healthy: active ? true : null, note: active ? null : "Optional MoMo bridge." };
    }
    case "ton": {
      const cronOk = !isProductionRuntime() || isSet("CRON_SECRET");
      return {
        healthy: cronOk,
        note: cronOk ? null : "CRON_SECRET required in production for /api/cron/*.",
      };
    }
    case "email": {
      const hasProvider = isSet("BREVO_API_KEY") || isSet("RESEND_API_KEY");
      const hasFrom =
        isSet("TRANSACTIONAL_EMAIL_FROM") || isSet("RESEND_FROM") || isSet("BREVO_FROM");
      const ok = !isProductionRuntime() || (hasProvider && hasFrom);
      return {
        healthy: ok,
        note: ok
          ? null
          : "BREVO_API_KEY or RESEND_API_KEY plus TRANSACTIONAL_EMAIL_FROM (or RESEND_FROM) required in production.",
      };
    }
    default:
      return { healthy: null, note: null };
  }
}

async function probeRelworxApi(): Promise<string | null> {
  if (!isRelworxConfigured()) return null;
  const accountNo = envValue("RELWORX_ACCOUNT_NO");
  const apiKey = envValue("RELWORX_API_KEY");
  const qs = new URLSearchParams({ account_no: accountNo, internal_reference: "deployment-env-probe" });
  try {
    const res = await fetch(
      `https://payments.relworx.com/api/mobile-money/check-request-status?${qs}`,
      {
        headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/vnd.relworx.v2" },
        cache: "no-store",
      },
    );
    const text = await res.text();
    if (/API_DISABLED|API disabled for this account/i.test(text)) {
      return "Relworx API disabled for this business account — contact Relworx support.";
    }
    if (res.status === 401) return "Relworx rejected API key (401).";
    if (res.status === 403 && /IP|allowlist/i.test(text)) {
      return "Relworx IP not allowlisted — add server public IP in Business Account → API Authorized IPs.";
    }
    if (res.status >= 200 && res.status < 500) return null;
    return `Relworx API probe returned ${res.status}.`;
  } catch {
    return "Could not reach Relworx API (network).";
  }
}

async function probeLivePayApi(): Promise<string | null> {
  if (!isLivePayConfigured()) return null;
  return null;
}

export async function getDeploymentEnvStatus(opts?: { probe?: boolean }): Promise<DeploymentEnvStatus> {
  await warmDeploymentEnvCache();
  const dashboardMeta = await listDeploymentEnvOverrideNames();
  const dashboardNames = new Set(dashboardMeta.map((m) => m.name));

  const groups: EnvGroupStatus[] = DEPLOYMENT_ENV_GROUPS.map((group) => {
    const vars = group.vars.map((v) => varStatus(v, dashboardNames));
    const health = defaultGroupHealth(group.id);
    return {
      id: group.id,
      title: group.title,
      description: group.description,
      docsPath: group.docsPath,
      masterUiAnchor: group.masterUiAnchor,
      configured: groupConfigured(group, vars),
      healthy: health.healthy,
      healthNote: health.note,
      webhookUrl: groupWebhookUrl(group.id),
      vars,
    };
  });

  if (opts?.probe) {
    const relworxNote = await probeRelworxApi();
    if (relworxNote) {
      const g = groups.find((x) => x.id === "relworx");
      if (g) {
        g.healthy = false;
        g.healthNote = relworxNote;
      }
    }
    const livepayNote = await probeLivePayApi();
    if (livepayNote) {
      const g = groups.find((x) => x.id === "livepay");
      if (g) {
        g.healthy = false;
        g.healthNote = livepayNote;
      }
    }
  }

  const allVars = groups.flatMap((g) => g.vars);
  const setVars = allVars.filter((v) => v.set).length;
  const missingProduction = allVars.filter((v) => v.missingInProduction).length;
  const groupsReady = groups.filter((g) => g.healthy === true).length;

  return {
    summary: {
      production: isProductionRuntime(),
      appUrl: envValue("NEXT_PUBLIC_APP_URL") || null,
      totalVars: allVars.length,
      setVars,
      dashboardOverrides: dashboardNames.size,
      missingProduction,
      groupsReady,
      groupsTotal: groups.length,
    },
    groups,
    probedAt: opts?.probe ? new Date().toISOString() : null,
  };
}
