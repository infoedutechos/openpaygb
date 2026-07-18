import { ProductLineLanding } from "@/components/ecosystem/ProductLineLanding";

export const dynamic = "force-dynamic";

export default function OdelPayUniversitiesPage() {
  return (
    <ProductLineLanding
      lineId="odelpay_higher"
      tenantTier="university"
      tenantHeading="Universities & tertiary — pay tuition"
      tenantEmpty="No active higher-institution workspaces yet. Request one below or run npm run seed for the demo tenant."
    />
  );
}
