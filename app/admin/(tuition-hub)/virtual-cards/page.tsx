import { OpenPayCardsRegistryPanel } from "@/components/admin/OpenPayCardsRegistryPanel";
import { OPEN_PAY_BRAND } from "@/lib/open-pay-brand";

export default function AdminVirtualCardsPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-white">OpenPayGB Card</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          {OPEN_PAY_BRAND} cards issued to students in your school or institution workspace. Balances and top-ups update
          after on-chain or mobile-money confirmation.
        </p>
      </header>
      <OpenPayCardsRegistryPanel
        apiPath="/api/admin/openpay-cards"
        sectionId="admin-virtual-cards"
        showSchoolColumn={false}
        description="Cards for students and admins in your organization. Admin personal cards use programme ADMIN_CARD."
      />
    </div>
  );
}
