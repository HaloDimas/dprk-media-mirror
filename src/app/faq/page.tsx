import type { Metadata } from "next";
import FaqContent from "@/components/FaqContent";

export const metadata: Metadata = {
  title: "FAQ — DPRK Media Mirror",
  description: "Frequently asked questions about the DPRK Media Mirror.",
};

export default function FaqPage() {
  return <FaqContent />;
}
