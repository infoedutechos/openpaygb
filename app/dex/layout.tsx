import DexHubShell from "./DexHubShell";

/** Dex Hub shell: TonConnect + fixed bottom bar for onramp/offramp journeys. */
export default function DexLayout({ children }: { children: React.ReactNode }) {
  return <DexHubShell>{children}</DexHubShell>;
}
