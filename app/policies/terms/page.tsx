import type { Metadata } from "next";
import { PlatformPolicyDocument } from "@/components/policies/PlatformPolicyDocument";
import { PLATFORM_TERMS } from "@/lib/platform-policy-content";

export const metadata: Metadata = {
  title: "Platform Terms of Service",
  description: PLATFORM_TERMS.summary,
};

export default function PlatformTermsPage() {
  return <PlatformPolicyDocument policy={PLATFORM_TERMS} />;
}
