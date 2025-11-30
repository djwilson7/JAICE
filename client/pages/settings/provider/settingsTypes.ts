export type TextScale = "small" | "default" | "large";
export type Theme = "light" | "dark";
export type MotionPreference = "slow" | "default" | "fast";
export type ContrastLevel = "low" | "default" | "high" | "bw";

export interface SettingsContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;

  textScale: TextScale;
  setTextScale: (t: TextScale) => void;

  motion: MotionPreference;
  setMotion: (m: MotionPreference) => void;

  contrast: ContrastLevel;
  setContrast: (c: ContrastLevel) => void;
}
