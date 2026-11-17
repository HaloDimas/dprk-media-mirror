import RadioStations from "@/components/RadioStations";
import { T } from "@/i18n/T";

export const metadata = {
  title: "Radio — DPRK Media Mirror",
  description: "KCBS, KCBS-2 and Pyongyang FM, streaming live on this site.",
};

export default function RadioPage() {
  return (
    // pb-28: room for the fixed Now Playing bar so it never covers the footer.
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
          <T k="radio.title" />
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <T k="radio.intro" />
        </p>
      </div>
      <RadioStations />
      <p className="text-xs text-zinc-500">
        <T k="radio.note" />
      </p>
    </div>
  );
}
