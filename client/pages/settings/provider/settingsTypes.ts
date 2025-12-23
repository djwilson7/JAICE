export type TextScale = "small" | "default" | "large";
export type Theme = "light" | "dark";
export type MotionPreference = "slow" | "default" | "fast";
export type ContrastLevel = "low" | "default" | "high" | "bw";
export type NavigationBehavior = "open" | "hover" | "closed";
export type ReviewBehavior = "inline" | "column" | "dynamic";

export interface SettingsContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;

  textScale: TextScale;
  setTextScale: (textScale: TextScale) => void;

  motion: MotionPreference;
  setMotion: (motion: MotionPreference) => void;

  contrast: ContrastLevel;
  setContrast: (contrast: ContrastLevel) => void;

  navigationBehavior: NavigationBehavior;
  setNavigationBehavior: (navigationBehavior: NavigationBehavior) => void;

  reviewBehavior: ReviewBehavior;
  setReviewBehavior: (reviewBehavior: ReviewBehavior) => void;
}
