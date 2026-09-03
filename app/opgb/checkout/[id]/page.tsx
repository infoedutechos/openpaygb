import { MerchantCheckoutClient } from "@/components/opgb/MerchantCheckoutClient";

export default async function MerchantCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="min-h-[70vh] px-4 py-10">
      <MerchantCheckoutClient chargeId={id} />
    </main>
  );
}
