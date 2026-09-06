"use client";

import { usePathname } from "next/navigation";
import PlatformCopilotChat from "@/components/platform/PlatformCopilotChat";
import {
  platformAssistVisibleOnPath,
  platformHubFromPathname,
} from "@/lib/platform-hub-from-path";

/** App-wide KB copilot (notifications live on dashboard shells, not global landing chrome). */
export default function PlatformAssistShell() {
  const pathname = usePathname() ?? "/";
  if (!platformAssistVisibleOnPath(pathname)) return null;

  const hub = platformHubFromPathname(pathname);
  const chatTitle =
    hub === "tuition"
      ? "Tuition Help"
      : hub === "admin"
        ? "Admin Help"
        : hub === "play"
          ? "URAPearls Help"
          : "ODELPay HUB Help";

  return <PlatformCopilotChat hub={hub} title={chatTitle} placement="landing" />;
}
