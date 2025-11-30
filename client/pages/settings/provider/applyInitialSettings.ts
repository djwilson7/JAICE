import { SETTINGS_KEYS } from "./settingKeys";

export function applyInitialSettings() {
  try {
    // THEME
    const theme =
      localStorage.getItem(SETTINGS_KEYS.THEME) ||
      (window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark");
    document.documentElement.setAttribute("data-theme", theme);

    // TEXT SCALE
    const scale = localStorage.getItem(SETTINGS_KEYS.TEXT_SCALE) || "default";
    const scaleValue =
      scale === "small" ? "0.85" : scale === "large" ? "1.15" : "1";
    document.documentElement.style.setProperty("--text-scale", scaleValue);

    // MOTION
    const motion = localStorage.getItem(SETTINGS_KEYS.MOTION) || "default";
    const duration =
      motion === "slow" ? "0.4s" : motion === "fast" ? "0.1s" : "0.2s";
    document.documentElement.style.setProperty(
      "--animation-duration",
      duration
    );

    // CONTRAST
    const contrast = localStorage.getItem(SETTINGS_KEYS.CONTRAST) || "default";
    document.documentElement.setAttribute("data-contrast", contrast);
  } catch {
    // Fallbacks do nothing—let defaults handle it
  }
}
