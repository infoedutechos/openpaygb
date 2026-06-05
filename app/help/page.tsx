import type { Metadata } from "next";
import HelpCenterBrowse from "@/components/help/HelpCenterBrowse";

export const metadata: Metadata = {
  title: "Help center",
  description:
    "Browse ODEL HUB knowledge base articles for tuition payments, school admin, and URAPearls.",
};

export default function HelpCenterPage() {
  return <HelpCenterBrowse />;
}
