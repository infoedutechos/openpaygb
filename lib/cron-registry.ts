import "server-only";

export type CronJobDef = {
  id: string;
  path: string;
  schedule: string;
  scheduleLabel: string;
  description: string;
};

/** Mirrors vercel.json crons — source of truth for MAC ops panel. */
export const PLATFORM_CRON_JOBS: CronJobDef[] = [
  {
    id: "confirm-ton",
    path: "/api/cron/confirm-ton",
    schedule: "*/5 * * * *",
    scheduleLabel: "Every 5 minutes",
    description: "Confirm pending TON tuition payments via TonAPI",
  },
  {
    id: "expire-pending-payments",
    path: "/api/cron/expire-pending-payments",
    schedule: "0 * * * *",
    scheduleLabel: "Hourly",
    description: "Expire stale pending payments past TTL",
  },
  {
    id: "telegram-tuition-reminders",
    path: "/api/cron/telegram-tuition-reminders",
    schedule: "0 9 * * 1",
    scheduleLabel: "Mondays 09:00 UTC",
    description: "Send Telegram tuition-due reminders",
  },
  {
    id: "dex-settle",
    path: "/api/cron/dex-settle",
    schedule: "*/15 * * * *",
    scheduleLabel: "Every 15 minutes",
    description: "P2P auto-release and queued Dex buys",
  },
];
