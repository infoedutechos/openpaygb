"use client";

import PlatformNotificationBell from "@/components/platform/PlatformNotificationBell";
import type { PlatformHub } from "@/lib/knowledge-base/types";

/** Notifications bell for dashboard shells (admin, student, staff, developers, master). */
export function DashboardNotificationBell({ hub }: { hub: PlatformHub }) {
  return <PlatformNotificationBell hub={hub} placement="inline" />;
}
