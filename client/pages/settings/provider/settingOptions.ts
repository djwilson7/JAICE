import type {
  TextScale,
  Theme,
  MotionPreference,
  ContrastLevel,
} from "./settingsTypes";

export const TEXT_SCALE_OPTIONS: Record<
  TextScale,
  { label: string; value: string; title?: string }
> = {
  small: { label: "Small", value: "0.85rem", title: "Shrink Text" },
  default: { label: "Default", value: "1rem", title: "Normal Text" },
  large: { label: "Large", value: "1.15rem", title: "Enlarge Text" },
};

export const THEME_OPTIONS: Record<Theme, { label: string; title?: string }> = {
  light: { label: "Light", title: "Set Light Theme" },
  dark: { label: "Dark", title: "Set Dark Theme" },
};

export const MOTION_OPTIONS: Record<
  MotionPreference,
  { label: string; value: string; title?: string }
> = {
  slow: { label: "Slow", value: "0.4s", title: "Slower Animations" },
  default: { label: "Default", value: "0.2s", title: "Normal Animations" },
  fast: { label: "Fast", value: "0.1s", title: "Faster Animations" },
};

export const CONTRAST_OPTIONS: Record<
  ContrastLevel,
  { label: string; value?: string; title?: string }
> = {
  low: { label: "Low", title: "Softer Contrast" },
  default: { label: "Default", title: "Normal Contrast" },
  high: { label: "High", title: "Stronger Contrast" },
  bw: { label: "BW", title: "Black & White Contrast" },
};

export const NAVIGATION_BEHAVIOR_OPTIONS: Record<
  string,
  { label: string; title?: string }
> = {
  open: { label: "Open", title: "Keep the navigation bar visible" },
  hover: { label: "Hover", title: "Show the navigation bar on hover" },
  closed: { label: "Closed", title: "Keep the navigation bar hidden" },
};

export const REVIEW_BEHAVIOR_OPTIONS: Record<
  string,
  { label: string; title?: string }
> = {
  inline: { label: "Inline", title: "Show reviews inline" },
  column: { label: "Column", title: "Show reviews in a separate column" },
  dynamic: { label: "Dynamic", title: "Show reviews when relevant" },
};

export const PRIMARY_COLUMN_BEHAVIOR_OPTIONS: Record<
  string,
  { label: string; title?: string }
> = {
  separate: {
    label: "Separated",
    title: "Keep accepted & rejected columns separated",
  },
  unified: {
    label: "Unified",
    title: "Combine accepted & rejected columns into one",
  },
};
