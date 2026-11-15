import { connection } from "next/server";
import ScheduleGuide from "@/components/ScheduleGuide";
import { getEpg } from "@/lib/sources";
import { todayPyt } from "@/lib/types";

// This page depends on the current time, so it renders at request time.
export const instant = false;

export default async function SchedulePage() {
  // "Today" depends on the current time, so this page renders per request.
  await connection();
  const date = todayPyt();
  const [kctv, sports, ryongnamsan] = await Promise.all([
    getEpg("kctv", date),
    getEpg("sports", date),
    getEpg("ryongnamsan", date),
  ]);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Full Programme Guide</h1>
        <p className="mt-1 text-sm text-zinc-400">
          The complete schedule for every TV channel — KCTV, Athletic TV, Ryongnamsan TV and Mansudae TV —
          with English and Korean titles. Pick a date to see that day&apos;s guide.
        </p>
      </div>
      <ScheduleGuide initialDate={date} initial={{ kctv, sports, ryongnamsan }} />
    </div>
  );
}
