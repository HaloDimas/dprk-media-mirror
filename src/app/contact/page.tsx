import type { Metadata } from "next";
import ContactContent from "@/components/ContactContent";

export const metadata: Metadata = {
  title: "Contact — DPRK Media Mirror",
  description: "How to reach the operator of the DPRK Media Mirror.",
};

export default function ContactPage() {
  return <ContactContent />;
}
