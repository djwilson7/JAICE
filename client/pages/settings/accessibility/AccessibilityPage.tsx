// import { localfiles } from "@/directory/path/to/localimport";

import { useEffect, useState } from "react";
import {
  CardSection,
  SettingCard,
  ButtonRow,
  SettingButton,
  SettingHeader,
} from "@/pages/settings/accessibility/accessibility-components/Cards";

type TextScale = "Small" | "Default" | "Large";
type Theme = "Light" | "Dark";
type MotionPreference = "Low" | "Default" | "High";
type ContrastLevel = "Low" | "Default" | "High" | "NoColor";

const TEXT_SCALE_KEY = "TEXT_SCALE";
const THEME_KEY = "APP_THEME";
const MOTION_PREFERENCE_KEY = "MOTION_PREFERENCE";
const CONTRAST_LEVEL_KEY = "CONTRAST_LEVEL";

export function AccessibilityPage() {
  // ---------- TEXT SCALING SETTINGS ----------
  const textScaleOptions = {
    Small: { key: "Small", width: "w-1/3", fontSize: "0.85rem" },
    Default: { key: "Default", width: "w-1/3", fontSize: "1rem" },
    Large: { key: "Large", width: "w-1/3", fontSize: "1.15rem" },
  };

  const [textScale, setTextScale] = useState<TextScale>(() => {
    return (localStorage.getItem(TEXT_SCALE_KEY) as TextScale) || "Default";
  });

  useEffect(() => {
    const scale =
      textScale === "Small" ? 0.85 : textScale === "Large" ? 1.15 : 1;
    document.documentElement.style.setProperty("--text-scale", String(scale));
    localStorage.setItem(TEXT_SCALE_KEY, textScale);
  }, [textScale]);

  // ---------- THEME SETTINGS ----------
  const themeOptions = {
    Light: { key: "Light", width: "w-1/2", fontSize: "1rem" },
    Dark: { key: "Dark", width: "w-1/2", fontSize: "1rem" },
  };

  // --- THEME: initialize from localStorage or system preference
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = (localStorage.getItem(THEME_KEY) as Theme | null) ?? null;
    if (saved === "Light" || saved === "Dark") return saved;
    const prefersLight = window.matchMedia?.(
      "(prefers-color-scheme: light)"
    ).matches;
    return prefersLight ? "Light" : "Dark";
  });

  // --- Apply theme to <html data-theme="..."> and persist
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // --- Keep in sync if the OS theme changes (only if user hasn't chosen explicitly)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_KEY);
      if (!saved) setTheme(e.matches ? "Light" : "Dark");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  // ---------- MOTION REDUCTION SETTINGS ----------
  const [motionPreference, setMotionPreference] =
    useState<MotionPreference>(() => {
      return (
        (localStorage.getItem(MOTION_PREFERENCE_KEY) as MotionPreference) ||
        "Default"
      );
    });

  const motionOptions = {
    Low: { key: "Low", width: "w-1/3", fontSize: "1rem" },
    Default: { key: "Default", width: "w-1/3", fontSize: "1rem" },
    High: { key: "High", width: "w-1/3", fontSize: "1rem" },
  };

  // ---------- CONTRAST LEVEL SETTINGS ----------
  const [contrast, setContrast] = useState<ContrastLevel>(() => {
    return (
      (localStorage.getItem(CONTRAST_LEVEL_KEY) as ContrastLevel) || "Default"
    );
  });

  const contrastOptions = {
    Low: { key: "Low", width: "w-1/4", fontSize: "1rem" },
    Default: { key: "Default", width: "w-1/4", fontSize: "1rem" },
    High: { key: "High", width: "w-1/4", fontSize: "1rem" },
    BW: { key: "B/W", width: "w-1/4", fontSize: "1rem" },
  };

  // ---------- RENDER ----------
  return (
    <main className="flex flex-col w-full h-full md:flex-row p-2 md:p-5">
      {/* Text Size Section */}

      <CardSection>
        <SettingCard>
          <SettingHeader
            title="Text Size"
            description="Adjust the text size used throughout the application."
          />
          <ButtonRow>
            {Object.entries(textScaleOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.key}
                className={option.width}
                style={{ fontSize: option.fontSize }}
                onClick={() => setTextScale(key as TextScale)}
              />
            ))}
          </ButtonRow>
        </SettingCard>

        {/* Theme Setting */}
        <SettingCard>
          <SettingHeader
            title="Theme"
            description="Light or dark theme for the application."
          />
          <ButtonRow>
            {Object.entries(themeOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.key}
                className={option.width}
                style={{ fontSize: option.fontSize }}
                onClick={() => setTheme(key as Theme)}
              />
            ))}
          </ButtonRow>
        </SettingCard>
      </CardSection>

      <CardSection>
        {/* Motion Reduction */}
        <SettingCard>
          <SettingHeader
            title="Motion Speed"
            description="Adjust the speed of animations and motion effects."
          />
          <ButtonRow>
            {Object.entries(motionOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.key}
                className={option.width}
                style={{ fontSize: option.fontSize }}
                onClick={() => {
                  setMotionPreference(key as MotionPreference);
                }}
              />
            ))}
          </ButtonRow>
        </SettingCard>

        <SettingCard>
          <SettingHeader
            title="Contrast Level"
            description="Adjust the contrast level for better visibility."
          />
          <ButtonRow>
            {Object.entries(contrastOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.key}
                className={option.width}
                style={{ fontSize: option.fontSize }}
                onClick={() => setContrast(key as ContrastLevel)}
              />
            ))}
          </ButtonRow>
        </SettingCard>
      </CardSection>
    </main>
  );
}
