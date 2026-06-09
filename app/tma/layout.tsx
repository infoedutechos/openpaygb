import { HubMaintenanceGate } from "@/components/hub/HubMaintenanceGate";
import Script from "next/script";
import "./tma.css";

export const metadata = {
  title: "ODEL HUB Pay",
  description: "OpenPayGB tuition, wallet, and virtual cards — Telegram Mini App",
};

export default function TmaLayout({ children }: { children: React.ReactNode }) {
  return (
    <HubMaintenanceGate hub="tuition">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </HubMaintenanceGate>
  );
}
