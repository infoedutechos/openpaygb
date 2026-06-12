"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { RequestSchoolWorkspaceCta } from "@/components/tuition/RequestSchoolWorkspaceCta";
import { SchoolCheckoutBanner } from "@/components/pay/SchoolCheckoutBanner";

function CheckoutLoading() {
  return (
    <div className="mx-auto min-h-[40vh] max-w-lg px-4 pt-12 text-center text-sm text-slate-500">
      Loading checkout…
    </div>
  );
}

const TenantList = dynamic(
  () => import("@/components/tuition/TenantList").then((m) => ({ default: m.TenantList })),
  { loading: () => null },
);

const PayWizard = dynamic(() => import("./PayWizard").then((m) => ({ default: m.PayWizard })), {
  ssr: false,
  loading: () => <CheckoutLoading />,
});

import type { InstitutionTier } from "@prisma/client";

export function PayCheckoutClient({
  organizationSlug,
  organizationName,
  institutionTier = "university",
}: {
  organizationSlug: string;
  organizationName: string;
  institutionTier?: InstitutionTier;
}) {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <div className="mx-auto max-w-lg space-y-4 px-4 pt-4">
        <SchoolCheckoutBanner
          organizationName={organizationName}
          organizationSlug={organizationSlug}
        />
        <TenantList
          variant="compact"
          currentSlug={organizationSlug}
          title="Other schools"
          description="Tap another school to open its checkout."
        />
        <RequestSchoolWorkspaceCta variant="inline" className="!text-left" />
      </div>
      <PayWizard
        organizationSlug={organizationSlug}
        organizationName={organizationName}
        institutionTier={institutionTier}
      />
    </Suspense>
  );
}
