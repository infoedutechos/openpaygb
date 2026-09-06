import { headers } from "next/headers";
import { ConditionalSiteTitleBar } from "@/components/ConditionalSiteTitleBar";

export async function ConditionalSiteTitleBarServer() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  return <ConditionalSiteTitleBar initialPathname={pathname} />;
}
