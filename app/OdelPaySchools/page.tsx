import { ProductLineLanding } from "@/components/ecosystem/ProductLineLanding";

export const revalidate = 60;

export default function OdelPaySchoolsPage() {
  return (
    <ProductLineLanding
      lineId="odelpay_schools"
      tenantTier="school"
      tenantHeading="Primary & secondary schools — pay fees"
      tenantEmpty="No active school workspaces yet. Register at OdelPay — Schools to create a term-based fee workspace."
    />
  );
}
