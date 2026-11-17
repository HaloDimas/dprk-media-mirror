import type { Metadata } from "next";
import PrivacyContent from "@/components/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy — DPRK Media Mirror",
  description: "How DPRK Media Mirror handles your data.",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
