import { headers } from "next/headers";
import { StandaloneAppProvider } from "@/components/standalone/StandaloneAppProvider";
import { StandaloneAppTopBar } from "@/components/standalone/StandaloneAppTopBar";
import { parseStandaloneAppId, standaloneAppById } from "@/lib/standalone-apps";

export async function StandaloneAppRoot({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const appId = parseStandaloneAppId(h.get("x-standalone-app"));
  const app = appId ? standaloneAppById(appId) : null;

  return (
    <StandaloneAppProvider value={{ appId, app }}>
      {app ? <StandaloneAppTopBar app={app} /> : null}
      {children}
    </StandaloneAppProvider>
  );
}
