import type { Metadata } from "next";
import TermsContent from "@/components/TermsContent";

export const metadata: Metadata = {
  title: "Terms & Conditions — DPRK Media Mirror",
  description: "Terms of use for the DPRK Media Mirror.",
};

export default function TermsPage() {
  return <TermsContent />;
}
