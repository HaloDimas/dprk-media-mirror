import type { Metadata } from "next";
import EulaContent from "@/components/EulaContent";

export const metadata: Metadata = {
  title: "End User License Agreement | DPRK Media Mirror",
  description:
    "End User License Agreement for the DPRK Media Mirror — a free, non-commercial mirror of DPRK media.",
};

export default function EulaPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      <div className="mx-auto max-w-3xl">
        <EulaContent />
      </div>
    </main>
  );
}
