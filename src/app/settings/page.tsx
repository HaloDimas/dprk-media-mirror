import type { Metadata } from "next";
import SettingsContent from "@/components/SettingsContent";

export const metadata: Metadata = {
  title: "Settings | DPRK Media Mirror",
  description:
    "Appearance, playback, programme guide and navigation settings for the DPRK Media Mirror. Stored only in your browser.",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-6 sm:px-4">
      <SettingsContent />
    </main>
  );
}
