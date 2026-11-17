"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, type Language } from "@/i18n/types";
import { DICTS, useLanguage } from "@/i18n/LanguageContext";
import { T } from "@/i18n/T";
import EpgLangSwitch from "@/components/EpgLangSwitch";
import {
  getFullscreenBlur,
  getNavAppearance,
  getTheme,
  getWatchTimeEnabled,
  setFullscreenBlur,
  setNavAppearance,
  setThemePreference,
  setWatchTimeEnabled,
  SETTINGS_CHANGED_EVENT,
  THEME_CHANGED_EVENT,
  type NavAppearance,
  type Theme,
} from "@/lib/settings";
import {
  clearWatchStats,
  formatWatchDuration,
  getWatchStats,
  type WatchTotals,
} from "@/lib/watchtime";
import { CHANNELS, RADIO_STATIONS } from "@/lib/types";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="section-title text-lg">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  desc,
  control,
}: {
  label: string;
  desc?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</p>
        {desc && <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{desc}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
            value === o.id
              ? "bg-red-700 text-white"
              : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-red-700" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** All watchable/listenable ids, in display order: TV then radio. */
const WATCH_IDS: { id: string; name: string; korean: string }[] = [
  ...CHANNELS.filter((c) => c.kind === "tv").map((c) => ({
    id: c.id,
    name: c.name,
    korean: c.korean,
  })),
  ...RADIO_STATIONS.map((s) => ({ id: s.hls, name: s.name, korean: s.korean })),
];

/** /settings body — every control reads and writes the same localStorage
 *  keys the header controls use (theme, language), so there is exactly
 *  one source of truth per setting. */
export default function SettingsContent() {
  const { lang, setLang, t } = useLanguage();
  const [theme, setTheme] = useState<Theme>("dark");
  const [watchEnabled, setWatchEnabled] = useState(true);
  const [blur, setBlur] = useState(true);
  const [nav, setNav] = useState<NavAppearance>("frosted");
  const [stats, setStats] = useState<WatchTotals[]>([]);
  const [statsTick, setStatsTick] = useState(0);

  // Theme: the header ThemeToggle owns the same key; sync both ways
  // through the shared setter + theme-changed event.
  useEffect(() => {
    setTheme(getTheme());
    const onTheme = () => setTheme(getTheme());
    window.addEventListener(THEME_CHANGED_EVENT, onTheme);
    return () => window.removeEventListener(THEME_CHANGED_EVENT, onTheme);
  }, []);

  // Other settings: read on mount and whenever any setting changes.
  useEffect(() => {
    const refresh = () => {
      setWatchEnabled(getWatchTimeEnabled());
      setBlur(getFullscreenBlur());
      setNav(getNavAppearance());
    };
    refresh();
    window.addEventListener(SETTINGS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, refresh);
  }, []);

  // Watch-time stats: read on mount, when tracking/clearing changes,
  // and when the tab regains focus (playback happens on other pages).
  const refreshStats = useCallback(() => {
    setStats(getWatchStats(WATCH_IDS.map((w) => w.id)));
  }, []);
  useEffect(() => {
    refreshStats();
  }, [refreshStats, statsTick]);
  useEffect(() => {
    const onFocus = () => setStatsTick((v) => v + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const dict = DICTS[lang].settings;
  const hasAnyStats = stats.some((s) => s.all > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        <T k="settings.title" />
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        <T k="settings.intro" />
      </p>

      <Section title={dict.appearance}>
        <Row
          label={dict.themeLabel}
          desc={dict.themeDesc}
          control={
            <Segmented<Theme>
              ariaLabel={dict.themeLabel}
              value={theme}
              onChange={(v) => setThemePreference(v)}
              options={[
                { id: "dark", label: dict.themeDark },
                { id: "light", label: dict.themeLight },
              ]}
            />
          }
        />
        <Row
          label={dict.languageLabel}
          desc={dict.languageDesc}
          control={
            <Segmented<Language>
              ariaLabel={dict.languageLabel}
              value={lang}
              onChange={(v) => setLang(v)}
              options={LANGUAGES.map((l) => ({ id: l.code, label: l.nativeName }))}
            />
          }
        />
      </Section>

      <Section title={dict.playback}>
        <Row
          label={dict.watchTimeLabel}
          desc={dict.watchTimeDesc}
          control={
            <Switch
              on={watchEnabled}
              onChange={(v) => {
                setWatchTimeEnabled(v);
                setWatchEnabled(v);
              }}
              label={dict.watchTimeLabel}
            />
          }
        />
        <Row
          label={dict.fullscreenBlurLabel}
          desc={dict.fullscreenBlurDesc}
          control={
            <Switch
              on={blur}
              onChange={(v) => {
                setFullscreenBlur(v);
                setBlur(v);
              }}
              label={dict.fullscreenBlurLabel}
            />
          }
        />
      </Section>

      <Section title={dict.guide}>
        <Row
          label={dict.epgLabel}
          desc={dict.epgDesc}
          control={<EpgLangSwitch />}
        />
      </Section>

      <Section title={dict.navigation}>
        <Row
          label={dict.navAppearanceLabel}
          desc={dict.navAppearanceDesc}
          control={
            <Segmented<NavAppearance>
              ariaLabel={dict.navAppearanceLabel}
              value={nav}
              onChange={(v) => {
                setNavAppearance(v);
                setNav(v);
              }}
              options={[
                { id: "classic", label: dict.navClassic },
                { id: "frosted", label: dict.navFrosted },
              ]}
            />
          }
        />
        <p className="text-xs leading-relaxed text-zinc-500">
          {nav === "classic" ? dict.navClassicDesc : dict.navFrostedDesc}
        </p>
      </Section>

      <Section title={dict.statsTitle}>
        <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{dict.statsIntro}</p>
        {!watchEnabled && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {dict.statsOffNote}
          </p>
        )}
        {hasAnyStats ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-100/70 text-left dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-300">{dict.statsChannel}</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-300">{dict.statsToday}</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-300">{dict.stats7}</th>
                  <th className="px-3 py-2 text-right font-semibold text-zinc-700 dark:text-zinc-300">{dict.statsAll}</th>
                </tr>
              </thead>
              <tbody>
                {WATCH_IDS.map((w) => {
                  const s = stats.find((x) => x.id === w.id) ?? { id: w.id, today: 0, last7: 0, all: 0 };
                  return (
                    <tr key={w.id} className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800">
                      <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">
                        {w.name} <span className="text-xs text-zinc-500">{w.korean}</span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatWatchDuration(s.today)}</td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatWatchDuration(s.last7)}</td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-700 dark:text-zinc-300">{formatWatchDuration(s.all)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">{dict.statsNoData}</p>
        )}
        {hasAnyStats && (
          <div>
            <button
              type="button"
              onClick={() => {
                clearWatchStats();
                setStatsTick((v) => v + 1);
              }}
              className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {dict.statsClear}
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}
