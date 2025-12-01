import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { SETTINGS_KEYS } from "./settingKeys";
import type {
  Theme,
  TextScale,
  MotionPreference,
  ContrastLevel,
  SettingsContextValue,
} from "./settingsTypes";

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // THEME
  const [theme, setTheme] = useState<Theme>(
    () =>
      (localStorage.getItem(SETTINGS_KEYS.THEME) as Theme) ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark")
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(SETTINGS_KEYS.THEME, theme);
    window.dispatchEvent(new Event("appearancechange"));
  }, [theme]);

  // TEXT SCALE
  const [textScale, setTextScale] = useState<TextScale>(
    () =>
      (localStorage.getItem(SETTINGS_KEYS.TEXT_SCALE) as TextScale) || "default"
  );

  useEffect(() => {
    const scale =
      textScale === "small" ? "0.85" : textScale === "large" ? "1.15" : "1";
    document.documentElement.style.setProperty("--text-scale", scale);
    localStorage.setItem(SETTINGS_KEYS.TEXT_SCALE, textScale);
    window.dispatchEvent(new Event("textscalechange"));
  }, [textScale]);

  // MOTION
  const [motion, setMotion] = useState<MotionPreference>(
    () =>
      (localStorage.getItem(SETTINGS_KEYS.MOTION) as MotionPreference) ||
      "default"
  );

  useEffect(() => {
    const duration =
      motion === "slow" ? "0.4s" : motion === "fast" ? "0.1s" : "0.2s";
    document.documentElement.style.setProperty(
      "--animation-duration",
      duration
    );
    localStorage.setItem(SETTINGS_KEYS.MOTION, motion);
    window.dispatchEvent(new Event("motionchange"));
  }, [motion]);

  // CONTRAST
  const [contrast, setContrast] = useState<ContrastLevel>(
    () =>
      (localStorage.getItem(SETTINGS_KEYS.CONTRAST) as ContrastLevel) ||
      "default"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-contrast", contrast);
    localStorage.setItem(SETTINGS_KEYS.CONTRAST, contrast);
    window.dispatchEvent(new Event("appearancechange"));
  }, [contrast]);

  const value: SettingsContextValue = {
    theme,
    setTheme,
    textScale,
    setTextScale,
    motion,
    setMotion,
    contrast,
    setContrast,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx)
    throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
