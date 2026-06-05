import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import { SETTINGS_KEYS } from "./settingKeys";
import { SettingsContext } from "./settingsContext";
import type {
  Theme,
  TextScale,
  MotionPreference,
  ContrastLevel,
  SettingsContextValue,
  NavigationBehavior,
  ReviewBehavior,
  PrimaryColumnBehavior,
} from "./settingsTypes";

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

  useEffect(() => {
    const syncFromDom = () => {
      const domTheme = document.documentElement.getAttribute(
        "data-theme"
      ) as Theme;
      const domContrast = document.documentElement.getAttribute(
        "data-contrast"
      ) as ContrastLevel;

      if (domTheme && domTheme !== theme) setTheme(domTheme);
      if (domContrast && domContrast !== contrast) setContrast(domContrast);
    };

    window.addEventListener("appearancechange", syncFromDom);

    return () => window.removeEventListener("appearancechange", syncFromDom);
  }, [theme, contrast]);

  // THEME
  const [navigationBehavior, setNavigationBehavior] =
    useState<NavigationBehavior>(
      () =>
        (localStorage.getItem(
          SETTINGS_KEYS.NAVIGATION_BEHAVIOR
        ) as NavigationBehavior) || "hover"
    );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-navigation-behavior",
      navigationBehavior
    );
    localStorage.setItem(SETTINGS_KEYS.NAVIGATION_BEHAVIOR, navigationBehavior);
    window.dispatchEvent(new Event("navigationbehaviorchange"));
  }, [navigationBehavior]);

  const [reviewBehavior, setReviewBehavior] = useState<ReviewBehavior>(
    () =>
      (localStorage.getItem(SETTINGS_KEYS.REVIEW_BEHAVIOR) as ReviewBehavior) ||
      "inline"
  );
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-review-behavior",
      reviewBehavior
    );
    localStorage.setItem(SETTINGS_KEYS.REVIEW_BEHAVIOR, reviewBehavior);
    window.dispatchEvent(new Event("reviewbehaviorchange"));
  }, [reviewBehavior]);

  const [primaryColumnBehavior, setPrimaryColumnBehavior] =
    useState<PrimaryColumnBehavior>(
      () =>
        (localStorage.getItem(
          SETTINGS_KEYS.PRIMARY_COLUMN_BEHAVIOR
        ) as PrimaryColumnBehavior) || "separate"
    );
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-primary-column-behavior",
      primaryColumnBehavior
    );
    localStorage.setItem(
      SETTINGS_KEYS.PRIMARY_COLUMN_BEHAVIOR,
      primaryColumnBehavior
    );
    window.dispatchEvent(new Event("primarycolumnbehaviorchange"));
  }, [primaryColumnBehavior]);

  const [selectedPrimaryColumn, setSelectedPrimaryColumn] = useState<
    "accepted" | "rejected"
  >(() => {
    const saved = localStorage.getItem(SETTINGS_KEYS.SELECTED_PRIMARY_COLUMN);
    return saved === "accepted" || saved === "rejected" ? saved : "accepted";
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-selected-primary-column",
      selectedPrimaryColumn
    );
    localStorage.setItem(
      SETTINGS_KEYS.SELECTED_PRIMARY_COLUMN,
      selectedPrimaryColumn
    );
    window.dispatchEvent(new Event("selectedprimarycolumnchange"));
  }, [selectedPrimaryColumn]);

  const value: SettingsContextValue = {
    theme,
    setTheme,
    textScale,
    setTextScale,
    motion,
    setMotion,
    contrast,
    setContrast,
    navigationBehavior,
    setNavigationBehavior,
    reviewBehavior,
    setReviewBehavior,
    primaryColumnBehavior,
    setPrimaryColumnBehavior,
    selectedPrimaryColumn,
    setSelectedPrimaryColumn,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
