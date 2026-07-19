import { PageBackLink } from "@/components/nav/PageBackLink";

/** Standard back control for Dex Hub leaf pages. */
export function DexPageBack({ label = "Dex Hub" }: { label?: string }) {
  return (
    <div className="mb-4">
      <PageBackLink href="/dex" label={label} />
    </div>
  );
}
