import type { TextScale, Theme, MotionPreference, ContrastLevel } from "./settingsTypes";

export const TEXT_SCALE_OPTIONS: Record<TextScale, { label: string; value: string }> = {
  small:   { label: "Small",   value: "0.85rem" },
  default: { label: "Default", value: "1rem" },
  large:   { label: "Large",   value: "1.15rem" },
};

export const THEME_OPTIONS: Record<Theme, { label: string }> = {
  light: { label: "Light" },
  dark:  { label: "Dark" },
};

export const MOTION_OPTIONS: Record<MotionPreference, { label: string; value: string }> = {
  slow:    { label: "Slow",    value: "0.4s" },
  default: { label: "Default", value: "0.2s" },
  fast:    { label: "Fast",    value: "0.1s" },
};

export const CONTRAST_OPTIONS: Record<ContrastLevel, { label: string; value?: string }> = {
  low:     { label: "Low" },
  default: { label: "Default" },
  high:    { label: "High" },
  bw:      { label: "BW" },
};
