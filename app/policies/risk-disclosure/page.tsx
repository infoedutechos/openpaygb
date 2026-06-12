import type { Metadata } from "next";
import { PlatformPolicyDocument } from "@/components/policies/PlatformPolicyDocument";
import { PLATFORM_RISK_DISCLOSURE } from "@/lib/platform-policy-content";

export const metadata: Metadata = {
  title: "Risk Disclosure",
  description: PLATFORM_RISK_DISCLOSURE.summary,
};

export default function PlatformRiskDisclosurePage() {
  return <PlatformPolicyDocument policy={PLATFORM_RISK_DISCLOSURE} />;
}
