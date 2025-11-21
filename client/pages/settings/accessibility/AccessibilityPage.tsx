// import { localfiles } from "@/directory/path/to/localimport";

import { useEffect, useState } from "react";
import {
  CardSection,
  SettingCard,
  ButtonRow,
  SettingButton,
  SettingHeader,
} from "@/pages/settings/accessibility/accessibility-components/Cards";

type TextSize = "Small" | "Medium" | "Large";
type Theme = "Light" | "Dark";
type MotionPreference = "Low" | "Medium" | "High";
type ContrastLevel = "Low" | "Medium" | "High" | "NoColor";

const THEME_KEY = "theme";

export function AccessibilityPage() {
  const textSizeOptions = {
    small: { key: "Small", width: "w-1/3", fontSize: "0.85rem" },
    medium: { key: "Default", width: "w-1/3", fontSize: "1rem" },
    large: { key: "Large", width: "w-1/3", fontSize: "1.15rem" },
  };

  const themeOptions = {
    light: { key: "Light", width: "w-1/2", fontSize: "1rem" },
    dark: { key: "Dark", width: "w-1/2", fontSize: "1rem" },
  };

  const motionOptions = {
    low: { key: "Low", width: "w-1/3", fontSize: "1rem" },
    medium: { key: "Default", width: "w-1/3", fontSize: "1rem" },
    high: { key: "High", width: "w-1/3", fontSize: "1rem" },
  };

  const contrastOptions = {
    low: { key: "Low", width: "w-1/4", fontSize: "1rem" },
    medium: { key: "Default", width: "w-1/4", fontSize: "1rem" },
    high: { key: "High", width: "w-1/4", fontSize: "1rem" },
    blackwhite: { key: "B/W", width: "w-1/4", fontSize: "1rem" },
  };

  //text size
  //theme settings
  //motion settings
  //contrast level

  const [textSize, setTextSize] = useState<TextSize>("Medium");
  const [motionPreference, setMotionPreference] =
    useState<MotionPreference>("Medium");
  const [contrast, setContrast] = useState<ContrastLevel>("Medium");

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
            {Object.entries(textSizeOptions).map(([key, option]) => (
              <SettingButton
                key={key}
                label={option.key}
                className={option.width}
                style={{ fontSize: option.fontSize }}
                onClick={() => setTextSize(key as TextSize)}
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
