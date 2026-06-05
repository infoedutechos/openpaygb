"use client";

import { usePathname } from "next/navigation";
import PlatformCopilotChat from "@/components/platform/PlatformCopilotChat";
import PlatformNotificationBell from "@/components/platform/PlatformNotificationBell";
import {
  platformAssistVisibleOnPath,
  platformHubFromPathname,
} from "@/lib/platform-hub-from-path";

/** App-wide KB copilot + server-backed notifications (hidden on Clicker — it uses header widgets). */
export default function PlatformAssistShell() {
  const pathname = usePathname() ?? "/";
  if (!platformAssistVisibleOnPath(pathname)) return null;

  const hub = platformHubFromPathname(pathname);
  const chatTitle =
    hub === "tuition" ? "Tuition Help" : hub === "admin" ? "Admin Help" : hub === "play" ? "URAPearls Help" : "ODEL HUB Help";

  return (
    <>
      <PlatformNotificationBell hub={hub} />
      <PlatformCopilotChat hub={hub} title={chatTitle} placement="landing" />
    </>
  );
}
