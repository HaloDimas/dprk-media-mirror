import { connection } from "next/server";
import ScheduleGuide from "@/components/ScheduleGuide";
import PyongyangClock from "@/components/PyongyangClock";
import EpgLangSwitch from "@/components/EpgLangSwitch";
import { getEpg } from "@/lib/sources";
import { todayPyt } from "@/lib/types";
import { T } from "@/i18n/T";

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            <T k="schedule.title" />
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            <T k="schedule.intro" />
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <PyongyangClock />
          <EpgLangSwitch />
        </div>
      </div>
      <ScheduleGuide initialDate={date} initial={{ kctv, sports, ryongnamsan }} />
    </div>
  );
}
