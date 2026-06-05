import DexHubShell from "./DexHubShell";

/** Dex Hub shell: fixed bottom bar for onramp/offramp journeys (TonConnect at root layout). */
export default function DexLayout({ children }: { children: React.ReactNode }) {
  return <DexHubShell>{children}</DexHubShell>;
}
