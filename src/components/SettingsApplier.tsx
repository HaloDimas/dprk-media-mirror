"use client";

import { useEffect } from "react";
import { applyNavAppearance, SETTINGS_CHANGED_EVENT } from "@/lib/settings";

/** Applies stored site-wide settings to <html> (currently the
 *  `nav-frosted` class) on mount and whenever a setting changes, so the
 *  header updates live when the choice is made on the Settings page. */
export default function SettingsApplier() {
  useEffect(() => {
    applyNavAppearance();
    const onChange = () => applyNavAppearance();
    window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
  }, []);
  return null;
}
