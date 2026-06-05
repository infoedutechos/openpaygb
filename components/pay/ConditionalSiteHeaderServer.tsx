import { headers } from "next/headers";
import { ConditionalSiteHeader } from "@/components/pay/ConditionalSiteHeader";

export async function ConditionalSiteHeaderServer() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  return <ConditionalSiteHeader initialPathname={pathname} />;
}
