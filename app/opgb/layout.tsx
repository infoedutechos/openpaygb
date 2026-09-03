import type { ReactNode } from "react";

/** Passthrough — lobby chrome is on the page; checkout uses its own layout (no Dex gate). */
export default function OpgbRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
