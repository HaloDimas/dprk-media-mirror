"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { T } from "@/i18n/T";

/** Live Pyongyang Time (UTC+9) clock, ticking every second. */
export default function PyongyangClock() {
  const [time, setTime] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      const d = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const p = (n: number) => String(n).padStart(2, "0");
      setTime(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="flex items-center gap-1.5 font-mono text-sm text-zinc-700 dark:text-zinc-300">
      <Clock className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
      <T k="schedule.pyongyangTimeNow" values={{ time }} />
      <span className="font-sans text-xs text-zinc-500">UTC+9</span>
    </p>
  );
}
