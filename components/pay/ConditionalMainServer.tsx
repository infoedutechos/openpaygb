import { headers } from "next/headers";
import { ConditionalMain } from "@/components/pay/ConditionalMain";

export async function ConditionalMainServer({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";
  return <ConditionalMain initialPathname={pathname}>{children}</ConditionalMain>;
}
