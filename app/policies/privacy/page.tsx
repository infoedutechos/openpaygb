import type { Metadata } from "next";
import { PlatformPolicyDocument } from "@/components/policies/PlatformPolicyDocument";
import { PLATFORM_PRIVACY } from "@/lib/platform-policy-content";

export const metadata: Metadata = {
  title: "Platform Privacy Policy",
  description: PLATFORM_PRIVACY.summary,
};

export default function PlatformPrivacyPage() {
  return <PlatformPolicyDocument policy={PLATFORM_PRIVACY} />;
}
